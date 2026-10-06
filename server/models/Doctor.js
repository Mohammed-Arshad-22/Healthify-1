import mongoose from 'mongoose';

const DoctorSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  name: { type: String, required: true, trim: true },
  specialization: { type: String, required: true, trim: true },
  hospitalClinic: { type: String, trim: true, default: '' },
  phone: { type: String, trim: true, default: '' },
  email: { type: String, trim: true, default: '' },
  address: { type: String, default: '' },
  lastConsultationDate: { type: Date },
  nextAppointmentDate: { type: Date },
  notes: { type: String, default: '' },
}, {
  timestamps: true,
});

export const Doctor = mongoose.model('Doctor', DoctorSchema);
export default Doctor;
