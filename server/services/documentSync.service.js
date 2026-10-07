import mongoose from 'mongoose';
import Document from '../models/Document.js';
import HealthRecord from '../models/HealthRecord.js';
import Medication from '../models/Medication.js';
import Doctor from '../models/Doctor.js';
import LabMetric from '../models/LabMetric.js';
import User from '../models/User.js';
import AIExtraction from '../models/AIExtraction.js';
import { ocrService } from './ocr.service.js';
import { aiExtractionService } from './ai/index.js';
import { labInterpretationService } from './labInterpretation.service.js';

function escapeRegex(string) {
  if (!string) return '';
  return string.replace(/[/\-\\^$*+?.()|[\]{}]/g, '\\$&');
}

/**
 * Safely parse date from clinical extraction or fallback
 */
function parseActualEventDate(rawDate, fallbackDate) {
  if (rawDate) {
    const d = new Date(rawDate);
    if (!isNaN(d.getTime())) return d;
  }
  if (fallbackDate) {
    const d = new Date(fallbackDate);
    if (!isNaN(d.getTime())) return d;
  }
  return new Date();
}

/**
 * Standard LabMetric enum names recognized by the LabMetric schema
 */
const LAB_METRIC_ENUM_MAP = [
  { match: /fasting.*glucose|glucose.*fasting/i, name: 'Fasting Blood Glucose' },
  { match: /post.*glucose|ppbs/i, name: 'Post Prandial Glucose' },
  { match: /\bglucose\b/i, name: 'Fasting Blood Glucose' },
  { match: /hba1c/i, name: 'HbA1c' },
  { match: /total.*cholesterol|cholesterol.*total/i, name: 'Total Cholesterol' },
  { match: /ldl/i, name: 'LDL Cholesterol' },
  { match: /hdl/i, name: 'HDL Cholesterol' },
  { match: /triglyceride/i, name: 'Triglycerides' },
  { match: /creatinine/i, name: 'Serum Creatinine' },
  { match: /\btsh\b|thyroid.*stimulating/i, name: 'TSH' },
  { match: /systolic/i, name: 'Blood Pressure - Systolic' },
  { match: /diastolic/i, name: 'Blood Pressure - Diastolic' },
  { match: /heart.*rate|pulse/i, name: 'Heart Rate' },
  { match: /\bweight\b/i, name: 'Weight' },
];

/**
 * Synchronize validated clinical extraction data into core medical collections:
 * HealthRecord, Medication, Doctor, LabMetric, and User profile.
 * Completely idempotent and deduplicated by documentId.
 */
