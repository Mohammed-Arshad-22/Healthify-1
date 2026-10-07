import HealthRecord from '../models/HealthRecord.js';
import Medication from '../models/Medication.js';
import LabMetric from '../models/LabMetric.js';
import Doctor from '../models/Doctor.js';
import Caregiver from '../models/Caregiver.js';
import Appointment from '../models/Appointment.js';
import Notification from '../models/Notification.js';
import Document from '../models/Document.js';
import User from '../models/User.js';
import { aiService } from '../services/ai.service.js';
import { retrievalService } from '../services/retrieval.service.js';
import { copilotService } from '../services/copilot.service.js';
import { syncAllAnalyzedDocumentsForUser } from '../services/documentSync.service.js';
import { AppError } from '../middleware/errorHandler.js';

// ==========================================
// 1. HEALTH RECORDS & TIMELINE (Phases 9 & 10)
// ==========================================
export const getHealthRecords = async (req, res, next) => {
  try {
    // Automatically guarantee any analyzed documents are synced to health records
    await syncAllAnalyzedDocumentsForUser(req.user._id);

    const { type, search, sort = '-date' } = req.query;
    const filter = { userId: req.user._id };

    if (type && type !== 'all') {
      filter.recordType = type;
    }
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { doctorName: { $regex: search, $options: 'i' } },
        { hospitalClinicName: { $regex: search, $options: 'i' } },
        { notes: { $regex: search, $options: 'i' } },
      ];
    }

    const records = await HealthRecord.find(filter).sort(sort);
    res.status(200).json({ status: 'success', count: records.length, records });
  } catch (err) {
    next(err);
  }
};

export const createHealthRecord = async (req, res, next) => {
  try {
    const { title, recordType, date, doctorName, hospitalClinicName, notes, diagnosis, tags } = req.body;
    if (!title || !recordType) {
      return next(new AppError('Title and record type are required.', 400));
    }

    const record = new HealthRecord({
      userId: req.user._id,
      title,
      recordType,
      date: date ? new Date(date) : new Date(),
      doctorName: doctorName || '',
      hospitalClinicName: hospitalClinicName || '',
      notes: notes || '',
      diagnosis: diagnosis || [],
      tags: tags || [],
      source: 'MANUAL_ENTRY',
    });

    await record.save();
    res.status(201).json({ status: 'success', record });
  } catch (err) {
    next(err);
  }
};

export const getHealthRecordById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const record = await HealthRecord.findOne({ _id: id, userId: req.user._id });
    if (!record) {
      return next(new AppError('Health record not found or unauthorized.', 404));
    }
    res.status(200).json({ status: 'success', record });
  } catch (err) {
    next(err);
  }
};

export const deleteHealthRecord = async (req, res, next) => {
  try {
    const { id } = req.params;
    const record = await HealthRecord.findOneAndDelete({ _id: id, userId: req.user._id });
    if (!record) {
      return next(new AppError('Health record not found or unauthorized.', 404));
    }
    res.status(200).json({ status: 'success', message: 'Record deleted.' });
  } catch (err) {
    next(err);
  }
};

// ==========================================
// 2. MEDICATION MANAGEMENT (Phase 11)
// ==========================================
export const getMedications = async (req, res, next) => {
  try {
    const medications = await Medication.find({ userId: req.user._id }).sort({ status: 1, createdAt: -1 });
    res.status(200).json({ status: 'success', count: medications.length, medications });
  } catch (err) {
    next(err);
  }
};

export const getMedicationById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const medication = await Medication.findOne({ _id: id, userId: req.user._id });
    if (!medication) {
      return next(new AppError('Medication not found or unauthorized.', 404));
    }
    res.status(200).json({ status: 'success', medication });
  } catch (err) {
    next(err);
  }
};

export const createMedication = async (req, res, next) => {
  try {
    const { name, dosage, form, frequency, schedule, instructions, prescribedBy, startDate, endDate } = req.body;
    if (!name || !dosage) {
      return next(new AppError('Medication name and dosage are required.', 400));
    }

    const med = new Medication({
      userId: req.user._id,
      name,
      dosage,
      form: form || 'tablet',
      frequency: frequency || 'Once daily',
      schedule: schedule || [{ time: '08:00', label: 'Morning' }],
      instructions: instructions || 'Take after meals',
      prescribedBy: prescribedBy || '',
      startDate: startDate ? new Date(startDate) : new Date(),
      endDate: endDate ? new Date(endDate) : undefined,
      status: 'active',
    });

    await med.save();
    res.status(201).json({ status: 'success', medication: med });
  } catch (err) {
    next(err);
  }
};

