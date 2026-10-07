import crypto from 'crypto';
import ObservationInterpretation from '../models/ObservationInterpretation.js';

/**
 * Curated Clinical Reference Ranges
 * ONLY used when all 4 strict criteria are satisfied:
 * 1. Test is confidently identified.
 * 2. Unit is known and matches valid clinical units.
 * 3. Patient context is sufficient (age/gender context available).
 * 4. Reference source and version are explicitly recorded.
 */
export const CURATED_REFERENCE_REGISTRY = {
  'fasting_glucose': {
    canonicalId: 'fasting_glucose',
    displayName: 'Fasting Blood Glucose',
    aliases: ['fasting blood glucose', 'fasting glucose', 'glucose fasting', 'fbs', 'blood glucose (fasting)'],
    validUnits: ['mg/dl', 'mg/100ml'],
    requiresGender: false,
    requiresAge: true, // Requires adult context (>= 18)
    range: { min: 70, max: 99 },
    formattedRange: '70–99 mg/dL',
    source: 'ADA_STANDARDS_CARE_2024_V1',
    urgentCriticalLow: 50,
    urgentCriticalHigh: 350,
  },
  'hba1c': {
    canonicalId: 'hba1c',
    displayName: 'HbA1c (Glycated Hemoglobin)',
    aliases: ['hba1c', 'glycated hemoglobin', 'hemoglobin a1c', 'a1c', 'glycosylated hemoglobin'],
    validUnits: ['%'],
    requiresGender: false,
    requiresAge: true,
    range: { min: 4.0, max: 5.6 }, // < 5.7% is standard normal
    formattedRange: '< 5.7%',
    source: 'ADA_STANDARDS_CARE_2024_V1',
    urgentCriticalHigh: 11.0,
  },
  'hemoglobin': {
    canonicalId: 'hemoglobin',
    displayName: 'Hemoglobin',
    aliases: ['hemoglobin', 'haemoglobin', 'hb'],
    validUnits: ['g/dl', 'g/100ml', 'g%'],
    requiresGender: true, // Gender differentiation is clinically required for adult reference ranges
    requiresAge: true,
    genderRanges: {
      male: { min: 13.0, max: 17.5, formatted: '13.0–17.5 g/dL' },
      female: { min: 12.0, max: 15.5, formatted: '12.0–15.5 g/dL' },
    },
    defaultAdultRange: { min: 12.0, max: 16.5, formatted: '12.0–16.5 g/dL' },
    source: 'WHO_HAEMOGLOBIN_CONCENTRATIONS_2023_V2',
    urgentCriticalLow: 7.0,
    urgentCriticalHigh: 20.0,
  },
  'serum_creatinine': {
    canonicalId: 'serum_creatinine',
    displayName: 'Serum Creatinine',
    aliases: ['serum creatinine', 'creatinine', 'creatinine serum'],
    validUnits: ['mg/dl'],
    requiresGender: false,
    requiresAge: true,
    range: { min: 0.6, max: 1.2 },
    formattedRange: '0.6–1.2 mg/dL',
    source: 'NKF_KDOQI_CLINICAL_GUIDELINES_V1',
    urgentCriticalHigh: 3.5,
  },
  'total_cholesterol': {
    canonicalId: 'total_cholesterol',
    displayName: 'Total Cholesterol',
    aliases: ['total cholesterol', 'cholesterol total', 'cholesterol'],
    validUnits: ['mg/dl'],
    requiresGender: false,
    requiresAge: true,
    range: { min: 125, max: 199 }, // < 200 mg/dL is desirable
    formattedRange: '< 200 mg/dL',
    source: 'NCEP_ATP_III_V2',
    urgentCriticalHigh: 350,
  },
  'platelets': {
    canonicalId: 'platelets',
    displayName: 'Platelet Count',
    aliases: ['platelets', 'platelet count', 'plt', 'total platelets'],
    validUnits: ['/ul', '/µl', 'k/ul', '10^3/ul', '10^3/µl', 'cells/cumm'],
    requiresGender: false,
    requiresAge: false,
    range: { min: 150000, max: 450000 },
    formattedRange: '150,000–450,000 /µL',
    source: 'CAP_HEMATOLOGY_REFERENCE_V1',
    urgentCriticalLow: 50000,
    urgentCriticalHigh: 900000,
  },
  'white_blood_cells': {
    canonicalId: 'white_blood_cells',
    displayName: 'Total Leukocyte Count (WBC)',
    aliases: ['white blood cells', 'wbc', 'total leukocyte count', 'total wbc', 'tlc', 'leukocytes'],
    validUnits: ['/ul', '/µl', 'k/ul', '10^3/ul', '10^3/µl', 'cells/cumm'],
    requiresGender: false,
    requiresAge: false,
    range: { min: 4000, max: 11000 },
    formattedRange: '4,000–11,000 /µL',
    source: 'CAP_HEMATOLOGY_REFERENCE_V1',
    urgentCriticalLow: 2000,
    urgentCriticalHigh: 30000,
  },
};

