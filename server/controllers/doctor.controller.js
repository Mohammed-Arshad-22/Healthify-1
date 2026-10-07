import User from '../models/User.js';
import DoctorAccess from '../models/DoctorAccess.js';
import HealthRecord from '../models/HealthRecord.js';
import Medication from '../models/Medication.js';
import Document from '../models/Document.js';
import { AppError } from '../middleware/errorHandler.js';

// 1. Get Doctor Profile
export const getDoctorProfile = async (req, res, next) => {
  try {
    const doctor = await User.findById(req.user._id);
    if (!doctor || doctor.role !== 'doctor') {
      return next(new AppError('Doctor profile not found.', 404));
    }

    res.status(200).json({
      status: 'success',
      profile: {
        id: doctor._id,
        name: doctor.name,
        email: doctor.email,
        phone: doctor.phone,
        specialization: doctor.specialization,
        professionalDesignation: doctor.professionalDesignation,
        clinicHospital: doctor.clinicHospital,
        registrationNumber: doctor.registrationNumber,
        verificationStatus: doctor.verificationStatus || 'pending',
        preferredLanguage: doctor.preferredLanguage,
      },
    });
  } catch (err) {
    next(err);
  }
};

// 2. Update Doctor Profile
export const updateDoctorProfile = async (req, res, next) => {
  try {
    const allowed = ['name', 'phone', 'specialization', 'professionalDesignation', 'clinicHospital', 'registrationNumber', 'preferredLanguage'];
    const updates = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }

    const doctor = await User.findByIdAndUpdate(
      req.user._id,
      { $set: updates },
      { new: true, runValidators: true }
    );

    res.status(200).json({
      status: 'success',
      message: 'Doctor profile updated successfully.',
      profile: doctor,
    });
  } catch (err) {
    next(err);
  }
};

// 3. Get Authorized Patients for this Doctor (Doctor Data Isolation: Doctor A != Doctor B)
export const getAuthorizedPatients = async (req, res, next) => {
  try {
    const shares = await DoctorAccess.find({
      doctorId: req.user._id,
      status: 'active',
    }).populate('patientId', 'name email phone age gender bloodGroup preferredLanguage');

    const patients = shares.map(s => ({
      shareId: s._id,
      patient: s.patientId,
      permissions: s.permissions,
      grantedAt: s.createdAt,
      expiresAt: s.expiresAt,
    }));

    res.status(200).json({
      status: 'success',
      count: patients.length,
      patients,
    });
  } catch (err) {
    next(err);
  }
};

// 4. Get Single Authorized Patient Health Data (Explicit authorization verification)
export const getAuthorizedPatientHealthData = async (req, res, next) => {
  try {
    const { patientId } = req.params;

    // Verify explicit active permission
    const access = await DoctorAccess.findOne({
      doctorId: req.user._id,
      patientId,
      status: 'active',
    });

    if (!access) {
      return next(new AppError('Unauthorized: Patient has not shared health records with you or access was revoked.', 403));
    }

    const patient = await User.findById(patientId).select('-passwordHash -otpCode -otpExpiresAt -sessions');
    if (!patient) {
      return next(new AppError('Patient account not found.', 404));
    }

    let records = [];
    let medicines = [];
    let documents = [];

    if (access.permissions.reports || access.permissions.timeline) {
      records = await HealthRecord.find({ userId: patientId }).sort({ date: -1 });
    }
    if (access.permissions.medicines) {
      medicines = await Medication.find({ userId: patientId, status: 'active' });
    }
    if (access.permissions.reports) {
      documents = await Document.find({ userId: patientId, status: 'VERIFIED' }).sort({ createdAt: -1 });
    }

    res.status(200).json({
      status: 'success',
      patient: access.permissions.profile ? patient : { name: patient.name },
      records,
      medicines,
      documents,
      permissions: access.permissions,
    });
  } catch (err) {
    next(err);
  }
};