export async function syncExtractedDataToDatabase(document, data, userId) {
  if (!document || !data) return null;

  const eventDate = parseActualEventDate(
    data.document_date || document.extractedData?.documentDate,
    document.upload_date || document.createdAt
  );

  const cleanDocName = data.doctor_name ? data.doctor_name.trim() : '';
  const cleanHospital = data.hospital_name ? data.hospital_name.trim() : '';
  const diagnoses = Array.isArray(data.diagnoses) ? data.diagnoses : [];
  const medications = Array.isArray(data.medications) ? data.medications : [];
  const labTests = Array.isArray(data.laboratory_tests) ? data.laboratory_tests : [];

  // Determine standard record type
  const docCat = (document.category || '').toLowerCase();
  const docType = (document.document_type || '').toUpperCase();
  let recordType = 'consultation';
  if (docCat === 'prescription' || docType === 'PRESCRIPTION') {
    recordType = 'prescription';
  } else if (docCat === 'lab_report' || docType === 'LAB_REPORT' || docType === 'LABORATORY_REPORT') {
    recordType = 'lab_report';
  } else if (docCat === 'imaging' || docType === 'IMAGING' || docType === 'DIAGNOSTIC_REPORT') {
    recordType = 'imaging';
  } else if (docCat === 'discharge_summary' || docType === 'DISCHARGE_SUMMARY') {
    recordType = 'hospitalization';
  }

  // Construct readable medical title
  let title = '';
  if (recordType === 'prescription') {
    title = `Prescription${cleanHospital ? `: ${cleanHospital}` : cleanDocName ? `: ${cleanDocName}` : ''}`;
  } else if (recordType === 'lab_report') {
    title = `Laboratory Report${cleanHospital ? `: ${cleanHospital}` : ''}`;
  } else if (recordType === 'imaging') {
    title = `Diagnostic Imaging${cleanHospital ? `: ${cleanHospital}` : ''}`;
  } else {
    title = `Medical Consultation${cleanHospital ? `: ${cleanHospital}` : cleanDocName ? `: ${cleanDocName}` : ''}`;
  }

  // Construct clinical summary notes for normal user reading
  const notesParts = [];
  if (diagnoses.length > 0) {
    notesParts.push(`Diagnosis: ${diagnoses.join(', ')}`);
  }
  if (medications.length > 0) {
    const medSummary = medications
      .map(m => `${m.name}${m.dosage ? ` (${m.dosage})` : ''}${m.frequency ? ` - ${m.frequency}` : ''}`)
      .join('; ');
    notesParts.push(`Prescribed: ${medSummary}`);
  }
  if (labTests.length > 0) {
    const labSummary = labTests
      .slice(0, 6)
      .map(t => `${t.test_name}: ${t.value}${t.unit ? ` ${t.unit}` : ''}${t.abnormal_flag && t.abnormal_flag !== 'NORMAL' ? ` [${t.abnormal_flag}]` : ''}`)
      .join(', ');
    notesParts.push(`Results: ${labSummary}`);
  }
  const notes = notesParts.join('\n\n') || data.clinical_notes || 'Verified medical record extracted from document.';

  // 1. HEALTH RECORD (Timeline & Records) — Deduplicated by documentId
  let healthRecord = await HealthRecord.findOne({ documentId: document._id, userId });
  if (healthRecord) {
    healthRecord.title = title;
    healthRecord.recordType = recordType;
    healthRecord.date = eventDate;
    healthRecord.doctorName = cleanDocName;
    healthRecord.hospitalClinicName = cleanHospital;
    healthRecord.diagnosis = diagnoses;
    healthRecord.notes = notes;
    healthRecord.tags = [recordType, 'verified_extraction', 'auto_synced'];
    await healthRecord.save();
  } else {
    healthRecord = await HealthRecord.create({
      userId,
      title,
      recordType,
      date: eventDate,
      doctorName: cleanDocName,
      hospitalClinicName: cleanHospital,
      diagnosis: diagnoses,
      notes,
      source: 'USER_UPLOAD',
      documentId: document._id,
      status: 'active',
      tags: [recordType, 'verified_extraction', 'auto_synced'],
    });
  }

  document.associatedRecordId = healthRecord._id;

  // 2. MEDICATIONS — Deduplicated by documentId
  await Medication.deleteMany({ documentId: document._id, userId });

  const createdMeds = [];
  if (medications.length > 0) {
    for (const med of medications) {
      if (!med.name || med.name.trim().length === 0) continue;
      const cleanMedName = med.name.trim();

      const newMed = await Medication.create({
        userId,
        name: cleanMedName,
        dosage: med.dosage || 'As prescribed',
        frequency: med.frequency || 'Once daily',
        instructions: med.instructions || 'Take as prescribed',
        duration: med.duration || '',
        prescribedBy: cleanDocName || 'Attending Clinician',
        startDate: eventDate,
        documentId: document._id,
        status: 'active',
        schedule: [
          {
            time: '08:30',
            label: med.frequency && /night|evening/i.test(med.frequency) ? 'Night' : 'Morning',
          },
        ],
      });
      createdMeds.push(newMed);
    }
  }

  // 3. DOCTORS — Deduplicated by name per user
  let doctorRecord = null;
  if (cleanDocName && cleanDocName.length >= 3) {
    const docQuery = {
      userId,
      name: new RegExp(`^${escapeRegex(cleanDocName)}$`, 'i'),
    };
    doctorRecord = await Doctor.findOne(docQuery);

    if (doctorRecord) {
      doctorRecord.lastConsultationDate = eventDate;
      if (cleanHospital && !doctorRecord.hospitalClinic) {
        doctorRecord.hospitalClinic = cleanHospital;
      }
      await doctorRecord.save();
    } else {
      doctorRecord = await Doctor.create({
        userId,
        name: cleanDocName,
        specialization: diagnoses[0] ? 'Consultant Physician' : 'General Practitioner',
        hospitalClinic: cleanHospital,
        lastConsultationDate: eventDate,
        notes: `Recorded from consultation on ${eventDate.toLocaleDateString()}`,
      });
    }
  }

  // 4. LAB METRICS — Deduplicated by documentId & sourceRecordId
  await LabMetric.deleteMany({
    $or: [{ sourceRecordId: document._id }, { sourceRecordId: healthRecord._id }],
    userId,
  });

  const createdMetrics = [];
  if (labTests.length > 0) {
    for (const test of labTests) {
      if (!test.test_name) continue;
      const tName = test.test_name.trim();

      // Find matching standard LabMetric enum
      const matchedMapping = LAB_METRIC_ENUM_MAP.find(m => m.match.test(tName));
      if (!matchedMapping) continue; // Only persist tests matching the strict Mongoose enum in LabMetric

      const rawVal = test.numeric_value !== null && test.numeric_value !== undefined 
        ? test.numeric_value 
        : parseFloat(String(test.value || '').replace(/,/g, ''));

      if (isNaN(rawVal)) continue;

      let refMin = undefined;
      let refMax = undefined;
      if (test.reference_range) {
        const parts = test.reference_range.replace(/[^0-9.–-]/g, '').split(/[–-]/);
        if (parts.length === 2) {
          refMin = parseFloat(parts[0]);
          refMax = parseFloat(parts[1]);
        } else if (test.reference_range.includes('<')) {
          refMax = parseFloat(test.reference_range.replace(/[^0-9.]/g, ''));
        } else if (test.reference_range.includes('>')) {
          refMin = parseFloat(test.reference_range.replace(/[^0-9.]/g, ''));
        }
      }

      let metricStatus = 'normal';
      if (test.abnormal_flag) {
        const flagLower = test.abnormal_flag.toLowerCase();
        if (flagLower === 'high' || flagLower === 'elevated') metricStatus = 'high';
        else if (flagLower === 'low' || flagLower === 'decreased') metricStatus = 'low';
      }

      const metric = await LabMetric.create({
        userId,
        metricName: matchedMapping.name,
        value: rawVal,
        unit: test.unit || 'mg/dL',
        referenceMin: isNaN(refMin) ? undefined : refMin,
        referenceMax: isNaN(refMax) ? undefined : refMax,
        status: metricStatus,
        date: eventDate,
        sourceRecordId: healthRecord._id,
        notes: `Recorded from ${title}`,
      });
      createdMetrics.push(metric);
    }
  }

  // 5. DEMOGRAPHICS UPDATE IN USER PROFILE (Non-destructive)
  if (data.patient_age || data.patient_gender) {
    const user = await User.findById(userId);
    if (user) {
      let changed = false;
      if (!user.age && data.patient_age) {
        const parsedAge = parseInt(data.patient_age, 10);
        if (!isNaN(parsedAge) && parsedAge > 0 && parsedAge < 125) {
          user.age = parsedAge;
          changed = true;
        }
      }
      if (!user.gender && data.patient_gender) {
        user.gender = data.patient_gender;
        changed = true;
      }
      if (changed) {
        await user.save({ validateBeforeSave: false });
      }
    }
  }

  // 6. UPDATE DOCUMENT STATUS
  document.processing_status = 'COMPLETED';
  document.status = 'ANALYZED';
  document.updated_at = new Date();
  await document.save();

  return {
    healthRecord,
    medicationsCount: createdMeds.length,
    doctor: doctorRecord?.name || null,
    metricsCount: createdMetrics.length,
  };
}

