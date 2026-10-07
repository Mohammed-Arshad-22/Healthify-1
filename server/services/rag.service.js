/**
 * Medical Document RAG (Retrieval-Augmented Generation) Service
 * Implements semantic chunking, context preservation, date awareness,
 * multi-document relevance scoring, query intent routing, and zero-hallucination failure handling.
 */

export const QUERY_INTENTS = {
  DOCTOR: 'DOCTOR',
  MEDICATION: 'MEDICATION',
  PRESCRIPTION: 'PRESCRIPTION',
  SPECIFIC_LAB_TEST: 'SPECIFIC_LAB_TEST',
  ABNORMAL_TESTS: 'ABNORMAL_TESTS',
  GENERAL_LAB_REPORT: 'GENERAL_LAB_REPORT',
  GENERAL_HEALTH: 'GENERAL_HEALTH',
  COMPARISON: 'COMPARISON',
};

// Common medical tests to detect in user queries for targeted retrieval
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
  { key: 'ast_alt', aliases: ['sgot', 'sgpt', 'ast', 'alt', 'liver enzymes'] },
  { key: 'electrolytes', aliases: ['sodium', 'potassium', 'chloride', 'electrolytes'] },
];

class RAGService {
  /**
   * Classify user query into a clinical intent
   */
  classifyQueryIntent(query = '') {
    const q = query.toLowerCase().trim();

    // 0. Comparison check FIRST
    const compareRegex = /(compare|comparison|trend|changed over time|difference between (my )?reports|previous vs (latest|current)|earlier report|higher or lower than before|ஒப்பீடு|तुलना)/i;
    if (compareRegex.test(q)) {
      return QUERY_INTENTS.COMPARISON;
    }

    // 1. Medication / Prescription check FIRST
    // Handles: "What medicines did my doctor prescribe?", "Explain my prescription", "My tablets"
    const medRegex = /(medicine|medicines|medication|medications|drug|drugs|tablet|tablets|pill|pills|dose|dosage|prescribe|prescribed|prescription|prescriptions|rx|மருந்து|दवा|दवाइयां|दवाएं|மందు)/i;
    const isMedOrPrescription = medRegex.test(q);

    if (isMedOrPrescription) {
      if (q.includes('prescription') || q.includes('rx') || q.includes('explain my prescription') || q.includes('view prescription')) {
        return QUERY_INTENTS.PRESCRIPTION;
      }
      return QUERY_INTENTS.MEDICATION;
    }

    // 2. Doctor / Provider check (Only if not asking about medicines)
    // Handles: "Who is my doctor?", "What is my doctor's name?", "Doctor contact"
    const doctorRegex = /(who is my doctor|who's my doctor|what is my doctor|doctor's name|doctor name|my doctor|physician|which doctor|consulting doctor|primary doctor|care provider|treating doctor|மருத்துவர்|डॉक्टर|వైద్యుడు)/i;
    if (doctorRegex.test(q)) {
      return QUERY_INTENTS.DOCTOR;
    }

    // 3. Abnormal results check
    // Handles: "Which values are abnormal?", "Out of range", "High or low"
    const abnormalRegex = /(abnormal|out of range|outside range|outside the range|high or low|elevated or low|concerning|irregular|deviation|borderline|அசாதாரண|असामान्य)/i;
    if (abnormalRegex.test(q)) {
      return QUERY_INTENTS.ABNORMAL_TESTS;
    }

    // 4. Specific medical test check
    const detected = this.detectTargetEntity(query);
    if (detected) {
      return QUERY_INTENTS.SPECIFIC_LAB_TEST;
    }

    // 5. General lab report check
    const reportRegex = /(lab report|blood report|blood test|test report|diagnostic report|explain my report|explain the report|explain report|cbc|metabolic panel|ரத்த அறிக்கை|ரத்த பரிசோதனை|இரத்த அறிக்கை|இரத்தப் பரிசோதனை|இரத்த|ரத்த|रक्त रिपोर्ट|रक्त जांच|ల్యాబ్ నివేదిక)/i;
    if (reportRegex.test(q)) {
      return QUERY_INTENTS.GENERAL_LAB_REPORT;
    }

    return QUERY_INTENTS.GENERAL_HEALTH;
  }

