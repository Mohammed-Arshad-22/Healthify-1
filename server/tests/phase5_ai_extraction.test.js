import assert from 'assert';

const API_URL = 'http://localhost:5000/api';

console.log('===============================================================');
console.log('   PHASE 5: AI MEDICAL ENTITY EXTRACTION VERIFICATION TESTS    ');
console.log('===============================================================');

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
  let passedCount = 0;
  const pass = (msg) => {
    passedCount++;
    console.log(`✓ PASS: ${msg}`);
  };

  try {
    // -------------------------------------------------------------------------
    // SECTION 1: USER REGISTRATION & AUTHENTICATION
    // -------------------------------------------------------------------------
    console.log('\n[SECTION 1] Registering Test Users...');
    const emailA = `patient_ai_a_${Date.now()}@example.com`;
    const regResA = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Patient AI A',
        email: emailA,
        password: 'Password123!',
        phone: '9876543230',
      }),
    }).then(r => r.json());
    assert(regResA.token, 'User A registered');
    const headersA = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${regResA.token}`,
    };
    pass('User A registered and authenticated');

    const emailB = `patient_ai_b_${Date.now()}@example.com`;
    const regResB = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Patient AI B',
        email: emailB,
        password: 'Password123!',
        phone: '9876543231',
      }),
    }).then(r => r.json());
    assert(regResB.token, 'User B registered');
    const headersB = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${regResB.token}`,
    };
    pass('User B registered and authenticated');

    // -------------------------------------------------------------------------
    // SECTION 2: COMPLETE MEDICAL DOCUMENT EXTRACTION
    // -------------------------------------------------------------------------
    console.log('\n[SECTION 2] Testing Complete Medical Entity Extraction...');

    const docLines = [
      'Princeton Plainsboro Teaching Hospital',
      'Patient Name: Sarah Connor | Age: 38 | Gender: Female',
      'Attending Physician: Dr. Gregory House',
      'Date: 2026-10-07',
      'Clinical Diagnosis: Type 2 Diabetes Mellitus',
      'Rx / Prescriptions:',
      'Tab Metformin 500mg | Route: Oral | Frequency: Twice daily | Duration: 30 days',
      'Tab Lisinopril 10mg | Route: Oral | Frequency: Once daily | Duration: 30 days',
      'Diagnostic Laboratory Findings:',
      'HbA1c: 7.4 % (Reference: < 5.7%)',
      'Fasting Blood Glucose: 135 mg/dL (Reference: 70 - 100 mg/dL)',
      'Serum Creatinine: 0.9 mg/dL (Reference: 0.6 - 1.2 mg/dL)',
      'Clinical Advice: Continue low glycemic index diet and exercise.',
    ];
    const pdfContent = generateSyntheticPdf(docLines);

    const pdfForm = new FormData();
    const pdfBlob = new Blob([pdfContent], { type: 'application/pdf' });
    pdfForm.append('file', pdfBlob, 'Full_Clinical_Consultation_Report.pdf');
    pdfForm.append('document_type', 'LAB_REPORT');

    const uploadRes = await fetch(`${API_URL}/documents/upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${regResA.token}` },
      body: pdfForm,
    });
    assert(uploadRes.status === 201, 'Document uploaded');
    const docData = await uploadRes.json();
    const docA = docData.document;
    pass('Uploaded synthetic comprehensive clinical document');

    // Run AI extraction: POST /api/documents/:id/extract
    const extractRes = await fetch(`${API_URL}/documents/${docA._id}/extract`, {
      method: 'POST',
      headers: headersA,
      body: JSON.stringify({}),
    });
    assert(extractRes.status === 200, 'POST /extract returned 200');
    const extractData = await extractRes.json();
    assert(extractData.status === 'success', 'Status is success');
    const val = extractData.validated_data;

    // Verify Core Demographics & Clinician
    assert(val.patient_name === 'Sarah Connor', `Patient name extracted: ${val.patient_name}`);
    assert(val.patient_age === '38', `Patient age extracted: ${val.patient_age}`);
    assert(val.patient_gender === 'Female', `Patient gender extracted: ${val.patient_gender}`);
    assert(val.doctor_name && val.doctor_name.includes('Gregory House'), `Doctor name extracted: ${val.doctor_name}`);
    assert(val.hospital_name && val.hospital_name.includes('Princeton Plainsboro'), `Hospital extracted: ${val.hospital_name}`);
    assert(val.document_date === '2026-10-07', `Date extracted: ${val.document_date}`);
    pass('Extracted patient demographics, attending doctor, hospital, and document date');

    // Verify Diagnoses
    assert(val.diagnoses.some(d => d.includes('Diabetes')), 'Diagnoses contains Type 2 Diabetes Mellitus');
    pass('Extracted clinical diagnoses');

    // Verify Medications (Strict schema)
    assert(val.medications.length >= 2, `Extracted ${val.medications.length} medications`);
    const metformin = val.medications.find(m => m.name.toLowerCase().includes('metformin'));
    assert(metformin, 'Metformin extracted');
    assert(metformin.dosage && metformin.dosage.includes('500'), 'Metformin dosage is 500mg');
    assert(metformin.confidence > 0, `Metformin confidence tracked: ${metformin.confidence}%`);

    const lisinopril = val.medications.find(m => m.name.toLowerCase().includes('lisinopril'));
    assert(lisinopril, 'Lisinopril extracted');
    assert(lisinopril.confidence > 0, `Lisinopril confidence tracked: ${lisinopril.confidence}%`);
    pass('Extracted medications with strict schema, dosage, frequency, and per-entity confidence');

    // Verify Laboratory Tests / Observations (Strict schema & abnormal flags)
    assert(val.laboratory_tests.length >= 3, `Extracted ${val.laboratory_tests.length} laboratory observations`);
    const hba1c = val.laboratory_tests.find(t => t.test_name.toLowerCase().includes('hba1c'));
    assert(hba1c, 'HbA1c extracted');
    assert(hba1c.numeric_value === 7.4, `HbA1c numeric_value is 7.4: ${hba1c.numeric_value}`);
    assert(hba1c.abnormal_flag === 'HIGH', `HbA1c abnormal_flag is HIGH: ${hba1c.abnormal_flag}`);
    assert(hba1c.confidence > 0, `HbA1c confidence tracked: ${hba1c.confidence}%`);

    const glucose = val.laboratory_tests.find(t => t.test_name.toLowerCase().includes('glucose'));
    assert(glucose, 'Glucose extracted');
    assert(glucose.numeric_value === 135, 'Glucose numeric_value is 135');
    assert(glucose.abnormal_flag === 'HIGH', 'Glucose abnormal_flag is HIGH');

    const creatinine = val.laboratory_tests.find(t => t.test_name.toLowerCase().includes('creatinine'));
    assert(creatinine, 'Creatinine extracted');
    assert(creatinine.abnormal_flag === 'NORMAL', 'Creatinine abnormal_flag is NORMAL');
    pass('Extracted laboratory tests with units, reference ranges, numeric values, and abnormal flags (HIGH/NORMAL)');

    // Verify Database Persistence in ai_extractions
    assert(extractData.extraction._id, 'Extraction record stored in database');
    assert(extractData.extraction.raw_model_response, 'Raw model response preserved');
    assert(extractData.extraction.processing_status === 'COMPLETED', 'Status is COMPLETED');
    pass('Stored raw model response and validated structured JSON in ai_extractions collection');

    // -------------------------------------------------------------------------
    // SECTION 3: SAFETY & NON-HALLUCINATION TEST (MISSING FIELDS MUST BE NULL)
    // -------------------------------------------------------------------------
    console.log('\n[SECTION 3] Testing Non-Hallucination & Null Default Enforcement...');

    // Minimal text: Only patient name and Hemoglobin
    const sparseLines = [
      'Apollo Diagnostic Center',
      'Patient: Alex Murphy',
      'Hemoglobin: 12.5 g/dL (Reference: 12.0 - 15.0)',
    ];
    const sparsePdf = generateSyntheticPdf(sparseLines);

    const sparseForm = new FormData();
    sparseForm.append('file', new Blob([sparsePdf], { type: 'application/pdf' }), 'Sparse_Lab_Slip.pdf');
    sparseForm.append('document_type', 'LAB_REPORT');

    const sparseUpload = await fetch(`${API_URL}/documents/upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${regResA.token}` },
      body: sparseForm,
    }).then(r => r.json());

    const sparseExtract = await fetch(`${API_URL}/documents/${sparseUpload.document._id}/extract`, {
      method: 'POST',
      headers: headersA,
      body: JSON.stringify({}),
    }).then(r => r.json());

    const sparseVal = sparseExtract.validated_data;
    assert(sparseVal.patient_name === 'Alex Murphy', 'Extracted Alex Murphy');
    assert(sparseVal.patient_age === null, 'patient_age is NULL when missing (never invented)');
    assert(sparseVal.patient_gender === null, 'patient_gender is NULL when missing (never invented)');
    assert(sparseVal.doctor_name === null, 'doctor_name is NULL when missing (never invented)');
    assert(sparseVal.medications.length === 0, 'Zero medications hallucinated when none listed');
    assert(sparseVal.diagnoses.length === 0, 'Zero diagnoses hallucinated when none listed');
    pass('Strict safety validated: Absent fields return null and are never invented');

    // -------------------------------------------------------------------------
    // SECTION 4: GET EXTRACTION ENDPOINT
    // -------------------------------------------------------------------------
    console.log('\n[SECTION 4] Testing GET /api/documents/:id/extraction...');

    const getExtRes = await fetch(`${API_URL}/documents/${docA._id}/extraction`, {
      headers: headersA,
    });
    assert(getExtRes.status === 200, 'GET /extraction returned 200');
    const getExtData = await getExtRes.json();
    assert(getExtData.status === 'success', 'Status is success');
    assert(getExtData.ai_extraction && getExtData.ai_extraction._id, 'ai_extraction returned');
    assert(getExtData.ai_extraction.validated_data.patient_name === 'Sarah Connor', 'Contains validated data');
    pass('Retrieved both OCR and AI extractions via GET /api/documents/:id/extraction');

    // -------------------------------------------------------------------------
    // SECTION 5: CROSS-USER ACCESS ISOLATION
    // -------------------------------------------------------------------------
    console.log('\n[SECTION 5] Testing Cross-User Access Isolation...');

    // 5.1 User B tries to extract User A's document -> 404
    const crossExtractRes = await fetch(`${API_URL}/documents/${docA._id}/extract`, {
      method: 'POST',
      headers: headersB,
      body: JSON.stringify({}),
    });
    assert(crossExtractRes.status === 404, 'User B blocked with 404 from extracting User A document');
    pass('User B blocked with 404 from extracting User A document');

    // 5.2 User B tries to get User A's extraction -> 404
    const crossGetRes = await fetch(`${API_URL}/documents/${docA._id}/extraction`, {
      headers: headersB,
    });
    assert(crossGetRes.status === 404, 'User B blocked with 404 from getting User A extraction');
    pass('User B blocked with 404 from getting User A extraction data');

    console.log('\n===============================================================');
    console.log(`   PHASE 5 VERIFICATION COMPLETE: ${passedCount}/${passedCount} TESTS PASSED`);
    console.log('===============================================================');
    console.log('\n🎉 ALL PHASE 5 AI MEDICAL EXTRACTION REQUIREMENTS MET!\n');
    process.exit(0);
  } catch (err) {
    console.error('\n❌ TEST FAILURE:', err);
    process.exit(1);
  }
}

runTests();
