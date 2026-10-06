import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import User from '../models/User.js';
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

// 8. Logout
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
