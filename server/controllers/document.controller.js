import path from 'path';
import fs from 'fs';
import Document from '../models/Document.js';
import HealthRecord from '../models/HealthRecord.js';
import Medication from '../models/Medication.js';
import LabMetric from '../models/LabMetric.js';
import { aiService } from '../services/ai.service.js';
import { AppError } from '../middleware/errorHandler.js';

// 1. Get All Documents for User
export const getDocuments = async (req, res, next) => {
  try {
    const { category, status } = req.query;
    const filter = { userId: req.user._id };
    if (category) filter.category = category;
    if (status) filter.status = status;

    const documents = await Document.find(filter).sort({ createdAt: -1 });
    res.status(200).json({ status: 'success', count: documents.length, documents });
  } catch (err) {
    next(err);
  }
};

// 2. Upload Document
export const uploadDocument = async (req, res, next) => {
  try {
    const file = req.file;
    const { category, originalName } = req.body;

    const docFileName = file ? file.filename : `sample_doc_${Date.now()}.pdf`;
    const docOriginalName = file ? file.originalname : (originalName || 'Medical_Record.pdf');
    const docUrl = `/uploads/${docFileName}`;
    const docType = path.extname(docOriginalName).slice(1).toLowerCase() || 'pdf';

    const document = new Document({
      userId: req.user._id,
      fileName: docFileName,
      originalName: docOriginalName,
      fileUrl: docUrl,
      fileType: ['jpg', 'jpeg', 'png'].includes(docType) ? docType : 'pdf',
      fileSize: file ? file.size : 204800,
      category: category || 'laboratory_report',
      status: 'PROCESSING',
    });

    await document.save();

    // Trigger AI OCR & Entity Extraction
    const extractionResult = await aiService.extractDocumentEntities(document);
    document.ocrRawText = extractionResult.ocrRawText;
    document.extractedData = extractionResult.extractedData;
    document.overallConfidence = extractionResult.overallConfidence;
    document.status = extractionResult.overallConfidence >= 90 ? 'ANALYZED' : 'NEEDS_REVIEW';

    await document.save();

    res.status(201).json({
      status: 'success',
      message: 'Document uploaded and analyzed successfully.',
      document,
    });
  } catch (err) {
    next(err);
  }
};

// 3. Human Verification of AI Extracted Medical Entities (Phase 8 requirement)
export const verifyDocumentExtraction = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { verifiedData, createHealthRecords = true } = req.body;

    const document = await Document.findOne({ _id: id, userId: req.user._id });
    if (!document) {
      return next(new AppError('Document not found.', 404));
    }

    if (verifiedData) {
      document.extractedData = { ...document.extractedData, ...verifiedData };
    }

    document.humanVerified = true;
    document.verifiedAt = new Date();
    document.status = 'VERIFIED';

    // If approved, automatically normalize into HealthRecord, Medication & LabMetric
    if (createHealthRecords) {
      const data = document.extractedData;
      
      // 1. Create main HealthRecord for timeline
      const healthRecord = new HealthRecord({
        userId: req.user._id,
        title: `${document.category.replace('_', ' ').toUpperCase()}: ${data.hospitalName || 'Verified Clinical Record'}`,
        recordType: document.category === 'prescription' ? 'prescription' : 'lab_report',
        date: data.documentDate || new Date(),
        doctorName: data.doctorName || 'Dr. Ramesh Sharma',
        hospitalClinicName: data.hospitalName || 'Metropolis Healthcare',
        diagnosis: data.diagnosis || [],
        source: 'USER_UPLOAD',
        documentId: document._id,
        status: 'active',
        tags: [document.category, 'verified_ai_extraction'],
      });
      await healthRecord.save();
      document.associatedRecordId = healthRecord._id;

      // 2. If prescription, register medications into Medication collection
      if (data.medicines && data.medicines.length > 0) {
        for (const med of data.medicines) {
          await Medication.create({
            userId: req.user._id,
            name: med.name,
            dosage: med.dosage || '500 mg',
            frequency: med.frequency || 'Twice daily',
            prescribedBy: data.doctorName,
            documentId: document._id,
            schedule: [
              { time: '08:30', label: 'Morning (After food)' },
              { time: '20:30', label: 'Night (After food)' }
            ],
            status: 'active',
          });
        }
      }

      // 3. If lab tests, register into LabMetric collection for interactive charts
      if (data.labTests && data.labTests.length > 0) {
        for (const test of data.labTests) {
          if (test.numericValue) {
            await LabMetric.create({
              userId: req.user._id,
              metricName: test.testName.includes('HbA1c') ? 'HbA1c'
                : test.testName.includes('Fasting') ? 'Fasting Blood Glucose'
                : test.testName.includes('Creatinine') ? 'Serum Creatinine'
                : test.testName.includes('Total Cholesterol') ? 'Total Cholesterol'
                : test.testName.includes('Systolic') ? 'Blood Pressure - Systolic'
                : test.testName.includes('Diastolic') ? 'Blood Pressure - Diastolic'
                : 'Blood Pressure - Systolic',
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
      message: 'Document extraction verified and integrated into health timeline.',
      document,
    });
  } catch (err) {
    next(err);
  }
};

// 4. Delete Document
export const deleteDocument = async (req, res, next) => {
  try {
    const { id } = req.params;
    const document = await Document.findOneAndDelete({ _id: id, userId: req.user._id });
    if (!document) {
      return next(new AppError('Document not found.', 404));
    }

    // Clean up file if on disk
    if (document.fileName) {
      const filePath = path.join(process.cwd(), 'uploads', document.fileName);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    res.status(200).json({ status: 'success', message: 'Document deleted successfully.' });
  } catch (err) {
    next(err);
  }
};