export const logMedicationAdherence = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, timeSlot } = req.body; // 'taken' | 'missed'

    const med = await Medication.findOne({ _id: id, userId: req.user._id });
    if (!med) return next(new AppError('Medication not found.', 404));

    med.adherenceLogs.push({
      date: new Date(),
      timeSlot: timeSlot || 'Today',
      status: status || 'taken',
    });

    await med.save();
    res.status(200).json({ status: 'success', medication: med });
  } catch (err) {
    next(err);
  }
};

export const toggleMedicationStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const med = await Medication.findOne({ _id: id, userId: req.user._id });
    if (!med) return next(new AppError('Medication not found.', 404));

    med.status = med.status === 'active' ? 'completed' : 'active';
    await med.save();

    res.status(200).json({ status: 'success', medication: med });
  } catch (err) {
    next(err);
  }
};

export const deleteMedication = async (req, res, next) => {
  try {
    const { id } = req.params;
    const med = await Medication.findOneAndDelete({ _id: id, userId: req.user._id });
    if (!med) return next(new AppError('Medication not found or unauthorized.', 404));

    res.status(200).json({ status: 'success', message: 'Medication removed.' });
  } catch (err) {
    next(err);
  }
};

// ==========================================
// 3. LAB TRENDS & CHARTS (Phase 12)
// ==========================================
export const getLabTrends = async (req, res, next) => {
  try {
    const { metric } = req.query;
    const filter = { userId: req.user._id };
    if (metric) filter.metricName = metric;

    const metrics = await LabMetric.find(filter).sort({ date: 1 });

    // Distinct available metric names
    const availableMetrics = await LabMetric.distinct('metricName', { userId: req.user._id });

    res.status(200).json({
      status: 'success',
      availableMetrics,
      metrics,
    });
  } catch (err) {
    next(err);
  }
};

export const addLabMetric = async (req, res, next) => {
  try {
    const { metricName, value, unit, date, notes, status: customStatus, referenceMin, referenceMax } = req.body;
    if (!metricName || value === undefined) {
      return next(new AppError('Metric name and value are required.', 400));
    }

    const numVal = Number(value);
    let resolvedStatus = customStatus || 'normal';
    if (!customStatus && referenceMin !== undefined && referenceMax !== undefined) {
      if (numVal > Number(referenceMax)) resolvedStatus = 'high';
      else if (numVal < Number(referenceMin)) resolvedStatus = 'low';
    }

    const metric = new LabMetric({
      userId: req.user._id,
      metricName,
      value: numVal,
      unit: unit || 'mg/dL',
      referenceMin: referenceMin !== undefined ? Number(referenceMin) : undefined,
      referenceMax: referenceMax !== undefined ? Number(referenceMax) : undefined,
      status: resolvedStatus,
      date: date ? new Date(date) : new Date(),
      notes: notes || '',
    });

    await metric.save();
    res.status(201).json({ status: 'success', metric });
  } catch (err) {
    next(err);
  }
};

// ==========================================
// 4. DOCTORS & APPOINTMENTS (Phase 13)
// ==========================================
export const getDoctors = async (req, res, next) => {
  try {
    const doctors = await Doctor.find({ userId: req.user._id }).sort({ name: 1 });
    res.status(200).json({ status: 'success', count: doctors.length, doctors });
  } catch (err) {
    next(err);
  }
};

export const createDoctor = async (req, res, next) => {
  try {
    const { name, specialization, hospitalClinic, phone, email, notes } = req.body;
    const doctor = new Doctor({
      userId: req.user._id,
      name,
      specialization,
      hospitalClinic,
      phone,
      email,
      notes,
    });
    await doctor.save();
    res.status(201).json({ status: 'success', doctor });
  } catch (err) {
    next(err);
  }
};

export const deleteDoctor = async (req, res, next) => {
  try {
    const { id } = req.params;
    const doc = await Doctor.findOneAndDelete({ _id: id, userId: req.user._id });
    if (!doc) return next(new AppError('Doctor record not found or unauthorized.', 404));

    res.status(200).json({ status: 'success', message: 'Doctor contact removed.' });
  } catch (err) {
    next(err);
  }
};

export const getAppointments = async (req, res, next) => {
  try {
    const appointments = await Appointment.find({ userId: req.user._id }).sort({ date: 1 });
    res.status(200).json({ status: 'success', appointments });
  } catch (err) {
    next(err);
  }
};

