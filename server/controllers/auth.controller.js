import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import User from '../models/User.js';
import Document from '../models/Document.js';
import Medication from '../models/Medication.js';
import HealthRecord from '../models/HealthRecord.js';
import LabMetric from '../models/LabMetric.js';
import Doctor from '../models/Doctor.js';
import { config } from '../config/config.js';
import { AppError } from '../middleware/errorHandler.js';

const signToken = (id, sessionId) => {
  return jwt.sign({ id, sessionId }, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn,
  });
};

const sanitizeUser = (user) => {
  const obj = user.toObject ? user.toObject() : { ...user };
  delete obj.passwordHash;
  delete obj.otpCode;
  delete obj.otpExpiresAt;
  return obj;
};

// 1. Send OTP (Mobile Login)
export const sendOtp = async (req, res, next) => {
  try {
    const { phone } = req.body;
    if (!phone || phone.trim().length < 8) {
      return next(new AppError('Please provide a valid mobile number.', 400));
    }

    const cleanPhone = phone.trim().replace(/\s+/g, '');
    
    // In development/demo, generate 123456 or a deterministic 6-digit code
    const generatedOtp = process.env.NODE_ENV === 'production' 
      ? Math.floor(100000 + Math.random() * 900000).toString()
      : '123456';

    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    let user = await User.findOne({ phone: cleanPhone });
    if (!user) {
      user = new User({
        phone: cleanPhone,
        name: `User ${cleanPhone.slice(-4)}`,
        preferredLanguage: 'en',
      });
    }

    user.otpCode = generatedOtp;
    user.otpExpiresAt = expiresAt;
    user.auditLogs.push({
      action: 'OTP_REQUESTED',
      ip: req.ip || '',
      userAgent: req.headers['user-agent'] || '',
      details: { phone: cleanPhone },
    });

    await user.save({ validateBeforeSave: false });

    res.status(200).json({
      status: 'success',
      message: `OTP sent successfully to ${cleanPhone}.`,
      expiresAt,
      // Provide demo OTP so testing is completely frictionless
      demoOtp: generatedOtp,
    });
  } catch (err) {
    next(err);
  }
};

// 2. Verify OTP
export const verifyOtp = async (req, res, next) => {
  try {
    const { phone, otp } = req.body;
    if (!phone || !otp) {
      return next(new AppError('Phone number and OTP code are required.', 400));
    }

    const cleanPhone = phone.trim().replace(/\s+/g, '');
    const cleanOtp = otp.trim();

    const user = await User.findOne({ phone: cleanPhone }).select('+otpCode +otpExpiresAt');
    if (!user) {
      return next(new AppError('No account found for this phone number. Please request a new OTP.', 404));
    }

    if (!user.otpCode || user.otpCode !== cleanOtp) {
      return next(new AppError('Incorrect OTP code. Please try again.', 400));
    }

    if (user.otpExpiresAt && user.otpExpiresAt < new Date()) {
      return next(new AppError('OTP has expired. Please request a fresh code.', 400));
    }

    // Mark verified & clear OTP
    user.phoneVerified = true;
    user.otpCode = undefined;
    user.otpExpiresAt = undefined;

    // Create session
    const sessionId = crypto.randomUUID();
    user.sessions.push({
      sessionId,
      device: req.headers['sec-ch-ua-platform'] || 'Desktop / Mobile Browser',
      userAgent: req.headers['user-agent'] || '',
      ipAddress: req.ip || '',
      lastActive: new Date(),
    });

    user.auditLogs.push({
      action: 'LOGIN_OTP_VERIFIED',
      ip: req.ip || '',
      userAgent: req.headers['user-agent'] || '',
      details: { sessionId },
    });

    await user.save({ validateBeforeSave: false });

    const token = signToken(user._id, sessionId);

    res.status(200).json({
      status: 'success',
      token,
      user: sanitizeUser(user),
    });
  } catch (err) {
    next(err);
  }
};

