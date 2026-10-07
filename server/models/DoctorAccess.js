import mongoose from 'mongoose';

const DoctorAccessSchema = new mongoose.Schema({
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  permissions: {
    profile: { type: Boolean, default: true },
    reports: { type: Boolean, default: true },
    medicines: { type: Boolean, default: true },
    timeline: { type: Boolean, default: true },
  },
  status: {
    type: String,
    enum: ['active', 'pending', 'revoked'],
    default: 'active',
    index: true,
  },
  notes: { type: String, default: '' },
  expiresAt: { type: Date },
  revokedAt: { type: Date },
}, {
  timestamps: true,
});

DoctorAccessSchema.index({ patientId: 1, doctorId: 1 }, { unique: true });

export const DoctorAccess = mongoose.model('DoctorAccess', DoctorAccessSchema);
export default DoctorAccess;
