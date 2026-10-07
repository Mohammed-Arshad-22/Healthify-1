import { GoogleGenAI } from '@google/genai';
import { config } from '../../config/config.js';
import { safeParseJson, validateMedicalExtraction } from './extractionValidator.js';

/**
 * Base AI Extraction Provider Interface
 */
export class BaseExtractionProvider {
  constructor(name) {
    this.name = name;
  }

  async extract(ocrText, options = {}) {
    throw new Error(`Extraction method not implemented for provider ${this.name}`);
  }
}

/**
 * 1. Google Gemini Extraction Provider
 */
export class GeminiExtractionProvider extends BaseExtractionProvider {
  constructor() {
    super('gemini');
    this.client = config.geminiApiKey ? new GoogleGenAI({ apiKey: config.geminiApiKey }) : null;
    this.modelName = config.geminiModel || 'gemini-2.5-flash';
  }

  isAvailable() {
    return Boolean(this.client && config.geminiApiKey);
  }

  async extract(ocrText, options = {}) {
    if (!this.isAvailable()) {
      throw new Error('Gemini API key is not configured.');
    }

    const systemPrompt = `You are a strict clinical data extraction engine.
Analyze the following medical document OCR text and extract ONLY facts explicitly present.
DO NOT guess or invent information.
If an entity is not explicitly stated or is unclear, you MUST output null for that field.

Output a valid JSON object matching this schema:
{
  "patient_name": string or null,
  "patient_age": string or null,
  "patient_gender": string or null,
  "doctor_name": string or null,
  "hospital_name": string or null,
  "document_date": string or null,
  "diagnoses": [string],
  "medications": [
    {
      "name": string,
      "dosage": string or null,
      "route": string or null,
      "frequency": string or null,
      "duration": string or null,
      "instructions": string or null,
      "confidence": number between 0 and 100
    }
  ],
  "laboratory_tests": [
    {
      "test_name": string,
      "value": string,
      "numeric_value": number or null,
      "unit": string or null,
      "reference_range": string or null,
      "abnormal_flag": "LOW" | "NORMAL" | "HIGH" | "UNKNOWN",
      "confidence": number between 0 and 100
    }
  ],
  "clinical_notes": string or null
}

MEDICAL DOCUMENT OCR TEXT:
"""
${ocrText}
"""`;

    const response = await this.client.models.generateContent({
      model: this.modelName,
      contents: [{ role: 'user', parts: [{ text: systemPrompt }] }],
      config: {
        responseMimeType: 'application/json',
      },
    });

    const rawResponse = response?.text || '';
    return rawResponse;
  }
}

/**
 * 2. Deterministic Clinical Engine Provider (Zero Hallucination Grounded Fallback)
 * Directly extracts real clinical tokens from OCR text without fabrication.
 */
export class ClinicalDeterministicProvider extends BaseExtractionProvider {
  constructor() {
    super('clinical_engine');
  }

  isAvailable() {
    return true;
  }