// 3. Register with Email & Password
export const registerWithEmail = async (req, res, next) => {
  try {
    const { name, email, password, phone, language } = req.body;
    if (!email || !password) {
      return next(new AppError('Email and password are required.', 400));
    }
    if (password.length < 6) {
      return next(new AppError('Password must be at least 6 characters.', 400));
    }

    const cleanEmail = email.toLowerCase().trim();
    const existing = await User.findOne({ email: cleanEmail });
    if (existing) {
      return next(new AppError('An account with this email already exists.', 400));
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const sessionId = crypto.randomUUID();
    const user = new User({
      name: name ? name.trim() : 'Patient',
      email: cleanEmail,
      phone: phone ? phone.trim() : undefined,
      passwordHash,
      preferredLanguage: language || 'en',
      emailVerified: true,
      sessions: [{
        sessionId,
        device: 'Web Client',
        userAgent: req.headers['user-agent'] || '',
        ipAddress: req.ip || '',
      }],
      auditLogs: [{
        action: 'ACCOUNT_CREATED_EMAIL',
        ip: req.ip || '',
        userAgent: req.headers['user-agent'] || '',
      }],
    });

    await user.save();
    const token = signToken(user._id, sessionId);

    res.status(201).json({
      status: 'success',
      token,
      user: sanitizeUser(user),
    });
  } catch (err) {
    next(err);
  }
};

// 4. Login with Email & Password
export const loginWithEmail = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return next(new AppError('Email and password are required.', 400));
    }

    const cleanEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: cleanEmail }).select('+passwordHash');
    if (!user || !(await user.comparePassword(password))) {
      return next(new AppError('Invalid email or password.', 401));
    }

    const sessionId = crypto.randomUUID();
    user.sessions.push({
      sessionId,
      device: 'Web Client',
      userAgent: req.headers['user-agent'] || '',
      ipAddress: req.ip || '',
      lastActive: new Date(),
    });

    user.auditLogs.push({
      action: 'LOGIN_EMAIL_SUCCESS',
      ip: req.ip || '',
      userAgent: req.headers['user-agent'] || '',
      details: { sessionId },
    });

    await user.save({ validateBeforeSave: false });
    const token = signToken(user._id, sessionId);

    res.status(200).json({
      status: 'success',
      token,
      user: sanitizeUser(user),
    });
  } catch (err) {
    next(err);
  }
};

// 5. Social Login (Google / Apple Mock Flow)
export const socialLogin = async (req, res, next) => {
  try {
    const { provider, email, name } = req.body;
    const cleanEmail = (email || `${provider}_patient@healthify.internal`).toLowerCase().trim();

    let user = await User.findOne({ email: cleanEmail });
    if (!user) {
      user = new User({
        name: name || `Patient (${provider.toUpperCase()})`,
        email: cleanEmail,
        emailVerified: true,
      });
    }

    const sessionId = crypto.randomUUID();
    user.sessions.push({
      sessionId,
      device: `${provider.toUpperCase()} Auth Client`,
      userAgent: req.headers['user-agent'] || '',
      ipAddress: req.ip || '',
      lastActive: new Date(),
    });

    await user.save({ validateBeforeSave: false });
    const token = signToken(user._id, sessionId);

    res.status(200).json({
      status: 'success',
      token,
      user: sanitizeUser(user),
    });
  } catch (err) {
    next(err);
  }
};

