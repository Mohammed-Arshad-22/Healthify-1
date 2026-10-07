/**
 * PHASE 8: RETRIEVAL FOUNDATION AUTOMATED TEST SUITE
 * Tests question understanding, 13 supported intents, structured-first retrieval priority,
 * metadata-filtered vector search, relevance gating, multi-tenant isolation, and non-exposure to user.
 */

import { retrievalService, RETRIEVAL_INTENTS, RETRIEVAL_STRATEGIES } from '../services/retrieval.service.js';

const API_URL = 'http://localhost:5000/api';

// Valid synthetic PDF generator with proper text line operators
function generateSyntheticPdf(textLines) {
  const lines = Array.isArray(textLines) ? textLines : textLines.split('\n');
  const contentStream = lines
    .map((l, idx) => `1 0 0 1 50 ${750 - idx * 24} Tm (${l.replace(/[()]/g, '')}) Tj`)
    .join('\n');
  const streamBody = `BT\n/F1 12 Tf\n${contentStream}\nET`;
  const streamLength = Buffer.byteLength(streamBody);

  const pdfStr = `%PDF-1.4
1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj
2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj
3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >> endobj
4 0 obj << /Length ${streamLength} >> stream
${streamBody}
endstream endobj
5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj
xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000244 00000 n 
0000000300 00000 n 
trailer << /Size 6 /Root 1 0 R >>
startxref
380
%%EOF`;

  return Buffer.from(pdfStr, 'utf-8');
}

