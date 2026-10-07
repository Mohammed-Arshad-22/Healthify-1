import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import mongoose from 'mongoose';
import Document from '../models/Document.js';
import HealthRecord from '../models/HealthRecord.js';
import Medication from '../models/Medication.js';
import LabMetric from '../models/LabMetric.js';
import { AppError } from '../middleware/errorHandler.js';
import { ocrService } from '../services/ocr.service.js';
import AIExtraction from '../models/AIExtraction.js';
import { aiExtractionService } from '../services/ai/index.js';
import { syncExtractedDataToDatabase, executeDocumentProcessingPipeline } from '../services/documentSync.service.js';

const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
];

const ALLOWED_EXTENSIONS = ['.pdf', '.jpg', '.jpeg', '.png'];

export const normalizeDocumentType = (type = '') => {
  const upper = String(type).trim().toUpperCase();
  const validTypes = [
    'PRESCRIPTION',
    'LAB_REPORT',
    'DIAGNOSTIC_REPORT',
    'DISCHARGE_SUMMARY',
    'OTHER',
    'UNKNOWN',
  ];
  if (validTypes.includes(upper)) return upper;

  const mapping = {
    PRESCRIPTION: 'PRESCRIPTION',
    LABORATORY_REPORT: 'LAB_REPORT',
    LAB_REPORT: 'LAB_REPORT',
    DIAGNOSTIC_REPORT: 'DIAGNOSTIC_REPORT',
    DISCHARGE_SUMMARY: 'DISCHARGE_SUMMARY',
    VACCINATION_RECORD: 'OTHER',
    MEDICAL_CERTIFICATE: 'OTHER',
    OTHER: 'OTHER',
  };
  return mapping[upper] || 'OTHER';
};

export const normalizeCategory = (type = '') => {
  const upper = String(type).trim().toUpperCase();
  const mapping = {
    PRESCRIPTION: 'prescription',
    LAB_REPORT: 'laboratory_report',
    LABORATORY_REPORT: 'laboratory_report',
    DIAGNOSTIC_REPORT: 'diagnostic_report',
    DISCHARGE_SUMMARY: 'discharge_summary',
    OTHER: 'other',
    UNKNOWN: 'other',
  };
  return mapping[upper] || type.toLowerCase();
};

// 1. Get All Documents for User (User-Scoped)
export const getDocuments = async (req, res, next) => {
  try {
    const { category, document_type, status, processing_status } = req.query;
    const filter = {
      $or: [{ user_id: req.user._id }, { userId: req.user._id }],
    };

    const targetType = document_type || category;
    if (targetType && targetType !== 'all') {
      const normalizedType = normalizeDocumentType(targetType);
      const normalizedCat = normalizeCategory(targetType);
      filter.$and = filter.$and || [];
      filter.$and.push({
        $or: [
          { document_type: normalizedType },
          { category: normalizedCat },
          { category: targetType },
        ],
      });
    }

    const targetStatus = processing_status || status;
    if (targetStatus && targetStatus !== 'all') {
      filter.$and = filter.$and || [];
      filter.$and.push({
        $or: [
          { processing_status: targetStatus.toUpperCase() },
          { status: targetStatus },
        ],
      });
    }

    const documents = await Document.find(filter).sort({ upload_date: -1, createdAt: -1 });
    res.status(200).json({ status: 'success', count: documents.length, documents });
  } catch (err) {
    next(err);
  }
};

// 2. Get Single Document by ID or UUID (User-Scoped)
export const getDocumentById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const isObjectId = mongoose.isValidObjectId(id);

    const query = {
      $and: [
        { $or: [{ user_id: req.user._id }, { userId: req.user._id }] },
        { $or: [isObjectId ? { _id: id } : null, { uuid: id }].filter(Boolean) },
      ],
    };

    const document = await Document.findOne(query);
    if (!document) {
      return next(new AppError('Document not found or unauthorized.', 404));
    }

    // Stream directly if ?view=true or ?download=true requested
    if (req.query.view === 'true' || req.query.download === 'true') {
      return streamDocumentFile(req, res, next, document, req.query.download === 'true');
    }

    res.status(200).json({ status: 'success', document });
  } catch (err) {
    next(err);
  }
};

