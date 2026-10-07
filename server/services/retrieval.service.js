import User from '../models/User.js';
import Document from '../models/Document.js';
import DocumentExtraction from '../models/DocumentExtraction.js';
import AIExtraction from '../models/AIExtraction.js';
import ObservationInterpretation from '../models/ObservationInterpretation.js';
import Medication from '../models/Medication.js';
import HealthRecord from '../models/HealthRecord.js';
import Doctor from '../models/Doctor.js';
import LabMetric from '../models/LabMetric.js';
import { buildStructuredHealthProfile } from './healthProfile.service.js';

/**
 * Phase 8: Supported Clinical & Query Intents
 */
export const RETRIEVAL_INTENTS = {
  DOCTOR: 'DOCTOR',
  MEDICATION: 'MEDICATION',
  DOSAGE: 'DOSAGE',
  LAB_RESULT: 'LAB_RESULT',
  ABNORMAL_LAB: 'ABNORMAL_LAB',
  DIAGNOSIS: 'DIAGNOSIS',
  PRESCRIPTION: 'PRESCRIPTION',
  DOCUMENT_SUMMARY: 'DOCUMENT_SUMMARY',
  INSTRUCTIONS: 'INSTRUCTIONS',
  TIMELINE: 'TIMELINE',
  COMPARISON: 'COMPARISON',
  GENERAL_EXPLANATION: 'GENERAL_EXPLANATION',
  UNKNOWN: 'UNKNOWN',
};

/**
 * Phase 8: Retrieval Strategy Taxonomy
 */
export const RETRIEVAL_STRATEGIES = {
  STRUCTURED_DATABASE: 'STRUCTURED_DATABASE',
  OCR_DOCUMENT_TEXT: 'OCR_DOCUMENT_TEXT',
  TIMELINE_DATABASE: 'TIMELINE_DATABASE',
  METADATA_FILTERED_VECTOR_SEARCH: 'METADATA_FILTERED_VECTOR_SEARCH',
  HYBRID_STRUCTURED_AND_OCR: 'HYBRID_STRUCTURED_AND_OCR',
  REJECTED_IRRELEVANT: 'REJECTED_IRRELEVANT',
  NONE: 'NONE',
};

// Common medical entities with multilingual aliases (English, Tamil, Hindi, Telugu)
export const RECOGNIZED_MEDICAL_ENTITIES = [
  { key: 'hemoglobin', aliases: ['hemoglobin', 'hb', 'hgb', 'ஹீமோகுளோபின்', 'हीमोग्लोबिन', 'హిమోగ్లోబిన్'] },
  { key: 'hba1c', aliases: ['hba1c', 'glycated hemoglobin', 'a1c', 'hb a1c', 'எச்பிஏ1சி', 'एचबीए1सी'] },
  { key: 'creatinine', aliases: ['creatinine', 'serum creatinine', 'கிரியேட்டினின்', 'क्रिएटिनिन', 'క్రియాటినిన్'] },
  { key: 'platelets', aliases: ['platelet', 'platelets', 'plt', 'platelet count', 'பிளேட்லெட்', 'प्लेटलेट्स', 'ప్లేట్‌లెట్స్'] },
  { key: 'wbc', aliases: ['wbc', 'white blood cells', 'white blood cell count', 'total leukocyte count', 'tlc', 'வெள்ளை அணுக்கள்', 'श्वेत रक्त कोशिकाएं'] },
  { key: 'rbc', aliases: ['rbc', 'red blood cells', 'red blood cell count', 'சிவப்பு அணுக்கள்', 'लाल रक्त कोशिकाएं'] },
  { key: 'tsh', aliases: ['tsh', 'thyroid stimulating hormone', 'thyroid', 'தைராய்டு', 'थायरॉयड', 'థైరాయిడ్'] },
  { key: 'cholesterol', aliases: ['cholesterol', 'total cholesterol', 'lipid', 'ldl', 'hdl', 'triglycerides', 'கொலஸ்ட்ரால்', 'कोलेस्ट्रॉल', 'కొలెస్ట్రాల్'] },
  { key: 'glucose', aliases: ['glucose', 'blood sugar', 'fasting blood glucose', 'post prandial glucose', 'fbs', 'ppbs', 'ரத்த சர்க்கரை', 'ब्लड शुगर', 'బ్లడ్ షుగర్'] },
  { key: 'blood_pressure', aliases: ['blood pressure', 'bp', 'systolic', 'diastolic', 'இரத்த அழுத்தம்', 'ब्लड प्रेशर', 'రక్తపోటు'] },
  { key: 'vitamin_b12', aliases: ['vitamin b12', 'b12', 'cobalamin', 'வைட்டமின் பி12', 'विटामिन बी12'] },
  { key: 'vitamin_d', aliases: ['vitamin d', '25-hydroxy vitamin d', 'vit d', 'வைட்டமின் டி', 'विटामिन डी'] },
  { key: 'iron', aliases: ['iron', 'serum iron', 'ferritin', 'total iron binding capacity', 'tibc', 'இரும்புச்சத்து', 'आयरन'] },
  { key: 'uric_acid', aliases: ['uric acid', 'serum uric acid'] },
  { key: 'bilirubin', aliases: ['bilirubin', 'total bilirubin', 'direct bilirubin'] },
  { key: 'liver_enzymes', aliases: ['sgot', 'sgpt', 'ast', 'alt', 'liver enzymes'] },
  { key: 'electrolytes', aliases: ['sodium', 'potassium', 'chloride', 'electrolytes'] },
];

/**
 * Stop words for tokenization and vector computation
 */
const STOP_WORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'of', 'in', 'on', 'at', 'to', 'for', 'with', 'by',
  'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do',
  'does', 'did', 'can', 'could', 'should', 'would', 'may', 'might', 'must', 'my',
  'your', 'his', 'her', 'its', 'our', 'their', 'this', 'that', 'these', 'those',
  'what', 'which', 'who', 'whom', 'whose', 'when', 'where', 'why', 'how', 'tell',
  'show', 'give', 'me', 'please', 'i', 'you', 'he', 'she', 'it', 'we', 'they',
]);

/**
 * Tokenize string into meaningful stems/words
 */
function tokenize(text = '') {
  if (!text || typeof text !== 'string') return [];
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(token => token.length > 1 && !STOP_WORDS.has(token));
}

/**
 * Cosine similarity between two token vectors
 */