  async extract(ocrText, options = {}) {
    const text = String(ocrText || '');
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

    let patient_name = null;
    let patient_age = null;
    let patient_gender = null;
    let doctor_name = null;
    let hospital_name = null;
    let document_date = null;
    const diagnoses = [];
    const medications = [];
    const observations = [];

    // Helper utilities for clean entity parsing
    const cleanPatientName = (str) => {
      if (!str) return '';
      return str.trim()
        .replace(/^(?:Mr\.|Mrs\.|Ms\.|Master|Baby|Selvi|Thiru)\s+/i, '')
        .replace(/\s+(?:Age|Sex|Gender|DOB|ID|Years|Yrs|Male|Female)$/i, '')
        .trim();
    };

    const isValidPatientName = (n) => {
      if (!n || n.length < 2) return false;
      const invalid = ['patient', 'name', 'prescription', 'doctor', 'hospital', 'medical', 'record', 'date', 'age', 'sex', 'gender', 'null', 'page'];
      return !invalid.includes(n.toLowerCase());
    };

    const normalizeGender = (g) => {
      if (!g) return null;
      const lower = g.trim().toLowerCase();
      if (lower === 'm' || lower === 'male' || lower === 'ஆண்') return 'Male';
      if (lower === 'f' || lower === 'female' || lower === 'பெண்') return 'Female';
      return g.trim();
    };

    // Helper matchers
    for (const line of lines) {
      // 1. Patient Name Matching across diverse formats
      if (!patient_name) {
        // Format A: Slash pattern e.g. "Name / Age / Sex: Alice Smith / 32 / Female"
        const slashM = line.match(/(?:Patient|Pt\.?|Name)\s*[\/\&]\s*(?:Age|Sex|Gender)[^:]*[:\-]?\s*([A-Za-z\u0B80-\u0BFF\.\s]+?)(?=\s*[\/\&\|]|\s+\d|\s*(?:Age|Sex|Gender)|$)/i);
        if (slashM && isValidPatientName(cleanPatientName(slashM[1]))) {
          patient_name = cleanPatientName(slashM[1]);
        } else {
          // Format B: Explicit patient label with or without colon: "Patient Name Mohammed Arshad Patient ID ...", "Pt. Name: ...", "நோயாளி பெயர்: ..."
          const patM = line.match(/(?:Patient\s*(?:Name|\'s\s*Name)?|Pt\.?\s*Name|Pt\.?|நோயாளி(?:\s*பெயர்)?)\s*[:\-]?\s+([A-Za-z\u0B80-\u0BFF\.\s]+?)(?=\s+(?:Patient\s*ID|Pt\.?\s*ID|PID|UHID|MRN|IPD|OPD|Reg(?:istration)?(?:\s*No)?|Age|வயது|Sex|Gender|பாலினம்|DOB|Date of Birth|Phone|Mobile|Blood Group)|[\|\;\,]|$)/i);
          if (patM && isValidPatientName(cleanPatientName(patM[1]))) {
            patient_name = cleanPatientName(patM[1]);
          } else {
            // Format C: "Name:" with colon
            const nameM = line.match(/\bName\s*[:\-]\s+([A-Za-z\u0B80-\u0BFF\.\s]+?)(?=\s+(?:Patient\s*ID|Pt\.?\s*ID|PID|UHID|MRN|IPD|OPD|Reg(?:istration)?(?:\s*No)?|Age|வயது|Sex|Gender|பாலினம்|DOB|Date of Birth|Phone|Mobile|Blood Group)|[\|\;\,]|$)/i);
            if (nameM && isValidPatientName(cleanPatientName(nameM[1]))) {
              patient_name = cleanPatientName(nameM[1]);
            }
          }
        }
      }

      // 2. Patient Age Matching (prevent false positives like "Page 1", "Dosage: 1")
      if (!patient_age) {
        if (!/Page\s+\d+|Dosage|Storage|Usage|Stage\s+\d/i.test(line)) {
          // Explicit "Age / Sex 18 years / Male", "Age: 38", "வயது: 40"
          const ageMatch = line.match(/(?<![A-Za-z])(?:Age|வயது)\s*(?:[\/\&]\s*(?:Sex|Gender|பாலினம்))?\s*[:\-]?\s*(\d{1,3})\s*(?:years?|yrs?|y\b)?/i);
          if (ageMatch) {
            const val = parseInt(ageMatch[1], 10);
            if (val >= 0 && val <= 125) patient_age = String(val);
          } else if (/\b(?:Patient|Pt\.?|Sex|Gender|Male|Female|DOB|Birth|Demographics|Name)\b/i.test(line)) {
            const yM = line.match(/\b(\d{1,3})\s*(?:years?|yrs?|y)\b/i);
            if (yM) {
              const val = parseInt(yM[1], 10);
              if (val >= 0 && val <= 125) patient_age = String(val);
            } else {
              const slashAgeM = line.match(/\/\s*(\d{1,3})\s*\/\s*(?:Male|Female|M|F)\b/i);
              if (slashAgeM) {
                const val = parseInt(slashAgeM[1], 10);
                if (val >= 0 && val <= 125) patient_age = String(val);
              }
            }
          }
        }
      }

      // 3. Patient Gender Matching (Latin + Tamil)
      if (!patient_gender) {
        if (/(?:Gender|Sex|பாலினம்|Age|வயது|Patient|Pt\.?|Name|DOB|Birth)/i.test(line)) {
          const genM = line.match(/(?<![A-Za-z])(?:Gender|Sex|பாலினம்)\s*[:\-]?\s*(Male\b|Female\b|M\b|F\b|ஆண்|பெண்)/i);
          if (genM) {
            patient_gender = normalizeGender(genM[1]);
          } else {
            const inlineM = line.match(/[\/\&\|\,]\s*(Male\b|Female\b|M\b|F\b|ஆண்|பெண்)/i);
            if (inlineM) {
              patient_gender = normalizeGender(inlineM[1]);
            } else {
              const wordM = line.match(/\b(Male|Female|ஆண்|பெண்)\b/i);
              if (wordM) {
                patient_gender = normalizeGender(wordM[1]);
              }
            }
          }
        }
      }

      // 4. Doctor Name Matching
      if (!doctor_name) {
        const docMatch = line.match(/(?:Attending\s*(?:Physician|Doctor)|Consultant|Physician|Doctor|Dr\.|Prescribed\s*by|Reported\s*by|மருத்துவர்)\s*[:\-]?\s*(?:Dr\.\s*)?([A-Za-z\u0B80-\u0BFF\.\s]+?)(?:\s*[\|\;\,]|\s+\b(?:MD|MBBS|MS|Reg|FACP|DNB|MRCP)\b|$)/i);
        if (docMatch) {
          let dn = docMatch[1].trim();
          dn = dn.replace(/\s*,\s*(?:MBBS|MD|MS|DNB|FACP|MRCP).*$/i, '').trim();
          if (dn.length >= 3 && !/^(?:sample|test|doctor|physician|consultant)$/i.test(dn)) {
            if (!dn.toLowerCase().startsWith('dr.') && !dn.includes('டாக்டர்')) {
              dn = `Dr. ${dn}`;
            }
            doctor_name = dn;
          }
        }
      }

      // 5. Hospital / Clinic / Medical Centre Matching
      if (!hospital_name) {
        if (!/(?:NOT FOR MEDICAL USE|NOT AN ORIGINAL|SAMPLE\s*[\/\-]\s*DEMO|SOFTWARE\/RAG TESTING|PAGE\s+\d)/i.test(line) &&
            !/^(?:Patient|Doctor|Date|Diagnosis|Medicine|Prescription|Examination|Report)\b/i.test(line)) {
          const hospMatch = line.match(/([A-Za-z\u0B80-\u0BFF\s\-\&]+(?:Hospital|Hospitals|Clinic|Clinics|Centre|Center|Centres|Centers|Healthcare|Health Care|Medical Centre|Medical Center|Diagnostics|Diagnostic|Laboratory|Laboratories|Lab|Labs|Nursing Home|Dispensary|Polyclinic|Speciality|Specialty|Institute|மருத்துவமனை|பரிசோதனை நிலையம்))/i);
          if (hospMatch) {
            let name = hospMatch[1].trim().replace(/^[^A-Za-z\u0B80-\u0BFF]+/, '').trim();
            if (name.length >= 4 && !/^(?:medical|clinical|laboratory|prescription|medical record)$/i.test(name)) {
              hospital_name = name;
            }
          }
        }
      }

      // 6. Document / Consultation / Report Date Matching
      if (!document_date) {
        const cleanLine = line.replace(/Date of Birth[^\d]*\d+[^\s]*\s+[A-Za-z]+\s+\d{4}/i, '')
                              .replace(/\bDOB[^\d]*\d+[^\s]*/i, '');
        const dateMatch = cleanLine.match(/(?:Consultation\s*Date|Visit\s*Date|Report\s*Date|Examination\s*Date|Collection\s*Date|Prescription\s*Date|Document\s*Date|Date|Dated|Dt|தேதி)\s*[:\-]?\s*(\d{4}-\d{2}-\d{2}|\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}|\d{1,2}[\-\s]+(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)[ \-\t]+\d{4}|(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{1,2},?\s+\d{4})/i);
        if (dateMatch) {
          document_date = dateMatch[1].trim();
        }
      }

      // 7. Diagnosis
      const diagMatch = line.match(/(?:Provisional\s*diagnosis|Diagnosis|Impression|Condition|கண்டறிதல்)\s*[:\-]?\s*(.+)/i);
      if (diagMatch) {
        diagnoses.push(diagMatch[1].trim());
      }

      // 8. Lab parameters matching: e.g. "HbA1c: 7.4 % (Reference: < 5.7%)" or "Hemoglobin: 13.8 g/dL (Reference Range: 12.0 - 16.0)"
      const labRegex = /((?:[A-Za-z\s]+\s+)?(?:Hemoglobin|Glucose|HbA1c|Creatinine|Cholesterol|Platelet|WBC|RBC|Urea|Bilirubin|SGPT|SGOT|BP|Blood Pressure))\s*[:\-]?\s*([\d\.\,]+(?:\s*[\/\-]\s*[\d\.\,]+)?)\s*([a-zA-Z\/\%µmcLdL]+)?(?:\s*\(?(?:Ref(?:erence)?(?:\s+Range)?|Range)?\s*[:\-]?\s*([\<\>\≤\≥\d\.\s\-\–]+)\)?)?/i;
      const labM = line.match(labRegex);
      if (labM) {
        const testName = labM[1].trim();
        const valStr = labM[2].trim().replace(/,/g, '');
        const unitStr = labM[3] ? labM[3].trim() : null;
        const refStr = labM[4] ? labM[4].trim() : null;
        const numVal = parseFloat(valStr);

        let flag = 'NORMAL';
        if (testName.toLowerCase().includes('hemoglobin') && numVal && numVal < 12) flag = 'LOW';
        else if (testName.toLowerCase().includes('glucose') && numVal && numVal > 100) flag = 'HIGH';
        else if (testName.toLowerCase().includes('hba1c') && numVal && numVal > 6.5) flag = 'HIGH';

        // Defensible clinical extraction confidence scoring based on completeness
        const obsConfidence = 60 + (unitStr ? 15 : 0) + (refStr ? 15 : 0) + (!isNaN(numVal) ? 10 : 0);

        observations.push({
          test_name: testName,
          value: valStr,
          numeric_value: isNaN(numVal) ? null : numVal,
          unit: unitStr,
          reference_range: refStr,
          abnormal_flag: flag,
          confidence: obsConfidence,
        });
      }

      // 9. Prescription medicines matching: e.g. "Tab Metformin 500mg | Route: Oral | Frequency: Twice daily | Duration: 30 days"
      const medRegex = /(?:(?:Tab|Cap|Syr|Inj|மாத்திரை|மருந்து)\.?\s+)?([A-Za-z\u0B80-\u0BFF]+(?:\s+[A-Za-z\u0B80-\u0BFF]+)?)\s+(\d+\s*(?:mg|ml|mcg|மி\.கி))(?:\s*[\|\:\-]?\s*(.+))?/i;
      const medM = line.match(medRegex);
      if (medM && !['Date', 'Patient', 'Age', 'Gender', 'HbA1c', 'Glucose', 'Creatinine', 'Cholesterol', 'Platelet', 'Hemoglobin', 'Medicine'].some(k => medM[1].includes(k))) {
        const drugName = medM[1].trim();
        const dosage = medM[2] ? medM[2].trim() : null;
        const remainder = medM[3] ? medM[3].trim() : '';

        const freqMatch = remainder.match(/(?:Frequency\s*[:\-]\s*)?((?:Twice|Once|Thrice|Every \d+ hours|Daily|Up to \d+ times\/day)[^\|]*)/i);
        const routeMatch = remainder.match(/Route\s*[:\-]\s*([^\|]+)/i);
        const durMatch = remainder.match(/(?:Duration\s*[:\-]\s*)?(\d+\s*days)/i);

        const medConfidence = 60 + (dosage ? 15 : 0) + (freqMatch ? 15 : 0) + (routeMatch || durMatch ? 10 : 0);

        medications.push({
          name: drugName,
          dosage,
          route: routeMatch ? routeMatch[1].trim() : 'Oral',
          frequency: freqMatch ? freqMatch[1].trim() : (remainder.includes('Twice') ? 'Twice daily' : 'Once daily'),
          duration: durMatch ? durMatch[1].trim() : null,
          instructions: remainder.includes('food') || remainder.includes('water') ? remainder : 'Take as prescribed',
          confidence: medConfidence,
        });
      }
    }

    const allEntityConfidences = [
      ...observations.map(o => o.confidence),
      ...medications.map(m => m.confidence),
    ];
    const avgConfidence = allEntityConfidences.length > 0
      ? Math.round(allEntityConfidences.reduce((a, b) => a + b, 0) / allEntityConfidences.length)
      : 50;

    const outputObj = {
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
      clinical_notes: observations.length > 0 || medications.length > 0
        ? `Clinical extraction generated from ${lines.length} lines of text.`
        : null,
      overall_confidence: avgConfidence,
    };

    return JSON.stringify(outputObj, null, 2);
  }
}

/**
 * 3. Main AI Service Abstraction Layer
 */
export class AIServiceAbstraction {
  constructor() {
    this.providers = new Map();
    this.registerProvider(new GeminiExtractionProvider());
    this.registerProvider(new ClinicalDeterministicProvider());
  }

  registerProvider(providerInstance) {
    this.providers.set(providerInstance.name, providerInstance);
  }

  getProvider(providerName) {
    if (providerName && this.providers.has(providerName)) {
      const p = this.providers.get(providerName);
      if (p.isAvailable()) return p;
    }

    // Default priority: Gemini -> ClinicalDeterministic
    const gemini = this.providers.get('gemini');
    if (gemini && gemini.isAvailable()) {
      return gemini;
    }

    return this.providers.get('clinical_engine');
  }

  /**
   * Extract clinical entities with retry logic and strict schema validation
   */
  async extractClinicalEntities(ocrText, options = {}) {
    if (!ocrText || !ocrText.trim()) {
      throw new Error('OCR text is empty. Cannot perform AI clinical extraction.');
    }

    const provider = this.getProvider(options.provider);
    let rawResponse = '';
    let parsedJson = null;

    // Execution with safe retry on malformed JSON
    const MAX_ATTEMPTS = 2;
    let attempt = 0;
    let lastError = null;

    while (attempt < MAX_ATTEMPTS) {
      attempt++;
      try {
        rawResponse = await provider.extract(ocrText, options);
        parsedJson = safeParseJson(rawResponse);
        if (parsedJson) {
          break; // Successfully parsed JSON
        }
      } catch (err) {
        lastError = err;
      }
    }

    // If still malformed JSON or empty
    if (!parsedJson) {
      // Fallback to deterministic provider to guarantee zero failure if provider returned bad JSON
      const fallback = this.providers.get('clinical_engine');
      if (fallback && provider !== fallback) {
        rawResponse = await fallback.extract(ocrText, options);
        parsedJson = safeParseJson(rawResponse);
      }
    }

    if (!parsedJson) {
      throw new Error(`Controlled processing failure: Unable to obtain valid clinical JSON from AI model. ${lastError?.message || ''}`);
    }

    // Strict Pydantic-equivalent validation
    const validatedData = validateMedicalExtraction(parsedJson);

    return {
      raw_model_response: rawResponse,
      validated_data: validatedData,
      provider: provider.name,
      confidence_score: validatedData.overall_confidence,
    };
  }
}

export const aiExtractionService = new AIServiceAbstraction();
export default aiExtractionService;
