import mongoose from 'mongoose';

const MedicationSchema = new mongoose.Schema({
  name: { type: String, default: null },
  dosage: { type: String, default: null },
  route: { type: String, default: null },
  frequency: { type: String, default: null },
  duration: { type: String, default: null },
  instructions: { type: String, default: null },
  confidence: { type: Number, default: 0, min: 0, max: 100 },
}, { _id: false });

const ObservationSchema = new mongoose.Schema({
  test_name: { type: String, default: null },
  value: { type: String, default: null },
  numeric_value: { type: Number, default: null },
  unit: { type: String, default: null },
  reference_range: { type: String, default: null },
  abnormal_flag: {
    type: String,
    enum: ['LOW', 'NORMAL', 'HIGH', 'UNKNOWN'],
    default: 'UNKNOWN',
  },
  confidence: { type: Number, default: 0, min: 0, max: 100 },
}, { _id: false });

const ValidatedDataSchema = new mongoose.Schema({
  patient_name: { type: String, default: null },
  patient_age: { type: String, default: null },
  patient_gender: { type: String, default: null },
  doctor_name: { type: String, default: null },
  hospital_name: { type: String, default: null },
  document_date: { type: String, default: null },
  diagnoses: [{ type: String }],
  medications: [MedicationSchema],
  laboratory_tests: [ObservationSchema],
  observations: [ObservationSchema],
  reference_ranges: [{ type: String }],
  units: [{ type: String }],
  abnormal_flags: [{ type: String }],
  clinical_notes: { type: String, default: null },
  overall_confidence: { type: Number, default: 0, min: 0, max: 100 },
}, { _id: false });

const AIExtractionSchema = new mongoose.Schema({
  // Associated Document Reference
  document_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Document',
    required: true,
    index: true,
  },
  documentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Document',
    index: true,
  },

  // Strict User Scoping
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true,
  },

  // LLM Response & Strict Validated Output
  raw_model_response: {
    type: String,
    default: '',
  },
  validated_data: {
    type: ValidatedDataSchema,
    default: () => ({}),
  },

  // Processing Diagnostics
  provider: {
    type: String,
    default: 'clinical_engine',
  },
  processing_status: {
    type: String,
    enum: ['PROCESSING', 'COMPLETED', 'FAILED'],
    default: 'PROCESSING',
    index: true,
  },
  status: {
    type: String,
    default: 'PROCESSING',
  },
  error_message: {
    type: String,
    default: '',
  },
  confidence_score: {
    type: Number,
    default: 0,
    min: 0,
    max: 100,
  },

  // Timestamps
  created_at: {
    type: Date,
    default: Date.now,
  },
  updated_at: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: true,
  collection: 'ai_extractions',
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// Virtual 'id' getter
AIExtractionSchema.virtual('id').get(function() {
  return this._id ? this._id.toString() : '';
});

// Sync hooks
AIExtractionSchema.pre('validate', function(next) {
  if (this.document_id && !this.documentId) this.documentId = this.document_id;
  if (this.documentId && !this.document_id) this.document_id = this.documentId;

  if (this.user_id && !this.userId) this.userId = this.user_id;
  if (this.userId && !this.user_id) this.user_id = this.userId;

  if (this.processing_status && !this.status) this.status = this.processing_status;
  if (this.status && !this.processing_status) this.processing_status = this.status;

  this.updated_at = new Date();
  next();
});

export const AIExtraction = mongoose.model('AIExtraction', AIExtractionSchema);
export default AIExtraction;