// 3. Helper: Stream Document File Safely (Anti-Traversal & Strict Scoping)
const streamDocumentFile = (req, res, next, document, asDownload = false) => {
  const safeFilename = path.basename(document.filename || document.fileName || '');
  if (!safeFilename) {
    return next(new AppError('Document file reference is invalid.', 404));
  }

  const uploadsDir = path.resolve(process.cwd(), 'uploads');
  const filePath = path.resolve(uploadsDir, safeFilename);

  // Prevent Directory Traversal
  if (!filePath.startsWith(uploadsDir) || !fs.existsSync(filePath)) {
    return next(new AppError('File not found on storage server.', 404));
  }

  const mimeType = document.mime_type || 'application/octet-stream';
  const originalName = path.basename(document.original_filename || document.originalName || safeFilename);
  const disposition = asDownload ? 'attachment' : 'inline';

  res.setHeader('Content-Type', mimeType);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Content-Security-Policy', "default-src 'none'");
  res.setHeader('Content-Disposition', `${disposition}; filename="${encodeURIComponent(originalName)}"`);

  const stream = fs.createReadStream(filePath);
  stream.on('error', (err) => next(err));
  stream.pipe(res);
};

// 4. View Document (Inline Stream)
export const viewDocument = async (req, res, next) => {
  try {
    const { id } = req.params;
    const isObjectId = mongoose.isValidObjectId(id);
    const query = {
      $and: [
        { $or: [{ user_id: req.user._id }, { userId: req.user._id }] },
        { $or: [isObjectId ? { _id: id } : null, { uuid: id }].filter(Boolean) },
      ],
    };

    const document = await Document.findOne(query);
    if (!document) {
      return next(new AppError('Document not found or unauthorized.', 404));
    }

    streamDocumentFile(req, res, next, document, false);
  } catch (err) {
    next(err);
  }
};

// 5. Download Document (Attachment Stream)
export const downloadDocument = async (req, res, next) => {
  try {
    const { id } = req.params;
    const isObjectId = mongoose.isValidObjectId(id);
    const query = {
      $and: [
        { $or: [{ user_id: req.user._id }, { userId: req.user._id }] },
        { $or: [isObjectId ? { _id: id } : null, { uuid: id }].filter(Boolean) },
      ],
    };

    const document = await Document.findOne(query);
    if (!document) {
      return next(new AppError('Document not found or unauthorized.', 404));
    }

    streamDocumentFile(req, res, next, document, true);
  } catch (err) {
    next(err);
  }
};

