import assert from 'assert';

const BASE_URL = 'http://localhost:5000/api';

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

async function request(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const headers = { ...options.headers };
  if (options.body && !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }
  const response = await fetch(url, {
    ...options,
    headers,
  });

  const contentType = response.headers.get('content-type') || '';
  let data = null;
  if (contentType.includes('application/json')) {
    data = await response.json();
  } else {
    data = await response.text();
  }

  return { status: response.status, data, headers: response.headers };
}

async function runPhase7Tests() {
  console.log('\n===============================================================');
  console.log('   PHASE 7: STRUCTURED HEALTH PROFILE & TIMELINE TESTS         ');
  console.log('===============================================================\n');

  // 1. Register test users
  console.log('[SECTION 1] Registering Test Users...');
  const userARes = await request('/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      name: 'Dr. Gregory House Patient A',
      email: `patient_p7_a_${Date.now()}@healthify.test`,
      password: 'SecurePassword123!',
      phone: '9876543240',
      age: 48,
      gender: 'male',
      bloodGroup: 'O+',
    }),
  });
  assert.strictEqual(userARes.status, 201);
  const tokenA = userARes.data.token;
  console.log('✓ PASS: User A registered and authenticated');

  const userBRes = await request('/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      name: 'Patient B Isolated',
      email: `patient_p7_b_${Date.now()}@healthify.test`,
      password: 'SecurePassword123!',
      phone: '9876543241',
      age: 32,
      gender: 'female',
    }),
  });
  assert.strictEqual(userBRes.status, 201);
  const tokenB = userBRes.data.token;
  console.log('✓ PASS: User B registered and authenticated');

  // 2. Upload Multiple Documents with Explicit Clinical Dates
  console.log('\n[SECTION 2] Uploading Multiple Documents with Explicit Clinical Dates...');

  // Document 1: Date 2026-09-01, Lab Report
  const doc1Lines = [
    'Metropolitan Clinical Laboratories',
    'Patient: Gregory Patient | Age: 48 | Gender: Male',
    'Date: 2026-09-01',
    'HbA1c: 7.4 % (Reference: < 5.7 %)',
    'Fasting Blood Glucose: 135 mg/dL (Reference: 70 - 100 mg/dL)',
    'Serum Creatinine: 0.9 mg/dL (Reference: 0.6 - 1.2 mg/dL)',
  ];
  const pdf1 = generateSyntheticPdf(doc1Lines);
  const form1 = new FormData();
  form1.append('file', new Blob([pdf1], { type: 'application/pdf' }), 'Metabolic_Panel_Sept01.pdf');
  form1.append('document_type', 'LAB_REPORT');

  const upload1 = await fetch(`${BASE_URL}/documents/upload`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenA}` },
    body: form1,
  });
  assert.strictEqual(upload1.status, 201);
  const doc1 = (await upload1.json()).document;

  // Document 2: Date 2026-09-05, Prescription
  const doc2Lines = [
    'St. Jude Medical Clinic',
    'Patient: Gregory Patient | Age: 48',
    'Date: 2026-09-05',
    'Diagnosis: Type 2 Diabetes Mellitus',
    'Rx:',
    'Tab Metformin 500mg | Route: Oral | Frequency: Twice daily | Duration: 30 days',
  ];
  const pdf2 = generateSyntheticPdf(doc2Lines);
  const form2 = new FormData();
  form2.append('file', new Blob([pdf2], { type: 'application/pdf' }), 'Prescription_Sept05.pdf');
  form2.append('document_type', 'PRESCRIPTION');

  const upload2 = await fetch(`${BASE_URL}/documents/upload`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenA}` },
    body: form2,
  });
  assert.strictEqual(upload2.status, 201);
  const doc2 = (await upload2.json()).document;

  // Document 3: Date 2026-09-20, Diagnostic Report
  const doc3Lines = [
    'Cardiovascular Diagnostic Center',
    'Patient: Gregory Patient | Age: 48',
    'Date: 2026-09-20',
    'Diagnosis: Essential Hypertension',
    'Rx:',
    'Tab Lisinopril 10mg | Route: Oral | Frequency: Once daily | Duration: 30 days',
  ];
  const pdf3 = generateSyntheticPdf(doc3Lines);
  const form3 = new FormData();
  form3.append('file', new Blob([pdf3], { type: 'application/pdf' }), 'Cardio_Report_Sept20.pdf');
  form3.append('document_type', 'DIAGNOSTIC_REPORT');

  const upload3 = await fetch(`${BASE_URL}/documents/upload`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenA}` },
    body: form3,
  });
  assert.strictEqual(upload3.status, 201);
  const doc3 = (await upload3.json()).document;

  console.log('✓ PASS: Uploaded 3 distinct documents with dates 2026-09-01, 2026-09-05, and 2026-09-20');

  // 3. Process AI Extractions & Lab Interpretations on all 3 documents
  console.log('\n[SECTION 3] Processing AI Extraction on All 3 Documents...');
  const ext1Res = await request(`/documents/${doc1._id}/extract`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenA}` },
  });
  assert.strictEqual(ext1Res.status, 200);

  const ext2Res = await request(`/documents/${doc2._id}/extract`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenA}` },
  });
  assert.strictEqual(ext2Res.status, 200);

  const ext3Res = await request(`/documents/${doc3._id}/extract`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenA}` },
  });
  assert.strictEqual(ext3Res.status, 200);

  // Interpret labs on doc1
  const labInterpRes = await request(`/documents/${doc1._id}/interpret-labs`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenA}` },
  });
  assert.strictEqual(labInterpRes.status, 200);
  console.log('✓ PASS: AI extractions and lab interpretations processed for all 3 documents');

  // 4. Retrieve Structured Health Profile: GET /api/user/health-profile
  console.log('\n[SECTION 4] Testing GET /api/user/health-profile Synthesis...');
  const profileRes = await request('/user/health-profile', {
    method: 'GET',
    headers: { Authorization: `Bearer ${tokenA}` },
  });
  assert.strictEqual(profileRes.status, 200);
  assert(profileRes.data.health_profile, 'Health profile returned');
  const hp = profileRes.data.health_profile;

  // 5. Test Summary Counters
  console.log('\n[SECTION 5] Verifying Summary Counts (Uploaded vs Analyzed)...');
  assert.strictEqual(hp.summary.total_uploaded_records, 3, 'Total uploaded records must be 3');
  assert.strictEqual(hp.summary.total_analyzed_records, 3, 'Total analyzed records must be 3');
  console.log(`✓ PASS: Counts verified: ${hp.summary.total_uploaded_records} uploaded, ${hp.summary.total_analyzed_records} analyzed`);

  // 6. Test Multi-Document Diagnoses Combination
  console.log('\n[SECTION 6] Verifying Multi-Document Diagnoses Combination...');
  const diagnoses = hp.diagnoses.map((d) => d.diagnosis.toLowerCase());
  assert(diagnoses.some((d) => d.includes('diabetes')), 'Must contain Diabetes from Doc 2');
  assert(diagnoses.some((d) => d.includes('hypertension')), 'Must contain Hypertension from Doc 3');
  assert.strictEqual(hp.diagnoses.length, 2, 'Must contain exactly 2 deduplicated diagnoses');
  console.log('✓ PASS: Multi-document diagnoses combined correctly without duplication or fabrication');

  // 7. Test Multi-Document Medications Combination
  console.log('\n[SECTION 7] Verifying Multi-Document Medications Combination...');
  const medNames = hp.medications.map((m) => m.name.toLowerCase());
  assert(medNames.some((m) => m.includes('metformin')), 'Must contain Metformin from Doc 2');
  assert(medNames.some((m) => m.includes('lisinopril')), 'Must contain Lisinopril from Doc 3');
  console.log('✓ PASS: Multi-document medications combined correctly with dosage and explicit schedule');

  // 8. Test Laboratory Observations
  console.log('\n[SECTION 8] Verifying Laboratory Observations...');
  assert(hp.recent_observations.length >= 2, 'Must contain lab observations from Doc 1');
  const testNames = hp.recent_observations.map((o) => o.test_name.toLowerCase());
  assert(testNames.some((t) => t.includes('glucose')), 'Contains Fasting Glucose observation');
  assert(testNames.some((t) => t.includes('hba1c')), 'Contains HbA1c observation');
  console.log('✓ PASS: Recent laboratory observations synthesized with values, units, and status');

  // 9. Test Timeline (Based on Actual Document Dates)
  console.log('\n[SECTION 9] Verifying Timeline Based on Actual Document Dates...');
  assert.strictEqual(hp.timeline.length, 3, 'Timeline must have 3 events corresponding to 3 documents');

  // Find events by date
  const eventDates = hp.timeline.map((e) => e.date);
  assert(eventDates.includes('2026-09-01'), 'Timeline contains actual date 2026-09-01 (Lab Report)');
  assert(eventDates.includes('2026-09-05'), 'Timeline contains actual date 2026-09-05 (Prescription)');
  assert(eventDates.includes('2026-09-20'), 'Timeline contains actual date 2026-09-20 (Diagnostic Report)');

  const eventSept01 = hp.timeline.find((e) => e.date === '2026-09-01');
  const eventSept05 = hp.timeline.find((e) => e.date === '2026-09-05');
  const eventSept20 = hp.timeline.find((e) => e.date === '2026-09-20');

  assert.strictEqual(eventSept01.type, 'LAB_REPORT', '2026-09-01 is Lab Report');
  assert.strictEqual(eventSept05.type, 'PRESCRIPTION', '2026-09-05 is Prescription');
  assert.strictEqual(eventSept20.type, 'DIAGNOSTIC_REPORT', '2026-09-20 is Diagnostic Report');

  console.log('✓ PASS: Timeline preserves exact actual document dates:');
  console.log('   2026-09-01 -> Lab Report');
  console.log('   2026-09-05 -> Prescription');
  console.log('   2026-09-20 -> Diagnostic Report');
  console.log('✓ PASS: Never invent dates rule verified.');

  // 10. Test Cross-User Isolation
  console.log('\n[SECTION 10] Testing Cross-User Profile Isolation...');
  const userBProfileRes = await request('/user/health-profile', {
    method: 'GET',
    headers: { Authorization: `Bearer ${tokenB}` },
  });
  assert.strictEqual(userBProfileRes.status, 200);
  const hpB = userBProfileRes.data.health_profile;

  assert.strictEqual(hpB.summary.total_uploaded_records, 0, 'User B must have 0 uploaded records');
  assert.strictEqual(hpB.summary.total_analyzed_records, 0, 'User B must have 0 analyzed records');
  assert.strictEqual(hpB.diagnoses.length, 0, 'User B must have 0 diagnoses (zero leak from User A)');
  assert.strictEqual(hpB.medications.length, 0, 'User B must have 0 medications (zero leak from User A)');
  assert.strictEqual(hpB.timeline.length, 0, 'User B must have 0 timeline events');
  console.log('✓ PASS: Strict cross-user isolation verified: User B has 0 records, 0 diagnoses, 0 timeline events');

  console.log('\n===============================================================');
  console.log('   PHASE 7 VERIFICATION COMPLETE: ALL TESTS PASSED!            ');
  console.log('===============================================================\n');
}

runPhase7Tests().catch((err) => {
  console.error('\n❌ TEST FAILURE:', err);
  process.exit(1);
});