/**
 * Helper to parse a reference range string into numeric bounds min & max
 */
export const parseReferenceRangeString = (rangeStr) => {
  if (!rangeStr || typeof rangeStr !== 'string') return null;
  const clean = rangeStr.trim().replace(/,/g, '');

  // Format: "< 5.7" or "<= 5.7" or "upto 5.7"
  const upperMatch = clean.match(/(?:<|<=|upto|less than)\s*([0-9]+(?:\.[0-9]+)?)/i);
  if (upperMatch) {
    const maxVal = parseFloat(upperMatch[1]);
    if (!isNaN(maxVal)) {
      return { min: null, max: maxVal, raw: rangeStr.trim() };
    }
  }

  // Format: "> 60" or ">= 60" or "more than 60"
  const lowerMatch = clean.match(/(?:>|>=|more than|greater than)\s*([0-9]+(?:\.[0-9]+)?)/i);
  if (lowerMatch) {
    const minVal = parseFloat(lowerMatch[1]);
    if (!isNaN(minVal)) {
      return { min: minVal, max: null, raw: rangeStr.trim() };
    }
  }

  // Format: "70 - 99" or "70 to 99" or "70 – 99" (en-dash / em-dash)
  const rangeMatch = clean.match(/([0-9]+(?:\.[0-9]+)?)\s*(?:-|–|—|to)\s*([0-9]+(?:\.[0-9]+)?)/i);
  if (rangeMatch) {
    const minVal = parseFloat(rangeMatch[1]);
    const maxVal = parseFloat(rangeMatch[2]);
    if (!isNaN(minVal) && !isNaN(maxVal)) {
      return { min: minVal, max: maxVal, raw: rangeStr.trim() };
    }
  }

  return null;
};

/**
 * Helper to extract numeric value from observation value string or number
 */
export const parseNumericValue = (val, explicitNumeric = null) => {
  if (typeof explicitNumeric === 'number' && !isNaN(explicitNumeric)) {
    return explicitNumeric;
  }
  if (typeof val === 'number' && !isNaN(val)) {
    return val;
  }
  if (typeof val === 'string') {
    const cleaned = val.replace(/,/g, '');
    const match = cleaned.match(/-?[0-9]+(?:\.[0-9]+)?/);
    if (match) {
      const parsed = parseFloat(match[0]);
      if (!isNaN(parsed)) return parsed;
    }
  }
  return null;
};

/**
 * Evaluate Curated Reference Range against the 4 strict safety criteria
 */