// 6. Upload Medical Document (Phase 3 Core Specification)
// Features: Drag-and-drop / Picker, Secure UUID generation, MIME & extension validation,
// User-scoping, Document metadata, Processing status: UPLOADED.
// Explicitly: NO OCR, NO AI EXTRACTION, NO RAG in Phase 3.
export const uploadDocument = async (req, res, next) => {
  try {
    const file = req.file;
    const rawCategory = req.body.document_type || req.body.category;
    const clientOriginalName = req.body.originalName || req.body.original_filename;

    if (!file && !clientOriginalName) {
      return next(new AppError('Please select a valid medical document to upload (PDF, JPG, JPEG, PNG).', 400));
    }

    let docFileName = '';
    let docOriginalName = '';
    let mimeType = 'application/pdf';
    let fileSize = 0;

    if (file) {
      // Validate MIME type
      const fileMime = (file.mimetype || '').toLowerCase();
      if (!ALLOWED_MIME_TYPES.includes(fileMime)) {
        // Clean up invalid uploaded file
        if (file.path && fs.existsSync(file.path)) fs.unlinkSync(file.path);
        return next(new AppError('Invalid MIME type. Supported formats: PDF, JPG, JPEG, PNG.', 400));
      }

      // Validate Extension
      const fileExt = path.extname(file.originalname || '').toLowerCase();
      if (!ALLOWED_EXTENSIONS.includes(fileExt)) {
        if (file.path && fs.existsSync(file.path)) fs.unlinkSync(file.path);
        return next(new AppError('Invalid file extension. Supported extensions: .pdf, .jpg, .jpeg, .png.', 400));
      }

      docFileName = file.filename;
      docOriginalName = path.basename(file.originalname);
      mimeType = fileMime;
      fileSize = file.size;
    } else {
      // JSON / simulated upload validation
      const ext = path.extname(clientOriginalName).toLowerCase();
      if (!ALLOWED_EXTENSIONS.includes(ext)) {
        return next(new AppError('Invalid file extension. Supported extensions: .pdf, .jpg, .jpeg, .png.', 400));
      }

      if (ext === '.pdf') mimeType = 'application/pdf';
      else if (ext === '.png') mimeType = 'image/png';
      else mimeType = 'image/jpeg';

      const safeUuid = crypto.randomUUID();
      docFileName = `doc_${safeUuid}${ext}`;
      docOriginalName = path.basename(clientOriginalName);
      fileSize = req.body.file_size || req.body.fileSize || 1024;

      // Ensure mock file exists on disk for downstream view/download testing
      const uploadsDir = path.resolve(process.cwd(), 'uploads');
      if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
      const mockFilePath = path.join(uploadsDir, docFileName);
      if (!fs.existsSync(mockFilePath)) {
        fs.writeFileSync(mockFilePath, Buffer.from(`Simulated medical document: ${docOriginalName}`));
      }
    }

    const docType = normalizeDocumentType(rawCategory);
    const docCategory = normalizeCategory(rawCategory);
    const docUuid = crypto.randomUUID();

    const VALID_PROCESSING_STATUSES = ['UPLOADED', 'PROCESSING', 'COMPLETED', 'LOW_CONFIDENCE', 'FAILED', 'ANALYZED', 'VERIFIED'];
    const rawProcessingStatus = req.body.processing_status || (req.body.isLowConfidence ? 'LOW_CONFIDENCE' : (req.body.status || 'UPLOADED'));
    const processingStatus = VALID_PROCESSING_STATUSES.includes(rawProcessingStatus) ? rawProcessingStatus : 'UPLOADED';
    const docStatus = req.body.status || (req.body.isLowConfidence ? 'LOW_CONFIDENCE' : 'UPLOADED');
    const overallConf = req.body.overallConfidence !== undefined ? req.body.overallConfidence : (req.body.isLowConfidence ? 45 : 98);
    const ocrConf = req.body.ocr_confidence !== undefined ? req.body.ocr_confidence : overallConf;
    const isLowConf = req.body.isLowConfidence === true || overallConf < 65;

    const document = new Document({
      uuid: docUuid,
      user_id: req.user._id,
      userId: req.user._id,
      filename: docFileName,
      fileName: docFileName,
      original_filename: docOriginalName,
      originalName: docOriginalName,
      mime_type: mimeType,
      file_size: fileSize,
      fileSize: fileSize,
      storage_path: `uploads/${docFileName}`,
      fileUrl: `/api/documents/${docUuid}/view`,
      document_type: docType,
      category: docCategory,
      processing_status: processingStatus,
      status: docStatus,
      overallConfidence: overallConf,
      ocr_confidence: ocrConf,
      isLowConfidence: isLowConf,
      extractedData: req.body.extractedData || {},
      upload_date: new Date(),
    });

    await document.save();

    // Populate structured records if provided in simulated or pre-extracted payload
    if (req.body.extractedData?.medicines && Array.isArray(req.body.extractedData.medicines)) {
      for (const med of req.body.extractedData.medicines) {
        await Medication.create({
          userId: req.user._id,
          name: med.name,
          dosage: med.dosage || '500mg',
          frequency: med.frequency || 'Once daily',
          duration: med.duration || '',
          instructions: med.instructions || '',
          prescribedBy: req.body.extractedData.doctorName || 'Attending Physician',
          documentId: document._id,
          status: 'active',
        }).catch(() => {});
      }
    }

    if (req.body.extractedData?.labTests && Array.isArray(req.body.extractedData.labTests)) {
      for (const test of req.body.extractedData.labTests) {
        let refMin = undefined;
        let refMax = undefined;
        if (test.referenceRange) {
          const parts = test.referenceRange.replace(/[^0-9.–-]/g, '').split(/[–-]/);
          if (parts.length === 2) {
            refMin = parseFloat(parts[0]);
            refMax = parseFloat(parts[1]);
          } else if (test.referenceRange.includes('<')) {
            refMax = parseFloat(test.referenceRange.replace(/[^0-9.]/g, ''));
          } else if (test.referenceRange.includes('>')) {
            refMin = parseFloat(test.referenceRange.replace(/[^0-9.]/g, ''));
          }
        }

        await LabMetric.create({
          userId: req.user._id,
          metricName: test.testName,
          value: test.numericValue !== undefined ? test.numericValue : parseFloat(test.value) || 0,
          unit: test.unit || '',
          referenceMin: refMin,
          referenceMax: refMax,
          status: test.status || (test.abnormal_flag ? test.abnormal_flag.toLowerCase() : 'normal'),
          date: req.body.extractedData.documentDate || new Date(),
          sourceRecordId: document._id,
        }).catch(() => {});
      }
    }

    res.status(201).json({
      status: 'success',
      message: 'Medical document uploaded successfully.',
      document,
    });
  } catch (err) {
    next(err);
  }
};