export const createAppointment = async (req, res, next) => {
  try {
    const { doctorName, specialty, hospitalClinic, date, time, reason } = req.body;
    const appt = new Appointment({
      userId: req.user._id,
      doctorName,
      specialty,
      hospitalClinic,
      date: new Date(date),
      time,
      reason,
      status: 'upcoming',
    });
    await appt.save();
    res.status(201).json({ status: 'success', appointment: appt });
  } catch (err) {
    next(err);
  }
};

export const deleteAppointment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const appt = await Appointment.findOneAndDelete({ _id: id, userId: req.user._id });
    if (!appt) return next(new AppError('Appointment not found or unauthorized.', 404));

    res.status(200).json({ status: 'success', message: 'Appointment removed.' });
  } catch (err) {
    next(err);
  }
};

// ==========================================
// 5. CAREGIVERS & SHARING (Phase 14)
// ==========================================
export const getCaregivers = async (req, res, next) => {
  try {
    const caregivers = await Caregiver.find({ userId: req.user._id });
    res.status(200).json({ status: 'success', caregivers });
  } catch (err) {
    next(err);
  }
};

export const addCaregiver = async (req, res, next) => {
  try {
    const { name, relationship, phone, email, permissionLevel, durationDays } = req.body;
    const expiresAt = durationDays ? new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000) : undefined;

    const caregiver = new Caregiver({
      userId: req.user._id,
      name,
      relationship,
      phone,
      email,
      permissionLevel: permissionLevel || 'medications_only',
      expiresAt,
      status: 'active',
    });

    await caregiver.save();
    res.status(201).json({ status: 'success', caregiver });
  } catch (err) {
    next(err);
  }
};

export const revokeCaregiver = async (req, res, next) => {
  try {
    const { id } = req.params;
    await Caregiver.findOneAndUpdate({ _id: id, userId: req.user._id }, { status: 'revoked' });
    res.status(200).json({ status: 'success', message: 'Caregiver access revoked.' });
  } catch (err) {
    next(err);
  }
};

// ==========================================
// 6. ABDM / ABHA DEMO MODULE (Phases 15, 16, 17, 18)
// ==========================================
export const getAbhaProfile = async (req, res) => {
  const user = req.user;
  res.status(200).json({
    status: 'success',
    abha: {
      connected: user.abhaConnected,
      abhaNumber: user.abhaNumber || 'DEMO-ABHA-8842-1920-5511',
      abhaAddress: user.abhaAddress || 'arun.patient@abdm',
      demoMode: user.abhaDemoMode !== false,
      disclaimer: 'DEMO ABHA — Not a real government health identity',
    },
  });
};

export const connectAbhaDemo = async (req, res, next) => {
  try {
    const user = req.user;
    user.abhaConnected = true;
    user.abhaNumber = 'DEMO-ABHA-8842-1920-5511';
    user.abhaAddress = `${(user.name || 'patient').toLowerCase().replace(/\s+/g, '')}@abdm`;
    user.abhaDemoMode = true;
    await user.save();

    res.status(200).json({
      status: 'success',
      message: 'Demo ABHA identity connected successfully.',
      abha: {
        connected: true,
        abhaNumber: user.abhaNumber,
        abhaAddress: user.abhaAddress,
        demoMode: true,
      },
    });
  } catch (err) {
    next(err);
  }
};

export const discoverAbhaRecords = async (req, res) => {
  // Mock external hospital health records discoverable via ABDM sandbox
  const discoverable = [
    {
      recordId: 'abdm-rec-001',
      type: 'Prescription',
      hospitalName: 'Apollo Speciality Hospital',
      doctorName: 'Dr. Ramesh Sharma',
      date: '2026-09-12',
      summary: 'Metformin 500mg, Telmisartan 40mg for glycemic & BP management',
      fhirResourceType: 'MedicationRequest',
    },
    {
      recordId: 'abdm-rec-002',
      type: 'Laboratory Report',
      hospitalName: 'Metropolis Central Diagnostic Lab',
      doctorName: 'Dr. Swati Deshmukh',
      date: '2026-09-18',
      summary: 'HbA1c: 7.2%, Lipid Profile & Serum Creatinine',
      fhirResourceType: 'DiagnosticReport',
    },
    {
      recordId: 'abdm-rec-003',
      type: 'Encounter / Discharge Summary',
      hospitalName: 'Fortis Healthcare Clinic',
      doctorName: 'Dr. Vivek Menon',
      date: '2026-08-10',
      summary: 'Annual Preventative Health Assessment & Dietary Consultation',
      fhirResourceType: 'Encounter',
    },
  ];

  res.status(200).json({
    status: 'success',
    disclaimer: 'DEMO ABDM DISCOVERY — Simulated hospital health repository',
    availableRecords: discoverable,
  });
};

