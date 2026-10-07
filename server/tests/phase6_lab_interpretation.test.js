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

async function runPhase6Tests() {
  console.log('\n===============================================================');
  console.log('   PHASE 6: SAFE LAB RESULT INTERPRETATION ENGINE TESTS        ');
  console.log('===============================================================\n');

  // 1. Create 2 isolated test users
  console.log('[SECTION 1] Registering Test Users...');
  const userARes = await request('/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      name: 'Synthetic Patient One',
      email: `patient_lab_a_${Date.now()}@healthify.test`,
      password: 'SecurePassword123!',
      phone: '9876543210',
      age: 45,
      gender: 'male',
    }),
  });
  assert.strictEqual(userARes.status, 201);
  const tokenA = userARes.data.token;
  const userA = userARes.data.user;
  console.log('✓ PASS: User A registered and authenticated');

  const userBRes = await request('/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      name: 'Synthetic Patient Two',
      email: `patient_lab_b_${Date.now()}@healthify.test`,
      password: 'SecurePassword123!',
      phone: '9876543211',
      age: 38,
      gender: 'female',
    }),
  });
  assert.strictEqual(userBRes.status, 201);
  const tokenB = userBRes.data.token;
  console.log('✓ PASS: User B registered and authenticated');

  // 2. Test LOW, NORMAL, HIGH with Document Reference Range
  console.log('\n[SECTION 2] Testing Status Determination with Document Reference Range...');
  const docRangeObservations = [
    {
      test_name: 'Fasting Blood Glucose',
      value: '65',
      numeric_value: 65,
      unit: 'mg/dL',
      reference_range: '70 - 99',
      confidence: 95,
    },
    {
      test_name: 'Fasting Blood Glucose',
      value: '85',
      numeric_value: 85,
      unit: 'mg/dL',
      reference_range: '70 - 99',
      confidence: 95,
    },
    {
      test_name: 'Fasting Blood Glucose',
      value: '145',
      numeric_value: 145,
      unit: 'mg/dL',
      reference_range: '70 - 99',
      confidence: 95,
    },
    {
      test_name: 'HbA1c',
      value: '5.2',
      numeric_value: 5.2,
      unit: '%',
      reference_range: '< 5.7',
      confidence: 95,
    },
    {
      test_name: 'HbA1c',
      value: '7.8',
      numeric_value: 7.8,
      unit: '%',
      reference_range: '< 5.7',
      confidence: 95,
    },
  ];

  const evalDocRangeRes = await request('/lab/interpret', {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenA}` },
    body: JSON.stringify({ observations: docRangeObservations }),
  });

  assert.strictEqual(evalDocRangeRes.status, 200);
  const docResults = evalDocRangeRes.data.interpretations;
  assert.strictEqual(docResults.length, 5);

  assert.strictEqual(docResults[0].status, 'LOW');
  assert.strictEqual(docResults[0].source, 'DOCUMENT_REPORT');

  assert.strictEqual(docResults[1].status, 'NORMAL');
  assert.strictEqual(docResults[1].source, 'DOCUMENT_REPORT');

  assert.strictEqual(docResults[2].status, 'HIGH');
  assert.strictEqual(docResults[2].source, 'DOCUMENT_REPORT');

  assert.strictEqual(docResults[3].status, 'NORMAL');
  assert.strictEqual(docResults[3].source, 'DOCUMENT_REPORT');

  assert.strictEqual(docResults[4].status, 'HIGH');
  assert.strictEqual(docResults[4].source, 'DOCUMENT_REPORT');

  console.log('✓ PASS: Successfully determined LOW, NORMAL, HIGH using document reference ranges');

  // 3. Test Priority: Document reference range takes precedence over curated
  console.log('\n[SECTION 3] Testing Document Range Priority Over Curated Standard...');
  const priorityObservation = [
    {
      test_name: 'Hemoglobin',
      value: '13.2',
      numeric_value: 13.2,
      unit: 'g/dL',
      // Document provides a customized lab range
      reference_range: '13.5 - 17.0',
      confidence: 96,
    },
  ];

  const evalPriorityRes = await request('/lab/interpret', {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenA}` },
    body: JSON.stringify({
      observations: priorityObservation,
      patient_context: { gender: 'male', age: 45 },
    }),
  });
  assert.strictEqual(evalPriorityRes.status, 200);
  const prioResult = evalPriorityRes.data.interpretations[0];
  // With 13.2 and document range 13.5 - 17.0, status is LOW, not normal
  assert.strictEqual(prioResult.status, 'LOW');
  assert.strictEqual(prioResult.reference_range, '13.5 - 17.0');
  assert.strictEqual(prioResult.source, 'DOCUMENT_REPORT');
  console.log('✓ PASS: Document reference range strictly prioritized and never overridden');

  // 4. Test Never Inventing Reference Ranges (Returns UNKNOWN)
  console.log('\n[SECTION 4] Testing Non-Invention Rule (No Range -> UNKNOWN)...');
  const unknownObservations = [
    {
      test_name: 'Novel Experimental Biomarker XYZ',
      value: '42.5',
      numeric_value: 42.5,
      unit: 'ng/mL',
      reference_range: null, // No document range
      confidence: 80,
    },
  ];

  const evalUnknownRes = await request('/lab/interpret', {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenA}` },
    body: JSON.stringify({ observations: unknownObservations }),
  });
  assert.strictEqual(evalUnknownRes.status, 200);
  const unkResult = evalUnknownRes.data.interpretations[0];
  assert.strictEqual(unkResult.status, 'UNKNOWN');
  assert.strictEqual(unkResult.reference_range, null);
  assert.strictEqual(unkResult.severity, 'INFORMATIONAL');
  assert.strictEqual(unkResult.source, 'INSUFFICIENT_RANGE_DATA');
  console.log('✓ PASS: Never invents reference range; returns UNKNOWN with INFORMATIONAL severity');

  // 5. Test Curated Reference Range 4 Strict Conditions
  console.log('\n[SECTION 5] Testing Curated Reference Range 4-Condition Rule...');
  // Condition Met:
  // 1. Confidently identified ('fasting blood glucose')
  // 2. Unit is known ('mg/dL')
  // 3. Patient context is sufficient (age 45 adult)
  // 4. Reference source/version recorded
  const curatedMetObservation = [
    {
      test_name: 'Fasting Blood Glucose',
      value: '110',
      numeric_value: 110,
      unit: 'mg/dL',
      reference_range: null, // No document range
      confidence: 90,
    },
  ];

  const evalCuratedMetRes = await request('/lab/interpret', {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenA}` },
    body: JSON.stringify({
      observations: curatedMetObservation,
      patient_context: { age: 45, is_adult: true },
    }),
  });
  assert.strictEqual(evalCuratedMetRes.status, 200);
  const curResult = evalCuratedMetRes.data.interpretations[0];
  assert.strictEqual(curResult.status, 'HIGH');
  assert.strictEqual(curResult.reference_range, '70–99 mg/dL');
  assert.strictEqual(curResult.source, 'ADA_STANDARDS_CARE_2024_V1');
  console.log('✓ PASS: Curated range successfully applied when all 4 conditions satisfied');

  // Condition FAILS: Unit is unknown or invalid
  const curatedFailUnitObservation = [
    {
      test_name: 'Fasting Blood Glucose',
      value: '110',
      numeric_value: 110,
      unit: 'arbitrary_units',
      reference_range: null,
      confidence: 90,
    },
  ];
  const evalCuratedFailUnitRes = await request('/lab/interpret', {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenA}` },
    body: JSON.stringify({
      observations: curatedFailUnitObservation,
      patient_context: { age: 45 },
    }),
  });
  assert.strictEqual(evalCuratedFailUnitRes.status, 200);
  const failUnitResult = evalCuratedFailUnitRes.data.interpretations[0];
  assert.strictEqual(failUnitResult.status, 'UNKNOWN');
  assert.strictEqual(failUnitResult.reference_range, null);
  console.log('✓ PASS: Curated range rejected when unit is unverified -> UNKNOWN');

  // Condition FAILS: Insufficient patient context for gender-specific test without gender
  const curatedFailContextObservation = [
    {
      test_name: 'Hemoglobin',
      value: '12.5',
      numeric_value: 12.5,
      unit: 'g/dL',
      reference_range: null,
      confidence: 90,
    },
  ];
  const evalCuratedFailContextRes = await request('/lab/interpret', {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenA}` },
    body: JSON.stringify({
      observations: curatedFailContextObservation,
      patient_context: { age: null, gender: null, is_adult: false },
    }),
  });
  assert.strictEqual(evalCuratedFailContextRes.status, 200);
  const failContextResult = evalCuratedFailContextRes.data.interpretations[0];
  assert.strictEqual(failContextResult.status, 'UNKNOWN');
  console.log('✓ PASS: Curated range rejected when patient context insufficient -> UNKNOWN');

  // 6. Test Severity Levels
  console.log('\n[SECTION 6] Testing Clinical Severity Levels...');
  const severityObservations = [
    {
      test_name: 'Fasting Blood Glucose',
      value: '88',
      numeric_value: 88,
      unit: 'mg/dL',
      reference_range: '70 - 99',
    },
    {
      test_name: 'Fasting Blood Glucose',
      value: '125',
      numeric_value: 125,
      unit: 'mg/dL',
      reference_range: '70 - 99',
    },
    {
      test_name: 'Fasting Blood Glucose',
      value: '420', // Critical high
      numeric_value: 420,
      unit: 'mg/dL',
      reference_range: '70 - 99',
    },
    {
      test_name: 'Unspecified Test',
      value: 'Positive',
      reference_range: null,
    },
  ];

  const evalSeverityRes = await request('/lab/interpret', {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenA}` },
    body: JSON.stringify({ observations: severityObservations }),
  });
  assert.strictEqual(evalSeverityRes.status, 200);
  const sevResults = evalSeverityRes.data.interpretations;

  assert.strictEqual(sevResults[0].severity, 'NORMAL');
  assert.strictEqual(sevResults[1].severity, 'REVIEW_RECOMMENDED');
  assert.strictEqual(sevResults[2].severity, 'URGENT_REVIEW');
  assert.strictEqual(sevResults[3].severity, 'INFORMATIONAL');
  console.log('✓ PASS: Accurately computed NORMAL, INFORMATIONAL, REVIEW_RECOMMENDED, URGENT_REVIEW severities');

  // 7. Test Non-Diagnostic Plain Language Explanation
  console.log('\n[SECTION 7] Testing Safety: Non-Diagnostic Explanations (Zero Hallucination/Diagnosing)...');
  const explanation = sevResults[1].explanation;
  // Must NOT assert a diagnosis
  assert.doesNotMatch(explanation, /you have diabetes/i);
  assert.doesNotMatch(explanation, /you are suffering from/i);
  // Must reflect actual observation
  assert.match(explanation, /above the reference range/i);
  assert.match(explanation, /qualified healthcare professional/i);
  console.log('✓ PASS: Zero diagnostic claims; explanation generated from actual observation with clinical disclaimer');

  // 8. Test Document Laboratory Interpretation Pipeline (POST /documents/:id/interpret-labs)
  console.log('\n[SECTION 8] Testing Document Laboratory Interpretation Pipeline...');
  const docLines = [
    'Comprehensive Metabolic Laboratory Report',
    'Patient: Synthetic Patient One | Age: 45 | Gender: Male',
    'Doctor: Dr. Sarah Connor | Date: 2026-10-07',
    'HbA1c: 7.2 % (Reference: < 5.7 %)',
    'Fasting Blood Glucose: 135 mg/dL (Reference: 70 - 100 mg/dL)',
    'Serum Creatinine: 0.9 mg/dL (Reference: 0.6 - 1.2 mg/dL)',
  ];
  const pdfBlobContent = generateSyntheticPdf(docLines);
  const formData = new FormData();
  formData.append('file', new Blob([pdfBlobContent], { type: 'application/pdf' }), 'synthetic_chemistry_panel.pdf');
  formData.append('document_type', 'LAB_REPORT');

  const uploadRes = await fetch(`${BASE_URL}/documents/upload`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenA}` },
    body: formData,
  });
  assert.strictEqual(uploadRes.status, 201);
  const uploadedDoc = (await uploadRes.json()).document;

  // Extract medical entities with AI first
  const extractRes = await request(`/documents/${uploadedDoc._id}/extract`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenA}` },
  });
  assert.strictEqual(extractRes.status, 200);

  // Now trigger document lab interpretations
  const docInterpretRes = await request(`/documents/${uploadedDoc._id}/interpret-labs`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenA}` },
  });
  assert.strictEqual(docInterpretRes.status, 200);
  assert(Array.isArray(docInterpretRes.data.interpretations));
  console.log(`✓ PASS: Interpreted ${docInterpretRes.data.interpretations.length} laboratory observations from document`);

  // 9. Test Querying Interpretations (GET /lab/interpretations)
  console.log('\n[SECTION 9] Testing GET /api/lab/interpretations...');
  const listInterpretRes = await request('/lab/interpretations', {
    method: 'GET',
    headers: { Authorization: `Bearer ${tokenA}` },
  });
  assert.strictEqual(listInterpretRes.status, 200);
  assert(listInterpretRes.data.interpretations.length > 0);
  const sampleSaved = listInterpretRes.data.interpretations[0];
  assert(sampleSaved.observation_id);
  assert(sampleSaved.status);
  assert(sampleSaved.explanation);
  assert(sampleSaved.severity);
  assert(sampleSaved.confidence);
  assert(sampleSaved.source);
  assert(sampleSaved.created_at);
  console.log('✓ PASS: Retrieved stored interpretations from observation_interpretations collection with full schema');

  // 10. Test Cross-User Access Isolation
  console.log('\n[SECTION 10] Testing Cross-User Access Isolation...');
  // User B tries to interpret User A document
  const crossInterpretRes = await request(`/documents/${uploadedDoc._id}/interpret-labs`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenB}` },
  });
  assert.strictEqual(crossInterpretRes.status, 404);

  // User B tries to get User A document interpretations
  const crossGetDocRes = await request(`/documents/${uploadedDoc._id}/lab-interpretations`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${tokenB}` },
  });
  assert.strictEqual(crossGetDocRes.status, 404);

  // User B list contains zero User A records
  const userBListRes = await request('/lab/interpretations', {
    method: 'GET',
    headers: { Authorization: `Bearer ${tokenB}` },
  });
  assert.strictEqual(userBListRes.status, 200);
  assert.strictEqual(userBListRes.data.count, 0);
  console.log('✓ PASS: Strict cross-user isolation enforced (404 and zero cross-tenant leak)');

  console.log('\n===============================================================');
  console.log('   PHASE 6 VERIFICATION COMPLETE: ALL TESTS PASSED!            ');
  console.log('===============================================================\n');
}

runPhase6Tests().catch((err) => {
  console.error('\n❌ TEST FAILURE:', err);
  process.exit(1);
});
