import assert from 'assert';
import path from 'path';
import fs from 'fs';

const API_URL = 'http://localhost:5000/api';

console.log('===============================================================');
console.log('   PHASE 4: PADDLEOCR & MEDICAL EXTRACTION VERIFICATION TESTS  ');
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
    const emailA = `patient_ocr_a_${Date.now()}@example.com`;
    const regResA = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Patient OCR A',
        email: emailA,
        password: 'Password123!',
        phone: '9876543220',
      }),
    }).then(r => r.json());
    assert(regResA.token, 'User A registered');
    const headersA = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${regResA.token}`,
    };
    pass('User A registered and authenticated');

    const emailB = `patient_ocr_b_${Date.now()}@example.com`;
    const regResB = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Patient OCR B',
        email: emailB,
        password: 'Password123!',
        phone: '9876543221',
      }),
    }).then(r => r.json());
    assert(regResB.token, 'User B registered');
    const headersB = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${regResB.token}`,
    };
    pass('User B registered and authenticated');

    // -------------------------------------------------------------------------
    // SECTION 2: SYNTHETIC ENGLISH LAB REPORT PDF
    // -------------------------------------------------------------------------
    console.log('\n[SECTION 2] Testing English Medical Document PDF Extraction...');

    const englishLines = [
      'City Health Diagnostics & Laboratory Services',
      'Patient: Jane Doe | Age: 42 | Gender: Female',
      'Test Name: Complete Blood Count & Metabolic Panel',
      'Hemoglobin: 13.8 g/dL (Reference Range: 12.0 - 16.0)',
      'Fasting Blood Glucose: 92 mg/dL (Reference Range: 70 - 100)',
      'Serum Creatinine: 0.9 mg/dL (Reference Range: 0.6 - 1.2)',
      'Total Cholesterol: 185 mg/dL (Reference Range: < 200)',
      'Platelet Count: 260,000 /mcL',
      'Notes: Normal lipid and glycemic profile.',
    ];
    const englishPdfString = generateSyntheticPdf(englishLines);

    const pdfForm = new FormData();
    const pdfBlob = new Blob([englishPdfString], { type: 'application/pdf' });
    pdfForm.append('file', pdfBlob, 'Diagnostic_Lab_Report_English.pdf');
    pdfForm.append('document_type', 'LAB_REPORT');

    const uploadPdfRes = await fetch(`${API_URL}/documents/upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${regResA.token}` },
      body: pdfForm,
    });
    assert(uploadPdfRes.status === 201, 'English PDF uploaded');
    const uploadedPdfData = await uploadPdfRes.json();
    const docEnglish = uploadedPdfData.document;
    pass('Uploaded synthetic English lab report PDF');

    // Trigger OCR
    const ocrPdfRes = await fetch(`${API_URL}/documents/${docEnglish._id}/ocr`, {
      method: 'POST',
      headers: headersA,
    });
    assert(ocrPdfRes.status === 200, 'OCR endpoint returned 200');
    const ocrPdfData = await ocrPdfRes.json();
    assert(ocrPdfData.status === 'success', 'OCR status is success');
    const extEnglish = ocrPdfData.extraction;

    assert(extEnglish.document_id === docEnglish._id, 'Extraction links to document_id');
    assert(extEnglish.page_count >= 1, 'Page count detected');
    assert(extEnglish.ocr_confidence >= 60, `OCR confidence tracked: ${extEnglish.ocr_confidence}%`);
    assert(extEnglish.ocr_status === 'COMPLETED', `OCR state is COMPLETED: ${extEnglish.ocr_status}`);
    assert(extEnglish.language_detected === 'en', `Language detected as 'en': ${extEnglish.language_detected}`);
    assert(extEnglish.cleaned_text.includes('Hemoglobin: 13.8'), 'Cleaned text contains Hemoglobin: 13.8');
    assert(extEnglish.cleaned_text.includes('Fasting Blood Glucose: 92'), 'Cleaned text contains Glucose: 92');
    assert(extEnglish.processing_time >= 0, `Processing time tracked: ${extEnglish.processing_time}ms`);
    pass('Successfully ran OCR on English PDF with accurate metrics, language detection, and text cleaning');

    // -------------------------------------------------------------------------
    // SECTION 3: SYNTHETIC TAMIL MEDICAL PRESCRIPTION
    // -------------------------------------------------------------------------
    console.log('\n[SECTION 3] Testing Tamil Medical Document Extraction...');

    const tamilText = [
      'அப்பல்லோ கிளினிக் - மருத்துவ அறிக்கை',
      'மருத்துவர்: டாக்டர் செந்தில் குமார்',
      'நோயாளி: ராமசாமி | வயது: 55',
      'மருந்துச் சீட்டு:',
      'பாராசிட்டமால் 500 மி.கி - காலை, இரவு உணவுக்குப் பின்',
      'மெட்ஃபோர்மின் 500 மி.கி - காலை உணவுக்கு முன்',
      'அட்டோர்வாஸ்டாடின் 10 மி.கி - இரவு படுக்கைக்கு முன்',
      'ரத்த அழுத்தம் மற்றும் சர்க்கரை அளவு சரிபார்க்கவும்.',
    ].join('\n');

    // Upload Tamil document (as text-based medical report image/scan)
    const tamilForm = new FormData();
    const tamilBlob = new Blob([Buffer.from(tamilText, 'utf-8')], { type: 'image/png' });
    tamilForm.append('file', tamilBlob, 'Tamil_Prescription_Rx.png');
    tamilForm.append('document_type', 'PRESCRIPTION');

    const uploadTamilRes = await fetch(`${API_URL}/documents/upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${regResA.token}` },
      body: tamilForm,
    });
    assert(uploadTamilRes.status === 201, 'Tamil document uploaded');
    const uploadedTamilData = await uploadTamilRes.json();
    const docTamil = uploadedTamilData.document;
    pass('Uploaded synthetic Tamil medical document');

    // Trigger OCR on Tamil document
    const ocrTamilRes = await fetch(`${API_URL}/documents/${docTamil._id}/ocr`, {
      method: 'POST',
      headers: headersA,
    });
    assert(ocrTamilRes.status === 200, 'Tamil OCR endpoint returned 200');
    const ocrTamilData = await ocrTamilRes.json();
    const extTamil = ocrTamilData.extraction;

    assert(extTamil.ocr_status === 'COMPLETED' || extTamil.ocr_status === 'LOW_CONFIDENCE', 'OCR processed Tamil file');
    assert(extTamil.language_detected === 'ta' || extTamil.language_detected === 'en, ta', `Tamil language detected: ${extTamil.language_detected}`);
    assert(extTamil.cleaned_text.includes('மருத்துவர்') || extTamil.cleaned_text.includes('பாராசிட்டமால்'), 'Tamil medical text extracted');
    pass('Successfully extracted Tamil medical prescription and recognized Tamil script');

    // -------------------------------------------------------------------------
    // SECTION 4: UNREADABLE / CORRUPTED FILE (ZERO FABRICATION GUARANTEE)
    // -------------------------------------------------------------------------
    console.log('\n[SECTION 4] Testing Unreadable Document Failure Handling (No Hallucination)...');

    // Random non-text binary bytes
    const badBytes = new Uint8Array([0, 1, 2, 3, 4, 5, 255, 254, 253, 0, 12, 45, 99]);
    const badForm = new FormData();
    const badBlob = new Blob([badBytes], { type: 'image/jpeg' });
    badForm.append('file', badBlob, 'Corrupted_Unreadable_Scan.jpg');
    badForm.append('document_type', 'OTHER');

    const uploadBadRes = await fetch(`${API_URL}/documents/upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${regResA.token}` },
      body: badForm,
    });
    assert(uploadBadRes.status === 201, 'Corrupted file uploaded');
    const badDocData = await uploadBadRes.json();
    const docBad = badDocData.document;

    // Trigger OCR on unreadable document
    const ocrBadRes = await fetch(`${API_URL}/documents/${docBad._id}/ocr`, {
      method: 'POST',
      headers: headersA,
    });
    assert(ocrBadRes.status === 200, 'OCR endpoint handled unreadable file gracefully');
    const ocrBadData = await ocrBadRes.json();
    const extBad = ocrBadData.extraction;

    assert(extBad.ocr_status === 'FAILED', `OCR status correctly reported FAILED: ${extBad.ocr_status}`);
    assert(extBad.ocr_confidence === 0, `Confidence is 0 for unreadable file: ${extBad.ocr_confidence}`);
    assert(extBad.cleaned_text === '', 'Never fabricates OCR text when unreadable');
    assert(extBad.error_message && extBad.error_message.length > 0, 'Clear error message reported');
    assert(ocrBadData.document.processing_status === 'FAILED', 'Parent document state updated to FAILED');
    pass('Gracefully reported FAILED on unreadable file with zero fabricated text');

    // -------------------------------------------------------------------------
    // SECTION 5: GET DOCUMENT EXTRACTION API
    // -------------------------------------------------------------------------
    console.log('\n[SECTION 5] Testing GET /api/documents/:id/extraction...');

    const getExtRes = await fetch(`${API_URL}/documents/${docEnglish._id}/extraction`, {
      headers: headersA,
    });
    assert(getExtRes.status === 200, 'GET /extraction returned 200');
    const getExtData = await getExtRes.json();
    assert(getExtData.status === 'success', 'Status is success');
    assert(getExtData.extraction._id, 'Extraction record returned with ID');
    assert(getExtData.extraction.document_id === docEnglish._id, 'Matches document_id');
    assert(getExtData.extraction.cleaned_text.includes('Hemoglobin'), 'Contains cleaned text');
    pass('Retrieved stored document extraction via GET /api/documents/:id/extraction');

    // -------------------------------------------------------------------------
    // SECTION 6: CROSS-USER ACCESS ISOLATION
    // -------------------------------------------------------------------------
    console.log('\n[SECTION 6] Testing Cross-User Access Isolation...');

    // 6.1 User B tries to trigger OCR on User A's document -> 404
    const crossOcrRes = await fetch(`${API_URL}/documents/${docEnglish._id}/ocr`, {
      method: 'POST',
      headers: headersB,
    });
    assert(crossOcrRes.status === 404, 'User B blocked from running OCR on User A document (404)');
    pass('User B blocked with 404 from triggering OCR on User A document');

    // 6.2 User B tries to get User A's extraction -> 404
    const crossExtRes = await fetch(`${API_URL}/documents/${docEnglish._id}/extraction`, {
      headers: headersB,
    });
    assert(crossExtRes.status === 404, 'User B blocked from getting User A extraction (404)');
    pass('User B blocked with 404 from retrieving User A extraction data');

    console.log('\n===============================================================');
    console.log(`   PHASE 4 VERIFICATION COMPLETE: ${passedCount}/${passedCount} TESTS PASSED`);
    console.log('===============================================================');
    console.log('\n🎉 ALL PHASE 4 OCR PIPELINE REQUIREMENTS MET!\n');
    process.exit(0);
  } catch (err) {
    console.error('\n❌ TEST FAILURE:', err);
    process.exit(1);
  }
}

runTests();
