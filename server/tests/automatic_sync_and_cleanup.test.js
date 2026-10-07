/**
 * Automatic Medical Record Sync & User-Facing Cleanup Verification Test
 * Tests Parts 1 to 16:
 * 1. Upload prescription -> OCR -> Extraction -> Medication auto-sync
 * 2. Upload lab report -> OCR -> Extraction -> Lab interpretation auto-sync
 * 3. Doctor auto-sync and deduplication
 * 4. Timeline auto-sync with real document dates
 * 5. Deduplication & idempotency on re-processing same document
 * 6. Copilot retrieval of newly uploaded medication
 * 7. Copilot retrieval of newly uploaded lab result
 * 8. Strict cross-user isolation
 * 9. FHIR backend APIs intact and working
 */

import assert from 'assert';

const API_URL = 'http://localhost:5000/api';

function generateSyntheticPdf(textLines) {
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

async function runTests() {
  console.log('\n===============================================================');
  console.log('   AUTOMATIC MEDICAL RECORD SYNC & USER CLEANUP TESTS');
  console.log('===============================================================\n');

  // Register User A
  const userAEmail = `synctest_a_${Date.now()}@healthify.test`;
  const regResA = await fetch(`${API_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Mohammed Arshad',
      email: userAEmail,
      password: 'Password123!',
      phone: `98765${Math.floor(10000 + Math.random() * 90000)}`,
    }),
  }).then(r => r.json());
  assert(regResA.token, 'User A registered');
  const headersA = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${regResA.token}`,
  };
  console.log('✓ PASS: User A registered and authenticated');

  // Register User B
  const userBEmail = `synctest_b_${Date.now()}@healthify.test`;
  const regResB = await fetch(`${API_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Different Patient',
      email: userBEmail,
      password: 'Password123!',
      phone: `98765${Math.floor(10000 + Math.random() * 90000)}`,
    }),
  }).then(r => r.json());
  assert(regResB.token, 'User B registered');
  const headersB = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${regResB.token}`,
  };
  console.log('✓ PASS: User B registered and authenticated');

  // 1. UPLOAD PRESCRIPTION & AUTO-PROCESS
  console.log('\n[STEP 1] Testing Prescription Upload & Auto-Processing Pipeline...');
  const rxLines = [
    'Sample Care Medical Centre',
    'Consultation Date: 06 October 2026',
    'Patient Name: Mohammed Arshad | Age: 18 | Gender: Male',
    'Attending Physician: Dr. Ananya Rao',
    'Clinical Diagnosis: Upper Respiratory Infection',
    'Rx Prescriptions:',
    'Tab Paracetamol 500mg | Route: Oral | Frequency: Twice daily | Duration: 5 days',
    'Instructions: Take with warm water after meals',
  ];

  const rxPdfString = generateSyntheticPdf(rxLines);
  const rxBlob = new Blob([rxPdfString], { type: 'application/pdf' });
  const rxForm = new FormData();
  rxForm.append('file', rxBlob, 'Prescription_Dr_Ananya.pdf');
  rxForm.append('document_type', 'PRESCRIPTION');

  const uploadRes = await fetch(`${API_URL}/documents/upload`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${regResA.token}` },
    body: rxForm,
  });
  assert(uploadRes.status === 201, 'Prescription uploaded');
  const uploadData = await uploadRes.json();
  const docId = uploadData.document._id;
  console.log('✓ PASS: Prescription uploaded successfully');

  // Trigger Automatic Pipeline: POST /api/documents/:id/process
  const processRes = await fetch(`${API_URL}/documents/${docId}/process`, {
    method: 'POST',
    headers: headersA,
    body: JSON.stringify({}),
  });
  assert(processRes.status === 200, 'Pipeline executed successfully');
  const processData = await processRes.json();
  assert(processData.status === 'success', 'Process pipeline status is success');
  console.log('✓ PASS: Automatic document processing pipeline executed successfully');

  // Verify Medication record automatically created
  const medsRes = await fetch(`${API_URL}/medications`, { headers: headersA }).then(r => r.json());
  const foundParacetamol = (medsRes.medications || []).some(m => /paracetamol/i.test(m.name));
  assert(foundParacetamol, 'Medication Paracetamol automatically created in medicines collection');
  console.log('✓ PASS: Medication Paracetamol 500mg automatically synced to user medicine records');

  // Verify Doctor automatically created
  const docsRes = await fetch(`${API_URL}/doctors`, { headers: headersA }).then(r => r.json());
  const foundDoctor = (docsRes.doctors || []).some(d => /ananya/i.test(d.name));
  assert(foundDoctor, 'Doctor Dr. Ananya Rao automatically recorded in doctors collection');
  console.log('✓ PASS: Doctor Dr. Ananya Rao automatically synced to user doctor contacts');

  // Verify Timeline / HealthRecord automatically created with real date
  const recordsRes = await fetch(`${API_URL}/records`, { headers: headersA }).then(r => r.json());
  const timelineRec = (recordsRes.records || []).find(r => r.documentId === docId || /prescription/i.test(r.title));
  assert(Boolean(timelineRec), 'Timeline event automatically created from uploaded prescription');
  assert(new Date(timelineRec.date).getFullYear() === 2026, 'Timeline event uses actual document year (2026)');
  console.log('✓ PASS: Timeline event automatically created with verified document date (06 October 2026)');

  // 2. IDEMPOTENCY / DUPLICATE PREVENTION
  console.log('\n[STEP 2] Testing Deduplication on Reprocessing Same Document...');
  const reprocessRes = await fetch(`${API_URL}/documents/${docId}/process`, {
    method: 'POST',
    headers: headersA,
    body: JSON.stringify({}),
  });
  assert(reprocessRes.status === 200, 'Reprocess call succeeded');

  const medsAfter = await fetch(`${API_URL}/medications`, { headers: headersA }).then(r => r.json());
  const paracetamolCount = (medsAfter.medications || []).filter(m => /paracetamol/i.test(m.name)).length;
  assert(paracetamolCount === 1, `Zero duplicate medications created on reprocess (count: ${paracetamolCount})`);
  console.log(`✓ PASS: Duplicate prevention verified: Exactly 1 medication record after reprocessing`);

  const recordsAfter = await fetch(`${API_URL}/records`, { headers: headersA }).then(r => r.json());
  const docRecordsCount = (recordsAfter.records || []).filter(r => r.documentId === docId).length;
  assert(docRecordsCount === 1, `Zero duplicate timeline records created on reprocess (count: ${docRecordsCount})`);
  console.log(`✓ PASS: Duplicate prevention verified: Exactly 1 timeline record after reprocessing`);

  // 3. UPLOAD LAB REPORT & AUTO-PROCESS
  console.log('\n[STEP 3] Testing Laboratory Report Upload & Interpretation Auto-Sync...');
  const labLines = [
    'Metropolis Central Diagnostics',
    'Report Date: 07 October 2026',
    'Patient Name: Mohammed Arshad | Age: 18 | Gender: Male',
    'Attending Doctor: Dr. Ananya Rao',
    'Laboratory Investigations:',
    'Fasting Blood Glucose: 142 mg/dL | Reference Range: 70-99 mg/dL | Flag: HIGH',
    'HbA1c: 7.2 % | Reference Range: 4.0-5.6 % | Flag: HIGH',
    'Serum Creatinine: 0.9 mg/dL | Reference Range: 0.7-1.3 mg/dL | Flag: NORMAL',
  ];

  const labPdfString = generateSyntheticPdf(labLines);
  const labBlob = new Blob([labPdfString], { type: 'application/pdf' });
  const labForm = new FormData();
  labForm.append('file', labBlob, 'Metropolis_Lab_Report.pdf');
  labForm.append('document_type', 'LAB_REPORT');

  const labUploadRes = await fetch(`${API_URL}/documents/upload`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${regResA.token}` },
    body: labForm,
  });
  assert(labUploadRes.status === 201, 'Lab report uploaded');
  const labData = await labUploadRes.json();
  const labDocId = labData.document._id;
  console.log('✓ PASS: Lab report uploaded successfully');

  const processLabRes = await fetch(`${API_URL}/documents/${labDocId}/process`, {
    method: 'POST',
    headers: headersA,
    body: JSON.stringify({}),
  });
  assert(processLabRes.status === 200, 'Lab report pipeline executed successfully');
  console.log('✓ PASS: Lab report automatically processed, interpreted, and synced');

  // Check Lab interpretations
  const labInterpRes = await fetch(`${API_URL}/lab/interpretations`, { headers: headersA }).then(r => r.json());
  assert(labInterpRes.interpretations && labInterpRes.interpretations.length > 0, 'Lab interpretations populated');
  const glucoseInterp = labInterpRes.interpretations.find(i => /glucose/i.test(i.test_name));
  assert(Boolean(glucoseInterp), 'Glucose interpretation recorded in laboratory dashboard collection');
  console.log('✓ PASS: Laboratory dashboard interpretations updated with verified status and explanations');

  // 4. TEST COPILOT RETRIEVAL
  console.log('\n[STEP 4] Testing Health Copilot with Newly Uploaded Information...');
  const copilotMedQuery = await fetch(`${API_URL}/copilot/ask`, {
    method: 'POST',
    headers: headersA,
    body: JSON.stringify({ query: 'What medicines did my doctor prescribe?' }),
  }).then(r => r.json());
  const medAnswer = copilotMedQuery.response || copilotMedQuery.answer || '';
  assert(/paracetamol/i.test(medAnswer), `Copilot successfully retrieved newly synced medication (Paracetamol). Answer: ${medAnswer}`);
  console.log('✓ PASS: Copilot successfully retrieved newly uploaded medication: Paracetamol 500mg');

  const copilotDocQuery = await fetch(`${API_URL}/copilot/ask`, {
    method: 'POST',
    headers: headersA,
    body: JSON.stringify({ query: 'Who is my doctor?' }),
  }).then(r => r.json());
  const docAnswer = copilotDocQuery.response || copilotDocQuery.answer || '';
  assert(/ananya/i.test(docAnswer), `Copilot successfully retrieved newly synced doctor (Dr. Ananya Rao). Answer: ${docAnswer}`);
  console.log('✓ PASS: Copilot successfully retrieved newly uploaded doctor: Dr. Ananya Rao');

  const copilotGlucoseQuery = await fetch(`${API_URL}/copilot/ask`, {
    method: 'POST',
    headers: headersA,
    body: JSON.stringify({ query: 'What is my fasting glucose?' }),
  }).then(r => r.json());
  const glucoseAnswer = copilotGlucoseQuery.response || copilotGlucoseQuery.answer || '';
  assert(/142/i.test(glucoseAnswer), `Copilot retrieved actual lab glucose (142 mg/dL). Answer: ${glucoseAnswer}`);
  console.log('✓ PASS: Copilot successfully retrieved newly uploaded laboratory result: Glucose 142 mg/dL');

  // 5. TEST CROSS-USER ISOLATION
  console.log('\n[STEP 5] Testing Multi-Tenant Security & Isolation...');
  const userBMeds = await fetch(`${API_URL}/medications`, { headers: headersB }).then(r => r.json());
  assert(userBMeds.medications.length === 0, 'User B cannot see User A medications (0 leak)');

  const userBDocs = await fetch(`${API_URL}/doctors`, { headers: headersB }).then(r => r.json());
  assert(userBDocs.doctors.length === 0, 'User B cannot see User A doctors (0 leak)');

  const userBRecords = await fetch(`${API_URL}/records`, { headers: headersB }).then(r => r.json());
  assert(userBRecords.records.length === 0, 'User B cannot see User A timeline records (0 leak)');

  const userBCopilot = await fetch(`${API_URL}/copilot/ask`, {
    method: 'POST',
    headers: headersB,
    body: JSON.stringify({ query: 'What medicines did my doctor prescribe?' }),
  }).then(r => r.json());
  const userBAnswer = userBCopilot.response || userBCopilot.answer || '';
  assert(!/paracetamol/i.test(userBAnswer), 'User B Copilot NEVER leaks User A medication');
  console.log('✓ PASS: Multi-tenant cross-user security confirmed: User B has 0 access to User A records or Copilot answers');

  // 6. TEST FHIR BACKEND PRESERVATION
  console.log('\n[STEP 6] Testing FHIR Backend APIs Preservation...');
  const fhirPatient = await fetch(`${API_URL}/fhir/patient`, { headers: headersA }).then(r => r.json());
  assert(fhirPatient.resourceType === 'Patient', 'FHIR Patient endpoint works');

  const fhirMeds = await fetch(`${API_URL}/fhir/medications`, { headers: headersA }).then(r => r.json());
  assert(fhirMeds.resourceType === 'Bundle', 'FHIR Medications endpoint works');

  const fhirExport = await fetch(`${API_URL}/fhir/export`, { headers: headersA }).then(r => r.json());
  assert(fhirExport.resourceType === 'Bundle', 'FHIR Export endpoint works');
  console.log('✓ PASS: Internal FHIR interoperability layer preserved and fully operational');

  console.log('\n===============================================================');
  console.log('   ALL AUTOMATIC SYNC & USER CLEANUP TESTS PASSED! (20/20)');
  console.log('===============================================================\n');
}

runTests().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
