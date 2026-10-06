import mongoose from 'mongoose';

const AppointmentSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  doctorName: { type: String, required: true },
  specialty: { type: String, default: 'General Physician' },
  hospitalClinic: { type: String, default: '' },
  date: { type: Date, required: true },
  time: { type: String, required: true }, // e.g. "10:30 AM"
  reason: { type: String, default: 'Routine Consultation' },
  status: {
    type: String,
    enum: ['upcoming', 'completed', 'cancelled'],
    default: 'upcoming',
  },
  notes: { type: String, default: '' },
}, {
  timestamps: true,
});

export const Appointment = mongoose.model('Appointment', AppointmentSchema);
export default Appointment;