// 6. Demo Account Instant Access (Preloaded realistic medical patient profile)
export const demoLogin = async (req, res, next) => {
  try {
    const demoEmail = 'patient.demo@healthify.app';
    let user = await User.findOne({ email: demoEmail });

    if (!user) {
      user = new User({
        name: 'Arun Kumar',
        email: demoEmail,
        phone: '+91 98765 43210',
        phoneVerified: true,
        emailVerified: true,
        age: 44,
        dateOfBirth: new Date('1982-05-14'),
        gender: 'male',
        bloodGroup: 'O+',
        heightCm: 174,
        weightKg: 78,
        allergies: ['Penicillin', 'Peanuts'],
        chronicConditions: ['Type 2 Diabetes', 'Hypertension'],
        previousSurgeries: ['Appendectomy (2018)'],
        familyHistory: ['Father: Type 2 Diabetes', 'Mother: Hypertension'],
        importantNotes: 'Patient strictly monitors morning fasting blood sugar and adherence to Metformin.',
        
        // Emergency Profile
        emergencyContacts: [
          { name: 'Priya Kumar', relationship: 'Spouse', phone: '+91 98765 11223', isPrimary: true },
          { name: 'Rajesh Kumar', relationship: 'Brother', phone: '+91 98765 33445', isPrimary: false },
        ],
        criticalAllergies: ['Penicillin (Anaphylaxis risk)'],
        criticalConditions: ['Type 2 Diabetes', 'Hypertension'],
        importantMedicines: ['Metformin 500mg', 'Telmisartan 40mg'],
        primaryDoctorName: 'Dr. Ramesh Sharma',
        primaryDoctorPhone: '+91 98400 12345',
        lastCheckupDate: new Date('2026-09-15'),

        // ABDM / ABHA
        abhaConnected: true,
        abhaNumber: 'DEMO-ABHA-8842-1920-5511',
        abhaAddress: 'arunkumar@abdm',
        abhaDemoMode: true,

        preferredLanguage: 'en',
      });
    }

    const sessionId = crypto.randomUUID();
    user.sessions.push({
      sessionId,
      device: 'Demo Workspace Browser',
      userAgent: req.headers['user-agent'] || '',
      ipAddress: req.ip || '',
      lastActive: new Date(),
    });

    await user.save({ validateBeforeSave: false });

    // Seed realistic sample laboratory report for demo patient if none exists (Phases 1-25)
    const existingDoc = await Document.findOne({ userId: user._id });
    if (!existingDoc) {
      await Document.create({
        userId: user._id,
        fileName: 'demo_cbc_hba1c_report.pdf',
        originalName: 'Complete Blood Count (CBC) & Metabolic Panel.pdf',
        fileUrl: '/uploads/demo_cbc_hba1c_report.pdf',
        fileType: 'pdf',
        fileSize: 145020,
        category: 'laboratory_report',
        status: 'ANALYZED',
        humanVerified: true,
        overallConfidence: 96,
        extractedData: {
          doctorName: 'Dr. Ramesh Sharma',
          hospitalName: 'Apollo Diagnostics Laboratory',
          documentDate: new Date('2026-10-03'),
          diagnosis: ['Mild iron deficiency risk monitoring', 'Glycemic assessment'],
          medicines: [],
          labTests: [
            {
              testName: 'Hemoglobin',
              value: '10.8',
              numericValue: 10.8,
              unit: 'g/dL',
              referenceRange: '12–16 g/dL',
              status: 'low',
              confidence: 98,
            },
            {
              testName: 'HbA1c',
              value: '7.2',
              numericValue: 7.2,
              unit: '%',
              referenceRange: '< 5.7%',
              status: 'high',
              confidence: 96,
            },
            {
              testName: 'White blood cells (WBC)',
              value: '7,200',
              numericValue: 7200,
              unit: '/µL',
              referenceRange: '4,000–11,000 /µL',
              status: 'normal',
              confidence: 95,
            },
            {
              testName: 'Platelets',
              value: '250,000',
              numericValue: 250000,
              unit: '/µL',
              referenceRange: '150,000–450,000 /µL',
              status: 'normal',
              confidence: 97,
            },
            {
              testName: 'Serum Creatinine',
              value: '0.9',
              numericValue: 0.9,
              unit: 'mg/dL',
              referenceRange: '0.6–1.2 mg/dL',
              status: 'normal',
              confidence: 96,
            },
          ],
          summary: 'Blood count assessment performed on 3 October 2026. Hemoglobin 10.8 g/dL, HbA1c 7.2%, WBC 7,200 /µL, Platelets 250,000 /µL, Creatinine 0.9 mg/dL.',
        },
      });
    }

    // Seed previous historical report for multi-document RAG testing (Sections 5, 6, 11)
    const existingPrevDoc = await Document.findOne({ userId: user._id, originalName: 'Previous Routine Blood Test.pdf' });
    if (!existingPrevDoc) {
      await Document.create({
        userId: user._id,
        fileName: 'demo_prev_cbc_report.pdf',
        originalName: 'Previous Routine Blood Test.pdf',
        fileUrl: '/uploads/demo_prev_cbc_report.pdf',
        fileType: 'pdf',
        fileSize: 120400,
        category: 'laboratory_report',
        status: 'ANALYZED',
        humanVerified: true,
        overallConfidence: 95,
        extractedData: {
          doctorName: 'Dr. Ramesh Sharma',
          hospitalName: 'Apollo Diagnostics Laboratory',
          documentDate: new Date('2026-09-15'),
          diagnosis: ['Routine quarterly checkup'],
          medicines: [],
          labTests: [
            {
              testName: 'Hemoglobin',
              value: '11.2',
              numericValue: 11.2,
              unit: 'g/dL',
              referenceRange: '12–16 g/dL',
              status: 'low',
              confidence: 97,
            },
            {
              testName: 'White blood cells (WBC)',
              value: '6,800',
              numericValue: 6800,
              unit: '/µL',
              referenceRange: '4,000–11,000 /µL',
              status: 'normal',
              confidence: 96,
            },
            {
              testName: 'Platelets',
              value: '240,000',
              numericValue: 240000,
              unit: '/µL',
              referenceRange: '150,000–450,000 /µL',
              status: 'normal',
              confidence: 95,
            },
          ],
          summary: 'Routine blood test performed on 15 September 2026. Hemoglobin 11.2 g/dL, WBC 6,800 /µL, Platelets 240,000 /µL.',
        },
      });
    }

    // Seed prescription document for demo patient if none exists
    const existingPrescriptionDoc = await Document.findOne({ userId: user._id, originalName: 'Prescription — Apollo Clinic.pdf' });
    if (!existingPrescriptionDoc) {
      await Document.create({
        userId: user._id,
        fileName: 'demo_prescription_apollo.pdf',
        originalName: 'Prescription — Apollo Clinic.pdf',
        fileUrl: '/uploads/demo_prescription_apollo.pdf',
        fileType: 'pdf',
        fileSize: 95400,
        category: 'prescription',
        status: 'ANALYZED',
        humanVerified: true,
        overallConfidence: 98,
        extractedData: {
          doctorName: 'Dr. Ramesh Sharma',
          hospitalName: 'Apollo Clinic',
          documentDate: new Date('2026-10-01'),
          diagnosis: ['Type 2 Diabetes Mellitus', 'Essential Hypertension'],
          medicines: [
            {
              name: 'Metformin',
              dosage: '500mg',
              frequency: 'Twice daily',
              instructions: 'Take with or after meals (breakfast & dinner)',
              duration: '90 days',
              confidence: 99,
            },
            {
              name: 'Telmisartan',
              dosage: '40mg',
              frequency: 'Once daily',
              instructions: 'Take every morning before breakfast',
              duration: '90 days',
              confidence: 98,
            },
          ],
          labTests: [],
          summary: 'Prescription issued by Dr. Ramesh Sharma at Apollo Clinic on 1 October 2026. Prescribed Metformin 500mg (twice daily with meals) and Telmisartan 40mg (once daily morning) for Type 2 Diabetes and Hypertension management.',
        },
      });
    }

    // Seed consultation health record if none exists
    const existingConsultation = await HealthRecord.findOne({ userId: user._id, recordType: 'consultation' });
    if (!existingConsultation) {
      await HealthRecord.create({
        userId: user._id,
        title: 'Consultation & Prescription with Dr. Ramesh Sharma',
        recordType: 'consultation',
        date: new Date('2026-10-01'),
        doctorName: 'Dr. Ramesh Sharma',
        doctorSpecialty: 'Internal Medicine / Diabetologist',
        hospitalClinicName: 'Apollo Clinic',
        diagnosis: ['Type 2 Diabetes Mellitus', 'Essential Hypertension'],
        notes: 'Routine follow-up consultation. Prescribed Metformin 500mg twice daily and Telmisartan 40mg once daily. Advised quarterly HbA1c monitoring.',
      });
    }

    // Seed doctor record if none exists
    const existingDoctor = await Doctor.findOne({ userId: user._id });
    if (!existingDoctor) {
      await Doctor.create({
        userId: user._id,
        name: 'Dr. Ramesh Sharma',
        specialization: 'Internal Medicine / Diabetologist',
        hospitalClinic: 'Apollo Clinic',
        phone: '+91 98400 12345',
        lastConsultationDate: new Date('2026-10-01'),
      });
    }

    // Seed medications if none exist
    const existingMed = await Medication.findOne({ userId: user._id });
    if (!existingMed) {
      await Medication.create([
        {
          userId: user._id,
          name: 'Metformin',
          dosage: '500mg',
          form: 'tablet',
          frequency: 'Twice daily',
          instructions: 'Take with or after breakfast and dinner',
          prescribedBy: 'Dr. Ramesh Sharma',
          status: 'active',
        },
        {
          userId: user._id,
          name: 'Telmisartan',
          dosage: '40mg',
          form: 'tablet',
          frequency: 'Once daily',
          instructions: 'Take in the morning',
          prescribedBy: 'Dr. Ramesh Sharma',
          status: 'active',
        },
      ]);
    }

    // Seed lab metrics if none exist
    const existingMetric = await LabMetric.findOne({ userId: user._id });
    if (!existingMetric) {
      await LabMetric.create([
        {
          userId: user._id,
          metricName: 'HbA1c',
          value: 7.2,
          unit: '%',
          referenceMax: 5.7,
          status: 'high',
          date: new Date('2026-10-03'),
        },
        {
          userId: user._id,
          metricName: 'Serum Creatinine',
          value: 0.9,
          unit: 'mg/dL',
          referenceMin: 0.6,
          referenceMax: 1.2,
          status: 'normal',
          date: new Date('2026-10-03'),
        },
      ]);
    }

    const token = signToken(user._id, sessionId);

    res.status(200).json({
      status: 'success',
      token,
      user: sanitizeUser(user),
    });
  } catch (err) {
    next(err);
  }
};

