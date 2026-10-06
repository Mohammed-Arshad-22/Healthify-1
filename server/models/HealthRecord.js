import mongoose from 'mongoose';

const HealthRecordSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  title: { type: String, required: true, trim: true },
  recordType: {
    type: String,
    enum: [
      'prescription',
      'lab_report',
      'diagnosis',
      'consultation',
      'hospitalization',
      'procedure',
      'vaccination',
      'imaging',
      'vital_sign'
    ],
    required: true,
    index: true,
  },
  date: { type: Date, required: true, index: true },
  doctorName: { type: String, trim: true, default: '' },
  doctorSpecialty: { type: String, trim: true, default: '' },
  hospitalClinicName: { type: String, trim: true, default: '' },
  notes: { type: String, default: '' },
  diagnosis: [{ type: String }],
  tags: [{ type: String }],
  
  // FHIR interoperability representation
  fhirResource: {
    resourceType: { type: String, default: 'Observation' },
    code: { type: String, default: '' },
    fhirData: { type: mongoose.Schema.Types.Mixed, default: {} },
  },

  source: {
    type: String,
    enum: ['USER_UPLOAD', 'MANUAL_ENTRY', 'ABHA_ABDM', 'DOCTOR_SHARED'],
    default: 'MANUAL_ENTRY',
  },

  documentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Document' },
  status: { type: String, enum: ['active', 'completed', 'archived'], default: 'active' },
}, {
  timestamps: true,
});

HealthRecordSchema.index({ userId: 1, date: -1 });

export const HealthRecord = mongoose.model('HealthRecord', HealthRecordSchema);
export default HealthRecord;
