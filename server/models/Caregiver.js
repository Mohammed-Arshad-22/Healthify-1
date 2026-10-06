import mongoose from 'mongoose';

const CaregiverSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  name: { type: String, required: true, trim: true },
  relationship: { type: String, required: true, trim: true },
  phone: { type: String, required: true, trim: true },
  email: { type: String, trim: true, default: '' },
  permissionLevel: {
    type: String,
    enum: ['emergency_only', 'medications_only', 'view_reports', 'full_view'],
    default: 'medications_only',
  },
  status: {
    type: String,
    enum: ['active', 'pending', 'revoked'],
    default: 'active',
  },
  consentGrantedAt: { type: Date, default: Date.now },
  expiresAt: { type: Date },
  lastAccessedAt: { type: Date },
  notes: { type: String, default: '' },
}, {
  timestamps: true,
});

export const Caregiver = mongoose.model('Caregiver', CaregiverSchema);
export default Caregiver;