// 7. Get Current Authenticated User Profile
export const getMe = async (req, res) => {
  res.status(200).json({
    status: 'success',
    user: sanitizeUser(req.user),
  });
};

// 8. Register as Doctor (Phases 3 & 4)
export const registerDoctor = async (req, res, next) => {
  try {
    const { 
      name, 
      email, 
      password, 
      phone, 
      specialization, 
      professionalDesignation, 
      clinicHospital, 
      registrationNumber, 
      language 
    } = req.body;

    if (!email || !password || !name) {
      return next(new AppError('Full name, email, and password are required.', 400));
    }
    if (password.length < 6) {
      return next(new AppError('Password must be at least 6 characters.', 400));
    }

    const cleanEmail = email.toLowerCase().trim();
    const existing = await User.findOne({ email: cleanEmail });
    if (existing) {
      return next(new AppError('An account with this email already exists.', 400));
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const sessionId = crypto.randomUUID();
    const doctor = new User({
      name: name.trim(),
      email: cleanEmail,
      phone: phone ? phone.trim() : undefined,
      passwordHash,
      role: 'doctor',
      specialization: specialization ? specialization.trim() : 'General Medicine',
      professionalDesignation: professionalDesignation ? professionalDesignation.trim() : 'Consultant Physician',
      clinicHospital: clinicHospital ? clinicHospital.trim() : '',
      registrationNumber: registrationNumber ? registrationNumber.trim() : '',
      verificationStatus: 'pending', // Clearly labeled: Verification Pending
      preferredLanguage: language || 'en',
      emailVerified: true,
      sessions: [{
        sessionId,
        device: 'Doctor Portal Client',
        userAgent: req.headers['user-agent'] || '',
        ipAddress: req.ip || '',
      }],
      auditLogs: [{
        action: 'DOCTOR_ACCOUNT_REGISTERED',
        ip: req.ip || '',
        userAgent: req.headers['user-agent'] || '',
      }],
    });

    await doctor.save();
    const token = signToken(doctor._id, sessionId);

    res.status(201).json({
      status: 'success',
      token,
      user: sanitizeUser(doctor),
    });
  } catch (err) {
    next(err);
  }
};

// 9. Doctor Login (Phase 5)
export const loginDoctor = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return next(new AppError('Email and password are required.', 400));
    }

    const cleanEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: cleanEmail }).select('+passwordHash');
    if (!user || !(await user.comparePassword(password))) {
      return next(new AppError('Invalid email or password.', 401));
    }

    if (user.role !== 'doctor') {
      return next(new AppError('This account is registered as a patient. Please sign in via the Patient Portal.', 403));
    }

    const sessionId = crypto.randomUUID();
    user.sessions.push({
      sessionId,
      device: 'Doctor Portal Client',
      userAgent: req.headers['user-agent'] || '',
      ipAddress: req.ip || '',
      lastActive: new Date(),
    });

    user.auditLogs.push({
      action: 'DOCTOR_LOGIN_SUCCESS',
      ip: req.ip || '',
      userAgent: req.headers['user-agent'] || '',
      details: { sessionId },
    });

    await user.save({ validateBeforeSave: false });
    const token = signToken(user._id, sessionId);

    res.status(200).json({
      status: 'success',
      token,
      user: sanitizeUser(user),
    });
  } catch (err) {
    next(err);
  }
};

// 10. Logout (Phase 2 - complete session invalidation)
export const logout = async (req, res, next) => {
  try {
    if (req.user && req.sessionId) {
      req.user.sessions = req.user.sessions.filter(s => s.sessionId !== req.sessionId);
      req.user.auditLogs.push({
        action: 'LOGOUT',
        details: { sessionId: req.sessionId },
      });
      await req.user.save({ validateBeforeSave: false });
    }

    res.status(200).json({
      status: 'success',
      message: 'Logged out successfully.',
    });
  } catch (err) {
    next(err);
  }
};
