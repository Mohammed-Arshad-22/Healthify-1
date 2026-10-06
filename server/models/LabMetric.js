import mongoose from 'mongoose';

const LabMetricSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  metricName: { 
    type: String, 
    required: true, 
    enum: [
      'Blood Pressure - Systolic',
      'Blood Pressure - Diastolic',
      'HbA1c',
      'Fasting Blood Glucose',
      'Post Prandial Glucose',
      'Total Cholesterol',
      'LDL Cholesterol',
      'HDL Cholesterol',
      'Triglycerides',
      'Serum Creatinine',
      'TSH',
      'Heart Rate',
      'Weight'
    ],
    index: true 
  },
  value: { type: Number, required: true },
  unit: { type: String, required: true },
  referenceMin: { type: Number },
  referenceMax: { type: Number },
  status: { type: String, enum: ['normal', 'high', 'low'], default: 'normal' },
  date: { type: Date, required: true, index: true },
  sourceRecordId: { type: mongoose.Schema.Types.ObjectId, ref: 'HealthRecord' },
  notes: { type: String, default: '' },
}, {
  timestamps: true,
});

LabMetricSchema.index({ userId: 1, metricName: 1, date: 1 });

export const LabMetric = mongoose.model('LabMetric', LabMetricSchema);
export default LabMetric;
