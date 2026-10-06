import mongoose from 'mongoose';

const AdherenceLogSchema = new mongoose.Schema({
  date: { type: Date, required: true },
  timeSlot: { type: String, required: true }, // e.g. "08:00 AM" or "Morning"
  status: { type: String, enum: ['taken', 'missed', 'skipped'], default: 'taken' },
  loggedAt: { type: Date, default: Date.now },
}, { _id: true });

const MedicationScheduleSchema = new mongoose.Schema({
  time: { type: String, required: true }, // "08:00"
  label: { type: String, default: 'Morning' }, // "Morning (After food)"
}, { _id: false });

const MedicationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  name: { type: String, required: true, trim: true },
  dosage: { type: String, required: true, trim: true }, // e.g. "500 mg"
  form: { 
    type: String, 
    enum: ['tablet', 'capsule', 'syrup', 'injection', 'inhaler', 'drops', 'ointment', 'other'], 
    default: 'tablet' 
  },
  frequency: { type: String, default: 'Once daily' }, // "Once daily", "Twice daily", "Thrice daily", "As needed"
  schedule: [MedicationScheduleSchema],
  instructions: { type: String, default: 'Take after meal with water' },
  prescribedBy: { type: String, default: '' },
  startDate: { type: Date, default: Date.now },
  endDate: { type: Date },
  status: { 
    type: String, 
    enum: ['active', 'completed', 'paused'], 
    default: 'active',
    index: true 
  },
  remainingDays: { type: Number },
  refillReminderDate: { type: Date },
  documentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Document' },
  adherenceLogs: [AdherenceLogSchema],
}, {
  timestamps: true,
});

export const Medication = mongoose.model('Medication', MedicationSchema);
export default Medication;
