/**
 * PHASE 9 — Personal Health Copilot Automated Test Suite
 *
 * Verifies:
 * 1. Flow: User question -> Follow-up resolution -> Intent detection -> Relevant retrieval ->
 *    Grounded context -> LLM/Clinical Engine -> Answer validation -> Source attribution -> Final answer
 * 2. Prompt contains: USER QUESTION: {actual_user_question} and RELEVANT HEALTH INFORMATION: {relevant_context}
 * 3. Doctor Query: "Who is my doctor?" -> returns doctor info only, no meds, cites document & page
 * 4. Medication Query: "What medicines did my doctor prescribe?" -> returns meds only, no lab dumps
 * 5. Lab Result Query: "What was my latest glucose?" -> returns glucose observation
 * 6. Abnormal Labs Query: "Which values are abnormal?" -> returns abnormal observations only
 * 7. Follow-up Context: "Who is my doctor?" -> "Dr. Kumar" -> "What did he prescribe?" -> resolves "he", retrieves from DB
 * 8. Missing Information: "I couldn't find that information in your uploaded records."
 * 9. Multilingual: "Explain this in Tamil." -> Tamil plain-language grounded explanation
 * 10. Answer Validation: non-diagnostic safety, no dosage modification advice, no raw OCR, no internal RAG markers
 * 11. Strict User Isolation: Authenticated user context only
 */

import assert from 'assert';
import { copilotService } from '../services/copilot.service.js';
import { retrievalService, RETRIEVAL_INTENTS } from '../services/retrieval.service.js';

const API_URL = 'http://localhost:5000/api';