export const importAbhaRecords = async (req, res, next) => {
  try {
    const { selectedRecordIds } = req.body;
    if (!selectedRecordIds || selectedRecordIds.length === 0) {
      return next(new AppError('Please select at least one record to import.', 400));
    }

    const imported = [];

    if (selectedRecordIds.includes('abdm-rec-001')) {
      const rec = await HealthRecord.create({
        userId: req.user._id,
        title: 'ABDM Import: Apollo Hospital Prescription',
        recordType: 'prescription',
        date: new Date('2026-09-12'),
        doctorName: 'Dr. Ramesh Sharma',
        hospitalClinicName: 'Apollo Speciality Hospital',
        notes: 'Imported via ABDM Health Information Exchange',
        diagnosis: ['Type 2 Diabetes', 'Hypertension'],
        source: 'ABHA_ABDM',
        status: 'active',
        tags: ['ABDM', 'Prescription', 'FHIR-MedicationRequest'],
      });
      imported.push(rec);
    }

    if (selectedRecordIds.includes('abdm-rec-002')) {
      const rec = await HealthRecord.create({
        userId: req.user._id,
        title: 'ABDM Import: Metropolis Lab HbA1c Report',
        recordType: 'lab_report',
        date: new Date('2026-09-18'),
        doctorName: 'Dr. Swati Deshmukh',
        hospitalClinicName: 'Metropolis Central Diagnostic Lab',
        notes: 'HbA1c 7.2%, Blood Glucose 142 mg/dL. Normalized into unified FHIR observation.',
        diagnosis: ['Elevated HbA1c'],
        source: 'ABHA_ABDM',
        status: 'active',
        tags: ['ABDM', 'Lab Report', 'FHIR-DiagnosticReport'],
      });
      imported.push(rec);
    }

    if (selectedRecordIds.includes('abdm-rec-003')) {
      const rec = await HealthRecord.create({
        userId: req.user._id,
        title: 'ABDM Import: Fortis Annual Health Encounter',
        recordType: 'consultation',
        date: new Date('2026-08-10'),
        doctorName: 'Dr. Vivek Menon',
        hospitalClinicName: 'Fortis Healthcare Clinic',
        notes: 'Routine health assessment. Diet and exercise regimen formulated.',
        source: 'ABHA_ABDM',
        status: 'completed',
        tags: ['ABDM', 'Encounter', 'FHIR-Encounter'],
      });
      imported.push(rec);
    }

    res.status(200).json({
      status: 'success',
      message: `Successfully imported ${imported.length} ABDM records to unified timeline.`,
      importedRecords: imported,
    });
  } catch (err) {
    next(err);
  }
};

// ==========================================
// 7. HEALTH COPILOT AI QUERY (Phases 20, 21, 22, 23)
// ==========================================
export const askHealthCopilot = async (req, res, next) => {
  try {
    const rawQuery = req.body?.query || req.body?.question || req.body?.message || req.query?.query || req.query?.q;
    const query = typeof rawQuery === 'string' ? rawQuery.trim() : '';
    if (!query) {
      return next(new AppError('Please provide a health inquiry question.', 400));
    }

    const { language = 'en', history = [] } = req.body || {};
    const documentId = req.body?.document_id || req.body?.documentId || req.query?.document_id || req.query?.doc || null;
    const documentType = req.body?.document_type || req.body?.documentType || null;
    const mode = req.body?.mode || null;

    const copilotResult = await copilotService.processQuery({
      query,
      userId: req.user._id,
      user: req.user,
      language: language || req.user.preferredLanguage || 'en',
      history,
      documentId,
      document_id: documentId,
      documentType,
      mode,
    });

    res.status(200).json({
      status: 'success',
      ...copilotResult,
    });
  } catch (err) {
    next(err);
  }
};