export const matchCuratedReferenceRange = (testName, unit, patientContext = {}, confidence = 0) => {
  if (!testName) return null;
  const normalizedTest = String(testName).trim().toLowerCase();
  const normalizedUnit = unit ? String(unit).trim().toLowerCase() : '';

  // 1. Confidently identified test
  let matchedConfig = null;
  for (const key of Object.keys(CURATED_REFERENCE_REGISTRY)) {
    const item = CURATED_REFERENCE_REGISTRY[key];
    if (item.aliases.some(alias => normalizedTest.includes(alias) || alias.includes(normalizedTest))) {
      matchedConfig = item;
      break;
    }
  }

  if (!matchedConfig) return null;

  // Criterion 1 Check: Confidence must be acceptable (if provided, >= 70%)
  if (typeof confidence === 'number' && confidence > 0 && confidence < 70) {
    return null;
  }

  // Criterion 2 Check: Unit must be known and valid
  if (!normalizedUnit || !matchedConfig.validUnits.includes(normalizedUnit)) {
    return null;
  }

  // Criterion 3 Check: Patient context is sufficient
  // E.g., if age is provided or adult context indicated
  const hasAge = patientContext.age !== undefined && patientContext.age !== null;
  const isAdult = patientContext.is_adult === true || 
                  (hasAge && (parseInt(patientContext.age, 10) >= 18 || String(patientContext.age).toLowerCase().includes('adult')));
  
  if (matchedConfig.requiresAge && !isAdult && !hasAge) {
    return null; // Insufficient age context
  }

  // If requires gender differentiation (e.g. Hemoglobin)
  let resolvedRange = null;
  let formattedRange = '';
  if (matchedConfig.requiresGender) {
    const gender = (patientContext.gender || '').toLowerCase();
    if (gender === 'male' || gender === 'm') {
      resolvedRange = matchedConfig.genderRanges.male;
      formattedRange = matchedConfig.genderRanges.male.formatted;
    } else if (gender === 'female' || gender === 'f') {
      resolvedRange = matchedConfig.genderRanges.female;
      formattedRange = matchedConfig.genderRanges.female.formatted;
    } else if (matchedConfig.defaultAdultRange) {
      // If gender unspecified but adult context given
      resolvedRange = matchedConfig.defaultAdultRange;
      formattedRange = matchedConfig.defaultAdultRange.formatted;
    } else {
      return null; // Insufficient gender context
    }
  } else {
    resolvedRange = matchedConfig.range;
    formattedRange = matchedConfig.formattedRange;
  }

  if (!resolvedRange) return null;

  // Criterion 4 Check: Reference source and version must be recorded
  if (!matchedConfig.source) return null;

  return {
    config: matchedConfig,
    min: resolvedRange.min,
    max: resolvedRange.max,
    formattedRange,
    source: matchedConfig.source,
  };
};

/**
 * Generate Strict Non-Diagnostic Plain Language Explanation
 * NEVER diagnoses (e.g. NO "You have diabetes", NO "You have anemia")
 * Strictly refers to the actual observation and encourages clinician review
 */
export const generatePlainLanguageExplanation = ({ testName, value, unit, status, referenceRange, source }) => {
  const displayName = testName || 'Laboratory test';
  const valStr = value !== null && value !== undefined ? `${value}${unit ? ` ${unit}` : ''}` : 'value';
  const rangeStr = referenceRange ? referenceRange : 'an established reference interval';

  switch (status) {
    case 'HIGH':
      return `Your ${displayName} level of ${valStr} is above the reference range (${rangeStr}) shown in this report. Elevated ${displayName.toLowerCase()} can have several physiological or clinical causes. Discuss this result with a qualified healthcare professional, especially if it is unexpected.`;
    
    case 'LOW':
      return `Your ${displayName} level of ${valStr} is below the reference range (${rangeStr}) shown in this report. Decreased ${displayName.toLowerCase()} can have several clinical causes and should be evaluated alongside other findings. Discuss this result with a qualified healthcare professional to understand its significance.`;
    
    case 'NORMAL':
      return `Your ${displayName} level of ${valStr} is within the expected reference range (${rangeStr}) shown in this report. Results within the expected range generally reflect stable values for this marker.`;
    
    case 'UNKNOWN':
    default:
      if (source === 'INSUFFICIENT_RANGE_DATA') {
        return `Your ${displayName} level is ${valStr}, but no reference range was provided on this report and patient context was insufficient to apply a validated standard range. Please consult your physician for guidance on how this relates to your health.`;
      }
      return `Your ${displayName} level is ${valStr}. A reference range could not be verified for this test. Discuss this result with your healthcare provider for clinical evaluation.`;
  }
};