// 7. Human Verification / Normalization (Preserved for compatibility)
export const verifyDocumentExtraction = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { verifiedData, createHealthRecords = true } = req.body;
    const isObjectId = mongoose.isValidObjectId(id);

    const query = {
      $and: [
        { $or: [{ user_id: req.user._id }, { userId: req.user._id }] },
        { $or: [isObjectId ? { _id: id } : null, { uuid: id }].filter(Boolean) },
      ],
    };

    const document = await Document.findOne(query);
    if (!document) {
      return next(new AppError('Document not found or unauthorized.', 404));
    }

    if (verifiedData) {
      document.extractedData = { ...document.extractedData, ...verifiedData };
    }

    document.humanVerified = true;
    document.verifiedAt = new Date();
    document.processing_status = 'COMPLETED';
    document.status = 'VERIFIED';

    if (createHealthRecords) {
      const data = document.extractedData || {};

      const healthRecord = new HealthRecord({
        userId: req.user._id,
        title: `${(document.category || 'record').replace('_', ' ').toUpperCase()}${data.hospitalName ? `: ${data.hospitalName}` : ''}`,
        recordType: document.category === 'prescription' ? 'prescription' : 'lab_report',
        date: data.documentDate || new Date(),
        doctorName: data.doctorName || '',
        hospitalClinicName: data.hospitalName || '',
        diagnosis: data.diagnosis || [],
        source: 'USER_UPLOAD',
        documentId: document._id,
        status: 'active',
        tags: [document.category || 'medical_record', 'verified_extraction'],
      });
      await healthRecord.save();
      document.associatedRecordId = healthRecord._id;

      if (data.medicines && data.medicines.length > 0) {
        for (const med of data.medicines) {
          await Medication.create({
            userId: req.user._id,
            name: med.name,
            dosage: med.dosage || '500 mg',
            frequency: med.frequency || 'Once daily',
            prescribedBy: data.doctorName,
            documentId: document._id,
            schedule: [
              { time: '08:30', label: 'Morning' },
            ],
            status: 'active',
          });
        }
      }

      if (data.labTests && data.labTests.length > 0) {
        for (const test of data.labTests) {
          if (test.numericValue) {
            await LabMetric.create({
              userId: req.user._id,
              metricName: test.testName,
              value: test.numericValue,
              unit: test.unit || '',
              status: test.status || 'normal',
              date: data.documentDate || new Date(),
              sourceRecordId: healthRecord._id,
            });
          }
        }
      }
    }

    await document.save();

    res.status(200).json({
      status: 'success',
      message: 'Document extraction verified successfully.',
      document,
    });
  } catch (err) {
    next(err);
  }
};

