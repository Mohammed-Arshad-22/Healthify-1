import User from '../models/User.js';
import Document from '../models/Document.js';
import AIExtraction from '../models/AIExtraction.js';
import ObservationInterpretation from '../models/ObservationInterpretation.js';
import Medication from '../models/Medication.js';
import HealthRecord from '../models/HealthRecord.js';

/**
 * Format a date object or date string into YYYY-MM-DD
 * Preserves actual clinical document date without inventing or guessing
 */
export const formatActualDate = (rawDate) => {
  if (!rawDate) return null;
  if (typeof rawDate === 'string') {
    const trimmed = rawDate.trim();
    // If format like 2026-09-01
    const isoMatch = trimmed.match(/^\d{4}-\d{2}-\d{2}/);
    if (isoMatch) return isoMatch[0];

    // Try parsing
    const parsed = new Date(trimmed);
    if (!isNaN(parsed.getTime())) {
      return parsed.toISOString().slice(0, 10);
    }
    return trimmed; // fallback to string as recorded
  }

  if (rawDate instanceof Date && !isNaN(rawDate.getTime())) {
    return rawDate.toISOString().slice(0, 10);
  }

  return null;
};

/**
 * Clean Document Type Label
 */
export const getDocumentTypeLabel = (type = '') => {
  const normalized = String(type).toUpperCase();
  switch (normalized) {
    case 'PRESCRIPTION':
      return 'Prescription';
    case 'LAB_REPORT':
    case 'LABORATORY_REPORT':
      return 'Lab Report';
    case 'DIAGNOSTIC_REPORT':
      return 'Diagnostic Report';
    case 'DISCHARGE_SUMMARY':
      return 'Discharge Summary';
    default:
      return 'Medical Record';
  }
};

/**
 * Build Structured Health Profile for Authenticated User
 * Uses ONLY existing database information.
 * Scoped strictly to authenticated user_id.
 */
