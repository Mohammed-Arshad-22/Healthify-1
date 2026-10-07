import mongoose from 'mongoose';

const DocumentExtractionSchema = new mongoose.Schema({
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

  // Extracted Text
  raw_text: {
    type: String,
    default: '',
  },
  cleaned_text: {
    type: String,
    default: '',
  },

  // Quality & Confidence Tracking (0 - 100%)
  ocr_confidence: {
    type: Number,
    default: 0,
    min: 0,
    max: 100,
  },

  // Document Metrics
  page_count: {
    type: Number,
    default: 1,
    min: 1,
  },

  // Language Detection ('en', 'ta', 'en, ta', 'unknown')
  language_detected: {
    type: String,
    default: 'en',
    index: true,
  },

  // Processing Diagnostics
  processing_time: {
    type: Number,
    default: 0, // In milliseconds
  },

  // OCR Processing States
  ocr_status: {
    type: String,
    enum: ['PROCESSING', 'COMPLETED', 'LOW_CONFIDENCE', 'FAILED'],
    default: 'PROCESSING',
    index: true,
  },
  status: {
    type: String,
    default: 'PROCESSING',
  },

  // Failure Diagnostics (Never fabricate if failed)
  error_message: {
    type: String,
    default: '',
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
  collection: 'document_extractions',
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// Virtual 'id' getter
DocumentExtractionSchema.virtual('id').get(function() {
  return this._id ? this._id.toString() : '';
});

// Bidirectional synchronization hook
DocumentExtractionSchema.pre('validate', function(next) {
  if (this.document_id && !this.documentId) this.documentId = this.document_id;
  if (this.documentId && !this.document_id) this.document_id = this.documentId;

  if (this.user_id && !this.userId) this.userId = this.user_id;
  if (this.userId && !this.user_id) this.user_id = this.userId;

  if (this.ocr_status && !this.status) this.status = this.ocr_status;
  if (this.status && !this.ocr_status) this.ocr_status = this.status;

  this.updated_at = new Date();
  next();
});

export const DocumentExtraction = mongoose.model('DocumentExtraction', DocumentExtractionSchema);
export default DocumentExtraction;
