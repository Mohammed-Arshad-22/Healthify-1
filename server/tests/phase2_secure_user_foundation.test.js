/**
 * PHASE 2 — Secure User & Data Foundation Comprehensive Security Test Suite
 * Validates:
 * 1. Authenticated access
 * 2. Unauthenticated access
 * 3. Cross-user document access prevention
 * 4. Cross-user medical data (records, medications, lab metrics) access prevention
 * 5. Cross-user Copilot access isolation (Zero Data Leakage)
 * 6. Protection against client-supplied userId spoofing
 */

const API_URL = 'http://localhost:5000/api';

async function runPhase2SecurityTests() {
  console.log('\n===============================================================');
  console.log('   PHASE 2: SECURE USER & DATA FOUNDATION SECURITY TESTS       ');
  console.log('===============================================================\n');

  let passed = 0;
  let total = 0;

  function assert(condition, testName) {
    total++;
    if (condition) {
      console.log(`✓ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`✗ FAIL: ${testName}`);
    }
  }

  try {
    // =========================================================================
    // SECTION 1: UNAUTHENTICATED ACCESS PREVENTION (HTTP 401)
    // =========================================================================
    console.log('[SECTION 1] Testing Unauthenticated Access Prevention...');

    // 1.1 Unauthenticated documents access
    const unauthDocs = await fetch(`${API_URL}/documents`);
    assert(unauthDocs.status === 401, 'Unauthenticated request to GET /documents returns 401');

    // 1.2 Unauthenticated records access
    const unauthRecords = await fetch(`${API_URL}/records`);
    assert(unauthRecords.status === 401, 'Unauthenticated request to GET /records returns 401');

    // 1.3 Unauthenticated medications access
    const unauthMeds = await fetch(`${API_URL}/medications`);
    assert(unauthMeds.status === 401, 'Unauthenticated request to GET /medications returns 401');

    // 1.4 Unauthenticated Copilot access
    const unauthCopilot = await fetch(`${API_URL}/copilot/ask`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: 'Who is my doctor?' }),
    });
    assert(unauthCopilot.status === 401, 'Unauthenticated request to POST /copilot/ask returns 401');

    // 1.5 Invalid token access
    const invalidTokenRes = await fetch(`${API_URL}/documents`, {
      headers: { 'Authorization': 'Bearer fake_invalid_jwt_token_12345' },
    });
    assert(invalidTokenRes.status === 401, 'Tampered/invalid JWT token returns 401');

    // =========================================================================
    // SECTION 2: AUTHENTICATED ACCESS FOR USER A
    // =========================================================================
    console.log('\n[SECTION 2] Registering User A & User B...');

    const timestamp = Date.now();
    const userAEmail = `user_a_${timestamp}@healthify.security.test`;
    const userBEmail = `user_b_${timestamp}@healthify.security.test`;

    const userARes = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Alice Security User',
        email: userAEmail,
        password: 'Password123!',
        phone: `91${Math.floor(1000000000 + Math.random() * 9000000000)}`,
      }),
    }).then(r => r.json());

    assert(userARes.token && userARes.user._id, 'User A registered and authenticated');
    const tokenA = userARes.token;
    const headersA = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tokenA}` };

    const userBRes = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Bob Security User',
        email: userBEmail,
        password: 'Password123!',
        phone: `91${Math.floor(1000000000 + Math.random() * 9000000000)}`,
      }),
    }).then(r => r.json());

    assert(userBRes.token && userBRes.user._id, 'User B registered and authenticated');
    const tokenB = userBRes.token;
    const headersB = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tokenB}` };

    // =========================================================================
    // SECTION 3: USER A CREATES MEDICAL RESOURCES
    // =========================================================================
    console.log('\n[SECTION 3] User A creating clinical resources...');

    // 3.1 User A creates a health record
    const recordA = await fetch(`${API_URL}/records`, {
      method: 'POST',
      headers: headersA,
      body: JSON.stringify({
        title: 'Alice Confidential Consultation',
        recordType: 'consultation',
        doctorName: 'Dr. Alice Specialist',
        hospitalClinicName: 'Alice Clinic',
        notes: 'Strictly confidential clinical record for Alice.',
      }),
    }).then(r => r.json());
    assert(recordA.status === 'success' && recordA.record._id, 'User A created health record');

    // 3.2 User A creates a medication
    const medA = await fetch(`${API_URL}/medications`, {
      method: 'POST',
      headers: headersA,
      body: JSON.stringify({
        name: 'Atorvastatin',
        dosage: '20mg',
        form: 'tablet',
        frequency: 'Once daily at bedtime',
        prescribedBy: 'Dr. Alice Specialist',
      }),
    }).then(r => r.json());
    assert(medA.status === 'success' && medA.medication._id, 'User A created medication');

    // 3.3 User A uploads a document
    const docA = await fetch(`${API_URL}/documents/upload`, {
      method: 'POST',
      headers: headersA,
      body: JSON.stringify({
        originalName: 'Alice_Confidential_Lipid_Panel.pdf',
        category: 'laboratory_report',
      }),
    }).then(r => r.json());
    assert(docA.status === 'success' && docA.document._id, 'User A uploaded medical document');

    // =========================================================================
    // SECTION 4: CROSS-USER ACCESS PREVENTION (USER B TRIES ACCESSING USER A DATA)
    // =========================================================================
    console.log('\n[SECTION 4] Testing Cross-User Access Prevention...');

    // 4.1 User B tries to view User A's document by ID
    const crossDocView = await fetch(`${API_URL}/documents/${docA.document._id}`, { headers: headersB });
    assert(crossDocView.status === 404, 'User B blocked with 404 from accessing User A document by ID');

    // 4.2 User B tries to verify User A's document
    const crossDocVerify = await fetch(`${API_URL}/documents/${docA.document._id}/verify`, {
      method: 'POST',
      headers: headersB,
      body: JSON.stringify({ verifiedData: { doctorName: 'Hacker Doctor' } }),
    });
    assert(crossDocVerify.status === 404, 'User B blocked with 404 from verifying User A document');

    // 4.3 User B tries to delete User A's document
    const crossDocDelete = await fetch(`${API_URL}/documents/${docA.document._id}`, {
      method: 'DELETE',
      headers: headersB,
    });
    assert(crossDocDelete.status === 404, 'User B blocked with 404 from deleting User A document');

    // 4.4 User B lists documents -> User A's document is NOT in User B's list
    const userBDocs = await fetch(`${API_URL}/documents`, { headers: headersB }).then(r => r.json());
    const hasAliceDoc = userBDocs.documents.some(d => d._id === docA.document._id);
    assert(!hasAliceDoc && userBDocs.documents.length === 0, 'User B document list contains 0 documents (no leak)');

    // 4.5 User B tries to view User A's health record by ID
    const crossRecView = await fetch(`${API_URL}/records/${recordA.record._id}`, { headers: headersB });
    assert(crossRecView.status === 404, 'User B blocked with 404 from accessing User A health record by ID');

    // 4.6 User B tries to delete User A's health record
    const crossRecDelete = await fetch(`${API_URL}/records/${recordA.record._id}`, {
      method: 'DELETE',
      headers: headersB,
    });
    assert(crossRecDelete.status === 404, 'User B blocked with 404 from deleting User A health record');

    // 4.7 User B tries to view User A's medication by ID
    const crossMedView = await fetch(`${API_URL}/medications/${medA.medication._id}`, { headers: headersB });
    assert(crossMedView.status === 404, 'User B blocked with 404 from accessing User A medication by ID');

    // 4.8 User B tries to delete User A's medication
    const crossMedDelete = await fetch(`${API_URL}/medications/${medA.medication._id}`, {
      method: 'DELETE',
      headers: headersB,
    });
    assert(crossMedDelete.status === 404, 'User B blocked with 404 from deleting User A medication');

    // 4.9 User B tries to log adherence on User A's medication
    const crossMedAdherence = await fetch(`${API_URL}/medications/${medA.medication._id}/adherence`, {
      method: 'POST',
      headers: headersB,
      body: JSON.stringify({ date: '2026-10-01', time: '08:00', status: 'taken' }),
    });
    assert(crossMedAdherence.status === 404, 'User B blocked with 404 from modifying User A medication adherence');

    // =========================================================================
    // SECTION 5: FRONTEND USER_ID SPOOFING PREVENTION
    // =========================================================================
    console.log('\n[SECTION 5] Testing Frontend userId Spoofing Prevention...');

    // User B attempts to create a record while providing User A's userId in body
    const spoofRecord = await fetch(`${API_URL}/records`, {
      method: 'POST',
      headers: headersB,
      body: JSON.stringify({
        title: 'Spoofed Record Attempt',
        recordType: 'consultation',
        userId: userARes.user._id, // Malicious attempt to inject into User A's account
      }),
    }).then(r => r.json());

    assert(
      spoofRecord.record && spoofRecord.record.userId === userBRes.user._id,
      'Backend overrides client-supplied userId and scopes record to authenticated User B'
    );

    // Verify User A does NOT see this spoofed record
    const aliceRecordsAfterSpoof = await fetch(`${API_URL}/records`, { headers: headersA }).then(r => r.json());
    const spoofLeakedToAlice = aliceRecordsAfterSpoof.records.some(r => r.title === 'Spoofed Record Attempt');
    assert(!spoofLeakedToAlice, 'User A records do NOT contain spoofed record');

    // =========================================================================
    // SECTION 6: CROSS-USER HEALTH COPILOT ISOLATION
    // =========================================================================
    console.log('\n[SECTION 6] Testing Cross-User Health Copilot Isolation...');

    // User A queries Copilot for their medication
    const copilotAlice = await fetch(`${API_URL}/copilot/ask`, {
      method: 'POST',
      headers: headersA,
      body: JSON.stringify({ query: 'What medicines did my doctor prescribe?', language: 'en' }),
    }).then(r => r.json());

    assert(
      copilotAlice.status === 'success' && copilotAlice.response.includes('Atorvastatin'),
      'User A Copilot successfully retrieves User A medication (Atorvastatin)'
    );

    // User B queries Copilot for medications -> MUST NOT LEAK User A's Atorvastatin!
    const copilotBob = await fetch(`${API_URL}/copilot/ask`, {
      method: 'POST',
      headers: headersB,
      body: JSON.stringify({ query: 'What medicines did my doctor prescribe?', language: 'en' }),
    }).then(r => r.json());

    assert(
      copilotBob.status === 'success' &&
      !copilotBob.response.includes('Atorvastatin') &&
      copilotBob.response.includes("couldn't find medication information"),
      'User B Copilot returns zero-record message and NEVER leaks User A Atorvastatin'
    );

    // User B queries Copilot for doctor -> MUST NOT LEAK User A's Dr. Alice Specialist
    const copilotBobDoc = await fetch(`${API_URL}/copilot/ask`, {
      method: 'POST',
      headers: headersB,
      body: JSON.stringify({ query: 'Who is my doctor?', language: 'en' }),
    }).then(r => r.json());

    assert(
      copilotBobDoc.status === 'success' &&
      !copilotBobDoc.response.includes('Dr. Alice Specialist') &&
      copilotBobDoc.response.includes("couldn't find doctor information"),
      'User B Copilot returns zero-doctor message and NEVER leaks User A doctor'
    );

    console.log('\n===============================================================');
    console.log(`   PHASE 2 SECURITY TESTS SUMMARY: ${passed}/${total} PASSED`);
    console.log('===============================================================\n');

    if (passed === total) {
      console.log('🎉 ALL PHASE 2 SECURITY REQUIREMENTS SATISFIED SUCCESSFULLY!\n');
    }
  } catch (err) {
    console.error('Phase 2 test execution error:', err);
  }
}

runPhase2SecurityTests();