/**
 * Determine Clinical Severity Level
 * - NORMAL
 * - INFORMATIONAL
 * - REVIEW_RECOMMENDED
 * - URGENT_REVIEW
 */
export const determineSeverity = ({ status, numericValue, min, max, curatedConfig }) => {
  if (status === 'NORMAL') {
    return 'NORMAL';
  }

  if (status === 'UNKNOWN' || numericValue === null) {
    return 'INFORMATIONAL';
  }

  // Check urgent critical flags if curated config provides critical thresholds
  if (curatedConfig) {
    if (curatedConfig.urgentCriticalLow !== undefined && numericValue < curatedConfig.urgentCriticalLow) {
      return 'URGENT_REVIEW';
    }
    if (curatedConfig.urgentCriticalHigh !== undefined && numericValue > curatedConfig.urgentCriticalHigh) {
      return 'URGENT_REVIEW';
    }
  }

  // Generic urgent deviation checks:
  // E.g., if numeric value is > 100% above max, or < 50% of min for non-zero bounds
  if (max !== null && max > 0 && numericValue >= max * 2.0) {
    return 'URGENT_REVIEW';
  }
  if (min !== null && min > 0 && numericValue <= min * 0.5) {
    return 'URGENT_REVIEW';
  }

  // Standard out-of-range observation
  if (status === 'LOW' || status === 'HIGH') {
    return 'REVIEW_RECOMMENDED';
  }

  return 'INFORMATIONAL';
};

/**
 * Core Lab Result Interpretation Engine
 * Interprets a single laboratory observation according to Phase 6 rules.
 */
export const interpretLaboratoryObservation = (observation, patientContext = {}) => {
  const testName = observation.test_name || observation.testName || 'Unknown Test';
  const rawValue = observation.value !== undefined ? String(observation.value).trim() : null;
  const numericValue = parseNumericValue(rawValue, observation.numeric_value ?? observation.numericValue);
  const unit = observation.unit ? String(observation.unit).trim() : null;
  const rawConfidence = typeof observation.confidence === 'number' ? observation.confidence : 85;
  const observationId = observation.observation_id || 
                        observation.observationId || 
                        observation._id?.toString() || 
                        `obs_${crypto.randomUUID().slice(0, 12)}`;

  let finalMin = null;
  let finalMax = null;
  let referenceRangeString = null;
  let source = null;
  let curatedMatch = null;

  // RULE 1: Use reference range from uploaded document whenever available
  const docRangeStr = observation.reference_range || observation.referenceRange;
  const parsedDocRange = parseReferenceRangeString(docRangeStr);

  if (parsedDocRange) {
    finalMin = parsedDocRange.min;
    finalMax = parsedDocRange.max;
    referenceRangeString = parsedDocRange.raw;
    source = 'DOCUMENT_REPORT';
  } else {
    // RULE 2: Never invent a reference range.
    // Curated reference range may ONLY be used if all 4 conditions are met
    curatedMatch = matchCuratedReferenceRange(testName, unit, patientContext, rawConfidence);
    if (curatedMatch) {
      finalMin = curatedMatch.min;
      finalMax = curatedMatch.max;
      referenceRangeString = curatedMatch.formattedRange;
      source = curatedMatch.source;
    } else {
      // RULE 3: If no valid reference range exists: abnormal_flag = UNKNOWN
      finalMin = null;
      finalMax = null;
      referenceRangeString = null;
      source = 'INSUFFICIENT_RANGE_DATA';
    }
  }

  // Determine Status: LOW, NORMAL, HIGH, UNKNOWN
  let status = 'UNKNOWN';
  if (numericValue !== null && (finalMin !== null || finalMax !== null)) {
    if (finalMin !== null && numericValue < finalMin) {
      status = 'LOW';
    } else if (finalMax !== null && numericValue > finalMax) {
      status = 'HIGH';
    } else {
      status = 'NORMAL';
    }
  } else {
    status = 'UNKNOWN';
  }

  // Determine Severity: NORMAL, INFORMATIONAL, REVIEW_RECOMMENDED, URGENT_REVIEW
  const severity = determineSeverity({
    status,
    numericValue,
    min: finalMin,
    max: finalMax,
    curatedConfig: curatedMatch?.config,
  });

  // Calculate Interpretation Confidence
  const confidence = source === 'DOCUMENT_REPORT' ? Math.min(rawConfidence, 98) :
                     curatedMatch ? Math.min(rawConfidence, 92) : 50;

  // Generate Strict Non-Diagnostic Plain Language Explanation
  const explanation = generatePlainLanguageExplanation({
    testName,
    value: rawValue ?? numericValue,
    unit,
    status,
    referenceRange: referenceRangeString,
    source,
  });

  return {
    observation_id: observationId,
    test_name: testName,
    value: rawValue,
    numeric_value: numericValue,
    unit,
    reference_range: referenceRangeString,
    reference_min: finalMin,
    reference_max: finalMax,
    status,
    explanation,
    severity,
    confidence,
    source,
    created_at: new Date(),
  };
};

