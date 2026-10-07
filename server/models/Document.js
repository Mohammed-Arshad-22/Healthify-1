import mongoose from 'mongoose';
import crypto from 'crypto';

const DocumentSchema = new mongoose.Schema({
  // Unique UUID document ID (in addition to MongoDB _id)
  uuid: {
    type: String,
    default: () => crypto.randomUUID(),
    unique: true,
    index: true,
  },

  // User Scoping (supporting both user_id and userId)
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },

  // Secure filename generated on server (never trust client filename)
  filename: { type: String, required: true },
  fileName: { type: String, required: true },

  // Original client filename
  original_filename: { type: String, required: true },
  originalName: { type: String, required: true },

  // Validated MIME type
  mime_type: {
    type: String,
    enum: ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'],
    required: true,
  },
  fileType: { type: String, enum: ['pdf', 'jpg', 'jpeg', 'png'] },

  // File size in bytes
  file_size: { type: Number, default: 0 },
  fileSize: { type: Number, default: 0 },

  // Safe relative storage path (never expose raw host filesystem path)
  storage_path: { type: String, required: true },
  fileUrl: { type: String, required: true },

  // Document Type Classification
  document_type: {
    type: String,
    enum: [
      'PRESCRIPTION',
      'LAB_REPORT',
      'DIAGNOSTIC_REPORT',
      'DISCHARGE_SUMMARY',
      'OTHER',
      'UNKNOWN'
    ],
    default: 'OTHER',
    index: true,
  },
  category: {
    type: String,
    default: 'other',
    index: true,
  },

  // Document Processing States
  processing_status: {
    type: String,
    enum: ['UPLOADED', 'PROCESSING', 'COMPLETED', 'LOW_CONFIDENCE', 'FAILED', 'ANALYZED', 'VERIFIED'],
    default: 'UPLOADED',
    index: true,
  },
  status: {
    type: String,
    default: 'UPLOADED',
    index: true,
  },

  // Timestamps
  upload_date: { type: Date, default: Date.now },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },

  // Clinical Extraction Placeholders (preserved for subsequent phases)
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
    summary: { type: String, default: '' },
  },
  overallConfidence: { type: Number, default: 0 },
  ocr_confidence: { type: Number, default: 0 },
  isLowConfidence: { type: Boolean, default: false },
  humanVerified: { type: Boolean, default: false },
  verifiedAt: { type: Date },
  associatedRecordId: { type: mongoose.Schema.Types.ObjectId, ref: 'HealthRecord' },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// Virtual 'id' getter returns string representation
DocumentSchema.virtual('id').get(function() {
  return this._id ? this._id.toString() : this.uuid;
});

// Bidirectional synchronization hook to ensure 100% compatibility across snake_case and camelCase
DocumentSchema.pre('validate', function(next) {
  // Sync user
  if (this.userId && !this.user_id) this.user_id = this.userId;
  if (this.user_id && !this.userId) this.userId = this.user_id;

  // Sync filenames
  if (this.filename && !this.fileName) this.fileName = this.filename;
  if (this.fileName && !this.filename) this.filename = this.fileName;

  if (this.original_filename && !this.originalName) this.originalName = this.original_filename;
  if (this.originalName && !this.original_filename) this.original_filename = this.originalName;

  // Sync file size
  if (this.file_size !== undefined && this.fileSize === undefined) this.fileSize = this.file_size;
  if (this.fileSize !== undefined && this.file_size === undefined) this.file_size = this.fileSize;

  // Sync storage path / url
  if (this.storage_path && !this.fileUrl) this.fileUrl = `/uploads/${this.filename}`;
  if (this.fileUrl && !this.storage_path) this.storage_path = `uploads/${this.filename}`;

  // Sync document_type and category
  const typeMap = {
    PRESCRIPTION: 'prescription',
    LAB_REPORT: 'laboratory_report',
    DIAGNOSTIC_REPORT: 'diagnostic_report',
    DISCHARGE_SUMMARY: 'discharge_summary',
    OTHER: 'other',
    UNKNOWN: 'other',
  };
  const categoryMap = {
    prescription: 'PRESCRIPTION',
    laboratory_report: 'LAB_REPORT',
    diagnostic_report: 'DIAGNOSTIC_REPORT',
    discharge_summary: 'DISCHARGE_SUMMARY',
    medical_certificate: 'OTHER',
    imaging_report: 'DIAGNOSTIC_REPORT',
    vaccination_record: 'OTHER',
    other: 'OTHER',
  };

  if (this.document_type && !this.category) {
    this.category = typeMap[this.document_type] || 'other';
  } else if (this.category && (!this.document_type || this.document_type === 'OTHER')) {
    this.document_type = categoryMap[this.category] || 'OTHER';
  }

  // Sync processing_status and status
  const statusMap = {
    UPLOADED: 'UPLOADED',
    PROCESSING: 'PROCESSING',
    ANALYZED: 'COMPLETED',
    NEEDS_REVIEW: 'COMPLETED',
    VERIFIED: 'COMPLETED',
    FAILED: 'FAILED',
  };
  if (this.status && (!this.processing_status || this.processing_status === 'UPLOADED')) {
    this.processing_status = statusMap[this.status] || 'UPLOADED';
  } else if (this.processing_status && (!this.status || this.status === 'UPLOADED')) {
    this.status = this.processing_status === 'COMPLETED' ? 'ANALYZED' : this.processing_status;
  }

  // Extension & MIME type sync
  if (!this.mime_type) {
    const orig = (this.original_filename || this.originalName || this.filename || this.fileName || '').toLowerCase();
    if (orig.endsWith('.png')) this.mime_type = 'image/png';
    else if (orig.endsWith('.jpg') || orig.endsWith('.jpeg')) this.mime_type = 'image/jpeg';
    else this.mime_type = 'application/pdf';
  }

  if (this.mime_type && !this.fileType) {
    if (this.mime_type === 'application/pdf') this.fileType = 'pdf';
    else if (this.mime_type.includes('png')) this.fileType = 'png';
    else if (this.mime_type.includes('jpeg') || this.mime_type.includes('jpg')) this.fileType = 'jpeg';
  }

  this.updated_at = new Date();
  next();
});

export const Document = mongoose.model('Document', DocumentSchema);
export default Document;