export const buildStructuredHealthProfile = async (userId) => {
  if (!userId) {
    throw new Error('User ID is required to build health profile.');
  }

  // 1. Fetch User Record
  const user = await User.findById(userId).lean();
  if (!user) {
    throw new Error('User profile not found.');
  }

  // 2. Fetch User-Scoped Documents
  const documents = await Document.find({
    $or: [{ user_id: userId }, { userId: userId }],
  }).sort({ upload_date: -1, createdAt: -1 }).lean();

  const documentIds = documents.map((d) => d._id);

  // 3. Fetch User-Scoped AI Extractions
  const aiExtractions = await AIExtraction.find({
    $or: [{ user_id: userId }, { userId: userId }],
  }).sort({ created_at: -1 }).lean();

  // Create documentId -> aiExtraction lookup map
  const extractionByDocId = new Map();
  for (const ext of aiExtractions) {
    const docKey = (ext.document_id || ext.documentId)?.toString();
    if (docKey && !extractionByDocId.has(docKey)) {
      extractionByDocId.set(docKey, ext);
    }
  }

  // 4. Fetch User-Scoped Lab Interpretations
  const labInterpretations = await ObservationInterpretation.find({
    $or: [{ user_id: userId }, { userId: userId }],
  }).sort({ created_at: -1 }).lean();

  // 5. Fetch User-Scoped Medications
  const recordedMedications = await Medication.find({
    $or: [{ userId: userId }, { user_id: userId }],
  }).lean();

  // 6. Fetch User-Scoped Health Records
  const healthRecords = await HealthRecord.find({
    $or: [{ userId: userId }, { user_id: userId }],
  }).sort({ date: -1 }).lean();

  // -------------------------------------------------------------------------
  // SYNTHESIZE SECTION A: DIAGNOSES (When explicitly extracted)
  // -------------------------------------------------------------------------
  const diagnosesMap = new Map();

  for (const doc of documents) {
    const ext = extractionByDocId.get(doc._id.toString());
    const valData = ext?.validated_data;
    const docDiagnoses = valData?.diagnoses || doc.extractedData?.diagnosis || [];

    const actualDate = formatActualDate(valData?.document_date) || 
                       formatActualDate(doc.extractedData?.documentDate) ||
                       formatActualDate(doc.upload_date || doc.createdAt);

    for (const diag of docDiagnoses) {
      if (!diag || typeof diag !== 'string') continue;
      const cleanDiag = diag.trim();
      if (!cleanDiag) continue;

      const normKey = cleanDiag.toLowerCase();
      if (!diagnosesMap.has(normKey)) {
        diagnosesMap.set(normKey, {
          diagnosis: cleanDiag,
          source_documents: [],
          first_recorded_date: actualDate,
          latest_recorded_date: actualDate,
        });
      }

      const item = diagnosesMap.get(normKey);
      item.source_documents.push({
        document_id: doc._id,
        document_name: doc.original_filename || doc.originalName || doc.filename,
        document_type: doc.document_type || 'OTHER',
        date: actualDate,
      });

      if (actualDate) {
        if (!item.first_recorded_date || actualDate < item.first_recorded_date) {
          item.first_recorded_date = actualDate;
        }
        if (!item.latest_recorded_date || actualDate > item.latest_recorded_date) {
          item.latest_recorded_date = actualDate;
        }
      }
    }
  }

  // Also include explicitly diagnosed conditions from HealthRecord collection
  for (const rec of healthRecords) {
    if (rec.diagnosis && typeof rec.diagnosis === 'string' && rec.diagnosis.trim()) {
      const cleanDiag = rec.diagnosis.trim();
      const normKey = cleanDiag.toLowerCase();
      const recDate = formatActualDate(rec.date);

      if (!diagnosesMap.has(normKey)) {
        diagnosesMap.set(normKey, {
          diagnosis: cleanDiag,
          source_documents: [],
          first_recorded_date: recDate,
          latest_recorded_date: recDate,
        });
      }
    }
  }

  const diagnosesList = Array.from(diagnosesMap.values());

  // -------------------------------------------------------------------------
  // SYNTHESIZE SECTION B: CURRENT MEDICATIONS (When explicitly available)
  // -------------------------------------------------------------------------
  const medicationsMap = new Map();

  // First, add medications from Medication collection
  for (const m of recordedMedications) {
    if (!m.name) continue;
    const normKey = m.name.trim().toLowerCase();
    medicationsMap.set(normKey, {
      id: m._id,
      name: m.name,
      dosage: m.dosage || '',
      frequency: m.frequency || '',
      route: m.route || 'Oral',
      duration: m.duration || '',
      instructions: m.instructions || '',
      status: m.status || 'active',
      source: 'Patient Medication Record',
      confidence: 100,
      prescribed_date: formatActualDate(m.startDate || m.createdAt),
    });
  }

  // Next, incorporate medications extracted from verified documents
  for (const doc of documents) {
    const ext = extractionByDocId.get(doc._id.toString());
    const valData = ext?.validated_data;
    const docMeds = valData?.medications || (doc.extractedData?.medicines || []).map((m) => ({
      name: m.name,
      dosage: m.dosage,
      frequency: m.frequency,
      duration: m.duration,
      confidence: m.confidence,
    }));

    const docDate = formatActualDate(valData?.document_date) || 
                    formatActualDate(doc.extractedData?.documentDate) ||
                    formatActualDate(doc.upload_date || doc.createdAt);

    for (const med of docMeds) {
      if (!med || !med.name) continue;
      const cleanName = med.name.trim();
      const normKey = cleanName.toLowerCase();

      if (!medicationsMap.has(normKey)) {
        medicationsMap.set(normKey, {
          id: med._id || `med_${normKey}`,
          name: cleanName,
          dosage: med.dosage || '',
          frequency: med.frequency || '',
          route: med.route || 'Oral',
          duration: med.duration || '',
          instructions: med.instructions || '',
          status: 'active',
          source: doc.original_filename || doc.originalName || 'Prescription Document',
          document_id: doc._id,
          confidence: med.confidence || 85,
          prescribed_date: docDate,
        });
      } else {
        // Update with details if missing
        const existing = medicationsMap.get(normKey);
        if (!existing.dosage && med.dosage) existing.dosage = med.dosage;
        if (!existing.frequency && med.frequency) existing.frequency = med.frequency;
        if (!existing.duration && med.duration) existing.duration = med.duration;
      }
    }
  }

  const medicationsList = Array.from(medicationsMap.values());

  // -------------------------------------------------------------------------
  // SYNTHESIZE SECTION C: RECENT LABORATORY OBSERVATIONS
  // -------------------------------------------------------------------------
  // Format observation interpretations with actual document dates
  const observationsList = labInterpretations.map((obs) => {
    // Find parent document if linked
    const docKey = (obs.document_id || obs.documentId)?.toString();
    const parentDoc = docKey ? documents.find((d) => d._id.toString() === docKey) : null;
    const parentExt = docKey ? extractionByDocId.get(docKey) : null;

    const actualDate = formatActualDate(parentExt?.validated_data?.document_date) ||
                       formatActualDate(parentDoc?.extractedData?.documentDate) ||
                       formatActualDate(obs.created_at);

    return {
      observation_id: obs.observation_id || obs._id,
      test_name: obs.test_name,
      value: obs.value,
      numeric_value: obs.numeric_value,
      unit: obs.unit,
      reference_range: obs.reference_range,
      status: obs.status,
      severity: obs.severity,
      explanation: obs.explanation,
      confidence: obs.confidence,
      source: obs.source,
      document_id: obs.document_id || obs.documentId,
      document_name: parentDoc?.original_filename || parentDoc?.originalName || 'Lab Report',
      date: actualDate,
      created_at: obs.created_at,
    };
  });

  // -------------------------------------------------------------------------
  // SYNTHESIZE SECTION D: TIMELINE (Based on actual document dates)
  // -------------------------------------------------------------------------
  // Example requirement:
  // 2026-09-01 -> Lab Report
  // 2026-09-05 -> Prescription
  // 2026-09-20 -> Diagnostic Report
  // Do not invent dates!
  const timelineEvents = [];

  for (const doc of documents) {
    const ext = extractionByDocId.get(doc._id.toString());
    const valData = ext?.validated_data;

    // Use ACTUAL document date explicitly present in document text first
    const explicitDate = formatActualDate(valData?.document_date) || 
                         formatActualDate(doc.extractedData?.documentDate);

    // If explicit clinical date is not present, use the recorded document date/upload date
    const actualDate = explicitDate || formatActualDate(doc.upload_date || doc.createdAt);

    // Highlights & findings
    const docDiagnoses = valData?.diagnoses || doc.extractedData?.diagnosis || [];
    const docMeds = (valData?.medications || doc.extractedData?.medicines || []).map((m) => m.name).filter(Boolean);
    const docLabs = (valData?.laboratory_tests || doc.extractedData?.labTests || []).map((t) => {
      const name = t.test_name || t.testName;
      const val = t.value || t.numeric_value || t.numericValue;
      const unit = t.unit ? ` ${t.unit}` : '';
      const flag = t.abnormal_flag || t.status;
      return `${name}: ${val}${unit}${flag && flag !== 'NORMAL' ? ` (${flag})` : ''}`;
    }).filter(Boolean);

    timelineEvents.push({
      id: doc._id.toString(),
      document_id: doc._id,
      date: actualDate,
      is_explicit_document_date: Boolean(explicitDate),
      type: doc.document_type || 'OTHER',
      type_label: getDocumentTypeLabel(doc.document_type),
      title: doc.original_filename || doc.originalName || doc.filename || 'Medical Document',
      doctor_name: valData?.doctor_name || doc.extractedData?.doctorName || null,
      hospital_name: valData?.hospital_name || doc.extractedData?.hospitalName || null,
      diagnoses: docDiagnoses,
      medications: docMeds,
      observations_count: docLabs.length,
      key_findings: docLabs.slice(0, 4),
      status: doc.processing_status || doc.status,
    });
  }

  // Sort timeline chronologically (earliest to latest or latest to earliest)
  // We sort latest date first for chronological event streams, but preserve exact string sorting
  timelineEvents.sort((a, b) => {
    const dateA = a.date || '0000-00-00';
    const dateB = b.date || '0000-00-00';
    return dateB.localeCompare(dateA);
  });

  // -------------------------------------------------------------------------
  // SYNTHESIZE SECTION E: SUMMARY COUNTERS
  // -------------------------------------------------------------------------
  const totalUploadedRecords = documents.length;
  const totalAnalyzedRecords = documents.filter((d) => 
    d.processing_status === 'COMPLETED' || 
    d.status === 'ANALYZED' || 
    extractionByDocId.has(d._id.toString())
  ).length;

  return {
    patient_profile: {
      id: user._id,
      name: user.name,
      age: user.age || null,
      gender: user.gender || null,
      blood_group: user.bloodGroup || null,
      email: user.email,
      phone: user.phone || null,
      abha_number: user.abhaNumber || null,
      abha_connected: Boolean(user.abhaConnected),
      emergency_contacts: user.emergencyContacts || [],
    },
    summary: {
      total_uploaded_records: totalUploadedRecords,
      total_analyzed_records: totalAnalyzedRecords,
      total_diagnoses: diagnosesList.length,
      total_medications: medicationsList.length,
      total_observations: observationsList.length,
    },
    recent_documents: documents.slice(0, 6).map((d) => ({
      id: d._id,
      original_filename: d.original_filename || d.originalName || d.filename,
      document_type: d.document_type || 'OTHER',
      type_label: getDocumentTypeLabel(d.document_type),
      processing_status: d.processing_status || d.status,
      file_size: d.file_size || d.fileSize || 0,
      upload_date: formatActualDate(d.upload_date || d.createdAt),
    })),
    recent_observations: observationsList.slice(0, 10),
    medications: medicationsList,
    diagnoses: diagnosesList,
    timeline: timelineEvents,
  };
};

export default {
  buildStructuredHealthProfile,
  formatActualDate,
  getDocumentTypeLabel,
};