// 5. Add Doctor Consultation for Authorized Patient
export const addDoctorConsultation = async (req, res, next) => {
  try {
    const { patientId } = req.params;
    const { title, notes, diagnosis, medicationsPrescribed } = req.body;

    const access = await DoctorAccess.findOne({
      doctorId: req.user._id,
      patientId,
      status: 'active',
    });

    if (!access) {
      return next(new AppError('Unauthorized: Active patient consent required to add clinical notes.', 403));
    }

    const record = new HealthRecord({
      userId: patientId,
      title: title || `Consultation with Dr. ${req.user.name}`,
      recordType: 'consultation',
      date: new Date(),
      doctorName: `Dr. ${req.user.name}`,
      doctorSpecialty: req.user.specialization || 'General Medicine',
      hospitalClinicName: req.user.clinicHospital || '',
      notes: notes || '',
      diagnosis: diagnosis || [],
      source: 'DOCTOR_SHARED',
      tags: ['doctor_consultation', req.user.specialization],
    });

    await record.save();

    // Optionally prescribe medicines directly to patient's medication list
    if (Array.isArray(medicationsPrescribed) && medicationsPrescribed.length > 0) {
      for (const med of medicationsPrescribed) {
        if (med.name && med.dosage) {
          await Medication.create({
            userId: patientId,
            name: med.name,
            dosage: med.dosage,
            frequency: med.frequency || 'Once daily',
            prescribedBy: `Dr. ${req.user.name}`,
            instructions: med.instructions || 'Take as instructed by doctor',
            status: 'active',
          });
        }
      }
    }

    res.status(201).json({
      status: 'success',
      message: 'Consultation recorded into patient timeline.',
      record,
    });
  } catch (err) {
    next(err);
  }
};

// ==========================================
// PATIENT-FACING DOCTOR SHARING (Phase 7)
// ==========================================

// 6. Patient gets list of registered doctors to share with
export const getDoctorsDirectory = async (req, res, next) => {
  try {
    const doctors = await User.find({ role: 'doctor' }).select('name specialization professionalDesignation clinicHospital verificationStatus');
    res.status(200).json({
      status: 'success',
      doctors,
    });
  } catch (err) {
    next(err);
  }
};

// 7. Patient shares records with a doctor
export const shareWithDoctor = async (req, res, next) => {
  try {
    const { doctorId, permissions, notes, durationDays } = req.body;
    if (!doctorId) {
      return next(new AppError('Doctor ID is required to share health records.', 400));
    }

    const doctor = await User.findOne({ _id: doctorId, role: 'doctor' });
    if (!doctor) {
      return next(new AppError('Target doctor account does not exist.', 404));
    }

    const expiresAt = durationDays ? new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000) : undefined;

    const access = await DoctorAccess.findOneAndUpdate(
      { patientId: req.user._id, doctorId },
      {
        permissions: permissions || { profile: true, reports: true, medicines: true, timeline: true },
        status: 'active',
        notes: notes || '',
        expiresAt,
        revokedAt: null,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    res.status(200).json({
      status: 'success',
      message: `Health records shared with Dr. ${doctor.name}.`,
      access,
    });
  } catch (err) {
    next(err);
  }
};

// 8. Patient revokes access from a doctor
export const revokeDoctorSharing = async (req, res, next) => {
  try {
    const { shareId } = req.params;
    const access = await DoctorAccess.findOneAndUpdate(
      { _id: shareId, patientId: req.user._id },
      { status: 'revoked', revokedAt: new Date() },
      { new: true }
    );

    if (!access) {
      return next(new AppError('Sharing permission record not found.', 404));
    }

    res.status(200).json({
      status: 'success',
      message: 'Doctor access revoked.',
    });
  } catch (err) {
    next(err);
  }
};

// 9. Patient views their active doctor shares
export const getPatientDoctorShares = async (req, res, next) => {
  try {
    const shares = await DoctorAccess.find({ patientId: req.user._id }).populate('doctorId', 'name specialization clinicHospital');
    res.status(200).json({
      status: 'success',
      shares,
    });
  } catch (err) {
    next(err);
  }
};