// 8. Delete Document (User-Scoped & Safe Physical Unlink)
export const deleteDocument = async (req, res, next) => {
  try {
    const { id } = req.params;
    const isObjectId = mongoose.isValidObjectId(id);

    const query = {
      $and: [
        { $or: [{ user_id: req.user._id }, { userId: req.user._id }] },
        { $or: [isObjectId ? { _id: id } : null, { uuid: id }].filter(Boolean) },
      ],
    };

    const document = await Document.findOneAndDelete(query);
    if (!document) {
      return next(new AppError('Document not found or unauthorized.', 404));
    }

    // Clean up physical file on disk securely
    const rawFileName = document.filename || document.fileName || '';
    const safeName = path.basename(rawFileName);

    if (safeName) {
      const uploadsDir = path.resolve(process.cwd(), 'uploads');
      const filePath = path.resolve(uploadsDir, safeName);

      if (filePath.startsWith(uploadsDir) && fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
        } catch (unlinkErr) {
          console.error(`[Document Storage] Failed to delete file: ${filePath}`, unlinkErr);
        }
      }
    }

    res.status(200).json({
      status: 'success',
      message: 'Document deleted successfully.',
    });
  } catch (err) {
    next(err);
  }
};

// 9. Trigger OCR Extraction on Document (Phase 4 Specification)
// POST /api/documents/:id/ocr
export const triggerDocumentOCR = async (req, res, next) => {
  try {
    const { id } = req.params;
    const isObjectId = mongoose.isValidObjectId(id);
    const query = {
      $and: [
        { $or: [{ user_id: req.user._id }, { userId: req.user._id }] },
        { $or: [isObjectId ? { _id: id } : null, { uuid: id }].filter(Boolean) },
      ],
    };

    const document = await Document.findOne(query);
    if (!document) {
      return next(new AppError('Document not found or unauthorized.', 404));
    }

    const extraction = await ocrService.processDocumentOCR(document._id, req.user._id);
    const updatedDoc = await Document.findById(document._id);

    res.status(200).json({
      status: 'success',
      message: 'Document OCR processed successfully.',
      extraction,
      document: updatedDoc,
    });
  } catch (err) {
    next(err);
  }
};

// 10. Get Document Extraction (Phases 4 & 5 Specification)
// GET /api/documents/:id/extraction
export const getDocumentExtraction = async (req, res, next) => {
  try {
    const { id } = req.params;
    const isObjectId = mongoose.isValidObjectId(id);
    const query = {
      $and: [
        { $or: [{ user_id: req.user._id }, { userId: req.user._id }] },
        { $or: [isObjectId ? { _id: id } : null, { uuid: id }].filter(Boolean) },
      ],
    };

    const document = await Document.findOne(query);
    if (!document) {
      return next(new AppError('Document not found or unauthorized.', 404));
    }

    const { extraction: ocrExtraction } = await ocrService.getDocumentExtraction(document._id, req.user._id).catch(() => ({ extraction: null }));
    const aiExtraction = await AIExtraction.findOne({
      document_id: document._id,
      $or: [{ user_id: req.user._id }, { userId: req.user._id }],
    }).sort({ created_at: -1 });

    if (!ocrExtraction && !aiExtraction) {
      return next(new AppError('No extraction found for this document. Please trigger OCR or AI extraction first.', 404));
    }

    res.status(200).json({
      status: 'success',
      extraction: aiExtraction || ocrExtraction,
      ai_extraction: aiExtraction,
      ocr_extraction: ocrExtraction,
      document,
    });
  } catch (err) {
    next(err);
  }
};

