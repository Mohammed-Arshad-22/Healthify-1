import assert from 'assert';
import path from 'path';
import fs from 'fs';

const API_URL = 'http://localhost:5000/api';

console.log('===============================================================');
console.log('   PHASE 3: MEDICAL DOCUMENT UPLOAD VERIFICATION TESTS         ');
console.log('===============================================================');

async function runTests() {
  let passedCount = 0;
  const pass = (msg) => {
    passedCount++;
    console.log(`✓ PASS: ${msg}`);
  };

  try {
    // -------------------------------------------------------------------------
    // STEP 1: REGISTER TWO TEST USERS (USER A & USER B)
    // -------------------------------------------------------------------------
    console.log('\n[SECTION 1] Registering Test Users...');
    const emailA = `patient_upload_a_${Date.now()}@example.com`;
    const regResA = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Patient Upload A',
        email: emailA,
        password: 'Password123!',
        phone: '9876543210',
      }),
    }).then(r => r.json());

    const tokenA = regResA.token;
    assert(tokenA, 'User A registered successfully');
    const headersA = { Authorization: `Bearer ${tokenA}` };
    pass('User A registered and authenticated');

    const emailB = `patient_upload_b_${Date.now()}@example.com`;
    const regResB = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Patient Upload B',
        email: emailB,
        password: 'Password123!',
        phone: '9876543211',
      }),
    }).then(r => r.json());

    const tokenB = regResB.token;
    assert(tokenB, 'User B registered successfully');
    const headersB = { Authorization: `Bearer ${tokenB}` };
    pass('User B registered and authenticated');

    // -------------------------------------------------------------------------
    // SECTION 2: FILE VALIDATION (MIME, EXTENSION, FILE SIZE)
    // -------------------------------------------------------------------------
    console.log('\n[SECTION 2] Testing File Validation Rules...');

    // 2.1 Reject unsupported file extension (.exe)
    const badExtForm = new FormData();
    const badExtBlob = new Blob(['malicious payload'], { type: 'application/octet-stream' });
    badExtForm.append('file', badExtBlob, 'malware.exe');
    badExtForm.append('document_type', 'LAB_REPORT');

    const badExtRes = await fetch(`${API_URL}/documents/upload`, {
      method: 'POST',
      headers: headersA,
      body: badExtForm,
    });
    assert(badExtRes.status === 400, 'Uploading .exe rejected with 400');
    pass('Rejected unsupported file extension (.exe) with HTTP 400');

    // 2.2 Reject unsupported MIME type (.txt / text/plain)
    const badMimeForm = new FormData();
    const badMimeBlob = new Blob(['some notes'], { type: 'text/plain' });
    badMimeForm.append('file', badMimeBlob, 'notes.txt');
    badMimeForm.append('document_type', 'OTHER');

    const badMimeRes = await fetch(`${API_URL}/documents/upload`, {
      method: 'POST',
      headers: headersA,
      body: badMimeForm,
    });
    assert(badMimeRes.status === 400, 'Uploading text/plain rejected with 400');
    pass('Rejected unsupported MIME type (text/plain) with HTTP 400');

    // 2.3 Reject empty upload without file
    const emptyForm = new FormData();
    const emptyRes = await fetch(`${API_URL}/documents/upload`, {
      method: 'POST',
      headers: headersA,
      body: emptyForm,
    });
    assert(emptyRes.status === 400, 'Empty upload rejected with 400');
    pass('Rejected upload missing file or document metadata with HTTP 400');

    // -------------------------------------------------------------------------
    // SECTION 3: VALID UPLOAD OF SUPPORTED FORMATS (PDF, PNG, JPG)
    // -------------------------------------------------------------------------
    console.log('\n[SECTION 3] Testing Valid File Uploads & Metadata Generation...');

    // 3.1 Upload PDF Document (Prescription)
    const pdfContent = '%PDF-1.4\n%Fake PDF content for prescription testing\n%%EOF';
    const pdfForm = new FormData();
    const pdfBlob = new Blob([pdfContent], { type: 'application/pdf' });
    pdfForm.append('file', pdfBlob, 'Dr_Smith_Prescription_Oct2026.pdf');
    pdfForm.append('document_type', 'PRESCRIPTION');

    const uploadPdfRes = await fetch(`${API_URL}/documents/upload`, {
      method: 'POST',
      headers: headersA,
      body: pdfForm,
    });
    assert(uploadPdfRes.status === 201, 'PDF upload returned 201');
    const pdfData = await uploadPdfRes.json();
    const docPdf = pdfData.document;

    assert(docPdf.id || docPdf._id, 'Document has unique ID');
    assert(docPdf.uuid, 'Document has unique UUID');
    assert(docPdf.document_type === 'PRESCRIPTION', 'Document type is PRESCRIPTION');
    assert(docPdf.processing_status === 'UPLOADED', 'Processing status is UPLOADED (no OCR in Phase 3)');
    assert(docPdf.mime_type === 'application/pdf', 'MIME type is application/pdf');
    assert(docPdf.original_filename === 'Dr_Smith_Prescription_Oct2026.pdf', 'Original filename preserved');
    assert(docPdf.filename !== 'Dr_Smith_Prescription_Oct2026.pdf', 'Server generated secure unique filename');
    assert(!docPdf.storage_path.includes(':') && !docPdf.storage_path.startsWith('/Users'), 'Raw filesystem path is NOT exposed');
    assert(docPdf.user_id || docPdf.userId, 'User scoping populated');
    pass('Successfully uploaded PDF prescription with secure UUID filename and UPLOADED state');

    // 3.2 Upload PNG Document (Lab Report)
    const pngContent = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13]); // PNG header
    const pngForm = new FormData();
    const pngBlob = new Blob([pngContent], { type: 'image/png' });
    pngForm.append('file', pngBlob, 'CBC_Lab_Report_Scan.png');
    pngForm.append('document_type', 'LAB_REPORT');

    const uploadPngRes = await fetch(`${API_URL}/documents/upload`, {
      method: 'POST',
      headers: headersA,
      body: pngForm,
    });
    assert(uploadPngRes.status === 201, 'PNG upload returned 201');
    const pngData = await uploadPngRes.json();
    const docPng = pngData.document;
    assert(docPng.mime_type === 'image/png', 'MIME type is image/png');
    assert(docPng.document_type === 'LAB_REPORT', 'Document type is LAB_REPORT');
    pass('Successfully uploaded PNG lab report with verified image/png MIME');

    // 3.3 Upload JPG Document (Diagnostic Report)
    const jpgContent = new Uint8Array([255, 216, 255, 224, 0, 16, 74, 70, 73, 70]); // JPEG header
    const jpgForm = new FormData();
    const jpgBlob = new Blob([jpgContent], { type: 'image/jpeg' });
    jpgForm.append('file', jpgBlob, 'Chest_XRay_Report.jpg');
    jpgForm.append('document_type', 'DIAGNOSTIC_REPORT');

    const uploadJpgRes = await fetch(`${API_URL}/documents/upload`, {
      method: 'POST',
      headers: headersA,
      body: jpgForm,
    });
    assert(uploadJpgRes.status === 201, 'JPG upload returned 201');
    const jpgData = await uploadJpgRes.json();
    const docJpg = jpgData.document;
    assert(docJpg.mime_type === 'image/jpeg', 'MIME type is image/jpeg');
    assert(docJpg.document_type === 'DIAGNOSTIC_REPORT', 'Document type is DIAGNOSTIC_REPORT');
    pass('Successfully uploaded JPG diagnostic report with verified image/jpeg MIME');

    // -------------------------------------------------------------------------
    // SECTION 4: DOCUMENT LISTING & FILTERING
    // -------------------------------------------------------------------------
    console.log('\n[SECTION 4] Testing Document Listing & Filters...');

    // 4.1 User A lists all documents
    const listA = await fetch(`${API_URL}/documents`, { headers: headersA }).then(r => r.json());
    assert(listA.status === 'success', 'List status is success');
    assert(listA.count >= 3, 'User A has at least 3 uploaded documents');
    pass(`User A listed all documents (found ${listA.count} documents)`);

    // 4.2 Filter by document_type = PRESCRIPTION
    const listPresc = await fetch(`${API_URL}/documents?document_type=PRESCRIPTION`, { headers: headersA }).then(r => r.json());
    assert(listPresc.documents.every(d => d.document_type === 'PRESCRIPTION' || d.category === 'prescription'), 'Only prescriptions returned');
    assert(listPresc.documents.length >= 1, 'Found filtered prescription');
    pass('Successfully filtered documents by document_type=PRESCRIPTION');

    // 4.3 Filter by processing_status = UPLOADED
    const listUploaded = await fetch(`${API_URL}/documents?processing_status=UPLOADED`, { headers: headersA }).then(r => r.json());
    assert(listUploaded.documents.every(d => d.processing_status === 'UPLOADED'), 'All returned docs are UPLOADED');
    pass('Successfully filtered documents by processing_status=UPLOADED');

    // -------------------------------------------------------------------------
    // SECTION 5: RETRIEVAL BY ID & UUID
    // -------------------------------------------------------------------------
    console.log('\n[SECTION 5] Testing Document Retrieval by ID & UUID...');

    // 5.1 Retrieve by MongoDB _id
    const getByIdRes = await fetch(`${API_URL}/documents/${docPdf._id}`, { headers: headersA }).then(r => r.json());
    assert(getByIdRes.document && getByIdRes.document._id === docPdf._id, 'Retrieved by MongoDB _id');
    pass('Retrieved document by MongoDB _id');

    // 5.2 Retrieve by UUID
    const getByUuidRes = await fetch(`${API_URL}/documents/${docPdf.uuid}`, { headers: headersA }).then(r => r.json());
    assert(getByUuidRes.document && getByUuidRes.document.uuid === docPdf.uuid, 'Retrieved by UUID');
    pass('Retrieved document by UUID');

    // -------------------------------------------------------------------------
    // SECTION 6: FILE PREVIEW & DOWNLOAD STREAMING
    // -------------------------------------------------------------------------
    console.log('\n[SECTION 6] Testing File Preview & Download Streaming...');

    // 6.1 View Document (Inline Stream)
    const viewRes = await fetch(`${API_URL}/documents/${docPdf._id}/view`, { headers: headersA });
    assert(viewRes.status === 200, 'View endpoint returned 200');
    assert(viewRes.headers.get('content-type') === 'application/pdf', 'Content-Type is application/pdf');
    assert(viewRes.headers.get('x-content-type-options') === 'nosniff', 'nosniff header present');
    assert(viewRes.headers.get('content-disposition')?.includes('inline'), 'Content-Disposition is inline');
    const viewedText = await viewRes.text();
    assert(viewedText.includes('%PDF-1.4'), 'Streamed original PDF file bytes successfully');
    pass('View endpoint streams file inline with nosniff and correct MIME');

    // 6.2 Download Document (Attachment Stream)
    const dlRes = await fetch(`${API_URL}/documents/${docPdf._id}/download`, { headers: headersA });
    assert(dlRes.status === 200, 'Download endpoint returned 200');
    assert(dlRes.headers.get('content-disposition')?.includes('attachment'), 'Content-Disposition is attachment');
    assert(dlRes.headers.get('content-disposition')?.includes('Dr_Smith_Prescription_Oct2026.pdf'), 'Original filename included in disposition');
    pass('Download endpoint streams file with attachment Content-Disposition header');

    // 6.3 Query param preview via /:id?view=true
    const queryViewRes = await fetch(`${API_URL}/documents/${docPdf._id}?view=true`, { headers: headersA });
    assert(queryViewRes.status === 200, 'Query param ?view=true returned 200');
    assert(queryViewRes.headers.get('content-type') === 'application/pdf', 'Query view has correct content type');
    pass('GET /documents/:id?view=true successfully streams preview');

    // -------------------------------------------------------------------------
    // SECTION 7: CROSS-USER ACCESS PREVENTION
    // -------------------------------------------------------------------------
    console.log('\n[SECTION 7] Testing Cross-User Access Isolation...');

    // 7.1 User B tries to view User A's document metadata -> 404
    const crossGet = await fetch(`${API_URL}/documents/${docPdf._id}`, { headers: headersB });
    assert(crossGet.status === 404, 'User B blocked from viewing User A document metadata (404)');
    pass('User B blocked with 404 from getting User A document metadata');

    // 7.2 User B tries to view User A's file stream -> 404
    const crossView = await fetch(`${API_URL}/documents/${docPdf._id}/view`, { headers: headersB });
    assert(crossView.status === 404, 'User B blocked from streaming User A file (404)');
    pass('User B blocked with 404 from streaming User A file preview');

    // 7.3 User B tries to download User A's file -> 404
    const crossDl = await fetch(`${API_URL}/documents/${docPdf._id}/download`, { headers: headersB });
    assert(crossDl.status === 404, 'User B blocked from downloading User A file (404)');
    pass('User B blocked with 404 from downloading User A document');

    // 7.4 User B document list does NOT contain User A's documents
    const listB = await fetch(`${API_URL}/documents`, { headers: headersB }).then(r => r.json());
    assert(listB.count === 0, 'User B document list is empty');
    pass('User B document list contains 0 items (strict isolation, zero leak)');

    // -------------------------------------------------------------------------
    // SECTION 8: DOCUMENT DELETION & STORAGE CLEANUP
    // -------------------------------------------------------------------------
    console.log('\n[SECTION 8] Testing Document Deletion & Storage Cleanup...');

    // 8.1 User B tries to delete User A's document -> 404
    const crossDel = await fetch(`${API_URL}/documents/${docPdf._id}`, {
      method: 'DELETE',
      headers: headersB,
    });
    assert(crossDel.status === 404, 'User B blocked from deleting User A document (404)');
    pass('User B blocked with 404 from deleting User A document');

    // 8.2 Verify file exists on disk prior to User A deletion
    const uploadsDir = path.resolve(process.cwd(), 'uploads');
    const pdfDiskPath = path.resolve(uploadsDir, docPdf.filename);
    assert(fs.existsSync(pdfDiskPath), 'PDF file exists on disk before deletion');

    // 8.3 User A deletes their own document
    const delRes = await fetch(`${API_URL}/documents/${docPdf._id}`, {
      method: 'DELETE',
      headers: headersA,
    });
    assert(delRes.status === 200, 'User A deleted document (200)');
    pass('User A successfully deleted document');

    // 8.4 Verify document is no longer retrievable
    const postDelGet = await fetch(`${API_URL}/documents/${docPdf._id}`, { headers: headersA });
    assert(postDelGet.status === 404, 'Deleted document returns 404');
    pass('Deleted document returns 404 on subsequent retrieval');

    // 8.5 Verify file was cleanly unlinked from disk
    assert(!fs.existsSync(pdfDiskPath), 'Physical file removed from disk after deletion');
    pass('Physical file safely unlinked from server storage directory');

    console.log('\n===============================================================');
    console.log(`   PHASE 3 VERIFICATION COMPLETE: ${passedCount}/${passedCount} TESTS PASSED`);
    console.log('===============================================================');
    console.log('\n🎉 ALL PHASE 3 MEDICAL DOCUMENT UPLOAD REQUIREMENTS MET!\n');
    process.exit(0);
  } catch (err) {
    console.error('\n❌ TEST FAILURE:', err);
    process.exit(1);
  }
}

runTests();
