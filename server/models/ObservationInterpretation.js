import mongoose from 'mongoose';

const ObservationInterpretationSchema = new mongoose.Schema({
  // Unique Observation identifier
  observation_id: {
    type: String,
    required: true,
    index: true,
  },
  observationId: {
    type: String,
    index: true,
  },

  // Document context (optional if standalone evaluation)
  document_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Document',
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

  // Observation Details
  test_name: {
    type: String,
    required: true,
    trim: true,
    index: true,
  },
  value: {
    type: String,
    default: null,
  },
  numeric_value: {
    type: Number,
    default: null,
  },
  unit: {
    type: String,
    default: null,
  },
  reference_range: {
    type: String,
    default: null,
  },
  reference_min: {
    type: Number,
    default: null,
  },
  reference_max: {
    type: Number,
    default: null,
  },

  // Safe Laboratory-Result Interpretation
  status: {
    type: String,
    enum: ['LOW', 'NORMAL', 'HIGH', 'UNKNOWN'],
    required: true,
    default: 'UNKNOWN',
    index: true,
  },
  explanation: {
    type: String,
    required: true,
    trim: true,
  },
  severity: {
    type: String,
    enum: ['NORMAL', 'INFORMATIONAL', 'REVIEW_RECOMMENDED', 'URGENT_REVIEW'],
    required: true,
    default: 'NORMAL',
    index: true,
  },
  confidence: {
    type: Number,
    default: 0,
    min: 0,
    max: 100,
  },
  source: {
    type: String,
    required: true,
    default: 'DOCUMENT_REPORT',
  },

  // Timestamps
  created_at: {
    type: Date,
    default: Date.now,
    index: true,
  },
  updated_at: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: true,
  collection: 'observation_interpretations',
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// Dual field sync hook
ObservationInterpretationSchema.pre('validate', function(next) {
  if (this.observation_id && !this.observationId) this.observationId = this.observation_id;
  if (this.observationId && !this.observation_id) this.observation_id = this.observationId;

  if (this.user_id && !this.userId) this.userId = this.user_id;
  if (this.userId && !this.user_id) this.user_id = this.userId;

  if (this.document_id && !this.documentId) this.documentId = this.document_id;
  if (this.documentId && !this.document_id) this.document_id = this.documentId;

  this.updated_at = new Date();
  next();
});

export const ObservationInterpretation = mongoose.model('ObservationInterpretation', ObservationInterpretationSchema);
export default ObservationInterpretation;