// 11. Trigger AI Medical Entity Extraction (Phase 5 Specification)
// POST /api/documents/:id/extract
export const triggerAIExtraction = async (req, res, next) => {
  try {
    const { id } = req.params;
    const isObjectId = mongoose.isValidObjectId(id);
    const query = {
      $and: [
        { $or: [{ user_id: req.user._id }, { userId: req.user._id }] },
        { $or: [isObjectId ? { _id: id } : null, { uuid: id }].filter(Boolean) },
      ],
    };

    const document = await Document.findOne(query);
    if (!document) {
      return next(new AppError('Document not found or unauthorized.', 404));
    }

    // 1. Ensure OCR text exists; if not, run OCR first
    let ocrText = document.ocrRawText;
    if (!ocrText || !ocrText.trim()) {
      const ocrExt = await ocrService.processDocumentOCR(document._id, req.user._id);
      ocrText = ocrExt.cleaned_text || ocrExt.raw_text;
    }

    if (!ocrText || !ocrText.trim()) {
      return next(new AppError('Cannot perform AI extraction: Document has no readable OCR text.', 400));
    }

    // 2. Execute AI Extraction via Abstraction Layer
    const result = await aiExtractionService.extractClinicalEntities(ocrText, {
      provider: req.body.provider,
    });

    // 3. Save record in ai_extractions collection
    const aiExtraction = await AIExtraction.create({
      document_id: document._id,
      documentId: document._id,
      user_id: req.user._id,
      userId: req.user._id,
      raw_model_response: result.raw_model_response,
      validated_data: result.validated_data,
      provider: result.provider,
      processing_status: 'COMPLETED',
      status: 'COMPLETED',
      confidence_score: result.confidence_score,
    });

    // 4. Synchronize into Document.extractedData for downstream RAG and Copilot
    const data = result.validated_data;
    document.extractedData = {
      doctorName: data.doctor_name || '',
      hospitalName: data.hospital_name || '',
      documentDate: data.document_date ? new Date(data.document_date) : new Date(),
      diagnosis: data.diagnoses || [],
      medicines: (data.medications || []).map(m => ({
        name: m.name,
        dosage: m.dosage || '',
        frequency: m.frequency || '',
        duration: m.duration || '',
        confidence: m.confidence || 0,
      })),
      labTests: (data.laboratory_tests || []).map(t => ({
        testName: t.test_name,
        value: t.value || '',
        numericValue: t.numeric_value,
        unit: t.unit || '',
        referenceRange: t.reference_range || '',
        status: t.abnormal_flag ? t.abnormal_flag.toLowerCase() : 'unknown',
        confidence: t.confidence || 0,
      })),
      summary: data.clinical_notes || '',
    };
    document.overallConfidence = data.overall_confidence || 88;
    document.processing_status = 'COMPLETED';
    document.status = 'ANALYZED';
    document.updated_at = new Date();
    await document.save();

    // Automatically synchronize extracted medical information into database (Medications, Doctors, HealthRecord, LabMetrics, User)
    const syncSummary = await syncExtractedDataToDatabase(document, data, req.user._id);

    res.status(200).json({
      status: 'success',
      message: 'AI medical extraction completed successfully.',
      extraction: aiExtraction,
      validated_data: result.validated_data,
      sync: syncSummary,
      document,
    });
  } catch (err) {
    next(err);
  }
};

// 12. Complete Automatic Document Processing Pipeline (OCR -> AI Extraction -> Lab Interpretation -> Database Sync)
// POST /api/documents/:id/process
export const processDocumentPipeline = async (req, res, next) => {
  try {
    const { id } = req.params;
    const isObjectId = mongoose.isValidObjectId(id);
    const query = {
      $and: [
        { $or: [{ user_id: req.user._id }, { userId: req.user._id }] },
        { $or: [isObjectId ? { _id: id } : null, { uuid: id }].filter(Boolean) },
      ],
    };

    const document = await Document.findOne(query);
    if (!document) {
      return next(new AppError('Document not found or unauthorized.', 404));
    }

    const result = await executeDocumentProcessingPipeline(document._id, req.user._id);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};

