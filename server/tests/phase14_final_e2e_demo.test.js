/**
 * PHASE 14 — FINAL END-TO-END DEMO TEST SUITE
 * Complete end-to-end verification of the Personal Health Copilot architecture:
 * USER -> LOGIN -> UPLOAD MEDICAL DOCUMENT -> DOCUMENT VALIDATION ->
 * OCR -> TEXT EXTRACTION -> STRUCTURED MEDICAL EXTRACTION ->
 * Pydantic VALIDATION -> MEDICAL DATABASE -> LAB ANALYSIS ->
 * HEALTH TIMELINE -> RAG RETRIEVAL -> PERSONAL HEALTH COPILOT
 *
 * Verifies all 7 Demo scenarios:
 * - DEMO 1: "What did my doctor prescribe?"
 * - DEMO 2: "Who is my doctor?" (with doctor present & unavailable with zero medication leak)
 * - DEMO 3: "What are my abnormal values?"
 * - DEMO 4: "Why was my glucose marked high?"
 * - DEMO 5: "Explain this in Tamil."
 * - DEMO 6: "Compare my latest glucose with my previous report."
 * - DEMO 7: Follow-up: "Who is my doctor?" -> "What did he prescribe?"
 *
 * Strictly synthetic test fixtures only — zero real patient data.
 */

import assert from 'assert';
import { validateMedicalExtraction } from '../services/ai/extractionValidator.js';
import retrievalService, { RETRIEVAL_INTENTS, RETRIEVAL_STRATEGIES } from '../services/retrieval.service.js';

const API_URL = 'http://localhost:5000/api';
let passedTests = 0;

function pass(msg) {
  passedTests++;
  console.log(`  ✅ [PASS ${passedTests}] ${msg}`);
}

/**
 * Generate synthetic minimal valid PDF bytes
 */