function computeCosineSimilarity(tokensA, tokensB) {
  if (!tokensA.length || !tokensB.length) return 0.0;

  const freqA = {};
  tokensA.forEach(t => { freqA[t] = (freqA[t] || 0) + 1; });

  const freqB = {};
  tokensB.forEach(t => { freqB[t] = (freqB[t] || 0) + 1; });

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (const t in freqA) {
    normA += freqA[t] * freqA[t];
    if (freqB[t]) {
      dotProduct += freqA[t] * freqB[t];
    }
  }

  for (const t in freqB) {
    normB += freqB[t] * freqB[t];
  }

  if (normA === 0 || normB === 0) return 0.0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

export class RetrievalService {
  /**
   * 1. Question Understanding & Intent Router
   * Maps question to one of the 13 supported intents
   */
  classifyQueryIntent(query = '') {
    const q = (query || '').toLowerCase().trim();
    if (!q) return RETRIEVAL_INTENTS.UNKNOWN;

    // Check for clear non-medical queries
    const nonMedicalRegex = /(weather|temperature today|forecast|cricket|football|movie|song|actor|flight|hotel|ticket booking|joke|capital of|who is president|who is prime minister|railway)/i;
    if (nonMedicalRegex.test(q)) {
      return RETRIEVAL_INTENTS.UNKNOWN;
    }

    // 1. TIMELINE Intent
    const timelineRegex = /(timeline|medical timeline|health timeline|chronolog|history of (my )?(records|visits|reports|consultations)|past events|visit history|కాలక్రమం|காலவரிசை|समयरेखा)/i;
    if (timelineRegex.test(q)) {
      return RETRIEVAL_INTENTS.TIMELINE;
    }

    // 2. COMPARISON Intent
    const compareRegex = /(compare|comparison|trend|changed over time|difference between (my )?reports|previous vs (latest|current)|earlier report|higher or lower than before|ஒப்பீடு|तुलना)/i;
    if (compareRegex.test(q)) {
      return RETRIEVAL_INTENTS.COMPARISON;
    }

    // 3. DOSAGE Intent (Targeted before general medication)
    const dosageRegex = /(dosage|dose|how much (mg|medicine|tablet|dose)|mg prescribed|units prescribed|how many mg|how many tablets|frequency of taking|how often should i take|dosage of|எவ்வளவு அளவு|மருந்து அளவு|खुराक)/i;
    if (dosageRegex.test(q)) {
      return RETRIEVAL_INTENTS.DOSAGE;
    }

    // 4. INSTRUCTIONS Intent
    const instructionRegex = /(instruction|instructions|how long (should|to|do) (i )?(take|use|continue)|how (should|to) (i )?take|duration of (treatment|taking|this medicine)|how many days (should|to) (i )?take|before (meals|food)|after (meals|food)|empty stomach|precaution|precautions|directions for use|special advice|doctor advice|வழிகாட்டுதல்|निर्देश)/i;
    if (instructionRegex.test(q)) {
      return RETRIEVAL_INTENTS.INSTRUCTIONS;
    }

    // 5. PRESCRIPTION Intent
    const prescriptionRegex = /(prescription|prescriptions|rx|rx document|doctor prescription|explain (my )?prescription|show (my )?prescription|view prescription|what does my prescription say|மருந்துச் சீட்டு|नुस्खा)/i;
    if (prescriptionRegex.test(q)) {
      return RETRIEVAL_INTENTS.PRESCRIPTION;
    }

    // 6. MEDICATION Intent
    const medRegex = /(medicine|medicines|medication|medications|drug|drugs|tablet|tablets|pill|pills|prescribe|prescribed|taking any medicines|current medicines|மருந்து|दवा|दवाइयां|మందు)/i;
    if (medRegex.test(q)) {
      return RETRIEVAL_INTENTS.MEDICATION;
    }

    // 7. DOCTOR Intent
    const doctorRegex = /(who is my doctor|who's my doctor|doctor's name|doctor name|my doctor|physician|attending doctor|consulting doctor|which doctor|primary doctor|who treated me|who wrote|doctor contact|மருத்துவர்|डॉक्टर|వైద్యుడు)/i;
    if (doctorRegex.test(q)) {
      return RETRIEVAL_INTENTS.DOCTOR;
    }

    // 8. DIAGNOSIS Intent
    const diagRegex = /(diagnosis|diagnoses|diagnosed with|what is my diagnosis|what did the doctor diagnose|condition|medical condition|disease|clinical impression|findings|நோய் கண்டறிதல்|रोग निदान)/i;
    if (diagRegex.test(q)) {
      return RETRIEVAL_INTENTS.DIAGNOSIS;
    }

    // 9. ABNORMAL_LAB Intent
    const abnormalRegex = /(abnormal|out of range|outside range|outside the range|high or low|elevated or low|concerning|irregular|borderline|flagged|அசாதாரண|சாதாரண வரம்பிற்கு வெளியே|வரம்பிற்கு வெளியே|அசாதாரணமான|அவசியமான|அसामान्य)/i;
    if (abnormalRegex.test(q)) {
      return RETRIEVAL_INTENTS.ABNORMAL_LAB;
    }

    // 10. DOCUMENT_SUMMARY & MISSING INFO Intent
    const missingInfoRegex = /(what (information|data|record|detail) is missing|missing (from|in) (my )?(uploaded )?records|what is missing|anything missing|records missing|விடுபட்ட|விடுபட்ட தகவல்)/i;
    if (missingInfoRegex.test(q)) {
      return RETRIEVAL_INTENTS.DOCUMENT_SUMMARY;
    }

    const summaryRegex = /(summarize|summary of|give me a summary|overview of (my )?(report|document|record)|brief summary|explain (my )?(latest )?(report|document)|சுருக்கம்|सारांश)/i;
    if (summaryRegex.test(q)) {
      return RETRIEVAL_INTENTS.DOCUMENT_SUMMARY;
    }

    // 11. GENERAL_EXPLANATION Intent ("What is hemoglobin?", "Explain what creatinine means", "What does creatinine mean?")
    const isExplainingConcept =
      /^(what is|what are|explain what is|meaning of|define)\s+/i.test(q) ||
      /^explain(\s+what)?\s+[a-z0-9\s]+\s+means?/i.test(q) ||
      /^what\s+does\s+[a-z0-9\s]+\s+mean/i.test(q) ||
      /^(explain\s+[a-z0-9\s]+)$/i.test(q);

    const isPersonalQuery = q.includes('my ') || q.includes('mine') || q.includes('result') || q.includes('level') || q.includes('value') || q.includes('score') || q.includes('report') || q.includes('blood test');

    if (isExplainingConcept && !isPersonalQuery) {
      return RETRIEVAL_INTENTS.GENERAL_EXPLANATION;
    }

    // 12. LAB_RESULT Intent
    const targetEntity = this.detectTargetEntity(query);
    const labTermsRegex = /(lab report|blood report|blood test|test report|diagnostic report|cbc|panel|lipid profile|liver function|renal function|test results|ரத்த அறிக்கை|ரத்த பரிசோதனை|रक्त रिपोर्ट)/i;
    if (targetEntity || labTermsRegex.test(q)) {
      return RETRIEVAL_INTENTS.LAB_RESULT;
    }

    // If query has some health context
    const healthContextRegex = /(health|body|blood|sugar|hospital|clinic|treatment|vital|heart|kidney|liver)/i;
    if (healthContextRegex.test(q)) {
      return RETRIEVAL_INTENTS.GENERAL_EXPLANATION;
    }

    return RETRIEVAL_INTENTS.UNKNOWN;
  }

  /**
   * Helper: Detect specific medical test/entity from query
   */
  detectTargetEntity(query = '') {
    const qLower = (query || '').toLowerCase().trim();
    for (const item of RECOGNIZED_MEDICAL_ENTITIES) {
      for (const alias of item.aliases) {
        if (alias.length <= 2) {
          const regex = new RegExp(`(^|[^a-z0-9])${alias}([^a-z0-9]|$)`, 'i');
          if (regex.test(qLower)) return item;
        } else if (qLower.includes(alias)) {
          return item;
        }
      }
    }
    return null;
  }

  /**
   * Helper: Normalize user ID to string
   */
  normalizeUserId(userId) {
    if (!userId) return null;
    return userId._id ? userId._id.toString() : userId.toString();
  }

  /**
   * 2. Relevance Gate
   * Evaluates retrieved candidates against the user's inquiry intent.
   * If retrieved content is unrelated to the question: REJECT IT.
   */
  evaluateRelevance({ intent, query, retrievedRecords, candidateChunks, targetEntity, documentType }) {
    const qLower = (query || '').toLowerCase().trim();
    const queryTokens = tokenize(query);

    // Rule 1: Unknown intent is unconditionally rejected
    if (intent === RETRIEVAL_INTENTS.UNKNOWN) {
      return {
        gate_passed: false,
        score: 0.0,
        reason: 'Unrecognized intent: Query does not match any known medical domain concept.',
        matched_entities: [],
      };
    }

    // Rule 2: Medication / Prescription / Dosage / Instructions questions MUST NOT accept pure Lab Report observations
    if ([RETRIEVAL_INTENTS.MEDICATION, RETRIEVAL_INTENTS.PRESCRIPTION, RETRIEVAL_INTENTS.DOSAGE, RETRIEVAL_INTENTS.INSTRUCTIONS].includes(intent)) {
      const hasMedRecords = retrievedRecords && retrievedRecords.some(r => r.name || r.medicationName || r.dosage || r.frequency || r.category === 'prescription' || r.document_type === 'PRESCRIPTION' || r.medication);
      const hasMedChunks = candidateChunks && candidateChunks.some(c => c.chunkType === 'medication' || c.chunkType === 'prescription');

      if (!hasMedRecords && !hasMedChunks) {
        return {
          gate_passed: false,
          score: 0.0,
          reason: 'Relevance Gate Rejection: Retrieved laboratory observations are irrelevant to medication inquiry. Zero medications found.',
          matched_entities: [],
        };
      }
    }

    // Rule 3: Targeted Lab Results must match the requested test
    if (intent === RETRIEVAL_INTENTS.LAB_RESULT && targetEntity) {
      const targetKey = targetEntity.key.toLowerCase();
      const hasMatchingRecord = retrievedRecords && retrievedRecords.some(r => {
        const testName = (r.test_name || r.testName || r.metricName || '').toLowerCase();
        return targetEntity.aliases.some(alias => {
          if (alias.length <= 3) {
            const regex = new RegExp(`(^|[^a-z0-9])${alias}([^a-z0-9]|$)`, 'i');
            return regex.test(testName);
          }
          return testName.includes(alias);
        });
      });

      const hasMatchingChunk = candidateChunks && candidateChunks.some(c => {
        const testName = (c.testName || '').toLowerCase();
        return targetEntity.aliases.some(alias => {
          if (alias.length <= 3) {
            const regex = new RegExp(`(^|[^a-z0-9])${alias}([^a-z0-9]|$)`, 'i');
            return regex.test(testName);
          }
          return testName.includes(alias);
        });
      });

      if (!hasMatchingRecord && !hasMatchingChunk) {
        return {
          gate_passed: false,
          score: 0.0,
          reason: `Relevance Gate Rejection: Requested lab test "${targetEntity.key}" is absent in authenticated user records. Unrelated tests rejected.`,
          matched_entities: [],
        };
      }
    }

    // Rule 4: Doctor inquiries must have doctor names
    if (intent === RETRIEVAL_INTENTS.DOCTOR) {
      const hasDoctorRecord = retrievedRecords && retrievedRecords.some(r => (r.name || r.doctor_name || r.doctorName || '').trim().length > 0);
      const hasDoctorChunk = candidateChunks && candidateChunks.some(c => (c.doctorName || '').trim().length > 0);

      if (!hasDoctorRecord && !hasDoctorChunk) {
        return {
          gate_passed: false,
          score: 0.0,
          reason: 'Relevance Gate Rejection: No attending physician or registered doctor found in user records.',
          matched_entities: [],
        };
      }
    }

    // Rule 5: Diagnoses inquiries must have explicit diagnoses
    if (intent === RETRIEVAL_INTENTS.DIAGNOSIS) {
      const hasDiagnosis = retrievedRecords && retrievedRecords.length > 0;
      if (!hasDiagnosis && (!candidateChunks || candidateChunks.length === 0)) {
        return {
          gate_passed: false,
          score: 0.0,
          reason: 'Relevance Gate Rejection: No clinical diagnoses found in user extractions or medical records.',
          matched_entities: [],
        };
      }
    }

    // Compute semantic relevance score based on token overlap & cosine similarity
    let maxSim = 0.0;
    const matchedTokens = new Set();

    if (candidateChunks && candidateChunks.length > 0) {
      candidateChunks.forEach(chunk => {
        const chunkTokens = tokenize(chunk.text || '');
        const sim = computeCosineSimilarity(queryTokens, chunkTokens);
        if (sim > maxSim) maxSim = sim;

        queryTokens.forEach(qt => {
          if (chunkTokens.includes(qt)) matchedTokens.add(qt);
        });
      });
    } else if (retrievedRecords && retrievedRecords.length > 0) {
      // Base relevance on structured record match
      maxSim = 0.85;
      queryTokens.forEach(qt => matchedTokens.add(qt));
    }

    // If direct structured match exists for recognized intent, score is solid
    if (retrievedRecords && retrievedRecords.length > 0) {
      maxSim = Math.max(maxSim, 0.75);
    }

    // Pass threshold is 0.15 for medical keyword match
    const passed = maxSim >= 0.15 || (retrievedRecords && retrievedRecords.length > 0);

    return {
      gate_passed: passed,
      score: Math.min(1.0, Number(maxSim.toFixed(2))),
      reason: passed ? 'Relevance Gate Passed: Candidates matched query intent and clinical entities.' : 'Relevance Gate Rejection: Relevance score below threshold.',
      matched_entities: Array.from(matchedTokens),
    };
  }

  /**
   * 3. Metadata-Filtered Vector Search
   * Strictly filters by user_id = authenticated_user_id and optional document_type.
   * Never performs unrestricted vector search across all medical documents.
   */
  async performMetadataFilteredVectorSearch({ userId, query, documentId = null, documentType = null, topK = 5 }) {
    const rawUserId = this.normalizeUserId(userId);
    if (!rawUserId) return [];

    const queryTokens = tokenize(query);
    if (!queryTokens.length) return [];

    // Build document query strictly scoped to authenticated user
    const docFilter = {
      $or: [{ user_id: rawUserId }, { userId: rawUserId }],
    };

    if (documentId) {
      docFilter._id = documentId;
    }

    if (documentType) {
      docFilter.$and = [
        {
          $or: [
            { document_type: documentType },
            { category: documentType.toLowerCase() },
          ],
        },
      ];
    }

    const documents = await Document.find(docFilter).lean();
    if (!documents.length) return [];

    const docIds = documents.map(d => d._id);

    // Fetch user-scoped document extractions strictly matching user's documents
    const extractions = await DocumentExtraction.find({
      $or: [{ user_id: rawUserId }, { userId: rawUserId }],
      document_id: { $in: docIds },
    }).lean();

    const aiExtractions = await AIExtraction.find({
      $or: [{ user_id: rawUserId }, { userId: rawUserId }],
      document_id: { $in: docIds },
    }).lean();

    // Build candidate chunks
    const candidateChunks = [];

    // Chunks from OCR text
    extractions.forEach(ext => {
      const parentDoc = documents.find(d => d._id.toString() === ext.document_id.toString());
      if (ext.cleaned_text || ext.raw_text) {
        const text = ext.cleaned_text || ext.raw_text;
        // Split text into paragraphs
        const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim().length > 20);
        paragraphs.forEach((para, pIdx) => {
          candidateChunks.push({
            chunkId: `ocr_${ext._id}_${pIdx}`,
            document_id: ext.document_id,
            document: parentDoc,
            document_type: parentDoc?.document_type || 'OTHER',
            text: para.trim(),
            page: ext.page_count ? 1 : null,
            source: 'DOCUMENT_OCR',
          });
        });
      }
    });

    // Chunks from AI Extractions
    aiExtractions.forEach(ai => {
      const parentDoc = documents.find(d => d._id.toString() === ai.document_id.toString());
      const vData = ai.validated_data || {};

      if (vData.clinical_notes) {
        candidateChunks.push({
          chunkId: `ai_notes_${ai._id}`,
          document_id: ai.document_id,
          document: parentDoc,
          document_type: parentDoc?.document_type || 'OTHER',
          text: `Clinical Notes: ${vData.clinical_notes}`,
          page: 1,
          source: 'AI_EXTRACTION',
        });
      }

      if (Array.isArray(vData.diagnoses)) {
        vData.diagnoses.forEach(diag => {
          candidateChunks.push({
            chunkId: `ai_diag_${ai._id}_${diag}`,
            document_id: ai.document_id,
            document: parentDoc,
            document_type: parentDoc?.document_type || 'OTHER',
            text: `Diagnosis: ${diag}`,
            page: 1,
            source: 'AI_EXTRACTION',
          });
        });
      }
    });

    // Calculate Cosine Similarity with metadata filtering
    const scoredChunks = [];
    candidateChunks.forEach(chunk => {
      const chunkTokens = tokenize(chunk.text);
      const score = computeCosineSimilarity(queryTokens, chunkTokens);
      if (score > 0.05) {
        scoredChunks.push({
          ...chunk,
          similarityScore: score,
        });
      }
    });

    scoredChunks.sort((a, b) => b.similarityScore - a.similarityScore);
    return scoredChunks.slice(0, topK);
  }

  /**
   * 4. Central Retrieval Engine (Phase 8 Architecture)
   * Priority: Structured Medical Data -> OCR Document Text -> Timeline -> Vector Search (when required)
   * Applies Relevance Gate.
   */
  async retrieve({ query = '', userId, requestedDocumentId = null, requestedDocumentType = null, limit = 8 }) {
    const rawUserId = this.normalizeUserId(userId);
    if (!rawUserId) {
      throw new Error('Authenticated user ID is required for Phase 8 medical retrieval.');
    }

    const intent = this.classifyQueryIntent(query);
    const targetEntity = this.detectTargetEntity(query);

    let strategy = RETRIEVAL_STRATEGIES.NONE;
    let relevantRecords = [];
    let candidateChunks = [];
    let primarySourceDocument = null;
    let pageNumber = null;

    // Document-specific mode verification
    let targetDoc = null;
    if (requestedDocumentId) {
      targetDoc = await Document.findOne({
        _id: requestedDocumentId,
        $or: [{ userId: rawUserId }, { user_id: rawUserId }],
      }).lean();

      if (!targetDoc) {
        return {
          detected_intent: intent,
          retrieval_strategy: RETRIEVAL_STRATEGIES.REJECTED_IRRELEVANT,
          relevant_records: [],
          source_document: null,
          page: null,
          relevance_information: {
            gate_passed: false,
            score: 0.0,
            reason: 'Requested document does not exist or does not belong to authenticated user.',
            matched_entities: [],
            filter_applied: { user_id: rawUserId, document_id: requestedDocumentId },
          },
          relevant_context: '',
        };
      }

      primarySourceDocument = {
        id: targetDoc._id.toString(),
        original_name: targetDoc.original_filename || targetDoc.originalName,
        document_type: targetDoc.document_type || (targetDoc.category ? targetDoc.category.toUpperCase() : 'MEDICAL_RECORD'),
        document_date: targetDoc.upload_date || targetDoc.createdAt,
      };
      pageNumber = 1;
    }

    // ========================================================
    // INTENT ROUTER & RELEVANT RETRIEVAL
    // ========================================================

    switch (intent) {
      // ------------------------------------------------------
      // A. MEDICATION INTENT
      // ------------------------------------------------------
      case RETRIEVAL_INTENTS.MEDICATION: {
        const extractedMeds = [];

        if (requestedDocumentId) {
          // Document-specific mode: ONLY retrieve from targetDoc
          const docMeds = targetDoc?.extractedData?.medicines || targetDoc?.extractedData?.medications || [];
          docMeds.forEach(m => {
            if (m.name) {
              extractedMeds.push({
                name: m.name,
                dosage: m.dosage,
                frequency: m.frequency,
                duration: m.duration,
                instructions: m.instructions,
                prescribed_by: targetDoc.extractedData?.doctorName || targetDoc.doctor_name,
                source: 'PRESCRIPTION_DOCUMENT',
                source_document: targetDoc.originalName || targetDoc.original_filename,
                source_document_id: targetDoc._id,
              });
            }
          });

          const aiExt = await AIExtraction.findOne({
            document_id: requestedDocumentId,
            $or: [{ user_id: rawUserId }, { userId: rawUserId }],
          }).lean();

          (aiExt?.validated_data?.medications || []).forEach(m => {
            if (m.name) {
              extractedMeds.push({
                ...m,
                source_document_id: requestedDocumentId,
                source_document_name: targetDoc.originalName || targetDoc.original_filename,
                document_date: aiExt.validated_data?.document_date,
              });
            }
          });
        } else {
          // All-records mode: Priority 1: Structured Medications collection
          const activeMeds = await Medication.find({
            $or: [{ userId: rawUserId }, { user_id: rawUserId }],
            status: 'active',
          }).lean();

          activeMeds.forEach(m => {
            extractedMeds.push({
              name: m.name,
              dosage: m.dosage,
              frequency: m.frequency,
              duration: m.duration,
              instructions: m.instructions,
              prescribed_by: m.prescribedBy,
              source: 'ACTIVE_MEDICATION_RECORD',
            });
          });

          // Priority 1b: Explicit AI Extractions medications
          const aiExts = await AIExtraction.find({
            $or: [{ user_id: rawUserId }, { userId: rawUserId }],
            'validated_data.medications.0': { $exists: true },
          }).populate('document_id').lean();

          aiExts.forEach(ext => {
            (ext.validated_data?.medications || []).forEach(m => {
              if (m.name) {
                extractedMeds.push({
                  ...m,
                  source_document_id: ext.document_id?._id,
                  source_document_name: ext.document_id?.original_filename || ext.document_id?.filename,
                  document_date: ext.validated_data?.document_date,
                });
              }
            });
          });

          // Priority 1c: Documents with extracted medicines
          const docMeds = await Document.find({
            $and: [
              { $or: [{ userId: rawUserId }, { user_id: rawUserId }] },
              {
                $or: [
                  { 'extractedData.medicines.0': { $exists: true } },
                  { 'extractedData.medications.0': { $exists: true } },
                ],
              },
            ],
          }).lean();

          docMeds.forEach(doc => {
            const meds = doc.extractedData?.medicines || doc.extractedData?.medications || [];
            meds.forEach(m => {
              if (m.name) {
                extractedMeds.push({
                  name: m.name,
                  dosage: m.dosage,
                  frequency: m.frequency,
                  duration: m.duration,
                  instructions: m.instructions,
                  prescribed_by: doc.extractedData?.doctorName || doc.doctor_name,
                  source: 'PRESCRIPTION_DOCUMENT',
                  source_document: doc.originalName || doc.original_filename,
                  source_document_id: doc._id,
                });
              }
            });
          });
        }

        // Combine & deduplicate
        const combinedMeds = [];
        const seenNames = new Set();
        extractedMeds.forEach(m => {
          const key = m.name.toLowerCase();
          if (!seenNames.has(key)) {
            seenNames.add(key);
            combinedMeds.push(m);
          }
        });

        if (combinedMeds.length > 0) {
          strategy = RETRIEVAL_STRATEGIES.STRUCTURED_DATABASE;
          relevantRecords = combinedMeds;

          if (!primarySourceDocument) {
            const prescriptionDoc = await Document.findOne({
              $and: [
                { $or: [{ user_id: rawUserId }, { userId: rawUserId }] },
                { $or: [{ document_type: 'PRESCRIPTION' }, { category: 'prescription' }] },
              ],
            }).lean();

            if (prescriptionDoc) {
              primarySourceDocument = {
                id: prescriptionDoc._id.toString(),
                original_name: prescriptionDoc.original_filename || prescriptionDoc.originalName,
                document_type: prescriptionDoc.document_type || 'PRESCRIPTION',
                document_date: prescriptionDoc.upload_date,
              };
              pageNumber = 1;
            }
          }
        } else if (!requestedDocumentId) {
          // Check OCR of prescription documents ONLY (never lab reports)
          const prescriptionDocs = await Document.find({
            $and: [
              { $or: [{ user_id: rawUserId }, { userId: rawUserId }] },
              { $or: [{ document_type: 'PRESCRIPTION' }, { category: 'prescription' }] },
            ],
          }).lean();

          if (prescriptionDocs.length > 0) {
            const pIds = prescriptionDocs.map(d => d._id);
            const extractions = await DocumentExtraction.find({
              $or: [{ user_id: rawUserId }, { userId: rawUserId }],
              document_id: { $in: pIds },
            }).lean();

            if (extractions.length > 0 && extractions[0].cleaned_text) {
              strategy = RETRIEVAL_STRATEGIES.OCR_DOCUMENT_TEXT;
              primarySourceDocument = {
                id: prescriptionDocs[0]._id.toString(),
                original_name: prescriptionDocs[0].original_filename || prescriptionDocs[0].originalName,
                document_type: prescriptionDocs[0].document_type || 'PRESCRIPTION',
                document_date: prescriptionDocs[0].upload_date,
              };
              pageNumber = 1;
              candidateChunks.push({
                chunkType: 'prescription',
                text: extractions[0].cleaned_text,
                source: 'PRESCRIPTION_OCR',
              });
            }
          }
        }
        break;
      }

      // ------------------------------------------------------
      // B. DOSAGE INTENT
      // ------------------------------------------------------
      case RETRIEVAL_INTENTS.DOSAGE: {
        const dosageRecords = [];

        if (requestedDocumentId) {
          const docExtMeds = targetDoc?.extractedData?.medicines || targetDoc?.extractedData?.medications || [];
          docExtMeds.forEach(m => {
            if (m.name && m.dosage) {
              dosageRecords.push({
                name: m.name,
                dosage: m.dosage,
                frequency: m.frequency,
                duration: m.duration,
                source: 'PRESCRIPTION_DOCUMENT',
                source_document_name: targetDoc.originalName || targetDoc.original_filename,
              });
            }
          });

          const aiExt = await AIExtraction.findOne({
            document_id: requestedDocumentId,
            $or: [{ user_id: rawUserId }, { userId: rawUserId }],
          }).lean();

          (aiExt?.validated_data?.medications || []).forEach(m => {
            if (m.name && m.dosage) {
              dosageRecords.push({
                name: m.name,
                dosage: m.dosage,
                frequency: m.frequency,
                duration: m.duration,
                source: 'PRESCRIPTION_DOCUMENT',
                source_document_name: targetDoc?.originalName,
              });
            }
          });
        } else {
          const meds = await Medication.find({
            $or: [{ userId: rawUserId }, { user_id: rawUserId }],
          }).lean();

          meds.forEach(m => {
            dosageRecords.push({
              name: m.name,
              dosage: m.dosage,
              frequency: m.frequency,
              schedule: m.schedule,
              duration: m.duration,
              source: 'MEDICATION_RECORD',
            });
          });

          const aiExts = await AIExtraction.find({
            $or: [{ user_id: rawUserId }, { userId: rawUserId }],
            'validated_data.medications.0': { $exists: true },
          }).populate('document_id').lean();

          aiExts.forEach(ext => {
            (ext.validated_data?.medications || []).forEach(m => {
              if (m.name && m.dosage) {
                dosageRecords.push({
                  name: m.name,
                  dosage: m.dosage,
                  frequency: m.frequency,
                  duration: m.duration,
                  source: 'PRESCRIPTION_DOCUMENT',
                  source_document_name: ext.document_id?.original_filename,
                });
              }
            });
          });

          const docMeds = await Document.find({
            $and: [
              { $or: [{ userId: rawUserId }, { user_id: rawUserId }] },
              {
                $or: [
                  { 'extractedData.medicines.0': { $exists: true } },
                  { 'extractedData.medications.0': { $exists: true } },
                ],
              },
            ],
          }).lean();

          docMeds.forEach(doc => {
            const medicines = doc.extractedData?.medicines || doc.extractedData?.medications || [];
            medicines.forEach(m => {
              if (m.name && m.dosage) {
                dosageRecords.push({
                  name: m.name,
                  dosage: m.dosage,
                  frequency: m.frequency,
                  duration: m.duration,
                  source: 'PRESCRIPTION_DOCUMENT',
                  source_document_name: doc.originalName || doc.original_filename,
                });
              }
            });
          });
        }

        // Prioritize medicine mentioned in query (e.g. Azithromycin)
        const qLower = query.toLowerCase();
        dosageRecords.sort((a, b) => {
          const aMatch = a.name && qLower.includes(a.name.toLowerCase()) ? 1 : 0;
          const bMatch = b.name && qLower.includes(b.name.toLowerCase()) ? 1 : 0;
          return bMatch - aMatch;
        });

        if (dosageRecords.length > 0) {
          strategy = RETRIEVAL_STRATEGIES.STRUCTURED_DATABASE;
          relevantRecords = dosageRecords;
          pageNumber = 1;
        }
        break;
      }

      // ------------------------------------------------------
      // C. DOCTOR INTENT
      // ------------------------------------------------------
      case RETRIEVAL_INTENTS.DOCTOR: {
        const doctorRecords = [];

        if (requestedDocumentId) {
          // Document-specific mode: ONLY return doctor for this document
          if (targetDoc?.extractedData?.doctorName) {
            doctorRecords.push({
              name: targetDoc.extractedData.doctorName,
              hospital: targetDoc.extractedData.hospitalName || '',
              document_date: targetDoc.extractedData.documentDate || targetDoc.upload_date,
              source: 'DOCUMENT_EXTRACTION',
              source_document: targetDoc.originalName || targetDoc.original_filename,
            });
          }

          const aiExt = await AIExtraction.findOne({
            document_id: requestedDocumentId,
            $or: [{ user_id: rawUserId }, { userId: rawUserId }],
          }).lean();

          if (aiExt?.validated_data?.doctor_name) {
            doctorRecords.push({
              name: aiExt.validated_data.doctor_name,
              hospital: aiExt.validated_data.hospital_name || '',
              document_date: aiExt.validated_data.document_date,
              source: 'DOCUMENT_EXTRACTION',
              source_document: targetDoc.originalName || targetDoc.original_filename,
            });
          }
        } else {
          // 1. User profile primary doctor
          const userRec = await User.findById(rawUserId).select('primaryDoctorName primaryDoctorPhone').lean();
          if (userRec?.primaryDoctorName) {
            doctorRecords.push({
              name: userRec.primaryDoctorName,
              phone: userRec.primaryDoctorPhone || null,
              role: 'Primary Care Physician',
              source: 'USER_PROFILE',
            });
          }

          // 2. Doctor collection
          const doctors = await Doctor.find({
            $or: [{ userId: rawUserId }, { user_id: rawUserId }],
          }).lean();
          doctors.forEach(d => {
            doctorRecords.push({
              name: d.name,
              specialization: d.specialization || 'General Practitioner',
              hospital: d.hospitalClinic || '',
              phone: d.phone || '',
              source: 'REGISTERED_DOCTOR',
            });
          });

          // 3. HealthRecord doctor fields
          const hRecords = await HealthRecord.find({
            $or: [{ userId: rawUserId }, { user_id: rawUserId }],
            doctorName: { $exists: true, $ne: '' },
          }).lean();
          hRecords.forEach(hr => {
            doctorRecords.push({
              name: hr.doctorName,
              hospital: hr.hospitalClinicName || '',
              consultation_title: hr.title,
              date: hr.date,
              source: 'HEALTH_RECORD',
            });
          });

          // 4. AI Extractions doctor fields
          const aiExts = await AIExtraction.find({
            $or: [{ user_id: rawUserId }, { userId: rawUserId }],
            'validated_data.doctor_name': { $exists: true, $ne: null },
          }).populate('document_id').lean();

          aiExts.forEach(ext => {
            if (ext.validated_data?.doctor_name) {
              doctorRecords.push({
                name: ext.validated_data.doctor_name,
                hospital: ext.validated_data.hospital_name || '',
                document_date: ext.validated_data.document_date,
                source: 'DOCUMENT_EXTRACTION',
                source_document: ext.document_id?.original_filename,
              });
              if (!primarySourceDocument && ext.document_id) {
                primarySourceDocument = {
                  id: ext.document_id._id.toString(),
                  original_name: ext.document_id.original_filename || ext.document_id.originalName,
                  document_type: ext.document_id.document_type || 'PRESCRIPTION',
                  document_date: ext.document_id.upload_date,
                };
              }
            }
          });
        }

        // Deduplicate
        const uniqueDocs = [];
        const seenDocNames = new Set();
        doctorRecords.forEach(d => {
          const key = d.name.toLowerCase().trim();
          if (!seenDocNames.has(key)) {
            seenDocNames.add(key);
            uniqueDocs.push(d);
          }
        });

        if (uniqueDocs.length > 0) {
          strategy = RETRIEVAL_STRATEGIES.STRUCTURED_DATABASE;
          relevantRecords = uniqueDocs;
          pageNumber = 1;
        }
        break;
      }

      // ------------------------------------------------------
      // D. ABNORMAL_LAB INTENT
      // ------------------------------------------------------
      case RETRIEVAL_INTENTS.ABNORMAL_LAB: {
        const abnormalObservations = [];

        if (requestedDocumentId) {
          const interpretations = await ObservationInterpretation.find({
            $or: [{ user_id: rawUserId }, { userId: rawUserId }],
            document_id: requestedDocumentId,
            status: { $in: ['LOW', 'HIGH'] },
          }).lean();

          interpretations.forEach(interp => {
            abnormalObservations.push({
              test_name: interp.test_name,
              value: interp.value,
              unit: interp.unit,
              reference_range: interp.reference_range,
              abnormal_flag: interp.status,
              severity: interp.severity,
              explanation: interp.explanation,
              source: 'OBSERVATION_INTERPRETATION',
              source_document: targetDoc.originalName || targetDoc.original_filename,
            });
          });

          const aiExt = await AIExtraction.findOne({
            document_id: requestedDocumentId,
            $or: [{ user_id: rawUserId }, { userId: rawUserId }],
          }).lean();

          const tests = [
            ...(aiExt?.validated_data?.laboratory_tests || []),
            ...(aiExt?.validated_data?.observations || []),
          ];
          tests.forEach(t => {
            if (['LOW', 'HIGH'].includes(t.abnormal_flag)) {
              const already = abnormalObservations.some(o => o.test_name.toLowerCase() === t.test_name.toLowerCase());
              if (!already) {
                abnormalObservations.push({
                  test_name: t.test_name,
                  value: t.value,
                  unit: t.unit,
                  reference_range: t.reference_range,
                  abnormal_flag: t.abnormal_flag,
                  source: 'AI_EXTRACTION',
                  source_document: targetDoc.originalName || targetDoc.original_filename,
                });
              }
            }
          });

          (targetDoc?.extractedData?.labTests || []).forEach(lt => {
            if (['low', 'high', 'LOW', 'HIGH'].includes(lt.status)) {
              const already = abnormalObservations.some(o => o.test_name.toLowerCase() === lt.testName.toLowerCase());
              if (!already) {
                abnormalObservations.push({
                  test_name: lt.testName,
                  value: String(lt.value),
                  unit: lt.unit,
                  reference_range: lt.referenceRange,
                  abnormal_flag: lt.status.toUpperCase(),
                  source: 'DOCUMENT_LAB_TEST',
                  source_document: targetDoc.originalName || targetDoc.original_filename,
                });
              }
            }
          });
        } else {
          const interpretations = await ObservationInterpretation.find({
            $or: [{ user_id: rawUserId }, { userId: rawUserId }],
            status: { $in: ['LOW', 'HIGH'] },
          }).populate('document_id').lean();

          interpretations.forEach(interp => {
            abnormalObservations.push({
              test_name: interp.test_name,
              value: interp.value,
              unit: interp.unit,
              reference_range: interp.reference_range,
              abnormal_flag: interp.status,
              severity: interp.severity,
              explanation: interp.explanation,
              source: 'OBSERVATION_INTERPRETATION',
              source_document: interp.document_id?.original_filename,
            });
            if (!primarySourceDocument && interp.document_id) {
              primarySourceDocument = {
                id: interp.document_id._id.toString(),
                original_name: interp.document_id.original_filename || interp.document_id.originalName,
                document_type: interp.document_id.document_type || 'LAB_REPORT',
                document_date: interp.document_id.upload_date,
              };
            }
          });

          // Also check AI Extractions
          const aiExts = await AIExtraction.find({
            $or: [{ user_id: rawUserId }, { userId: rawUserId }],
          }).populate('document_id').lean();

          aiExts.forEach(ext => {
            const tests = [
              ...(ext.validated_data?.laboratory_tests || []),
              ...(ext.validated_data?.observations || []),
            ];
            tests.forEach(t => {
              if (['LOW', 'HIGH'].includes(t.abnormal_flag)) {
                const already = abnormalObservations.some(o => o.test_name.toLowerCase() === t.test_name.toLowerCase());
                if (!already) {
                  abnormalObservations.push({
                    test_name: t.test_name,
                    value: t.value,
                    unit: t.unit,
                    reference_range: t.reference_range,
                    abnormal_flag: t.abnormal_flag,
                    source: 'AI_EXTRACTION',
                    source_document: ext.document_id?.original_filename,
                  });
                }
              }
            });
          });

          // Also check Document.extractedData.labTests
          const userDocs = await Document.find({
            $or: [{ user_id: rawUserId }, { userId: rawUserId }],
          }).lean();

          userDocs.forEach(d => {
            (d.extractedData?.labTests || []).forEach(lt => {
              if (['low', 'high', 'LOW', 'HIGH'].includes(lt.status)) {
                const already = abnormalObservations.some(o => o.test_name.toLowerCase() === lt.testName.toLowerCase());
                if (!already) {
                  abnormalObservations.push({
                    test_name: lt.testName,
                    value: String(lt.value),
                    unit: lt.unit,
                    reference_range: lt.referenceRange,
                    abnormal_flag: lt.status.toUpperCase(),
                    source: 'DOCUMENT_LAB_TEST',
                    source_document: d.originalName || d.original_filename,
                  });
                }
              }
            });
          });

          // Also check LabMetric collection for out-of-range status
          const labMetrics = await LabMetric.find({
            $or: [{ userId: rawUserId }, { user_id: rawUserId }],
            status: { $in: ['low', 'high', 'LOW', 'HIGH'] },
          }).lean();

          labMetrics.forEach(lm => {
            const already = abnormalObservations.some(o => o.test_name.toLowerCase() === lm.metricName.toLowerCase());
            if (!already) {
              const rangeStr = (lm.referenceMin !== undefined || lm.referenceMax !== undefined)
                ? `${lm.referenceMin !== undefined ? lm.referenceMin : ''}–${lm.referenceMax !== undefined ? lm.referenceMax : ''} ${lm.unit || ''}`.trim()
                : '';
              abnormalObservations.push({
                test_name: lm.metricName,
                value: String(lm.value),
                unit: lm.unit,
                reference_range: rangeStr,
                abnormal_flag: (lm.status || '').toUpperCase(),
                source: 'LAB_METRICS',
              });
            }
          });
        }

        if (abnormalObservations.length > 0) {
          strategy = RETRIEVAL_STRATEGIES.STRUCTURED_DATABASE;
          relevantRecords = abnormalObservations;
          pageNumber = 1;
        }
        break;
      }

      // ------------------------------------------------------
      // E. LAB_RESULT INTENT
      // ------------------------------------------------------
      case RETRIEVAL_INTENTS.LAB_RESULT: {
        const allObservations = [];

        if (requestedDocumentId) {
          const aiExt = await AIExtraction.findOne({
            document_id: requestedDocumentId,
            $or: [{ user_id: rawUserId }, { userId: rawUserId }],
          }).lean();

          const tests = [
            ...(aiExt?.validated_data?.laboratory_tests || []),
            ...(aiExt?.validated_data?.observations || []),
          ];
          tests.forEach(t => {
            if (t.test_name) {
              allObservations.push({
                test_name: t.test_name,
                value: t.value,
                numeric_value: t.numeric_value,
                unit: t.unit,
                reference_range: t.reference_range,
                abnormal_flag: t.abnormal_flag,
                document_id: requestedDocumentId,
                document_name: targetDoc.originalName || targetDoc.original_filename,
                document_date: aiExt?.validated_data?.document_date || targetDoc.upload_date,
              });
            }
          });

          (targetDoc?.extractedData?.labTests || []).forEach(lt => {
            if (lt.testName) {
              const already = allObservations.some(o => o.test_name.toLowerCase() === lt.testName.toLowerCase());
              if (!already) {
                allObservations.push({
                  test_name: lt.testName,
                  value: String(lt.value),
                  numeric_value: lt.numericValue || parseFloat(lt.value),
                  unit: lt.unit,
                  reference_range: lt.referenceRange,
                  abnormal_flag: lt.status ? lt.status.toUpperCase() : 'UNKNOWN',
                  document_id: targetDoc._id,
                  document_name: targetDoc.originalName || targetDoc.original_filename,
                  document_date: targetDoc.extractedData?.documentDate || targetDoc.createdAt,
                });
              }
            }
          });
        } else {
          // Fetch AI Extractions observations
          const aiExts = await AIExtraction.find({
            $or: [{ user_id: rawUserId }, { userId: rawUserId }],
          }).populate('document_id').lean();

          aiExts.forEach(ext => {
            const tests = [
              ...(ext.validated_data?.laboratory_tests || []),
              ...(ext.validated_data?.observations || []),
            ];
            tests.forEach(t => {
              if (t.test_name) {
                allObservations.push({
                  test_name: t.test_name,
                  value: t.value,
                  numeric_value: t.numeric_value,
                  unit: t.unit,
                  reference_range: t.reference_range,
                  abnormal_flag: t.abnormal_flag,
                  document_id: ext.document_id?._id,
                  document_name: ext.document_id?.original_filename || ext.document_id?.filename,
                  document_date: ext.validated_data?.document_date || ext.document_id?.upload_date,
                });
              }
            });
          });

          // Also fetch from Document.extractedData.labTests
          const userDocsForLabs = await Document.find({
            $or: [{ user_id: rawUserId }, { userId: rawUserId }],
          }).lean();

          userDocsForLabs.forEach(doc => {
            (doc.extractedData?.labTests || []).forEach(lt => {
              if (lt.testName) {
                const already = allObservations.some(o => o.test_name.toLowerCase() === lt.testName.toLowerCase());
                if (!already) {
                  allObservations.push({
                    test_name: lt.testName,
                    value: String(lt.value),
                    numeric_value: lt.numericValue || parseFloat(lt.value),
                    unit: lt.unit,
                    reference_range: lt.referenceRange,
                    abnormal_flag: lt.status ? lt.status.toUpperCase() : 'UNKNOWN',
                    document_id: doc._id,
                    document_name: doc.originalName || doc.original_filename,
                    document_date: doc.extractedData?.documentDate || doc.createdAt,
                  });
                }
              }
            });
          });

          // Also fetch LabMetric collection
          const labMetrics = await LabMetric.find({
            $or: [{ userId: rawUserId }, { user_id: rawUserId }],
          }).lean();

          labMetrics.forEach(lm => {
            const already = allObservations.some(o => o.test_name.toLowerCase() === lm.metricName.toLowerCase());
            if (!already) {
              allObservations.push({
                test_name: lm.metricName,
                value: String(lm.value),
                numeric_value: lm.value,
                unit: lm.unit,
                reference_range: `${lm.referenceMin || ''}–${lm.referenceMax || ''} ${lm.unit || ''}`.trim(),
                abnormal_flag: lm.status ? lm.status.toUpperCase() : 'UNKNOWN',
                source: 'LAB_METRICS',
              });
            }
          });
        }

        // If targetEntity specified (e.g. hemoglobin, hba1c)
        let filtered = allObservations;
        if (targetEntity) {
          filtered = allObservations.filter(obs => {
            const obsLower = obs.test_name.toLowerCase();
            return targetEntity.aliases.some(alias => {
              if (alias.length <= 3) {
                const regex = new RegExp(`(^|[^a-z0-9])${alias}([^a-z0-9]|$)`, 'i');
                return regex.test(obsLower);
              }
              return obsLower.includes(alias);
            });
          });
        }

        if (filtered.length > 0) {
          strategy = RETRIEVAL_STRATEGIES.STRUCTURED_DATABASE;
          relevantRecords = filtered;

          if (!primarySourceDocument) {
            const docMatch = filtered[0].document_id;
            if (docMatch) {
              const matchedDoc = await Document.findById(docMatch).lean();
              if (matchedDoc) {
                primarySourceDocument = {
                  id: matchedDoc._id.toString(),
                  original_name: matchedDoc.original_filename || matchedDoc.originalName,
                  document_type: matchedDoc.document_type || 'LAB_REPORT',
                  document_date: matchedDoc.upload_date,
                };
                pageNumber = 1;
              }
            }
          }
        } else if (!requestedDocumentId) {
          // If not in structured data, search lab report OCR with metadata filtering
          const vectorResults = await this.performMetadataFilteredVectorSearch({
            userId: rawUserId,
            query,
            documentType: requestedDocumentType || 'LAB_REPORT',
            topK: 3,
          });

          if (vectorResults.length > 0) {
            strategy = RETRIEVAL_STRATEGIES.METADATA_FILTERED_VECTOR_SEARCH;
            candidateChunks = vectorResults;
            relevantRecords = vectorResults.map(v => ({ text: v.text, source: v.source }));
            if (vectorResults[0].document) {
              primarySourceDocument = {
                id: vectorResults[0].document._id.toString(),
                original_name: vectorResults[0].document.original_filename || vectorResults[0].document.originalName,
                document_type: vectorResults[0].document.document_type,
                document_date: vectorResults[0].document.upload_date,
              };
              pageNumber = vectorResults[0].page || 1;
            }
          }
        }
        break;
      }

      // ------------------------------------------------------
      // F. DIAGNOSIS INTENT
      // ------------------------------------------------------
      case RETRIEVAL_INTENTS.DIAGNOSIS: {
        const diagList = [];

        // 1. AI Extractions diagnoses
        const aiExtQuery = {
          $or: [{ user_id: rawUserId }, { userId: rawUserId }],
          'validated_data.diagnoses.0': { $exists: true },
        };
        if (requestedDocumentId) aiExtQuery.document_id = requestedDocumentId;

        const aiExts = await AIExtraction.find(aiExtQuery).populate('document_id').lean();

        aiExts.forEach(ext => {
          (ext.validated_data?.diagnoses || []).forEach(d => {
            diagList.push({
              diagnosis: d,
              document_name: ext.document_id?.original_filename,
              document_date: ext.validated_data?.document_date,
              source: 'AI_EXTRACTION',
            });
            if (!primarySourceDocument && ext.document_id) {
              primarySourceDocument = {
                id: ext.document_id._id.toString(),
                original_name: ext.document_id.original_filename || ext.document_id.originalName,
                document_type: ext.document_id.document_type || 'DIAGNOSTIC_REPORT',
                document_date: ext.document_id.upload_date,
              };
            }
          });
        });

        // 2. HealthRecord diagnoses (only if not restricted to specific document)
        if (!requestedDocumentId) {
          const hRecords = await HealthRecord.find({
            $or: [{ userId: rawUserId }, { user_id: rawUserId }],
            diagnosis: { $exists: true, $ne: [] },
          }).lean();

          hRecords.forEach(hr => {
            (hr.diagnosis || []).forEach(d => {
              diagList.push({
                diagnosis: d,
                record_title: hr.title,
                date: hr.date,
                source: 'HEALTH_RECORD',
              });
            });
          });
        }

        // Deduplicate
        const uniqueDiags = [];
        const seenDiags = new Set();
        diagList.forEach(item => {
          const key = item.diagnosis.toLowerCase().trim();
          if (!seenDiags.has(key)) {
            seenDiags.add(key);
            uniqueDiags.push(item);
          }
        });

        if (uniqueDiags.length > 0) {
          strategy = RETRIEVAL_STRATEGIES.STRUCTURED_DATABASE;
          relevantRecords = uniqueDiags;
          pageNumber = 1;
        }
        break;
      }

      // ------------------------------------------------------
      // G. PRESCRIPTION INTENT
      // ------------------------------------------------------
      case RETRIEVAL_INTENTS.PRESCRIPTION: {
        let primaryDoc = null;
        if (requestedDocumentId) {
          primaryDoc = targetDoc;
        } else {
          const prescriptionDocs = await Document.find({
            $and: [
              { $or: [{ user_id: rawUserId }, { userId: rawUserId }] },
              { $or: [{ document_type: 'PRESCRIPTION' }, { category: 'prescription' }] },
            ],
          }).lean();
          if (prescriptionDocs.length > 0) primaryDoc = prescriptionDocs[0];
        }

        if (primaryDoc) {
          primarySourceDocument = {
            id: primaryDoc._id.toString(),
            original_name: primaryDoc.original_filename || primaryDoc.originalName,
            document_type: 'PRESCRIPTION',
            document_date: primaryDoc.upload_date,
          };
          pageNumber = 1;

          // Fetch associated AI extraction
          const aiExt = await AIExtraction.findOne({
            $or: [{ user_id: rawUserId }, { userId: rawUserId }],
            document_id: primaryDoc._id,
          }).lean();

          const docMeds = primaryDoc.extractedData?.medicines || primaryDoc.extractedData?.medications || [];

          if (aiExt?.validated_data?.medications?.length > 0) {
            strategy = RETRIEVAL_STRATEGIES.STRUCTURED_DATABASE;
            relevantRecords = aiExt.validated_data.medications.map(m => ({
              ...m,
              doctor_name: aiExt.validated_data.doctor_name,
              document_date: aiExt.validated_data.document_date,
            }));
          } else if (docMeds.length > 0) {
            strategy = RETRIEVAL_STRATEGIES.STRUCTURED_DATABASE;
            relevantRecords = docMeds.map(m => ({
              ...m,
              doctor_name: primaryDoc.extractedData?.doctorName || primaryDoc.doctor_name,
              document_date: primaryDoc.extractedData?.documentDate || primaryDoc.createdAt,
            }));
          } else {
            // Fall back to OCR
            const docExt = await DocumentExtraction.findOne({
              $or: [{ user_id: rawUserId }, { userId: rawUserId }],
              document_id: primaryDoc._id,
            }).lean();

            if (docExt?.cleaned_text) {
              strategy = RETRIEVAL_STRATEGIES.OCR_DOCUMENT_TEXT;
              candidateChunks.push({
                chunkType: 'prescription',
                text: docExt.cleaned_text,
                source: 'PRESCRIPTION_OCR',
              });
              relevantRecords = [{ text: docExt.cleaned_text, page: 1 }];
            }
          }
        }
        break;
      }

      // ------------------------------------------------------
      // H. DOCUMENT_SUMMARY INTENT
      // ------------------------------------------------------
      case RETRIEVAL_INTENTS.DOCUMENT_SUMMARY: {
        let docToSummarize = null;
        if (requestedDocumentId) {
          docToSummarize = targetDoc;
        } else {
          docToSummarize = await Document.findOne({
            $or: [{ user_id: rawUserId }, { userId: rawUserId }],
          }).sort({ upload_date: -1, createdAt: -1 }).lean();
        }

        if (docToSummarize) {
          primarySourceDocument = {
            id: docToSummarize._id.toString(),
            original_name: docToSummarize.original_filename || docToSummarize.originalName,
            document_type: docToSummarize.document_type || docToSummarize.category?.toUpperCase() || 'OTHER',
            document_date: docToSummarize.upload_date,
          };
          pageNumber = 1;

          const docExt = await DocumentExtraction.findOne({
            $or: [{ user_id: rawUserId }, { userId: rawUserId }],
            document_id: docToSummarize._id,
          }).lean();

          const aiExt = await AIExtraction.findOne({
            $or: [{ user_id: rawUserId }, { userId: rawUserId }],
            document_id: docToSummarize._id,
          }).lean();

          let summaryText = aiExt?.validated_data?.clinical_notes || docExt?.cleaned_text || docToSummarize.extractedData?.summary || docToSummarize.ocrRawText;
          if (!summaryText && (aiExt?.validated_data?.laboratory_tests?.length > 0 || docToSummarize.extractedData?.labTests?.length > 0)) {
            const tests = (aiExt?.validated_data?.laboratory_tests || docToSummarize.extractedData?.labTests || []).map(t => `${t.test_name || t.testName}: ${t.value} ${t.unit || ''} (${t.abnormal_flag || t.status || 'NORMAL'})`).join(', ');
            summaryText = `Laboratory Report findings: ${tests}.`;
          } else if (!summaryText && (aiExt?.validated_data?.medications?.length > 0 || docToSummarize.extractedData?.medicines?.length > 0)) {
            const meds = (aiExt?.validated_data?.medications || docToSummarize.extractedData?.medicines || []).map(m => `${m.name} ${m.dosage || ''}`).join(', ');
            summaryText = `Prescription records for medications: ${meds}.`;
          }

          if (summaryText) {
            strategy = RETRIEVAL_STRATEGIES.OCR_DOCUMENT_TEXT;
            relevantRecords = [{
              summary: summaryText,
              doctor_name: aiExt?.validated_data?.doctor_name || docToSummarize.extractedData?.doctorName,
              document_date: aiExt?.validated_data?.document_date || docToSummarize.upload_date,
            }];
            candidateChunks.push({
              chunkType: 'summary',
              text: summaryText,
            });
          }
        }
        break;
      }

      // ------------------------------------------------------
      // I. INSTRUCTIONS INTENT
      // ------------------------------------------------------
      case RETRIEVAL_INTENTS.INSTRUCTIONS: {
        const instList = [];

        if (requestedDocumentId) {
          const docMeds = targetDoc?.extractedData?.medicines || targetDoc?.extractedData?.medications || [];
          docMeds.forEach(m => {
            if (m.instructions || m.duration) {
              instList.push({
                medication: m.name,
                name: m.name,
                instructions: m.instructions,
                duration: m.duration,
                frequency: m.frequency,
                dosage: m.dosage,
                source: 'PRESCRIPTION_DOCUMENT',
                source_document: targetDoc.originalName || targetDoc.original_filename,
              });
            }
          });

          const aiExt = await AIExtraction.findOne({
            document_id: requestedDocumentId,
            $or: [{ user_id: rawUserId }, { userId: rawUserId }],
          }).lean();

          (aiExt?.validated_data?.medications || []).forEach(m => {
            if (m.instructions || m.duration) {
              instList.push({
                medication: m.name,
                name: m.name,
                instructions: m.instructions,
                duration: m.duration,
                dosage: m.dosage,
                source: 'PRESCRIPTION_EXTRACTION',
                source_document: targetDoc.originalName || targetDoc.original_filename,
              });
            }
          });
        } else {
          const meds = await Medication.find({
            $or: [{ userId: rawUserId }, { user_id: rawUserId }],
            $or: [
              { instructions: { $exists: true, $ne: '' } },
              { duration: { $exists: true, $ne: '' } },
            ],
          }).lean();

          meds.forEach(m => {
            instList.push({
              medication: m.name,
              name: m.name,
              instructions: m.instructions,
              duration: m.duration,
              frequency: m.frequency,
              source: 'MEDICATION_RECORD',
            });
          });

          const aiExts = await AIExtraction.find({
            $or: [{ user_id: rawUserId }, { userId: rawUserId }],
          }).populate('document_id').lean();

          aiExts.forEach(ext => {
            (ext.validated_data?.medications || []).forEach(m => {
              if (m.instructions || m.duration) {
                instList.push({
                  medication: m.name,
                  name: m.name,
                  instructions: m.instructions,
                  duration: m.duration,
                  dosage: m.dosage,
                  source: 'PRESCRIPTION_EXTRACTION',
                  source_document: ext.document_id?.original_filename,
                });
              }
            });
            if (ext.validated_data?.clinical_notes) {
              instList.push({
                clinical_advice: ext.validated_data.clinical_notes,
                doctor_name: ext.validated_data.doctor_name,
                source: 'CLINICAL_NOTES',
              });
            }
          });

          const docMeds = await Document.find({
            $and: [
              { $or: [{ userId: rawUserId }, { user_id: rawUserId }] },
              {
                $or: [
                  { 'extractedData.medicines.0': { $exists: true } },
                  { 'extractedData.medications.0': { $exists: true } },
                ],
              },
            ],
          }).lean();

          docMeds.forEach(doc => {
            (doc.extractedData?.medicines || doc.extractedData?.medications || []).forEach(m => {
              if (m.instructions || m.duration) {
                instList.push({
                  medication: m.name,
                  name: m.name,
                  instructions: m.instructions,
                  duration: m.duration,
                  dosage: m.dosage,
                  source: 'PRESCRIPTION_DOCUMENT',
                  source_document: doc.originalName || doc.original_filename,
                });
              }
            });
          });
        }

        if (instList.length > 0) {
          strategy = RETRIEVAL_STRATEGIES.STRUCTURED_DATABASE;
          relevantRecords = instList;
          pageNumber = 1;
        }
        break;
      }

      // ------------------------------------------------------
      // J. TIMELINE INTENT
      // ------------------------------------------------------
      case RETRIEVAL_INTENTS.TIMELINE: {
        const profile = await buildStructuredHealthProfile(rawUserId);
        if (profile?.timeline?.length > 0) {
          strategy = RETRIEVAL_STRATEGIES.TIMELINE_DATABASE;
          relevantRecords = profile.timeline;
          if (profile.recent_documents?.length > 0) {
            primarySourceDocument = profile.recent_documents[0];
          }
        }
        break;
      }

      // ------------------------------------------------------
      // K. COMPARISON INTENT
      // ------------------------------------------------------
      case RETRIEVAL_INTENTS.COMPARISON: {
        // Find documents with duplicate/multi-date observations
        const aiExts = await AIExtraction.find({
          $or: [{ user_id: rawUserId }, { userId: rawUserId }],
        }).populate('document_id').lean();

        const testTimelineMap = {};
        aiExts.forEach(ext => {
          const date = ext.validated_data?.document_date || ext.document_id?.upload_date;
          const tests = [
            ...(ext.validated_data?.laboratory_tests || []),
            ...(ext.validated_data?.observations || []),
          ];
          tests.forEach(t => {
            if (t.test_name) {
              const k = t.test_name.toLowerCase();
              if (!testTimelineMap[k]) testTimelineMap[k] = [];
              testTimelineMap[k].push({
                test_name: t.test_name,
                value: t.value,
                unit: t.unit,
                reference_range: t.reference_range,
                date,
                document_name: ext.document_id?.original_filename,
              });
            }
          });
        });

        // Filter tests with > 1 entry or targeted entity
        const comparisonRecords = [];
        for (const k in testTimelineMap) {
          if (targetEntity && k.includes(targetEntity.key)) {
            comparisonRecords.push(...testTimelineMap[k]);
          } else if (!targetEntity && testTimelineMap[k].length > 1) {
            comparisonRecords.push(...testTimelineMap[k]);
          }
        }

        if (comparisonRecords.length > 0) {
          strategy = RETRIEVAL_STRATEGIES.STRUCTURED_DATABASE;
          relevantRecords = comparisonRecords;
          pageNumber = 1;
        }
        break;
      }

      // ------------------------------------------------------
      // L. GENERAL_EXPLANATION INTENT
      // ------------------------------------------------------
      case RETRIEVAL_INTENTS.GENERAL_EXPLANATION: {
        if (targetEntity) {
          // Check if patient has this test in records to anchor personalized context
          const interp = await ObservationInterpretation.findOne({
            $or: [{ user_id: rawUserId }, { userId: rawUserId }],
            test_name: { $regex: targetEntity.key, $options: 'i' },
          }).populate('document_id').lean();

          if (interp) {
            strategy = RETRIEVAL_STRATEGIES.STRUCTURED_DATABASE;
            relevantRecords = [interp];
            if (interp.document_id) {
              primarySourceDocument = {
                id: interp.document_id._id.toString(),
                original_name: interp.document_id.original_filename || interp.document_id.originalName,
                document_type: interp.document_id.document_type || 'LAB_REPORT',
                document_date: interp.document_id.upload_date,
              };
              pageNumber = 1;
            }
          }
        }
        break;
      }

      // ------------------------------------------------------
      // M. UNKNOWN INTENT
      // ------------------------------------------------------
      case RETRIEVAL_INTENTS.UNKNOWN:
      default: {
        strategy = RETRIEVAL_STRATEGIES.NONE;
        relevantRecords = [];
        break;
      }
    }

    // ========================================================
    // RELEVANCE GATE ENFORCEMENT
    // ========================================================
    const relevanceInfo = this.evaluateRelevance({
      intent,
      query,
      retrievedRecords: relevantRecords,
      candidateChunks,
      targetEntity,
      documentType: requestedDocumentType,
    });

    // If relevance gate fails, reject immediately and do NOT send irrelevant context
    if (!relevanceInfo.gate_passed) {
      return {
        detected_intent: intent,
        retrieval_strategy: RETRIEVAL_STRATEGIES.REJECTED_IRRELEVANT,
        relevant_records: [],
        source_document: null,
        page: null,
        relevance_information: {
          ...relevanceInfo,
          filter_applied: {
            user_id: rawUserId,
            document_type: requestedDocumentType || null,
          },
        },
        relevant_context: '',
      };
    }

    // Format safe context for LLM
    const formattedContext = this.formatContextForLLM({
      intent,
      records: relevantRecords,
      chunks: candidateChunks,
      sourceDocument: primarySourceDocument,
    });

    return {
      detected_intent: intent,
      retrieval_strategy: strategy,
      relevant_records: relevantRecords,
      source_document: primarySourceDocument,
      page: pageNumber,
      relevance_information: {
        ...relevanceInfo,
        filter_applied: {
          user_id: rawUserId,
          document_type: requestedDocumentType || null,
        },
      },
      relevant_context: formattedContext,
    };
  }

  /**
   * Helper: Format retrieved records into concise context for LLM without exposing internal scores
   */
  formatContextForLLM({ intent, records = [], chunks = [], sourceDocument = null }) {
    if (!records.length && !chunks.length) return '';

    const lines = [];
    lines.push(`=== RETRIEVED USER MEDICAL CONTEXT (Intent: ${intent}) ===`);

    if (sourceDocument) {
      lines.push(`Primary Source Document: "${sourceDocument.original_name}" (${sourceDocument.document_type || 'MEDICAL_RECORD'})`);
    }

    if (records.length > 0) {
      lines.push('\n[STRUCTURED CLINICAL RECORDS]:');
      records.forEach((rec, idx) => {
        if (rec.test_name && rec.value !== undefined) {
          lines.push(`• Test: ${rec.test_name} | Result: ${rec.value} ${rec.unit || ''} | Ref Range: ${rec.reference_range || 'None'} | Flag: ${rec.abnormal_flag || 'NORMAL'}`);
        } else if (rec.name && (rec.dosage || rec.frequency)) {
          lines.push(`• Medication: ${rec.name} | Dosage: ${rec.dosage || 'Standard'} | Frequency: ${rec.frequency || 'As advised'}${rec.instructions ? ` | Instructions: ${rec.instructions}` : ''}`);
        } else if (rec.diagnosis) {
          lines.push(`• Diagnosis: ${rec.diagnosis}${rec.source_document ? ` (Source: ${rec.source_document})` : ''}`);
        } else if (rec.role || rec.specialization) {
          lines.push(`• Attending Doctor: ${rec.name}${rec.specialization ? ` (${rec.specialization})` : ''}${rec.hospital ? ` at ${rec.hospital}` : ''}`);
        } else if (rec.date && (rec.title || rec.event_type)) {
          lines.push(`• Timeline Event [${rec.date}]: ${rec.title || rec.event_type} (${rec.document_type || 'Record'})`);
        } else if (rec.text || rec.summary) {
          lines.push(`• ${rec.text || rec.summary}`);
        }
      });
    }

    if (chunks.length > 0) {
      lines.push('\n[DOCUMENT TEXT EXCERPTS]:');
      chunks.forEach((c, idx) => {
        lines.push(`--- Excerpt #${idx + 1} ---`);
        lines.push(c.text);
      });
    }

    lines.push('========================================================');
    return lines.join('\n');
  }
}

export const retrievalService = new RetrievalService();
export default retrievalService;