  /**
   * Detect specific medical entity from query
   */
  detectTargetEntity(query = '') {
    const qLower = query.toLowerCase().trim();
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
   * Break a medical document into semantic, relationship-preserving chunks (Section 4)
   * Preserves: Test -> Result -> Unit -> Reference Range -> Date -> Doctor -> Hospital
   */
  chunkDocument(doc) {
    const chunks = [];
    if (!doc) return chunks;

    const docId = doc._id ? String(doc._id) : 'doc';
    const docName = doc.originalName || doc.fileName || 'Medical Document';
    const category = doc.category || 'medical_document';
    const docDate = doc.extractedData?.documentDate || doc.createdAt || new Date();
    const docDateObj = new Date(docDate);
    const dateFormatted = docDateObj.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
    const doctorName = doc.extractedData?.doctorName || '';
    const hospitalName = doc.extractedData?.hospitalName || '';

    const ext = doc.extractedData || {};

    // 1. Doctor & Facility Information Chunk
    if (doctorName || hospitalName) {
      const docInfoText = [
        `Document: "${docName}" (Date: ${dateFormatted})`,
        doctorName ? `Doctor / Physician: ${doctorName}` : null,
        hospitalName ? `Facility / Clinic: ${hospitalName}` : null,
        `Document Category: ${category.replace('_', ' ').toUpperCase()}`,
      ].filter(Boolean).join('\n');

      chunks.push({
        chunkId: `${docId}_doc_info`,
        documentId: docId,
        documentName: docName,
        category,
        documentDate: docDateObj,
        documentDateFormatted: dateFormatted,
        hospitalName,
        doctorName,
        chunkType: 'doctor_info',
        sectionName: 'Doctor & Facility Information',
        text: docInfoText,
      });
    }

    // 2. Lab Test Chunks (Table-based relationship preservation)
    if (ext.labTests && Array.isArray(ext.labTests)) {
      ext.labTests.forEach((t, idx) => {
        const testName = t.testName || `Test #${idx + 1}`;
        const valStr = t.value !== undefined ? String(t.value) : '';
        const unitStr = t.unit || '';
        const rangeStr = t.referenceRange ? t.referenceRange.trim() : '';

        const chunkText = [
          `Document: "${docName}"`,
          `Report Date: ${dateFormatted}`,
          hospitalName ? `Facility: ${hospitalName}` : null,
          doctorName ? `Doctor: ${doctorName}` : null,
          `Section: Laboratory Test Result`,
          `Test: ${testName}`,
          `Result: ${valStr} ${unitStr}`.trim(),
          rangeStr ? `Reference Range on Report: ${rangeStr}` : `Reference Range on Report: None specified on report`,
          t.status && t.status !== 'unknown' ? `Status Flag: ${t.status}` : null,
        ].filter(Boolean).join('\n');

        chunks.push({
          chunkId: `${docId}_test_${idx}`,
          documentId: docId,
          documentName: docName,
          category,
          documentDate: docDateObj,
          documentDateFormatted: dateFormatted,
          hospitalName,
          doctorName,
          chunkType: 'lab_test',
          sectionName: `Lab Test: ${testName}`,
          testName,
          value: valStr,
          numericValue: t.numericValue,
          unit: unitStr,
          referenceRange: rangeStr,
          status: t.status || 'unknown',
          confidence: t.confidence || doc.overallConfidence || 85,
          text: chunkText,
        });
      });
    }

    // 3. Prescribed Medications Chunks
    if (ext.medicines && Array.isArray(ext.medicines) && ext.medicines.length > 0) {
      ext.medicines.forEach((m, idx) => {
        const medName = m.name || `Medicine #${idx + 1}`;
        const chunkText = [
          `Document: "${docName}"`,
          `Prescription Date: ${dateFormatted}`,
          doctorName ? `Prescribing Doctor: ${doctorName}` : null,
          hospitalName ? `Clinic / Hospital: ${hospitalName}` : null,
          `Section: Prescribed Medication`,
          `Medicine: ${medName}`,
          `Dosage: ${m.dosage || 'Standard'}`,
          `Frequency: ${m.frequency || 'As advised'}`,
          m.duration ? `Duration: ${m.duration}` : null,
          m.instructions ? `Instructions: ${m.instructions}` : null,
        ].filter(Boolean).join('\n');

        chunks.push({
          chunkId: `${docId}_med_${idx}`,
          documentId: docId,
          documentName: docName,
          category,
          documentDate: docDateObj,
          documentDateFormatted: dateFormatted,
          hospitalName,
          doctorName,
          chunkType: 'medication',
          sectionName: `Prescription: ${medName}`,
          medicineName: medName,
          dosage: m.dosage || '',
          frequency: m.frequency || '',
          duration: m.duration || '',
          instructions: m.instructions || '',
          confidence: m.confidence || doc.overallConfidence || 85,
          text: chunkText,
        });
      });

      // Also create prescription overview chunk
      const presOverviewText = [
        `Document: "${docName}"`,
        `Prescription Date: ${dateFormatted}`,
        doctorName ? `Prescribing Doctor: ${doctorName}` : null,
        hospitalName ? `Facility / Clinic: ${hospitalName}` : null,
        `Section: Prescription Summary`,
        `Prescribed Medications:`,
        ...ext.medicines.map(m => `• ${m.name}: ${m.dosage || 'Standard dose'}, ${m.frequency || 'As advised'}${m.instructions ? ` (${m.instructions})` : ''}`),
        ext.diagnosis?.length > 0 ? `Indications / Diagnosis: ${ext.diagnosis.join(', ')}` : null,
      ].filter(Boolean).join('\n');

      chunks.push({
        chunkId: `${docId}_pres_overview`,
        documentId: docId,
        documentName: docName,
        category: 'prescription',
        documentDate: docDateObj,
        documentDateFormatted: dateFormatted,
        hospitalName,
        doctorName,
        chunkType: 'prescription',
        sectionName: 'Prescription Overview',
        text: presOverviewText,
      });
    }

    // 4. Clinical Impressions / Diagnosis Chunks
    if (ext.diagnosis && Array.isArray(ext.diagnosis) && ext.diagnosis.length > 0) {
      chunks.push({
        chunkId: `${docId}_diag`,
        documentId: docId,
        documentName: docName,
        category,
        documentDate: docDateObj,
        documentDateFormatted: dateFormatted,
        hospitalName,
        doctorName,
        chunkType: 'diagnosis',
        sectionName: 'Clinical Impressions / Diagnoses',
        diagnosisList: ext.diagnosis,
        text: `Document: "${docName}" (Date: ${dateFormatted})\nSection: Clinical Impressions / Diagnoses\nFindings: ${ext.diagnosis.join(', ')}`,
      });
    }

    // 5. Document Summary / OCR Text
    if (ext.summary) {
      chunks.push({
        chunkId: `${docId}_summary`,
        documentId: docId,
        documentName: docName,
        category,
        documentDate: docDateObj,
        documentDateFormatted: dateFormatted,
        hospitalName,
        doctorName,
        chunkType: 'summary',
        sectionName: 'Document Summary',
        text: `Document: "${docName}" (Date: ${dateFormatted})\nSection: Document Summary\nSummary: ${ext.summary}`,
      });
    }

    return chunks;
  }

  /**
   * Retrieve relevant chunks from user documents (Sections 1, 4, 5, 6, 9, 11, 13)
   * The retrieval strictly depends on the user's question.
   */
  retrieveRelevantChunks({ query = '', documents = [], labMetrics = [], medications = [], records = [], doctors = [], user = {}, limit = 8 }) {
    const qLower = query.toLowerCase().trim();
    const intent = this.classifyQueryIntent(query);

    // 1. Build all semantic chunks across user's documents
    const allChunks = [];
    documents.forEach(doc => {
      const docChunks = this.chunkDocument(doc);
      allChunks.push(...docChunks);
    });

    // 2. Index standalone HealthRecords
    if (Array.isArray(records) && records.length > 0) {
      records.forEach((r, idx) => {
        const recDate = new Date(r.date || new Date());
        const dateFormatted = recDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
        const isPrescriptionRecord = r.recordType === 'prescription';
        allChunks.push({
          chunkId: `rec_${r._id || idx}`,
          documentId: `record_${r._id || idx}`,
          documentName: r.title || 'Health Record',
          category: r.recordType || 'clinical_record',
          documentDate: recDate,
          documentDateFormatted: dateFormatted,
          hospitalName: r.hospitalClinicName || '',
          doctorName: r.doctorName || '',
          chunkType: isPrescriptionRecord ? 'prescription' : (r.doctorName ? 'doctor_info' : 'clinical_record'),
          sectionName: `Clinical Record: ${r.title}`,
          text: `Record: "${r.title}" (Date: ${dateFormatted})\nDoctor: ${r.doctorName || 'Not recorded'}\nFacility: ${r.hospitalClinicName || 'Not recorded'}${r.notes ? `\nNotes: ${r.notes}` : ''}${r.diagnosis?.length ? `\nFindings: ${r.diagnosis.join(', ')}` : ''}`,
        });
      });
    }

    // 3. Index user primary doctor if present
    if (user?.primaryDoctorName) {
      allChunks.push({
        chunkId: 'user_primary_doc',
        documentId: 'user_profile',
        documentName: 'Verified Health Profile',
        category: 'profile',
        documentDate: user.lastCheckupDate ? new Date(user.lastCheckupDate) : new Date(),
        documentDateFormatted: user.lastCheckupDate ? new Date(user.lastCheckupDate).toLocaleDateString('en-GB') : 'Current Profile',
        hospitalName: '',
        doctorName: user.primaryDoctorName,
        chunkType: 'doctor_info',
        sectionName: 'Primary Doctor Profile',
        text: `Primary Care Doctor: ${user.primaryDoctorName}${user.primaryDoctorPhone ? ` (Phone: ${user.primaryDoctorPhone})` : ''}`,
      });
    }

    // 4. Index doctors collection if present
    if (Array.isArray(doctors) && doctors.length > 0) {
      doctors.forEach((d, idx) => {
        allChunks.push({
          chunkId: `doc_entry_${d._id || idx}`,
          documentId: `doctor_${d._id || idx}`,
          documentName: 'Registered Doctor Profile',
          category: 'doctor_profile',
          documentDate: d.lastConsultationDate ? new Date(d.lastConsultationDate) : new Date(),
          documentDateFormatted: d.lastConsultationDate ? new Date(d.lastConsultationDate).toLocaleDateString('en-GB') : 'Current',
          hospitalName: d.hospitalClinic || '',
          doctorName: d.name,
          chunkType: 'doctor_info',
          sectionName: `Doctor: ${d.name}`,
          text: `Doctor: ${d.name}\nSpecialization: ${d.specialization || 'General Physician'}\nHospital/Clinic: ${d.hospitalClinic || 'Clinic'}${d.phone ? `\nPhone: ${d.phone}` : ''}`,
        });
      });
    }

    // 5. Index standalone labMetrics if not already represented in document chunks
    if (labMetrics.length > 0) {
      labMetrics.forEach((l, idx) => {
        const metricDate = new Date(l.date || new Date());
        const dateFormatted = metricDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
        let rangeStr = '';
        if (l.referenceMin !== undefined && l.referenceMax !== undefined) {
          rangeStr = `${l.referenceMin}–${l.referenceMax} ${l.unit || ''}`.trim();
        } else if (l.referenceMin !== undefined) {
          rangeStr = `>= ${l.referenceMin} ${l.unit || ''}`.trim();
        } else if (l.referenceMax !== undefined) {
          rangeStr = `<= ${l.referenceMax} ${l.unit || ''}`.trim();
        }

        const alreadyInChunks = allChunks.some(
          c => c.chunkType === 'lab_test' && c.testName.toLowerCase() === l.metricName.toLowerCase()
        );

        if (!alreadyInChunks) {
          allChunks.push({
            chunkId: `metric_${l._id || idx}`,
            documentId: l.sourceRecordId ? String(l.sourceRecordId) : `metric_${idx}`,
            documentName: 'Verified Clinical Records',
            category: 'laboratory_report',
            documentDate: metricDate,
            documentDateFormatted: dateFormatted,
            hospitalName: 'Recorded Clinical Metric',
            doctorName: '',
            chunkType: 'lab_test',
            sectionName: `Recorded Metric: ${l.metricName}`,
            testName: l.metricName,
            value: String(l.value),
            numericValue: l.value,
            unit: l.unit || '',
            referenceRange: rangeStr,
            status: l.status || 'unknown',
            confidence: 90,
            text: `Document: "Verified Clinical Records" (Date: ${dateFormatted})\nSection: Laboratory Test Metric\nTest: ${l.metricName}\nResult: ${l.value} ${l.unit || ''}\nReport Reference Range: ${rangeStr || 'Not recorded'}\nStatus: ${l.status || 'unknown'}`,
          });
        }
      });
    }

    // ==========================================
    // ROUTE STRICTLY BY QUERY INTENT
    // ==========================================

    // CASE 1: DOCTOR INQUIRY ("Who is my doctor?", "Doctor name")
    if (intent === QUERY_INTENTS.DOCTOR) {
      const doctorChunks = allChunks.filter(c => c.chunkType === 'doctor_info' || (c.doctorName && c.doctorName.trim().length > 0));
      const uniqueDoctorChunks = [];
      const seenDocs = new Set();
      doctorChunks.forEach(c => {
        const key = `${c.doctorName}_${c.hospitalName}`;
        if (!seenDocs.has(key)) {
          seenDocs.add(key);
          uniqueDoctorChunks.push(c);
        }
      });

      if (uniqueDoctorChunks.length === 0) {
        return {
          retrievalStatus: 'NOT_FOUND',
          intent,
          missingEntity: 'Doctor information',
          chunks: [],
          sources: [],
        };
      }

      return {
        retrievalStatus: 'SUCCESS',
        intent,
        missingEntity: null,
        chunks: uniqueDoctorChunks.slice(0, limit),
        sources: this.buildSourcesFromChunks(uniqueDoctorChunks),
      };
    }

    // CASE 2: MEDICATION / PRESCRIPTION INQUIRY ("What medicines did my doctor prescribe?", "Explain my prescription")
    if (intent === QUERY_INTENTS.MEDICATION || intent === QUERY_INTENTS.PRESCRIPTION) {
      const medChunks = allChunks.filter(c => c.chunkType === 'medication' || c.chunkType === 'prescription');

      // Also incorporate structured active medications from Medication collection if not already represented
      if (Array.isArray(medications) && medications.length > 0) {
        medications.forEach((m, idx) => {
          const already = medChunks.some(c => c.medicineName && c.medicineName.toLowerCase() === m.name.toLowerCase());
          if (!already) {
            medChunks.push({
              chunkId: `active_med_${idx}`,
              documentId: 'active_prescriptions',
              documentName: 'Active Prescribed Medications',
              category: 'prescription',
              documentDate: new Date(),
              documentDateFormatted: 'Current',
              hospitalName: '',
              doctorName: m.prescribedBy || '',
              chunkType: 'medication',
              sectionName: `Prescription: ${m.name}`,
              medicineName: m.name,
              dosage: m.dosage || '',
              frequency: m.frequency || '',
              instructions: m.instructions || '',
              text: `Document: "Active Prescriptions"\nSection: Prescribed Medication\nMedicine: ${m.name}\nDosage: ${m.dosage || 'Standard'}\nFrequency: ${m.frequency || 'As advised'}${m.prescribedBy ? `\nPrescribed By: ${m.prescribedBy}` : ''}${m.instructions ? `\nInstructions: ${m.instructions}` : ''}`,
            });
          }
        });
      }

      // Check if user has zero medication records anywhere
      if (medChunks.length === 0) {
        return {
          retrievalStatus: 'NOT_FOUND',
          intent,
          missingEntity: 'Medication information',
          notFoundMessage: "I couldn't find medication information in your uploaded records.",
          chunks: [],
          sources: [],
        };
      }

      const sources = this.buildSourcesFromChunks(medChunks);
      return {
        retrievalStatus: 'SUCCESS',
        intent,
        missingEntity: null,
        chunks: medChunks.slice(0, limit),
        sources,
      };
    }

    // CASE 3: SPECIFIC LAB TEST ("What is my HbA1c?", "Hemoglobin level")
    const targetEntity = this.detectTargetEntity(query);
    if (intent === QUERY_INTENTS.SPECIFIC_LAB_TEST && targetEntity) {
      const matchedTestChunks = allChunks.filter(c => {
        if (c.chunkType !== 'lab_test') return false;
        const testLower = c.testName.toLowerCase();
        return targetEntity.aliases.some(alias => {
          if (alias.length <= 2) {
            const regex = new RegExp(`(^|[^a-z0-9])${alias}([^a-z0-9]|$)`, 'i');
            return regex.test(testLower);
          }
          return testLower.includes(alias);
        });
      });

      matchedTestChunks.sort((a, b) => b.documentDate - a.documentDate);

      if (matchedTestChunks.length === 0) {
        return {
          retrievalStatus: 'NOT_FOUND',
          intent,
          missingEntity: targetEntity.key.replace('_', ' ').toUpperCase(),
          targetEntity,
          chunks: [],
          primaryDocument: null,
          historicalComparison: null,
          sources: [],
        };
      }

      let historicalComparison = null;
      if (matchedTestChunks.length > 1) {
        const latest = matchedTestChunks[0];
        const previous = matchedTestChunks.find(
          c => c.documentDate.getTime() !== latest.documentDate.getTime()
        );
        if (previous) {
          historicalComparison = {
            testName: latest.testName,
            latest,
            previous,
          };
        }
      }

      const topChunks = matchedTestChunks.slice(0, limit);
      const sources = this.buildSourcesFromChunks(topChunks);

      return {
        retrievalStatus: 'SUCCESS',
        intent,
        missingEntity: null,
        targetEntity,
        chunks: topChunks,
        primaryDocument: topChunks[0],
        historicalComparison,
        sources,
      };
    }

    // CASE 3b: MULTI-REPORT / CHRONOLOGICAL COMPARISON ("Compare two reports", "Compare my reports")
    if (intent === QUERY_INTENTS.COMPARISON) {
      const targetEntity = this.detectTargetEntity(query);
      let matchedTestChunks = [];

      if (targetEntity) {
        matchedTestChunks = allChunks.filter(c => {
          if (c.chunkType !== 'lab_test') return false;
          const testLower = c.testName.toLowerCase();
          return targetEntity.aliases.some(alias => {
            if (alias.length <= 2) {
              const regex = new RegExp(`(^|[^a-z0-9])${alias}([^a-z0-9]|$)`, 'i');
              return regex.test(testLower);
            }
            return testLower.includes(alias);
          });
        });
      } else {
        const labChunks = allChunks.filter(c => c.chunkType === 'lab_test');
        const testGroups = {};
        for (const chunk of labChunks) {
          const normKey = chunk.testName.toLowerCase().replace(/[^a-z0-9]/g, '');
          if (!testGroups[normKey]) testGroups[normKey] = [];
          testGroups[normKey].push(chunk);
        }

        let chosenGroup = null;
        for (const [key, group] of Object.entries(testGroups)) {
          if (group.length > 1) {
            const firstDate = group[0].documentDate ? new Date(group[0].documentDate).getTime() : 0;
            const hasMultipleDates = group.some(g => (g.documentDate ? new Date(g.documentDate).getTime() : 0) !== firstDate);
            if (hasMultipleDates) {
              if (key.includes('hemoglobin') || key.includes('glucose') || !chosenGroup) {
                chosenGroup = group;
                if (key.includes('hemoglobin')) break;
              }
            }
          }
        }

        if (chosenGroup) {
          matchedTestChunks = chosenGroup;
        } else if (labChunks.length > 0) {
          matchedTestChunks = labChunks;
        }
      }

      matchedTestChunks.sort((a, b) => (b.documentDate || 0) - (a.documentDate || 0));

      let historicalComparison = null;
      if (matchedTestChunks.length > 1) {
        const latest = matchedTestChunks[0];
        const previous = matchedTestChunks.find(
          c => (c.documentDate ? new Date(c.documentDate).getTime() : 0) !== (latest.documentDate ? new Date(latest.documentDate).getTime() : 0)
        ) || matchedTestChunks[1];

        if (previous) {
          historicalComparison = {
            testName: latest.testName,
            latest,
            previous,
          };
        }
      }

      const topChunks = matchedTestChunks.slice(0, limit);
      const sources = this.buildSourcesFromChunks(topChunks);

      return {
        retrievalStatus: historicalComparison ? 'SUCCESS' : (matchedTestChunks.length > 0 ? 'PARTIAL' : 'NOT_FOUND'),
        intent,
        targetEntity: targetEntity || null,
        chunks: topChunks,
        primaryDocument: topChunks[0] || null,
        historicalComparison,
        sources,
      };
    }

    // CASE 4: ABNORMAL TEST RESULTS ("Which values are abnormal?", "Out of range")
    if (intent === QUERY_INTENTS.ABNORMAL_TESTS) {
      const abnormalChunks = allChunks.filter(c => {
        if (c.chunkType !== 'lab_test') return false;
        const status = (c.status || '').toLowerCase();
        return status === 'high' || status === 'low' || status === 'abnormal';
      });

      abnormalChunks.sort((a, b) => b.documentDate - a.documentDate);

      const uniqueAbnormal = [];
      const seenTests = new Set();
      abnormalChunks.forEach(c => {
        const key = c.testName.toLowerCase();
        if (!seenTests.has(key)) {
          seenTests.add(key);
          uniqueAbnormal.push(c);
        }
      });

      const sources = this.buildSourcesFromChunks(uniqueAbnormal);
      return {
        retrievalStatus: 'SUCCESS',
        intent,
        allNormal: uniqueAbnormal.length === 0,
        missingEntity: null,
        chunks: uniqueAbnormal.slice(0, limit),
        sources,
      };
    }

    // CASE 5: GENERAL LAB REPORT ("Explain my blood report", "Explain latest report")
    if (intent === QUERY_INTENTS.GENERAL_LAB_REPORT) {
      const labDocuments = documents.filter(d =>
        d.category === 'laboratory_report' ||
        d.category === 'diagnostic_report' ||
        (d.extractedData?.labTests && d.extractedData.labTests.length > 0)
      );

      labDocuments.sort((a, b) => {
        const dateA = new Date(a.extractedData?.documentDate || a.createdAt);
        const dateB = new Date(b.extractedData?.documentDate || b.createdAt);
        return dateB - dateA;
      });

      if (labDocuments.length > 0) {
        const latestDoc = labDocuments[0];
        const latestDocId = String(latestDoc._id);
        const docChunks = allChunks.filter(c => c.documentId === latestDocId);
        const sources = this.buildSourcesFromChunks(docChunks.length > 0 ? docChunks : allChunks.slice(0, limit));

        return {
          retrievalStatus: 'SUCCESS',
          intent,
          missingEntity: null,
          chunks: docChunks.length > 0 ? docChunks : allChunks.slice(0, limit),
          primaryDocument: latestDoc,
          sources,
        };
      }

      const testChunks = allChunks.filter(c => c.chunkType === 'lab_test');
      if (testChunks.length > 0) {
        testChunks.sort((a, b) => b.documentDate - a.documentDate);
        return {
          retrievalStatus: 'SUCCESS',
          intent,
          missingEntity: null,
          chunks: testChunks.slice(0, limit),
          sources: this.buildSourcesFromChunks(testChunks.slice(0, limit)),
        };
      }

      return {
        retrievalStatus: 'EMPTY',
        intent,
        missingEntity: 'Laboratory Report',
        chunks: [],
        sources: [],
      };
    }

    // CASE 6: GENERAL HEALTH QUERY
    const queryTokens = qLower.split(/\s+/).filter(w => w.length > 3);
    const matchedChunks = allChunks.filter(c => {
      const textLower = c.text.toLowerCase();
      return queryTokens.some(token => textLower.includes(token));
    });

    if (matchedChunks.length > 0) {
      return {
        retrievalStatus: 'SUCCESS',
        intent: QUERY_INTENTS.GENERAL_HEALTH,
        missingEntity: null,
        chunks: matchedChunks.slice(0, limit),
        sources: this.buildSourcesFromChunks(matchedChunks.slice(0, limit)),
      };
    }

    return {
      retrievalStatus: 'EMPTY',
      intent: QUERY_INTENTS.GENERAL_HEALTH,
      missingEntity: null,
      chunks: [],
      sources: [],
    };
  }

  /**
   * Format retrieved chunks into concise, relationship-preserving RAG context for LLM (Sections 4, 13, 14, 15)
   */
  formatContextForLLM(retrievalResult) {
    if (!retrievalResult || retrievalResult.retrievalStatus === 'EMPTY' || !retrievalResult.chunks || retrievalResult.chunks.length === 0) {
      return 'NO RELEVANT MEDICAL DOCUMENT CHUNKS RETRIEVED.';
    }

    const { chunks, historicalComparison, intent } = retrievalResult;
    const lines = [];

    lines.push(`=== RETRIEVED MEDICAL CONTEXT (Intent: ${intent || 'GENERAL'} | Primary Ground Truth) ===`);
    lines.push(`Total Retrieved Chunks: ${chunks.length}`);

    if (historicalComparison) {
      const { testName, latest, previous } = historicalComparison;
      lines.push(`\n[MULTI-DOCUMENT COMPARISON FOR ${testName.toUpperCase()}]:`);
      lines.push(`• Latest Report ("${latest.documentName}", Date: ${latest.documentDateFormatted}): ${latest.value} ${latest.unit || ''} (Range: ${latest.referenceRange || 'None specified'})`);
      lines.push(`• Previous Report ("${previous.documentName}", Date: ${previous.documentDateFormatted}): ${previous.value} ${previous.unit || ''} (Range: ${previous.referenceRange || 'None specified'})`);
    }

    lines.push('\n[RETRIEVED SECTIONS]:');
    chunks.forEach((c, idx) => {
      lines.push(`--- CHUNK #${idx + 1} [Source: "${c.documentName}" | Section: ${c.sectionName} | Date: ${c.documentDateFormatted}] ---`);
      const cleanText = (c.text || '')
        .replace(/<<<UNTRUSTED_DOCUMENT_CONTENT_START>>>/g, '')
        .replace(/<<<UNTRUSTED_DOCUMENT_CONTENT_END>>>/g, '');
      lines.push(cleanText);
    });

    lines.push(`================================================================`);
    return lines.join('\n');
  }

  /**
   * Build clean, traceable sources for UI citation (Section 12)
   */
  buildSourcesFromChunks(chunks = []) {
    const sources = [];
    const seen = new Set();

    chunks.forEach(c => {
      const key = `${c.documentName}_${c.documentDateFormatted}`;
      if (!seen.has(key)) {
        seen.add(key);
        sources.push({
          title: c.documentName,
          date: c.documentDateFormatted,
          hospital: c.hospitalName || 'Verified Clinical Facility',
          type: (c.category || 'medical_document').replace('_', ' ').toUpperCase(),
          section: c.sectionName,
        });
      }
    });

    return sources;
  }
}

export const ragService = new RAGService();
export default ragService;
