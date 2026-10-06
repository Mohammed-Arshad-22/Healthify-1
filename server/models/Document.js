import mongoose from 'mongoose';

const DocumentSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  fileName: { type: String, required: true },
  originalName: { type: String, required: true },
  fileUrl: { type: String, required: true },
  fileType: { type: String, enum: ['pdf', 'jpg', 'jpeg', 'png'], required: true },
  fileSize: { type: Number, default: 0 },
  category: {
    type: String,
    enum: [
      'prescription',
      'laboratory_report',
      'diagnostic_report',
      'discharge_summary',
      'medical_certificate',
      'imaging_report',
      'vaccination_record',
      'other'
    ],
    default: 'other',
  },
  status: {
    type: String,
    enum: ['UPLOADED', 'PROCESSING', 'ANALYZED', 'NEEDS_REVIEW', 'VERIFIED', 'ARCHIVED'],
    default: 'UPLOADED',
    index: true,
  },
  ocrRawText: { type: String, default: '' },
  extractedData: {
    doctorName: { type: String, default: '' },
    hospitalName: { type: String, default: '' },
    documentDate: { type: Date },
    diagnosis: [{ type: String }],
    medicines: [{
      name: { type: String },
      dosage: { type: String },
      frequency: { type: String },
      duration: { type: String },
      confidence: { type: Number, default: 0 },
    }],
    labTests: [{
      testName: { type: String },
      value: { type: String },
      numericValue: { type: Number },
      unit: { type: String },
      referenceRange: { type: String },
      status: { type: String, enum: ['normal', 'high', 'low', 'unknown'], default: 'unknown' },
      confidence: { type: Number, default: 0 },
    }],
  },
  overallConfidence: { type: Number, default: 0 },
  humanVerified: { type: Boolean, default: false },
  verifiedAt: { type: Date },
  associatedRecordId: { type: mongoose.Schema.Types.ObjectId, ref: 'HealthRecord' },
}, {
  timestamps: true,
});

export const Document = mongoose.model('Document', DocumentSchema);
export default Document;