/**
 * Execute Complete End-to-End Pipeline:
 * Document -> OCR -> AI Extraction -> Lab Interpretation -> Database Record Sync
 */
export async function executeDocumentProcessingPipeline(documentId, userId) {
  const document = await Document.findOne({
    _id: documentId,
    $or: [{ userId }, { user_id: userId }],
  });

  if (!document) {
    throw new Error('Document not found or unauthorized.');
  }

  document.processing_status = 'PROCESSING';
  document.status = 'PROCESSING';
  await document.save();

  // 1. Run OCR (Reusing existing production OCR engine)
  let ocrExtraction = null;
  let ocrText = document.ocrRawText;
  if (!ocrText || !ocrText.trim()) {
    ocrExtraction = await ocrService.processDocumentOCR(document._id, userId);
    ocrText = ocrExtraction.cleaned_text || ocrExtraction.raw_text;
  }

  if (!ocrText || !ocrText.trim()) {
    document.processing_status = 'FAILED';
    document.status = 'FAILED';
    await document.save();
    throw new Error('Cannot process document: No readable text recognized.');
  }

  // 2. Run Structured AI Clinical Extraction (Reusing existing clinical extractor)
  const extractionResult = await aiExtractionService.extractClinicalEntities(ocrText);
  const data = extractionResult.validated_data;

  // Save / Update AIExtraction record
  await AIExtraction.findOneAndUpdate(
    { document_id: document._id, user_id: userId },
    {
      document_id: document._id,
      documentId: document._id,
      user_id: userId,
      userId,
      raw_model_response: extractionResult.raw_model_response,
      validated_data: data,
      provider: extractionResult.provider,
      processing_status: 'COMPLETED',
      status: 'COMPLETED',
      confidence_score: extractionResult.confidence_score,
      created_at: new Date(),
    },
    { upsert: true, new: true }
  );

  // Synchronize into Document.extractedData
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
  await document.save();

  // 3. Run Laboratory Interpretation (if observations present)
  let labInterpretations = [];
  if (data.laboratory_tests && data.laboratory_tests.length > 0) {
    try {
      labInterpretations = await labInterpretationService.interpretDocumentLaboratories(document, userId);
    } catch (labErr) {
      console.warn('[AutoPipeline] Lab interpretation warning:', labErr.message);
    }
  }

  // 4. Synchronize into Core Medical Database Collections
  const syncResult = await syncExtractedDataToDatabase(document, data, userId);

  return {
    status: 'success',
    message: 'Document automatically processed and synchronized to health profile.',
    document,
    validated_data: data,
    sync: syncResult,
    lab_interpretations_count: labInterpretations.length,
  };
}