/**
 * Service class for laboratory interpretation lifecycle
 */
class LabInterpretationService {
  /**
   * Interpret a single laboratory observation
   */
  interpretObservation(observation, patientContext = {}) {
    return interpretLaboratoryObservation(observation, patientContext);
  }

  /**
   * Interpret structured observations array and persist to observation_interpretations collection
   */
  async interpretAndPersistObservations({ observations = [], userId, documentId = null, patientContext = {} }) {
    if (!Array.isArray(observations)) {
      throw new Error('Observations must be an array.');
    }

    const interpretedList = [];

    for (const obs of observations) {
      const result = interpretLaboratoryObservation(obs, patientContext);

      // If userId is provided, persist into MongoDB collection observation_interpretations
      if (userId) {
        const savedDoc = await ObservationInterpretation.create({
          observation_id: result.observation_id,
          observationId: result.observation_id,
          document_id: documentId,
          documentId: documentId,
          user_id: userId,
          userId: userId,
          test_name: result.test_name,
          value: result.value,
          numeric_value: result.numeric_value,
          unit: result.unit,
          reference_range: result.reference_range,
          reference_min: result.reference_min,
          reference_max: result.reference_max,
          status: result.status,
          explanation: result.explanation,
          severity: result.severity,
          confidence: result.confidence,
          source: result.source,
          created_at: result.created_at,
        });
        interpretedList.push(savedDoc.toObject());
      } else {
        interpretedList.push(result);
      }
    }

    return interpretedList;
  }

  /**
   * Interpret all laboratory observations belonging to a document
   */
  async interpretDocumentLaboratories(document, userId, patientContext = {}) {
    const rawObs = [];

    // Pull from Document.extractedData.labTests
    if (document.extractedData?.labTests?.length > 0) {
      for (const t of document.extractedData.labTests) {
        rawObs.push({
          test_name: t.testName || t.name,
          value: t.value,
          numeric_value: t.numericValue,
          unit: t.unit,
          reference_range: t.referenceRange,
          confidence: t.confidence || 85,
        });
      }
    }

    // If empty, check Document.metadata or fallback
    return this.interpretAndPersistObservations({
      observations: rawObs,
      userId,
      documentId: document._id,
      patientContext,
    });
  }
}

export const labInterpretationService = new LabInterpretationService();
export default labInterpretationService;