// ==========================================
// 7b. PHASE 8: RETRIEVAL FOUNDATION QUERY
// ==========================================
export const retrieveCopilotData = async (req, res, next) => {
  try {
    const { query, document_type, limit, mode } = req.body;
    if (!query) {
      return next(new AppError('Please provide a health inquiry query for retrieval.', 400));
    }

    if (mode === 'vector_search_only') {
      const vectorResults = await retrievalService.performMetadataFilteredVectorSearch({
        userId: req.user._id,
        query,
        documentType: document_type || null,
        topK: limit || 5,
      });
      return res.status(200).json({
        status: 'success',
        results: vectorResults,
      });
    }

    const retrievalResult = await retrievalService.retrieve({
      query,
      userId: req.user._id,
      requestedDocumentType: document_type || null,
      limit: limit || 8,
    });

    res.status(200).json({
      status: 'success',
      ...retrievalResult,
    });
  } catch (err) {
    next(err);
  }
};

// ==========================================
// 8. EMERGENCY CARD & QR (Phases 24, 25, 26)
// ==========================================
export const getEmergencyProfile = async (req, res) => {
  const user = req.user;
  res.status(200).json({
    status: 'success',
    emergency: {
      name: user.name,
      age: user.age,
      bloodGroup: user.bloodGroup || '',
      emergencyContacts: user.emergencyContacts || [],
      criticalAllergies: user.criticalAllergies || [],
      criticalConditions: user.criticalConditions || [],
      importantMedicines: user.importantMedicines || [],
      primaryDoctorName: user.primaryDoctorName || '',
      primaryDoctorPhone: user.primaryDoctorPhone || '',
      lastCheckupDate: user.lastCheckupDate || null,
      abhaNumber: user.abhaNumber || '',
      tollFreeAssistanceNumber: '1800-889-CARE',
    },
  });
};

// Public Emergency QR endpoint (Minimal scoped info for first responders, access logged)
export const getPublicEmergencyCard = async (req, res, next) => {
  try {
    const { userId } = req.params;
    if (!userId || userId === 'demo_user' || userId === 'not_available' || userId.length !== 24) {
      return next(new AppError('Emergency record not found or link is invalid.', 404));
    }

    const user = await User.findById(userId);
    if (!user) {
      return next(new AppError('Emergency record not found or expired.', 404));
    }

    // Log emergency access audit
    user.auditLogs.push({
      action: 'EMERGENCY_QR_SCANNED',
      ip: req.ip || '',
      userAgent: req.headers['user-agent'] || '',
      timestamp: new Date(),
    });
    await user.save({ validateBeforeSave: false });

    // Strict minimal emergency data
    res.status(200).json({
      status: 'success',
      emergencyCard: {
        patientName: user.name,
        age: user.age,
        bloodGroup: user.bloodGroup || 'Not specified',
        emergencyContacts: user.emergencyContacts || [],
        criticalAllergies: user.criticalAllergies || [],
        criticalConditions: user.criticalConditions || [],
        importantMedicines: user.importantMedicines || [],
        primaryDoctor: {
          name: user.primaryDoctorName || '',
          phone: user.primaryDoctorPhone || '',
        },
        emergencyTollFree: '1800-889-CARE',
      },
    });
  } catch (err) {
    next(err);
  }
};

// ==========================================
// 9. GLOBAL HEALTH SEARCH (Phase 29)
// ==========================================
export const globalSearch = async (req, res, next) => {
  try {
    const { q } = req.query;
    if (!q || q.trim().length === 0) {
      return res.status(200).json({ status: 'success', results: { records: [], medicines: [], doctors: [] } });
    }

    const regex = new RegExp(q.trim(), 'i');
    const records = await HealthRecord.find({
      userId: req.user._id,
      $or: [{ title: regex }, { doctorName: regex }, { hospitalClinicName: regex }, { diagnosis: regex }],
    }).limit(5);

    const medicines = await Medication.find({
      userId: req.user._id,
      name: regex,
    }).limit(5);

    const doctors = await Doctor.find({
      userId: req.user._id,
      $or: [{ name: regex }, { specialization: regex }],
    }).limit(5);

    res.status(200).json({
      status: 'success',
      query: q,
      results: { records, medicines, doctors },
    });
  } catch (err) {
    next(err);
  }
};

// ==========================================
// 10. NOTIFICATIONS (Phase 27)
// ==========================================
export const getNotifications = async (req, res, next) => {
  try {
    const notifications = await Notification.find({ userId: req.user._id }).sort({ createdAt: -1 });
    res.status(200).json({ status: 'success', notifications });
  } catch (err) {
    next(err);
  }
};

export const markNotificationRead = async (req, res, next) => {
  try {
    const { id } = req.params;
    await Notification.findOneAndUpdate({ _id: id, userId: req.user._id }, { read: true });
    res.status(200).json({ status: 'success', message: 'Notification marked as read.' });
  } catch (err) {
    next(err);
  }
};