/**
 * Migration helper: Sync any previously analyzed documents for user that lack HealthRecord
 */
export async function syncAllAnalyzedDocumentsForUser(userId) {
  try {
    const analyzedDocs = await Document.find({
      $or: [{ userId }, { user_id: userId }],
      status: { $in: ['ANALYZED', 'COMPLETED', 'VERIFIED'] },
      extractedData: { $exists: true, $ne: {} },
    });

    for (const doc of analyzedDocs) {
      const hasRecord = await HealthRecord.exists({ documentId: doc._id, userId });
      if (!hasRecord && doc.extractedData) {
        await syncExtractedDataToDatabase(doc, {
          patient_name: null,
          patient_age: null,
          patient_gender: null,
          doctor_name: doc.extractedData.doctorName,
          hospital_name: doc.extractedData.hospitalName,
          document_date: doc.extractedData.documentDate,
          diagnoses: doc.extractedData.diagnosis || [],
          medications: (doc.extractedData.medicines || []).map(m => ({
            name: m.name,
            dosage: m.dosage,
            frequency: m.frequency,
            duration: m.duration,
          })),
          laboratory_tests: (doc.extractedData.labTests || []).map(t => ({
            test_name: t.testName || t.name,
            value: t.value,
            numeric_value: t.numericValue,
            unit: t.unit,
            reference_range: t.referenceRange,
            abnormal_flag: t.status ? t.status.toUpperCase() : 'NORMAL',
          })),
          clinical_notes: doc.extractedData.summary,
        }, userId);
      }
    }
  } catch (err) {
    console.warn('[AutoPipeline] syncAllAnalyzedDocumentsForUser error:', err.message);
  }
}

export default {
  syncExtractedDataToDatabase,
  executeDocumentProcessingPipeline,
  syncAllAnalyzedDocumentsForUser,
};
