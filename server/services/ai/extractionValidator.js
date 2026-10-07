/**
 * Strict Schema Validator for AI Medical Extractions (Pydantic-equivalent in Node.js).
 * Enforces strict typing, null values for absent data, abnormal_flag enum restrictions,
 * and per-field confidence score tracking.
 */

const ALLOWED_ABNORMAL_FLAGS = ['LOW', 'NORMAL', 'HIGH', 'UNKNOWN'];

/**
 * Safely parse JSON from LLM response with cleanup of markdown code fences and common syntax issues
 */
export const safeParseJson = (rawString = '') => {
  if (!rawString || typeof rawString !== 'string') return null;

  // 1. Remove markdown fences
  let cleaned = rawString.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim();
  }

  // 2. Extract JSON substring if surrounded by commentary
  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    cleaned = cleaned.substring(firstBrace, lastBrace + 1);
  }

  // 3. Attempt standard parse
  try {
    return JSON.parse(cleaned);
  } catch (err1) {
    // Attempt basic repair of trailing commas
    try {
      const repaired = cleaned.replace(/,\s*([\]}])/g, '$1');
      return JSON.parse(repaired);
    } catch (err2) {
      return null;
    }
  }
};

/**
 * Strict Schema Validation conforming to Pydantic rules
 */
export const validateMedicalExtraction = (rawObj) => {
  if (!rawObj || typeof rawObj !== 'object') {
    throw new Error('Invalid extraction output: Expected an object.');
  }

  // Helper for string or null
  const strOrNull = (val) => {
    if (val === undefined || val === null) return null;
    const s = String(val).trim();
    if (!s || s.toLowerCase() === 'null' || s.toLowerCase() === 'none' || s.toLowerCase() === 'n/a') {
      return null;
    }
    return s;
  };

  // Helper for numeric confidence (0 - 100)
  const numConfidence = (val, defaultVal = 0) => {
    const num = parseFloat(val);
    if (isNaN(num)) return defaultVal;
    // Normalize if returned as 0.0 - 1.0
    if (num > 0 && num <= 1) return Math.round(num * 100);
    return Math.min(100, Math.max(0, Math.round(num)));
  };

  // 1. Core Patient & Clinical Metadata
  const patient_name = strOrNull(rawObj.patient_name || rawObj.patientName);
  const patient_age = strOrNull(rawObj.patient_age || rawObj.patientAge || rawObj.age);
  const patient_gender = strOrNull(rawObj.patient_gender || rawObj.patientGender || rawObj.gender);
  const doctor_name = strOrNull(rawObj.doctor_name || rawObj.doctorName);
  const hospital_name = strOrNull(rawObj.hospital_name || rawObj.hospitalName);
  const document_date = strOrNull(rawObj.document_date || rawObj.documentDate || rawObj.date);

  // 2. Diagnoses (Array of non-empty strings)
  let rawDiagnoses = rawObj.diagnoses || rawObj.diagnosis || [];
  if (!Array.isArray(rawDiagnoses)) rawDiagnoses = [rawDiagnoses];
  const diagnoses = rawDiagnoses
    .map(d => typeof d === 'string' ? d.trim() : (d?.name || d?.condition || ''))
    .filter(d => d && d.length > 0 && d.toLowerCase() !== 'null');

  // 3. Medications (Strict Medication schema with confidence)
  const rawMeds = rawObj.medications || rawObj.medicines || [];
  const medications = (Array.isArray(rawMeds) ? rawMeds : [])
    .map(m => {
      const name = strOrNull(m.name || m.medicine || m.drug);
      if (!name) return null; // Do not invent phantom medicines

      return {
        name,
        dosage: strOrNull(m.dosage || m.dose),
        route: strOrNull(m.route),
        frequency: strOrNull(m.frequency || m.timing),
        duration: strOrNull(m.duration),
        instructions: strOrNull(m.instructions || m.remarks || m.advice),
        confidence: numConfidence(m.confidence, 85),
      };
    })
    .filter(Boolean);

  // 4. Observations & Laboratory Tests (Strict Observation schema with abnormal_flag)
  const rawTests = rawObj.laboratory_tests || rawObj.observations || rawObj.labTests || [];
  const observations = (Array.isArray(rawTests) ? rawTests : [])
    .map(t => {
      const test_name = strOrNull(t.test_name || t.testName || t.name);
      if (!test_name) return null;

      const valueStr = strOrNull(t.value || t.result);
      let numeric_value = t.numeric_value !== undefined ? parseFloat(t.numeric_value) : parseFloat(valueStr);
      if (isNaN(numeric_value)) numeric_value = null;

      const unit = strOrNull(t.unit || t.units);
      const reference_range = strOrNull(t.reference_range || t.referenceRange || t.range);

      // Abnormal Flag normalization
      let flag = String(t.abnormal_flag || t.status || 'UNKNOWN').trim().toUpperCase();
      if (!ALLOWED_ABNORMAL_FLAGS.includes(flag)) {
        if (flag === 'NORMAL') flag = 'NORMAL';
        else if (flag === 'HIGH' || flag === 'ELEVATED') flag = 'HIGH';
        else if (flag === 'LOW' || flag === 'DECREASED') flag = 'LOW';
        else flag = 'UNKNOWN';
      }

      return {
        test_name,
        value: valueStr,
        numeric_value,
        unit,
        reference_range,
        abnormal_flag: flag,
        confidence: numConfidence(t.confidence, 90),
      };
    })
    .filter(Boolean);

  // 5. Reference Ranges and Units Arrays
  const reference_ranges = observations.map(o => o.reference_range).filter(Boolean);
  const units = observations.map(o => o.unit).filter(Boolean);
  const abnormal_flags = observations.map(o => o.abnormal_flag).filter(f => f !== 'UNKNOWN');

  // 6. Clinical Notes
  const clinical_notes = strOrNull(rawObj.clinical_notes || rawObj.summary || rawObj.notes);

  // 7. Overall Confidence calculation
  const allConfidences = [
    patient_name ? 90 : null,
    doctor_name ? 90 : null,
    hospital_name ? 90 : null,
    ...medications.map(m => m.confidence),
    ...observations.map(o => o.confidence),
  ].filter(c => c !== null);

  const overall_confidence = allConfidences.length > 0
    ? Math.round(allConfidences.reduce((a, b) => a + b, 0) / allConfidences.length)
    : 80;

  return {
    patient_name,
    patient_age,
    patient_gender,
    doctor_name,
    hospital_name,
    document_date,
    diagnoses,
    medications,
    laboratory_tests: observations,
    observations,
    reference_ranges,
    units,
    abnormal_flags,
    clinical_notes,
    overall_confidence,
  };
};

export default { safeParseJson, validateMedicalExtraction };