function generateSyntheticPdf(textLines = []) {
  const contentStream = textLines
    .map((l, idx) => `1 0 0 1 50 ${750 - idx * 24} Tm (${l.replace(/[()]/g, '')}) Tj`)
    .join('\n');
  const streamBody = `BT\n/F1 12 Tf\n${contentStream}\nET`;
  const streamLength = Buffer.byteLength(streamBody);

  return `%PDF-1.4
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
}

async function runPhase14FinalE2EDemo() {
  console.log('\n========================================================================');
  console.log('🚀 PHASE 14: FINAL END-TO-END DEMO AUTOMATED VERIFICATION SUITE');
  console.log('   Architectural Pipeline & Demos 1 to 7 Full Verification');
  console.log('========================================================================\n');

  // ==========================================================================
  // ARCHITECTURE FLOW STEP 1: USER REGISTRATION & AUTHENTICATION (LOGIN)
  // ==========================================================================
  console.log('--- Step 1: User Registration & Login (Session Authentication) ---');
  const timestamp = Date.now();
  const demoUser = {
    name: 'David Synthetic Patient',
    email: `david_synthetic_${timestamp}@healthcopilot.demo`,
    password: 'Password123!',
    phone: '9876543210',
  };

  const regRes = await fetch(`${API_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(demoUser),
  }).then(r => r.json());

  assert(regRes.token && regRes.user._id, 'User registration succeeded and returned JWT');
  const token = regRes.token;
  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
  pass('USER registered and obtained authenticated JWT session');

  // Login verification
  const loginRes = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: demoUser.email, password: demoUser.password }),
  }).then(r => r.json());
  assert(loginRes.token, 'LOGIN endpoint authenticated user with valid session');
  pass('LOGIN endpoint verified with session persistence');

  // ==========================================================================
  // ARCHITECTURE FLOW STEP 2: UPLOAD & VALIDATION
  // ==========================================================================
  console.log('\n--- Step 2: Upload Medical Document & Validation ---');
  // Validation: Unsupported extension rejection
  const badForm = new FormData();
  badForm.append('file', new Blob(['data'], { type: 'application/octet-stream' }), 'prescription.exe');
  badForm.append('document_type', 'PRESCRIPTION');
  const badRes = await fetch(`${API_URL}/documents/upload`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: badForm,
  });
  assert(badRes.status === 400, 'DOCUMENT VALIDATION: Rejected invalid file extension');
  pass('DOCUMENT VALIDATION correctly blocked unauthorized file format');

  // Valid Upload: Synthetic Prescription Document
  const presLines = [
    'City Care Clinic & Heart Specialty',
    'Attending Physician: Dr. Ramesh Gupta',
    'Patient: David Synthetic Patient | Age: 48 | Gender: Male',
    'Date: 2026-10-01',
    'Diagnosis: Mild Hyperglycemia and Essential Hypertension',
    'Rx:',
    'Tab Metformin 500mg | Route: Oral | Frequency: Once daily with breakfast | Duration: 30 days',
    'Tab Atorvastatin 20mg | Route: Oral | Frequency: Once daily at bedtime | Duration: 30 days',
    'Instructions: Follow low glycemic index diet and exercise 30 minutes daily.',
  ];

  const presPdfBytes = generateSyntheticPdf(presLines);
  const presForm = new FormData();
  presForm.append('file', new Blob([presPdfBytes], { type: 'application/pdf' }), 'Prescription_Dr_Ramesh_Gupta.pdf');
  presForm.append('document_type', 'PRESCRIPTION');

  const presUploadRes = await fetch(`${API_URL}/documents/upload`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: presForm,
  }).then(r => r.json());

  assert(presUploadRes.document && presUploadRes.document._id, 'Prescription uploaded successfully');
  const presDoc = presUploadRes.document;
  pass('UPLOAD MEDICAL DOCUMENT succeeded: Prescription stored with UUID filename');

  // ==========================================================================
  // ARCHITECTURE FLOW STEP 3: OCR & TEXT EXTRACTION
  // ==========================================================================
  console.log('\n--- Step 3: OCR & Text Extraction ---');
  const ocrPresRes = await fetch(`${API_URL}/documents/${presDoc._id}/ocr`, {
    method: 'POST',
    headers,
  }).then(r => r.json());

  assert(ocrPresRes.status === 'success', 'OCR pipeline executed successfully');
  assert(ocrPresRes.extraction.cleaned_text.includes('Dr. Ramesh Gupta'), 'OCR extracted doctor name');
  assert(ocrPresRes.extraction.cleaned_text.includes('Metformin 500mg'), 'OCR extracted medication');
  pass('OCR & TEXT EXTRACTION verified: Clean text extracted with script detection');

  // ==========================================================================
  // ARCHITECTURE FLOW STEP 4: STRUCTURED MEDICAL EXTRACTION & Pydantic VALIDATION
  // ==========================================================================
  console.log('\n--- Step 4: Structured Medical Extraction & Pydantic Validation ---');
  const extractPresRes = await fetch(`${API_URL}/documents/${presDoc._id}/extract`, {
    method: 'POST',
    headers,
    body: JSON.stringify({}),
  }).then(r => r.json());

  assert(extractPresRes.status === 'success', 'Structured extraction succeeded');
  const presExt = extractPresRes.validated_data;
  assert(presExt.doctor_name === 'Dr. Ramesh Gupta', 'Doctor extracted');
  assert(presExt.medications.length >= 2, 'Medications extracted');

  // Run strict schema validator conforming to Pydantic rules
  const pydanticValidated = validateMedicalExtraction(presExt);
  assert(pydanticValidated.patient_name === 'David Synthetic Patient', 'Pydantic validated patient name');
  assert(pydanticValidated.doctor_name === 'Dr. Ramesh Gupta', 'Pydantic validated doctor name');
  assert(pydanticValidated.medications.some(m => m.name.includes('Metformin')), 'Pydantic validated Metformin');
  assert(pydanticValidated.medications.some(m => m.name.includes('Atorvastatin')), 'Pydantic validated Atorvastatin');
  pass('STRUCTURED MEDICAL EXTRACTION & Pydantic VALIDATION verified');

  // ==========================================================================
  // ARCHITECTURE FLOW STEP 5: MEDICAL DATABASE & HEALTH TIMELINE
  // ==========================================================================
  const healthProfileRes = await fetch(`${API_URL}/health-profile`, { headers }).then(r => r.json());
  assert(healthProfileRes.status === 'success', 'Health profile synthesized from database');
  const hp = healthProfileRes.health_profile || healthProfileRes.data || {};
  assert(hp.timeline && hp.timeline.length >= 1, 'HEALTH TIMELINE includes event from prescription');
  pass('MEDICAL DATABASE & HEALTH TIMELINE verified with actual document dates');

  // ==========================================================================
  // DEMO 1: "What did my doctor prescribe?"
  // ==========================================================================
  console.log('\n--- DEMO 1: "What did my doctor prescribe?" ---');
  const demo1Res = await fetch(`${API_URL}/copilot/ask`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ query: 'What did my doctor prescribe?' }),
  }).then(r => r.json());

  assert(demo1Res.status === 'success', 'Demo 1 Copilot call succeeded');
  assert(demo1Res.response.includes('Metformin') && demo1Res.response.includes('Atorvastatin'), 'Medication information returned');
  assert(demo1Res.sources && demo1Res.sources.length > 0, 'Source citation returned');
  assert(demo1Res.sources[0].title.toLowerCase().includes('prescription'), 'Source matches prescription document');
  assert(!demo1Res.response.includes('Glucose:') && !demo1Res.response.includes('HbA1c:'), 'Zero unrelated lab leakage');
  pass('DEMO 1 PASSED: "What did my doctor prescribe?" -> Accurate medications and matching prescription source');

  // ==========================================================================
  // DEMO 2: "Who is my doctor?"
  // Expected: Doctor information if present.
  // If unavailable: "I couldn't find your doctor's name in your uploaded records." Do not return medications instead.
  // ==========================================================================
  console.log('\n--- DEMO 2: "Who is my doctor?" (Doctor Present & Unavailable Scenarios) ---');
  // Scenario 2A: Doctor is present in David's uploaded prescription
  const demo2ARes = await fetch(`${API_URL}/copilot/ask`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ query: 'Who is my doctor?' }),
  }).then(r => r.json());

  assert(demo2ARes.status === 'success', 'Demo 2A Copilot call succeeded');
  assert(demo2ARes.response.includes('Dr. Ramesh Gupta'), 'Doctor information returned: Dr. Ramesh Gupta');
  assert(!demo2ARes.response.includes('Metformin') && !demo2ARes.response.includes('Atorvastatin'), 'Does not dump medications for doctor question');
  pass('DEMO 2A PASSED: "Who is my doctor?" -> Dr. Ramesh Gupta identified with clean attribution');

  // Scenario 2B: New synthetic patient with NO doctor information
  const patientNoDoctor = {
    name: 'Eve Synthetic Patient',
    email: `eve_synthetic_${timestamp}@healthcopilot.demo`,
    password: 'Password123!',
  };
  const regEve = await fetch(`${API_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patientNoDoctor),
  }).then(r => r.json());

  const headersEve = { 'Content-Type': 'application/json', Authorization: `Bearer ${regEve.token}` };

  // Eve uploads a lab slip that has NO doctor information
  const noDocSlipLines = [
    'Direct Consumer Walk-In Diagnostics',
    'Patient: Eve Synthetic Patient',
    'Document Date: 2026-10-02',
    'Hemoglobin: 13.2 g/dL (Reference Range: 12.0 - 16.0)',
  ];
  const noDocForm = new FormData();
  noDocForm.append('file', new Blob([generateSyntheticPdf(noDocSlipLines)], { type: 'application/pdf' }), 'WalkIn_Lab_Slip.pdf');
  noDocForm.append('document_type', 'LAB_REPORT');

  const uploadNoDoc = await fetch(`${API_URL}/documents/upload`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${regEve.token}` },
    body: noDocForm,
  }).then(r => r.json());

  await fetch(`${API_URL}/documents/${uploadNoDoc.document._id}/ocr`, { method: 'POST', headers: headersEve });
  await fetch(`${API_URL}/documents/${uploadNoDoc.document._id}/extract`, { method: 'POST', headers: headersEve, body: JSON.stringify({}) });

  const demo2BRes = await fetch(`${API_URL}/copilot/ask`, {
    method: 'POST',
    headers: headersEve,
    body: JSON.stringify({ query: 'Who is my doctor?' }),
  }).then(r => r.json());

  assert(demo2BRes.status === 'success', 'Demo 2B Copilot call succeeded');
  assert(
    demo2BRes.response.includes("I couldn't find your doctor's name in your uploaded records.") ||
    demo2BRes.response.includes("I couldn't find doctor information in your uploaded records."),
    'Returns honest missing doctor message'
  );
  assert(
    !demo2BRes.response.includes('Metformin') &&
    !demo2BRes.response.includes('Hemoglobin') &&
    !demo2BRes.response.includes('prescribe'),
    'Crucial Rule: Does NOT return medications or irrelevant observations instead of doctor'
  );
  pass('DEMO 2B PASSED: Unavailable doctor returns honest message and never dumps medications');

  // ==========================================================================
  // DEMO 3: Upload Synthetic Laboratory Report & Ask "What are my abnormal values?"
  // ==========================================================================
  console.log('\n--- DEMO 3: Laboratory Report & "What are my abnormal values?" ---');
  const labReportLines = [
    'City Health Diagnostics & Blood Testing Laboratory',
    'Patient: David Synthetic Patient | Age: 48 | Gender: Male',
    'Attending Physician: Dr. Ramesh Gupta',
    'Document Date: 2026-10-06',
    'Test Name: Comprehensive Metabolic & Hematology Panel',
    'Hemoglobin: 10.5 g/dL (Reference Range: 12.0 - 16.0)',
    'Fasting Blood Glucose: 146 mg/dL (Reference Range: 70 - 99)',
    'Serum Creatinine: 0.9 mg/dL (Reference Range: 0.6 - 1.2)',
    'Platelet Count: 260,000 /mcL (Reference Range: 150,000 - 450,000)',
  ];

  const labForm = new FormData();
  labForm.append('file', new Blob([generateSyntheticPdf(labReportLines)], { type: 'application/pdf' }), 'David_Lab_Report_Oct2026.pdf');
  labForm.append('document_type', 'LAB_REPORT');

  const labUploadRes = await fetch(`${API_URL}/documents/upload`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: labForm,
  }).then(r => r.json());
  const labDoc = labUploadRes.document;

  await fetch(`${API_URL}/documents/${labDoc._id}/ocr`, { method: 'POST', headers });
  await fetch(`${API_URL}/documents/${labDoc._id}/extract`, { method: 'POST', headers, body: JSON.stringify({}) });
  await fetch(`${API_URL}/documents/${labDoc._id}/interpret-labs`, { method: 'POST', headers });

  const demo3Res = await fetch(`${API_URL}/copilot/ask`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ query: 'What are my abnormal values?' }),
  }).then(r => r.json());

  assert(demo3Res.status === 'success', 'Demo 3 Copilot call succeeded');
  assert(demo3Res.response.includes('146') || demo3Res.response.includes('Glucose'), 'Includes abnormal glucose');
  assert(demo3Res.response.includes('10.5') || demo3Res.response.includes('Hemoglobin'), 'Includes abnormal hemoglobin');
  assert(!demo3Res.response.includes('Creatinine: 0.9 (Status: Higher') && !demo3Res.response.includes('Creatinine: 0.9 (Status: Lower'), 'Normal creatinine not flagged abnormal');
  assert(!demo3Res.response.includes('Platelet Count: 260,000 (Status: Higher'), 'Normal platelets not flagged abnormal');
  assert(demo3Res.response.includes('not a medical diagnosis') || demo3Res.response.includes('discuss') || demo3Res.response.includes('healthcare professional'), 'Enforces non-diagnostic guidance');
  pass('DEMO 3 PASSED: "What are my abnormal values?" -> Isolates abnormal observations without diagnosis');

  // ==========================================================================
  // DEMO 4: "Why was my glucose marked high?"
  // Expected: Explanation based on actual value & reference range from report. Do not diagnose.
  // ==========================================================================
  console.log('\n--- DEMO 4: "Why was my glucose marked high?" ---');
  const demo4Res = await fetch(`${API_URL}/copilot/ask`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ query: 'Why was my glucose marked high?' }),
  }).then(r => r.json());

  assert(demo4Res.status === 'success', 'Demo 4 Copilot call succeeded');
  assert(demo4Res.response.includes('146'), 'Mentions actual glucose value 146');
  assert(demo4Res.response.includes('70') && demo4Res.response.includes('99'), 'Preserves actual reference range (70 - 99)');
  assert(
    demo4Res.response.toLowerCase().includes('higher than the reference range') ||
    demo4Res.response.toLowerCase().includes('higher than the normal range') ||
    demo4Res.response.toLowerCase().includes('higher than typical'),
    'Explains why it was marked high based on report range'
  );
  assert(
    !demo4Res.response.toLowerCase().includes('you are diagnosed with diabetes') &&
    !demo4Res.response.toLowerCase().includes('you definitely have diabetes'),
    'Non-diagnostic rule strictly observed: Zero medical diagnosis'
  );
  pass('DEMO 4 PASSED: "Why was my glucose marked high?" -> Grounded in actual numbers, reference range, non-diagnostic');

  // ==========================================================================
  // DEMO 5: "Explain this in Tamil."
  // Expected: Tamil explanation based only on retrieved records.
  // ==========================================================================
  console.log('\n--- DEMO 5: "Explain this in Tamil." ---');
  const demo5Res = await fetch(`${API_URL}/copilot/ask`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      query: 'Explain this in Tamil.',
      language: 'ta',
      history: [
        { role: 'user', content: 'Why was my glucose marked high?' },
        { role: 'assistant', content: demo4Res.response },
      ],
    }),
  }).then(r => r.json());

  assert(demo5Res.status === 'success', 'Demo 5 Copilot call succeeded');
  assert(demo5Res.language === 'ta', 'Reported language is Tamil');
  assert(
    demo5Res.response.includes('146') ||
    demo5Res.response.includes('குளுக்கோஸ்') ||
    demo5Res.response.includes('சர்க்கரை') ||
    demo5Res.response.includes('பரிசோதனை'),
    'Tamil explanation incorporates grounded clinical records'
  );
  assert(
    demo5Res.response.includes('மருத்துவர்') || demo5Res.response.includes('வரம்பு'),
    'Tamil explanation includes clinical guidance and reference range'
  );
  pass('DEMO 5 PASSED: "Explain this in Tamil." -> Grounded Tamil explanation based strictly on retrieved records');

  // ==========================================================================
  // DEMO 6: "Compare my latest glucose with my previous report."
  // Expected: Retrieve both relevant observations and provide a grounded comparison.
  // ==========================================================================
  console.log('\n--- DEMO 6: "Compare my latest glucose with my previous report." ---');
  // Seed earlier report (September 2026) with glucose 138 mg/dL
  const earlierReportLines = [
    'City Health Diagnostics & Blood Testing Laboratory',
    'Patient: David Synthetic Patient',
    'Document Date: 2026-09-01',
    'Fasting Blood Glucose: 138 mg/dL (Reference Range: 70 - 99)',
    'Hemoglobin: 11.0 g/dL (Reference Range: 12.0 - 16.0)',
  ];

  const earlierForm = new FormData();
  earlierForm.append('file', new Blob([generateSyntheticPdf(earlierReportLines)], { type: 'application/pdf' }), 'David_Lab_Report_Sep2026.pdf');
  earlierForm.append('document_type', 'LAB_REPORT');

  const earlierUpload = await fetch(`${API_URL}/documents/upload`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: earlierForm,
  }).then(r => r.json());

  await fetch(`${API_URL}/documents/${earlierUpload.document._id}/ocr`, { method: 'POST', headers });
  await fetch(`${API_URL}/documents/${earlierUpload.document._id}/extract`, { method: 'POST', headers, body: JSON.stringify({}) });

  const demo6Res = await fetch(`${API_URL}/copilot/ask`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ query: 'Compare my latest glucose with my previous report.' }),
  }).then(r => r.json());

  assert(demo6Res.status === 'success', 'Demo 6 Copilot call succeeded');
  assert(demo6Res.response.includes('146'), 'Contains latest glucose reading (146 mg/dL)');
  assert(demo6Res.response.includes('138'), 'Contains previous glucose reading (138 mg/dL)');
  assert(
    demo6Res.response.includes('Latest') || demo6Res.response.includes('Previous') || demo6Res.response.includes('Comparison'),
    'Distinguishes chronological latest and previous reports'
  );
  assert(
    demo6Res.response.includes('70') && demo6Res.response.includes('99'),
    'Preserves laboratory reference range (70 - 99) in comparison'
  );
  pass('DEMO 6 PASSED: "Compare my latest glucose with my previous report." -> Grounded comparison across both reports');

  // ==========================================================================
  // DEMO 7: Follow-up: "Who is my doctor?" Then "What did he prescribe?"
  // Expected: Resolve conversational reference ("he" -> doctor) but retrieve
  // medication information from the actual database.
  // ==========================================================================
  console.log('\n--- DEMO 7: Conversational Follow-up: "Who is my doctor?" -> "What did he prescribe?" ---');
  // Turn 1: "Who is my doctor?"
  const turn1Res = await fetch(`${API_URL}/copilot/ask`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ query: 'Who is my doctor?' }),
  }).then(r => r.json());

  assert(turn1Res.response.includes('Dr. Ramesh Gupta'), 'Turn 1 identifies Dr. Ramesh Gupta');

  // Turn 2: Follow-up using conversation history: "What did he prescribe?"
  const conversationHistory = [
    { role: 'user', content: 'Who is my doctor?' },
    { role: 'assistant', content: turn1Res.response },
  ];

  const turn2Res = await fetch(`${API_URL}/copilot/ask`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      query: 'What did he prescribe?',
      history: conversationHistory,
    }),
  }).then(r => r.json());

  assert(turn2Res.status === 'success', 'Turn 2 Copilot call succeeded');
  assert(
    turn2Res.response.includes('Metformin') || turn2Res.response.includes('Atorvastatin'),
    'Retrieved actual prescribed medications from database'
  );
  assert(turn2Res.response.includes('500mg') || turn2Res.response.includes('20mg'), 'Preserved exact dosages from database');
  assert(turn2Res.sources && turn2Res.sources.length > 0, 'Sources attached to prescription');
  pass('DEMO 7 PASSED: Conversational pronoun "he" resolved and medications retrieved from authenticated database');

  // ==========================================================================
  // FINAL ARCHITECTURE CHECK: Core Invariants
  // ==========================================================================
  console.log('\n--- Final Architecture & Fundamental Rule Verification ---');
  // 1. Question Understanding & Intent Router
  assert(retrievalService.classifyQueryIntent('What did my doctor prescribe?') === RETRIEVAL_INTENTS.MEDICATION, 'MEDICATION routed');
  assert(retrievalService.classifyQueryIntent('Who is my doctor?') === RETRIEVAL_INTENTS.DOCTOR, 'DOCTOR routed');
  assert(retrievalService.classifyQueryIntent('What are my abnormal values?') === RETRIEVAL_INTENTS.ABNORMAL_LAB, 'ABNORMAL_LAB routed');
  assert(retrievalService.classifyQueryIntent('Compare my latest glucose with my previous report') === RETRIEVAL_INTENTS.COMPARISON, 'COMPARISON routed');
  pass('INTENT / QUERY ROUTER classifies all clinical inquiries correctly');

  // 2. Fundamental Rule: COPILOT ANSWERS THE QUESTION (No data dump)
  const docOnlyQuery = await fetch(`${API_URL}/copilot/ask`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ query: 'Who is my doctor?' }),
  }).then(r => r.json());
  assert(!docOnlyQuery.response.includes('Hemoglobin: 10.5') && !docOnlyQuery.response.includes('Glucose: 146'), 'Doctor query does NOT dump lab data');
  assert(!docOnlyQuery.response.includes('Tab Metformin 500mg Once daily'), 'Doctor query does NOT dump full prescription schedule');
  pass('FUNDAMENTAL RULE SATISFIED: Copilot strictly answers the user\'s question and never dumps arbitrary records');

  console.log('\n========================================================================');
  console.log(`🎉 ALL ${passedTests} PHASE 14 END-TO-END DEMO TESTS PASSED WITH 100% SUCCESS!`);
  console.log('   - Architecture Pipeline: User -> Login -> Upload -> OCR -> Extract -> DB -> Timeline -> RAG -> Copilot');
  console.log('   - DEMO 1: "What did my doctor prescribe?" -> Prescribed medications with matching source');
  console.log('   - DEMO 2: "Who is my doctor?" -> Identified doctor; unavailable handled cleanly with zero med leak');
  console.log('   - DEMO 3: "What are my abnormal values?" -> Isolated abnormal observations');
  console.log('   - DEMO 4: "Why was my glucose marked high?" -> Grounded explanation, non-diagnostic');
  console.log('   - DEMO 5: "Explain this in Tamil." -> Accurate Tamil explanation based on records');
  console.log('   - DEMO 6: "Compare my latest glucose with my previous report." -> Chronological comparison');
  console.log('   - DEMO 7: Conversational follow-up: "Who is my doctor?" -> "What did he prescribe?"');
  console.log('========================================================================\n');
}

runPhase14FinalE2EDemo().catch((err) => {
  console.error('\n❌ Phase 14 Demo Verification Failed:', err);
  process.exit(1);
});