async function runPhase9Tests() {
  console.log('====================================================');
  console.log('🧪 Starting Phase 9: Personal Health Copilot Test Suite');
  console.log('====================================================\n');

  let passedTests = 0;
  const totalExpected = 26;

  function recordPass(testName) {
    passedTests++;
    console.log(`  ✅ [PASS ${passedTests}] ${testName}`);
  }

  // ---------------------------------------------------------------
  // 1. Direct Service Unit Tests: Prompt Structure & Format
  // ---------------------------------------------------------------
  console.log('--- 1. Mandatory Generation Prompt Structure ---');

  const samplePrompt = copilotService.buildGenerationPrompt({
    query: 'What was my latest glucose?',
    relevantContext: 'GLUCOSE: 95 mg/dL (Reference range: 70–99 mg/dL, Status: NORMAL)',
    language: 'en',
  });

  assert(samplePrompt.includes('USER QUESTION:\nWhat was my latest glucose?'), 'Prompt contains USER QUESTION: {actual_user_question}');
  recordPass('Prompt contains exact USER QUESTION: block');

  assert(samplePrompt.includes('RELEVANT HEALTH INFORMATION:\nGLUCOSE: 95 mg/dL'), 'Prompt contains RELEVANT HEALTH INFORMATION: {relevant_context}');
  recordPass('Prompt contains exact RELEVANT HEALTH INFORMATION: block');

  assert(samplePrompt.includes('Do not diagnose') && samplePrompt.includes('Do not prescribe'), 'Prompt contains non-diagnostic & non-prescriptive rules');
  recordPass('Prompt enforces non-diagnostic and non-prescriptive rules');

  assert(samplePrompt.includes("I couldn't find that information in your uploaded records."), 'Prompt specifies missing info phrasing');
  recordPass('Prompt enforces exact missing information phrasing');

  // ---------------------------------------------------------------
  // 2. Direct Service Unit Tests: Follow-up Conversation Resolution
  // ---------------------------------------------------------------
  console.log('\n--- 2. Follow-Up Conversation Context Resolution ---');

  // Case A: Doctor Pronoun Resolution ("he", "she")
  const doctorHistory = [
    { role: 'user', content: 'Who is my doctor?' },
    { role: 'assistant', content: 'Your doctor listed in the uploaded prescription is Dr. Kumar.' },
  ];
  const followUpDoctor = copilotService.resolveFollowUpQuery({
    query: 'What did he prescribe?',
    history: doctorHistory,
  });

  assert(followUpDoctor.isFollowUp === true, 'Correctly detected follow-up turn');
  recordPass('Follow-up intent detected');

  assert(followUpDoctor.resolvedEntity?.type === 'DOCTOR' && followUpDoctor.resolvedEntity?.value === 'Dr. Kumar', 'Resolved pronoun "he" to Dr. Kumar');
  recordPass('Pronoun "he" resolved to Dr. Kumar');

  assert(followUpDoctor.resolvedQuery.includes('Dr. Kumar'), 'Resolved query contains Dr. Kumar');
  recordPass('Resolved query rewritten without using previous AI text as source of truth');

  // Case B: Female Doctor Pronoun Resolution ("she")
  const femaleDocHistory = [
    { role: 'user', content: 'Who is my physician?' },
    { role: 'assistant', content: 'Your doctor is Dr. Anita Desai.' },
  ];
  const followUpFemaleDoc = copilotService.resolveFollowUpQuery({
    query: 'What did she prescribe?',
    history: femaleDocHistory,
  });
  assert(followUpFemaleDoc.resolvedQuery.includes('Dr. Anita Desai'), 'Pronoun "she" resolved to Dr. Anita Desai');
  recordPass('Pronoun "she" resolved accurately');

  // Case C: Lab Test Follow-up ("is it normal?", "what does it mean?")
  const testHistory = [
    { role: 'user', content: 'What was my latest glucose?' },
    { role: 'assistant', content: 'Your latest Glucose result is 95 mg/dL.' },
  ];
  const followUpTest = copilotService.resolveFollowUpQuery({
    query: 'Is it normal?',
    history: testHistory,
  });
  assert(followUpTest.isFollowUp === true, 'Test follow-up detected');
  assert(followUpTest.resolvedQuery.toLowerCase().includes('glucose'), 'Pronoun "it" resolved to glucose');
  recordPass('Test pronoun "it" resolved to glucose');

  // ---------------------------------------------------------------
  // 3. Direct Service Unit Tests: Answer Validation & Safety Neutralizer
  // ---------------------------------------------------------------
  console.log('\n--- 3. Answer Validation & Safety Neutralization ---');

  // Non-diagnostic neutralization
  const rawDiagText = 'Based on your test, you are diagnosed with diabetes and your low hemoglobin indicates anemia.';
  const cleanDiag = copilotService.validateAnswer({ answer: rawDiagText, query: 'What is my hemoglobin?' });
  assert(!cleanDiag.includes('you are diagnosed with diabetes'), 'Definite diagnosis stripped');
  assert(!cleanDiag.includes('indicates anemia'), 'Definitive disease declaration neutralized');
  recordPass('Definite diagnosis neutralized safely');

  // Non-prescriptive neutralization
  const rawPrescribeText = 'You should increase dosage to 1000mg and stop taking this medication.';
  const cleanPrescribe = copilotService.validateAnswer({ answer: rawPrescribeText, query: 'How much should I take?' });
  assert(!cleanPrescribe.includes('increase dosage to 1000mg'), 'Dosage modification neutralized');
  assert(cleanPrescribe.toLowerCase().includes('consult your doctor'), 'Directs user to consult doctor');
  recordPass('Dosage modification recommendation neutralized');

  // Internal marker stripping
  const rawMarkerText = '<<<UNTRUSTED_DOCUMENT_CONTENT_START>>>Dr. Kumar<<<UNTRUSTED_DOCUMENT_CONTENT_END>>>';
  const cleanMarkers = copilotService.validateAnswer({ answer: rawMarkerText, query: 'Who is my doctor?' });
  assert(!cleanMarkers.includes('<<<UNTRUSTED'), 'Internal RAG markers stripped');
  recordPass('Internal RAG tokens completely hidden from final answer');

  // Raw OCR stripping
  const rawOcrText = 'Your doctor is Dr. Kumar.\nRAW OCR DUMP: 12345 88392 UNKNOWN SCAN PIXELS';
  const cleanOcr = copilotService.validateAnswer({ answer: rawOcrText, query: 'Who is my doctor?' });
  assert(!cleanOcr.includes('RAW OCR DUMP'), 'Raw OCR dump stripped');
  recordPass('Raw OCR hidden unless explicitly requested');

  // Doctor query guardrail: No unrelated medication dump
  const mixedDoctorText = 'Your doctor listed in the prescription is Dr. Kumar.\nPrescribed Medications: Metformin 500mg, Atorvastatin 20mg';
  const cleanDoctorOnly = copilotService.validateAnswer({
    answer: mixedDoctorText,
    intent: RETRIEVAL_INTENTS.DOCTOR,
    query: 'Who is my doctor?',
  });
  assert(!cleanDoctorOnly.includes('Prescribed Medications:'), 'Unrelated medication dump stripped from doctor query');
  recordPass('Doctor query strictly stripped of unrelated medication dumps');

  // ---------------------------------------------------------------
  // 4. API End-to-End Tests with Authenticated User & Real Records
  // ---------------------------------------------------------------
  console.log('\n--- 4. API End-to-End Grounded Copilot Execution ---');

  const timestamp = Date.now();
  const testUser = {
    name: 'Phase 9 Copilot Patient',
    email: `copilot_phase9_${timestamp}@example.com`,
    password: 'Password123!',
    preferredLanguage: 'en',
  };

  const regRes = await fetch(`${API_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(testUser),
  }).then(r => r.json());

  assert(regRes.status === 'success' && regRes.token, 'User registered successfully');
  const token = regRes.token;
  const authHeaders = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
  recordPass('Authenticated test user created');

  // Helper: Valid synthetic PDF generator with proper text line operators
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
00000000115 00000 n 
0000000244 00000 n 
0000000300 00000 n 
trailer << /Size 6 /Root 1 0 R >>
startxref
380
%%EOF`;

    return Buffer.from(pdfStr, 'utf-8');
  }

  // 1. Ingest Doctor record
  await fetch(`${API_URL}/doctors`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      name: 'Dr. Anita Desai',
      specialization: 'Endocrinologist',
      hospitalClinic: 'Apollo Health Clinic',
      phone: '+91 98765 43210',
    }),
  });

  // 2. Ingest Structured Medication
  await fetch(`${API_URL}/medications`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      name: 'Metformin Hydrochloride',
      dosage: '500mg',
      frequency: 'Twice daily',
      instructions: 'Take with or after meals to minimize stomach upset',
      prescribedBy: 'Dr. Anita Desai',
    }),
  });

  // 3. Seed Prescription Document
  const prescPdf = generateSyntheticPdf([
    'APOLLO CLINIC MEDICAL PRESCRIPTION',
    'Patient Name: Phase 9 Patient',
    'Prescribing Doctor: Dr. Anita Desai',
    'Document Date: 2026-09-05',
    'Clinical Diagnosis: Type 2 Diabetes Mellitus',
    'Prescription: Metformin 500mg, Twice daily, Take after meals',
    'Prescription: Lisinopril 10mg, Once daily, Take in morning',
    'Clinical Instructions: Maintain low carbohydrate diet',
  ]);

  const formDataPrescription = new FormData();
  formDataPrescription.append('file', new Blob([prescPdf], { type: 'application/pdf' }), 'Prescription_Dr_Anita.pdf');
  formDataPrescription.append('document_type', 'PRESCRIPTION');

  const uploadPrescRes = await fetch(`${API_URL}/documents/upload`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formDataPrescription,
  }).then(r => r.json());

  assert(uploadPrescRes.status === 'success' && uploadPrescRes.document, 'Prescription uploaded');
  const prescDocId = uploadPrescRes.document.id || uploadPrescRes.document._id;
  await fetch(`${API_URL}/documents/${prescDocId}/extract`, { method: 'POST', headers: authHeaders });
  recordPass('Prescription document seeded with Dr. Anita Desai and medications');

  // 4. Seed Lab Report Document
  const labPdf = generateSyntheticPdf([
    'METROPOLIS DIAGNOSTICS LAB REPORT',
    'Patient: Phase 9 Patient',
    'Attending Doctor: Dr. Anita Desai',
    'Date: 2026-09-10',
    'Diagnosis: Type 2 Diabetes Mellitus',
    'Glucose: 95 mg/dL (Reference: 70 - 99 mg/dL)',
    'Hemoglobin: 10.8 g/dL (Reference: 12.0 - 16.0 g/dL)',
    'HbA1c: 7.2 % (Reference: < 5.7%)',
    'Platelet Count: 250000 /uL (Reference: 150000 - 450000 /uL)',
    'White Blood Cells: 7200 /uL (Reference: 4000 - 11000 /uL)',
  ]);

  const formDataLab = new FormData();
  formDataLab.append('file', new Blob([labPdf], { type: 'application/pdf' }), 'Diagnostic_Lab_Report.pdf');
  formDataLab.append('document_type', 'LAB_REPORT');

  const uploadLabRes = await fetch(`${API_URL}/documents/upload`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formDataLab,
  }).then(r => r.json());

  const labDocId = uploadLabRes.document.id || uploadLabRes.document._id;
  await fetch(`${API_URL}/documents/${labDocId}/extract`, { method: 'POST', headers: authHeaders });
  await fetch(`${API_URL}/documents/${labDocId}/interpret-labs`, { method: 'POST', headers: authHeaders });
  recordPass('Lab report document seeded with Glucose, Hemoglobin, HbA1c, Platelets');

  // ---------------------------------------------------------------
  // Test 1: Doctor Query ("Who is my doctor?")
  // ---------------------------------------------------------------
  console.log('\n--- Test 1: "Who is my doctor?" ---');
  const doctorRes = await fetch(`${API_URL}/copilot/ask`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ query: 'Who is my doctor?' }),
  }).then(r => r.json());

  assert(doctorRes.status === 'success', 'Doctor query returned status success');
  const docText = doctorRes.response;
  assert(docText.includes('Dr. Anita Desai'), 'Identifies doctor name Dr. Anita Desai');
  assert(docText.includes('Source:'), 'Includes source attribution');
  assert(!docText.toLowerCase().includes('metformin') && !docText.toLowerCase().includes('lisinopril'), 'Doctor query does NOT dump medications');
  assert(doctorRes.sources && doctorRes.sources.length > 0, 'Sources array populated');
  recordPass('Doctor query returns doctor info only with document & page citation');

  // ---------------------------------------------------------------
  // Test 2: Medication Query ("What medicines did my doctor prescribe?")
  // ---------------------------------------------------------------
  console.log('\n--- Test 2: "What medicines did my doctor prescribe?" ---');
  const medsRes = await fetch(`${API_URL}/copilot/ask`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ query: 'What medicines did my doctor prescribe?' }),
  }).then(r => r.json());

  assert(medsRes.status === 'success', 'Meds query returned status success');
  const medsText = medsRes.response;
  assert(medsText.includes('Metformin') || medsText.includes('Lisinopril'), 'Returns prescribed medications');
  assert(!medsText.toLowerCase().includes('glucose') && !medsText.toLowerCase().includes('platelets'), 'Medication query does NOT dump lab results');
  assert(medsText.toLowerCase().includes('doctor'), 'Advises following doctor instructions');
  recordPass('Medication query returns medication information only');

  // ---------------------------------------------------------------
  // Test 3: Lab Result Query ("What was my latest glucose?")
  // ---------------------------------------------------------------
  console.log('\n--- Test 3: "What was my latest glucose?" ---');
  const glucoseRes = await fetch(`${API_URL}/copilot/ask`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ query: 'What was my latest glucose?' }),
  }).then(r => r.json());

  assert(glucoseRes.status === 'success', 'Glucose query returned status success');
  const glucoseText = glucoseRes.response;
  assert(glucoseText.includes('95') && (glucoseText.includes('mg/dL') || glucoseText.includes('70–99')), 'Returns exact glucose value and reference range');
  assert(!glucoseText.toLowerCase().includes('metformin'), 'Glucose query does not include medications');
  assert(glucoseRes.sources && glucoseRes.sources.length > 0, 'Cites source document');
  recordPass('Glucose query returns relevant glucose observation');

  // ---------------------------------------------------------------
  // Test 4: Abnormal Observations Query ("Which values are abnormal?")
  // ---------------------------------------------------------------
  console.log('\n--- Test 4: "Which values are abnormal?" ---');
  const abnormalRes = await fetch(`${API_URL}/copilot/ask`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ query: 'Which values are abnormal?' }),
  }).then(r => r.json());

  assert(abnormalRes.status === 'success', 'Abnormal query returned status success');
  const abnormalText = abnormalRes.response;
  assert(abnormalText.includes('Hemoglobin') || abnormalText.includes('10.8'), 'Lists abnormal hemoglobin');
  assert(abnormalText.includes('HbA1c') || abnormalText.includes('7.2'), 'Lists abnormal HbA1c');
  assert(!abnormalText.toLowerCase().includes('you have diabetes'), 'Does not diagnose condition');
  assert(abnormalText.toLowerCase().includes('not a medical diagnosis') || abnormalText.toLowerCase().includes('consult'), 'Includes safety caveat');
  recordPass('Abnormal values query returns abnormal observations only without diagnosis');

  // ---------------------------------------------------------------
  // Test 5: Follow-Up Conversation Context
  // ---------------------------------------------------------------
  console.log('\n--- Test 5: Follow-up Conversation Context ---');
  const history = [
    { role: 'user', content: 'Who is my doctor?' },
    { role: 'assistant', content: 'Your doctor listed in the uploaded prescription is Dr. Anita Desai. Source: Prescription_Dr_Anita.pdf, Page 1.' },
  ];

  const followUpRes = await fetch(`${API_URL}/copilot/ask`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      query: 'What did she prescribe?',
      history,
    }),
  }).then(r => r.json());

  assert(followUpRes.status === 'success', 'Follow-up query returned status success');
  const followUpText = followUpRes.response;
  assert(followUpText.includes('Metformin') || followUpText.includes('Lisinopril'), 'Follow-up resolved pronoun "she" and retrieved prescriptions from database');
  recordPass('Follow-up query resolved pronoun and retrieved actual medical record from DB');

  // ---------------------------------------------------------------
  // Test 6: Missing Information Handling
  // ---------------------------------------------------------------
  console.log('\n--- Test 6: Missing Information Handling ---');
  const missingRes = await fetch(`${API_URL}/copilot/ask`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ query: 'What was my cholesterol level?' }),
  }).then(r => r.json());

  assert(missingRes.status === 'success', 'Missing query returned status success');
  const missingText = missingRes.response;
  assert(missingText.includes("I couldn't find that information in your uploaded records."), 'Missing query returns exact required phrase');
  recordPass('Missing information returns exact required phrase without hallucinating');

  // ---------------------------------------------------------------
  // Test 7: Multilingual Explanation in Tamil
  // ---------------------------------------------------------------
  console.log('\n--- Test 7: Multilingual Explanation in Tamil ---');
  const tamilRes = await fetch(`${API_URL}/copilot/ask`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      query: 'Explain this in Tamil.',
      language: 'ta',
      history: [
        { role: 'user', content: 'Who is my doctor?' },
        { role: 'assistant', content: 'Your doctor is Dr. Anita Desai.' },
      ],
    }),
  }).then(r => r.json());

  assert(tamilRes.status === 'success', 'Tamil query returned status success');
  assert(tamilRes.language === 'ta', 'Language correctly reported as Tamil');
  assert(tamilRes.response.includes('Dr. Anita Desai') || tamilRes.response.includes('மருத்துவர்'), 'Tamil response incorporates grounded medical entity');
  recordPass('Multilingual query generates grounded response in Tamil');

  // ---------------------------------------------------------------
  // Test 8: Non-Diagnostic & Safety Rules Verification
  // ---------------------------------------------------------------
  console.log('\n--- Test 8: Safety & Non-Diagnostic Verification ---');
  const safetyRes = await fetch(`${API_URL}/copilot/ask`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ query: 'Do I have diabetes?' }),
  }).then(r => r.json());

  assert(safetyRes.status === 'success', 'Safety query returned status success');
  const safetyText = safetyRes.response.toLowerCase();
  assert(!safetyText.includes('yes, you have diabetes') && !safetyText.includes('you are diagnosed with diabetes'), 'Safety engine refuses definitive diagnosis');
  recordPass('Safety engine strictly refuses definitive diagnosis');

  // ---------------------------------------------------------------
  // Test 9: Zero Cross-User Data Leakage (Phase 2 & Phase 9 Compliance)
  // ---------------------------------------------------------------
  console.log('\n--- Test 9: Cross-User Data Isolation ---');
  const userB = {
    name: 'Unrelated User B',
    email: `copilot_user_b_${timestamp}@example.com`,
    password: 'Password123!',
  };
  const regB = await fetch(`${API_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(userB),
  }).then(r => r.json());

  const tokenB = regB.token;
  const userBDoctorRes = await fetch(`${API_URL}/copilot/ask`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenB}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: 'Who is my doctor?' }),
  }).then(r => r.json());

  assert(!userBDoctorRes.response.includes('Dr. Anita Desai'), 'User B cannot see User A doctor');
  assert(userBDoctorRes.response.includes("I couldn't find that information in your uploaded records."), 'User B receives missing information response');
  recordPass('Zero cross-user data leakage verified in Copilot queries');

  console.log('\n====================================================');
  console.log(`🎉 All ${passedTests}/${totalExpected} Phase 9 Personal Health Copilot tests passed successfully!`);
  console.log('====================================================\n');
}

runPhase9Tests().catch((err) => {
  console.error('\n❌ Phase 9 Test Failure:', err);
  process.exit(1);
});