async function runPhase8RetrievalTests() {
  console.log('\n===============================================================');
  console.log('   PHASE 8: RETRIEVAL FOUNDATION AUTOMATED TESTS              ');
  console.log('===============================================================\n');

  let passed = 0;
  let total = 0;

  function assert(condition, message, details = '') {
    total++;
    if (condition) {
      console.log(`✓ PASS: ${message}`);
      passed++;
    } else {
      console.error(`✗ FAIL: ${message} ${details ? `(${details})` : ''}`);
      throw new Error(`Test failed: ${message}`);
    }
  }

  try {
    // -------------------------------------------------------------------------
    // SECTION 1: QUESTION UNDERSTANDING & INTENT ROUTER (ALL 13 INTENTS)
    // -------------------------------------------------------------------------
    console.log('[SECTION 1] Testing Intent Classification Across All 13 Supported Intents...');

    const intentTests = [
      { query: 'Who is my doctor?', expected: RETRIEVAL_INTENTS.DOCTOR },
      { query: 'What is my doctor\'s name?', expected: RETRIEVAL_INTENTS.DOCTOR },
      { query: 'What medicines did my doctor prescribe?', expected: RETRIEVAL_INTENTS.MEDICATION },
      { query: 'List my current tablets', expected: RETRIEVAL_INTENTS.MEDICATION },
      { query: 'What is the dosage of Metformin?', expected: RETRIEVAL_INTENTS.DOSAGE },
      { query: 'How many mg should I take per day?', expected: RETRIEVAL_INTENTS.DOSAGE },
      { query: 'What is my HbA1c result?', expected: RETRIEVAL_INTENTS.LAB_RESULT },
      { query: 'What was my hemoglobin level in the blood test?', expected: RETRIEVAL_INTENTS.LAB_RESULT },
      { query: 'Which lab tests are abnormal or out of range?', expected: RETRIEVAL_INTENTS.ABNORMAL_LAB },
      { query: 'Are any of my values high or low?', expected: RETRIEVAL_INTENTS.ABNORMAL_LAB },
      { query: 'What is my clinical diagnosis?', expected: RETRIEVAL_INTENTS.DIAGNOSIS },
      { query: 'What medical condition do I have?', expected: RETRIEVAL_INTENTS.DIAGNOSIS },
      { query: 'Explain my prescription document', expected: RETRIEVAL_INTENTS.PRESCRIPTION },
      { query: 'Show my doctor prescription', expected: RETRIEVAL_INTENTS.PRESCRIPTION },
      { query: 'Give me a summary of my latest medical report', expected: RETRIEVAL_INTENTS.DOCUMENT_SUMMARY },
      { query: 'Summarize my hospital document', expected: RETRIEVAL_INTENTS.DOCUMENT_SUMMARY },
      { query: 'How should I take my medicines (before or after food)?', expected: RETRIEVAL_INTENTS.INSTRUCTIONS },
      { query: 'What directions and precautions did the doctor give?', expected: RETRIEVAL_INTENTS.INSTRUCTIONS },
      { query: 'Show my health timeline of visits', expected: RETRIEVAL_INTENTS.TIMELINE },
      { query: 'What is the chronological history of my medical records?', expected: RETRIEVAL_INTENTS.TIMELINE },
      { query: 'Compare my blood test reports over time', expected: RETRIEVAL_INTENTS.COMPARISON },
      { query: 'Compare my hemoglobin between previous and latest report', expected: RETRIEVAL_INTENTS.COMPARISON },
      { query: 'What is hemoglobin?', expected: RETRIEVAL_INTENTS.GENERAL_EXPLANATION },
      { query: 'Explain what creatinine means', expected: RETRIEVAL_INTENTS.GENERAL_EXPLANATION },
      { query: 'What is the weather in New Delhi today?', expected: RETRIEVAL_INTENTS.UNKNOWN },
      { query: 'Book a train ticket to Chennai', expected: RETRIEVAL_INTENTS.UNKNOWN },
    ];

    intentTests.forEach(({ query, expected }) => {
      const detected = retrievalService.classifyQueryIntent(query);
      assert(detected === expected, `Query "${query}" classified as ${expected}`, `Got ${detected}`);
    });

    // -------------------------------------------------------------------------
    // SECTION 2: TEST USERS SETUP & RECORD INGESTION
    // -------------------------------------------------------------------------
    console.log('\n[SECTION 2] Registering Test Users and Ingesting Multi-Source Records...');

    const timestamp = Date.now();
    const userAReg = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Patient Alpha',
        email: `patient.alpha.${timestamp}@example.com`,
        password: 'Password123!',
      }),
    }).then(r => r.json());
    assert(userAReg.token, 'User A registered and authenticated');
    const tokenA = userAReg.token;
    const userAId = userAReg.user.id || userAReg.user._id;

    const userBReg = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Patient Beta',
        email: `patient.beta.${timestamp}@example.com`,
        password: 'Password123!',
      }),
    }).then(r => r.json());
    assert(userBReg.token, 'User B registered and authenticated');
    const tokenB = userBReg.token;
    const userBId = userBReg.user.id || userBReg.user._id;

    // Ingest Structured Active Medication for User A
    const medRes = await fetch(`${API_URL}/medications`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenA}` },
      body: JSON.stringify({
        name: 'Metformin Hydrochloride',
        dosage: '500mg',
        frequency: 'Twice daily',
        instructions: 'Take with or after meals to minimize stomach upset',
        prescribedBy: 'Dr. Anita Desai',
      }),
    }).then(r => r.json());
    assert(medRes.status === 'success', 'User A structured medication ingested');

    // Ingest Doctor record for User A
    const docRes = await fetch(`${API_URL}/doctors`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenA}` },
      body: JSON.stringify({
        name: 'Dr. Anita Desai',
        specialization: 'Endocrinologist',
        hospitalClinic: 'Apollo Speciality Center',
        phone: '+91 98765 43210',
      }),
    }).then(r => r.json());
    assert(docRes.status === 'success', 'User A doctor record ingested');

    // Upload & Extract Lab Report for User A (Date: 2026-09-01)
    const labPdf = generateSyntheticPdf([
      'METROPOLIS DIAGNOSTICS LAB REPORT',
      'Patient: Patient Alpha',
      'Attending Doctor: Dr. Anita Desai',
      'Date: 2026-09-01',
      'Diagnosis: Type 2 Diabetes Mellitus',
      'Hemoglobin: 10.8 g/dL (Reference: 12.0 - 16.0 g/dL)',
      'Fasting Blood Glucose: 142 mg/dL (Reference: 70 - 100 mg/dL)',
      'Platelet Count: 250000 /uL (Reference: 150000 - 450000 /uL)',
    ]);

    const formA1 = new FormData();
    formA1.append('file', new Blob([labPdf], { type: 'application/pdf' }), 'Metropolis_Lab_Report_2026-09-01.pdf');
    formA1.append('document_type', 'LAB_REPORT');

    const uploadLabRes = await fetch(`${API_URL}/documents/upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenA}` },
      body: formA1,
    }).then(r => r.json());
    assert(uploadLabRes.document?._id, 'User A lab report uploaded');
    const labDocId = uploadLabRes.document._id;

    // Trigger AI Extraction and Lab Interpretation on Lab Report
    await fetch(`${API_URL}/documents/${labDocId}/extract`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    await fetch(`${API_URL}/documents/${labDocId}/interpret-labs`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenA}` },
    });

    // Upload & Extract Prescription for User A (Date: 2026-09-05)
    const presPdf = generateSyntheticPdf([
      'APOLLO CLINIC MEDICAL PRESCRIPTION',
      'Patient Name: Patient Alpha',
      'Prescribing Doctor: Dr. Anita Desai',
      'Document Date: 2026-09-05',
      'Clinical Diagnosis: Type 2 Diabetes Mellitus',
      'Prescription: Metformin 500mg, Twice daily, Take after meals',
      'Prescription: Lisinopril 10mg, Once daily, Take in morning',
      'Clinical Instructions: Maintain low carbohydrate diet and monitor daily blood sugar',
    ]);

    const formA2 = new FormData();
    formA2.append('file', new Blob([presPdf], { type: 'application/pdf' }), 'Apollo_Prescription_2026-09-05.pdf');
    formA2.append('document_type', 'PRESCRIPTION');

    const uploadPresRes = await fetch(`${API_URL}/documents/upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenA}` },
      body: formA2,
    }).then(r => r.json());
    assert(uploadPresRes.document?._id, 'User A prescription document uploaded');
    const presDocId = uploadPresRes.document._id;

    await fetch(`${API_URL}/documents/${presDocId}/extract`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenA}` },
    });

    // -------------------------------------------------------------------------
    // SECTION 3: PRIORITY RULE — STRUCTURED DATABASE FIRST
    // -------------------------------------------------------------------------
    console.log('\n[SECTION 3] Testing Structured Database Priority over Vector Search...');

    const retMedDirect = await fetch(`${API_URL}/copilot/retrieve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenA}` },
      body: JSON.stringify({ query: 'What medicines did my doctor prescribe?' }),
    }).then(r => r.json());

    assert(
      retMedDirect.retrieval_strategy === RETRIEVAL_STRATEGIES.STRUCTURED_DATABASE,
      `Priority rule respected: Uses ${RETRIEVAL_STRATEGIES.STRUCTURED_DATABASE} instead of vector search`,
      `Strategy was ${retMedDirect.retrieval_strategy}`
    );
    assert(retMedDirect.detected_intent === RETRIEVAL_INTENTS.MEDICATION, 'Detected intent is MEDICATION');
    assert(retMedDirect.relevant_records.length >= 1, 'Retrieved structured medication records');
    assert(
      retMedDirect.relevant_records.some(r => r.name && r.name.toLowerCase().includes('metformin')),
      'Contains Metformin in relevant records'
    );

    // -------------------------------------------------------------------------
    // SECTION 4: MEDICATION QUERY RETRIEVAL (ROOT BUG RESOLUTION)
    // -------------------------------------------------------------------------
    console.log('\n[SECTION 4] Testing Medication Retrieval — Zero Unrelated Lab Leakage...');

    const retMedApi = await fetch(`${API_URL}/copilot/retrieve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenA}` },
      body: JSON.stringify({ query: 'What medicines did my doctor prescribe?' }),
    }).then(r => r.json());

    assert(retMedApi.status === 'success', 'POST /copilot/retrieve returned success');
    assert(retMedApi.detected_intent === 'MEDICATION', 'Detected intent is MEDICATION');
    assert(retMedApi.retrieval_strategy === RETRIEVAL_STRATEGIES.STRUCTURED_DATABASE, 'Strategy is STRUCTURED_DATABASE');

    // CRITICAL ROOT BUG TEST: Ensure zero laboratory observations are returned as medications!
    const containsUnrelatedLab = retMedApi.relevant_records.some(r => r.test_name === 'Hemoglobin' || r.test_name === 'Fasting Blood Glucose');
    assert(!containsUnrelatedLab, 'ROOT BUG RESOLVED: Medication retrieval strictly excludes unrelated lab reports (HbA1c/Glucose/Hemoglobin)');

    // -------------------------------------------------------------------------
    // SECTION 5: DOCTOR RETRIEVAL
    // -------------------------------------------------------------------------
    console.log('\n[SECTION 5] Testing Doctor Intent Retrieval...');

    const retDocApi = await fetch(`${API_URL}/copilot/retrieve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenA}` },
      body: JSON.stringify({ query: 'Who is my doctor?' }),
    }).then(r => r.json());

    assert(retDocApi.detected_intent === 'DOCTOR', 'Detected intent is DOCTOR');
    assert(retDocApi.retrieval_strategy === RETRIEVAL_STRATEGIES.STRUCTURED_DATABASE, 'Doctor retrieval uses STRUCTURED_DATABASE');
    assert(retDocApi.relevant_records.some(d => d.name && d.name.includes('Dr. Anita Desai')), 'Doctor name Dr. Anita Desai retrieved');

    // -------------------------------------------------------------------------
    // SECTION 6: LAB RESULT & ABNORMAL LAB RETRIEVAL
    // -------------------------------------------------------------------------
    console.log('\n[SECTION 6] Testing Lab Result & Abnormal Lab Retrieval...');

    // 6a: Specific Lab Result
    const retHgb = await fetch(`${API_URL}/copilot/retrieve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenA}` },
      body: JSON.stringify({ query: 'What is my hemoglobin level?' }),
    }).then(r => r.json());

    assert(retHgb.detected_intent === 'LAB_RESULT', 'Hemoglobin query detected as LAB_RESULT');
    assert(retHgb.relevance_information.gate_passed === true, 'Relevance gate passed for existing lab test');
    assert(retHgb.relevant_records.some(r => r.test_name && r.test_name.toLowerCase().includes('hemoglobin')), 'Hemoglobin observation retrieved with exact value');

    // 6b: Abnormal Lab Results
    const retAbnormal = await fetch(`${API_URL}/copilot/retrieve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenA}` },
      body: JSON.stringify({ query: 'Which lab tests are abnormal or out of range?' }),
    }).then(r => r.json());

    assert(retAbnormal.detected_intent === 'ABNORMAL_LAB', 'Detected intent is ABNORMAL_LAB');
    assert(retAbnormal.relevance_information.gate_passed === true, 'Relevance gate passed for abnormal labs');
    assert(
      retAbnormal.relevant_records.every(r => ['LOW', 'HIGH', 'ABNORMAL'].includes((r.abnormal_flag || '').toUpperCase())),
      'Only genuinely abnormal (LOW/HIGH) observations retrieved'
    );

    // -------------------------------------------------------------------------
    // SECTION 7: TIMELINE RETRIEVAL BASED ON ACTUAL DATES
    // -------------------------------------------------------------------------
    console.log('\n[SECTION 7] Testing Timeline Retrieval...');

    const retTimeline = await fetch(`${API_URL}/copilot/retrieve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenA}` },
      body: JSON.stringify({ query: 'Show my health timeline' }),
    }).then(r => r.json());

    assert(retTimeline.detected_intent === 'TIMELINE', 'Detected intent is TIMELINE');
    assert(retTimeline.retrieval_strategy === RETRIEVAL_STRATEGIES.TIMELINE_DATABASE, 'Strategy is TIMELINE_DATABASE');
    assert(retTimeline.relevant_records.length >= 2, 'Timeline contains user records');
    assert(retTimeline.relevant_records.some(e => e.date === '2026-09-01'), 'Timeline contains actual document date 2026-09-01');

    // -------------------------------------------------------------------------
    // SECTION 8: METADATA-FILTERED VECTOR SEARCH
    // -------------------------------------------------------------------------
    console.log('\n[SECTION 8] Testing Metadata-Filtered Vector Search...');

    const vectorRes = await fetch(`${API_URL}/copilot/retrieve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenA}` },
      body: JSON.stringify({
        mode: 'vector_search_only',
        query: 'low carbohydrate diet monitor daily blood sugar',
        document_type: 'PRESCRIPTION',
        limit: 3,
      }),
    }).then(r => r.json());

    const vectorResults = vectorRes.results || [];
    assert(vectorResults.length > 0, 'Metadata-filtered vector search returned relevant prescription excerpts');
    assert(
      vectorResults.every(r => r.document_type === 'PRESCRIPTION'),
      'Metadata filtering enforced: Only requested document_type="PRESCRIPTION" retrieved'
    );

    // -------------------------------------------------------------------------
    // SECTION 9: RELEVANCE GATE ENFORCEMENT — REJECTION OF UNRELATED DATA
    // -------------------------------------------------------------------------
    console.log('\n[SECTION 9] Testing Relevance Gate — Rejection of Unrelated Content...');

    // 9a: Query for test that does NOT exist in user records (Vitamin B12)
    const retMissingTest = await fetch(`${API_URL}/copilot/retrieve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenA}` },
      body: JSON.stringify({ query: 'What is my Vitamin B12 level?' }),
    }).then(r => r.json());

    assert(retMissingTest.relevance_information.gate_passed === false, 'Relevance gate REJECTED non-existent Vitamin B12 inquiry');
    assert(
      retMissingTest.retrieval_strategy === RETRIEVAL_STRATEGIES.REJECTED_IRRELEVANT,
      `Strategy set to ${RETRIEVAL_STRATEGIES.REJECTED_IRRELEVANT}`
    );
    assert(retMissingTest.relevant_records.length === 0, 'Zero irrelevant records sent when gate rejects');
    assert(retMissingTest.relevant_context === '', 'Zero irrelevant context sent to LLM');

    // 9b: Completely unrelated query (Weather in Delhi)
    const retWeather = await fetch(`${API_URL}/copilot/retrieve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenA}` },
      body: JSON.stringify({ query: 'What is the weather in Delhi?' }),
    }).then(r => r.json());

    assert(retWeather.detected_intent === 'UNKNOWN', 'Weather query classified as UNKNOWN');
    assert(retWeather.relevance_information.gate_passed === false, 'Relevance gate REJECTED out-of-domain weather query');
    assert(retWeather.relevant_records.length === 0, 'Zero medical records retrieved for non-medical question');

    // -------------------------------------------------------------------------
    // SECTION 10: MULTI-TENANT ISOLATION
    // -------------------------------------------------------------------------
    console.log('\n[SECTION 10] Testing Multi-Tenant Retrieval Isolation...');

    const retUserB = await fetch(`${API_URL}/copilot/retrieve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenB}` },
      body: JSON.stringify({ query: 'What medicines did my doctor prescribe?' }),
    }).then(r => r.json());

    assert(retUserB.relevant_records.length === 0, 'User B retrieves 0 medications (no leakage from User A)');
    assert(retUserB.relevance_information.gate_passed === false, 'Relevance gate rejected empty tenant');

    // -------------------------------------------------------------------------
    // SECTION 11: NON-EXPOSURE OF INTERNAL RETRIEVAL DATA TO END USER
    // -------------------------------------------------------------------------
    console.log('\n[SECTION 11] Verifying Non-Exposure of Internal Retrieval Data to User...');

    const chatRes = await fetch(`${API_URL}/copilot/ask`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenA}` },
      body: JSON.stringify({ query: 'What medicines did my doctor prescribe?' }),
    }).then(r => r.json());

    assert(chatRes.status === 'success', 'User chat endpoint returned success');
    const userMessage = chatRes.response || '';

    // Verify internal debug fields are NOT exposed in user-facing message text
    assert(!userMessage.includes('STRUCTURED_DATABASE'), 'Does NOT leak retrieval_strategy inside user message');
    assert(!userMessage.includes('relevance_information'), 'Does NOT leak relevance_information schema to user');
    assert(!userMessage.includes('similarityScore'), 'Does NOT leak internal vector similarity score to user');
    assert(!userMessage.includes('gate_passed'), 'Does NOT leak gate_passed flag to user');
    assert(userMessage.toLowerCase().includes('metformin'), 'User message contains clear, plain-language medicine explanation');

    console.log('\n===============================================================');
    console.log(`   PHASE 8 TESTS COMPLETED: ${passed} / ${total} PASSED (100%)       `);
    console.log('===============================================================\n');

  } catch (err) {
    console.error('\n[FATAL TEST ERROR]:', err);
    process.exit(1);
  }
}

runPhase8RetrievalTests().then(() => {
  process.exit(0);
}).catch(err => {
  console.error(err);
  process.exit(1);
});
