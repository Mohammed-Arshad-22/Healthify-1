import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const EmergencyContactSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  relationship: { type: String, required: true, trim: true },
  phone: { type: String, required: true, trim: true },
  isPrimary: { type: Boolean, default: false },
}, { _id: true });

const SessionSchema = new mongoose.Schema({
  sessionId: { type: String, required: true },
  device: { type: String, default: 'Web Browser' },
  userAgent: { type: String, default: '' },
  ipAddress: { type: String, default: '' },
  lastActive: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now },
}, { _id: true });

const AuditLogSchema = new mongoose.Schema({
  action: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
  ip: { type: String, default: '' },
  userAgent: { type: String, default: '' },
  details: { type: mongoose.Schema.Types.Mixed, default: {} },
}, { _id: true });

const UserSchema = new mongoose.Schema({
  // 1. Personal & Contact
  name: { type: String, trim: true, default: '' },
  phone: { type: String, trim: true, sparse: true, index: true },
  email: { type: String, trim: true, lowercase: true, sparse: true, index: true },
  passwordHash: { type: String, select: false },
  avatarUrl: { type: String, default: '' },
  dateOfBirth: { type: Date },
  age: { type: Number },
  gender: { type: String, enum: ['male', 'female', 'other', 'prefer_not_to_say', ''], default: '' },

  // 2. Authentication States
  phoneVerified: { type: Boolean, default: false },
  emailVerified: { type: Boolean, default: false },
  otpCode: { type: String, select: false },
  otpExpiresAt: { type: Date, select: false },
  role: { type: String, enum: ['patient', 'caregiver', 'doctor', 'admin'], default: 'patient' },

  // 2.1 Doctor Professional Profile (Phases 3-6)
  specialization: { type: String, trim: true, default: '' },
  professionalDesignation: { type: String, trim: true, default: '' },
  clinicHospital: { type: String, trim: true, default: '' },
  registrationNumber: { type: String, trim: true, default: '' },
  verificationStatus: { type: String, enum: ['verified', 'pending', 'rejected'], default: 'pending' },

  // 3. Health Profile
  bloodGroup: { 
    type: String, 
    enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'Unknown', ''], 
    default: '' 
  },
  heightCm: { type: Number },
  weightKg: { type: Number },
  allergies: [{ type: String, trim: true }],
  chronicConditions: [{ type: String, trim: true }],
  previousSurgeries: [{ type: String, trim: true }],
  familyHistory: [{ type: String, trim: true }],
  importantNotes: { type: String, default: '' },

  // 4. Emergency Profile (High Priority for SOS / QR)
  emergencyContacts: [EmergencyContactSchema],
  criticalAllergies: [{ type: String, trim: true }],
  criticalConditions: [{ type: String, trim: true }],
  importantMedicines: [{ type: String, trim: true }],
  primaryDoctorName: { type: String, trim: true, default: '' },
  primaryDoctorPhone: { type: String, trim: true, default: '' },
  lastCheckupDate: { type: Date },

  // 5. ABDM / ABHA Connection Status
  abhaConnected: { type: Boolean, default: false },
  abhaNumber: { type: String, default: '' },
  abhaAddress: { type: String, default: '' },
  abhaDemoMode: { type: Boolean, default: true },

  // 6. Preferences & Accessibility
  preferredLanguage: { type: String, enum: ['en', 'ta', 'hi', 'te'], default: 'en' },
  highContrast: { type: Boolean, default: false },
  largeText: { type: Boolean, default: false },
  simpleMode: { type: Boolean, default: false },
  voiceAssistance: { type: Boolean, default: false },
  notificationPreferences: {
    medicineReminders: { type: Boolean, default: true },
    appointmentReminders: { type: Boolean, default: true },
    reportStatus: { type: Boolean, default: true },
    emailAlerts: { type: Boolean, default: true },
  },

  // 7. Security & Sessions
  sessions: [SessionSchema],
  auditLogs: [AuditLogSchema],
}, {
  timestamps: true,
});

// Password comparison method
UserSchema.methods.comparePassword = async function (enteredPassword) {
  if (!this.passwordHash) return false;
  return bcrypt.compare(enteredPassword, this.passwordHash);
};

export const User = mongoose.model('User', UserSchema);
export default User;
