/**
 * Automated Multi-Account Tenant Isolation & Doctor Authorization Test Suite
 * Tests Phases 1, 2, 3, 6, 7, 8, 9, 13, 18, 28, 29, 31
 */
const API_URL = 'http://localhost:5000/api';

async function runIsolationTests() {
  console.log('\n======================================================');
  console.log('   RUNNING COMPREHENSIVE ISOLATION & SECURITY TESTS   ');
  console.log('======================================================\n');

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
    // ----------------------------------------------------
    // TEST 1: Create Patient A with private records
    // ----------------------------------------------------
    const patientAEmail = `patient_a_${Date.now()}@healthify.test`;
    const patientARes = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Pragath Patient A',
        email: patientAEmail,
        password: 'Password123!',
        phone: `91${Math.floor(1000000000 + Math.random() * 9000000000)}`,
      }),
    }).then(r => r.json());

    assert(patientARes.token && patientARes.user._id, 'Patient A successfully registered');
    const tokenA = patientARes.token;
    const headersA = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tokenA}` };

    // Patient A adds a medication
    const medARes = await fetch(`${API_URL}/medications`, {
      method: 'POST',
      headers: headersA,
      body: JSON.stringify({
        name: 'Insulin Glargine',
        dosage: '10 units',
        frequency: 'Once daily at bedtime',
        form: 'injection',
      }),
    }).then(r => r.json());
    assert(medARes.status === 'success' && medARes.medication._id, 'Patient A successfully created private medication');

    // Patient A adds a health record
    const recARes = await fetch(`${API_URL}/records`, {
      method: 'POST',
      headers: headersA,
      body: JSON.stringify({
        title: 'Private Endocrine Consult - Patient A',
        recordType: 'consultation',
        doctorName: 'Dr. Private Specialist',
      }),
    }).then(r => r.json());
    assert(recARes.status === 'success' && recARes.record._id, 'Patient A successfully created private health record');

    // ----------------------------------------------------
    // TEST 2: Create Patient B - MUST START COMPLETELY CLEAN
    // ----------------------------------------------------
    const patientBEmail = `patient_b_${Date.now()}@healthify.test`;
    const patientBRes = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Suresh Patient B',
        email: patientBEmail,
        password: 'Password123!',
        phone: `91${Math.floor(1000000000 + Math.random() * 9000000000)}`,
      }),
    }).then(r => r.json());

    assert(patientBRes.token && patientBRes.user._id, 'Patient B successfully registered');
    const tokenB = patientBRes.token;
    const headersB = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tokenB}` };

    // Verify Patient B has ZERO medications
    const medsBRes = await fetch(`${API_URL}/medications`, { headers: headersB }).then(r => r.json());
    assert(medsBRes.medications.length === 0, 'Patient B starts with ZERO medications (no leak from Patient A)');

    // Verify Patient B has ZERO health records
    const recsBRes = await fetch(`${API_URL}/records`, { headers: headersB }).then(r => r.json());
    assert(recsBRes.records.length === 0, 'Patient B starts with ZERO records (no leak from Patient A)');

    // Verify Patient B has ZERO documents
    const docsBRes = await fetch(`${API_URL}/documents`, { headers: headersB }).then(r => r.json());
    assert(docsBRes.documents.length === 0, 'Patient B starts with ZERO documents (no leak from Patient A)');

    // ----------------------------------------------------
    // TEST 3: Health Copilot with Zero Records (Phase 9 & 13)
    // ----------------------------------------------------
    const copilotBRes = await fetch(`${API_URL}/copilot/ask`, {
      method: 'POST',
      headers: headersB,
      body: JSON.stringify({ query: 'What medicines am I taking?', language: 'en' }),
    }).then(r => r.json());

    assert(
      copilotBRes.response &&
      (copilotBRes.response.toLowerCase().includes("couldn't find") || copilotBRes.response.toLowerCase().includes('no') || copilotBRes.response.toLowerCase().includes('none') || copilotBRes.response.toLowerCase().includes('clean')) &&
      !copilotBRes.response.includes('Insulin Glargine'),
      'Copilot does NOT invent medications or leak Patient A medications to Patient B'
    );

    // ----------------------------------------------------
    // TEST 4: Doctor Registration & Role Separation (Phases 3, 4, 5)
    // ----------------------------------------------------
    const doctorAEmail = `doctor_a_${Date.now()}@healthify.test`;
    const docARes = await fetch(`${API_URL}/auth/doctor/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Dr. Anand Kumar, MD',
        email: doctorAEmail,
        password: 'DoctorPassword123!',
        phone: `91${Math.floor(1000000000 + Math.random() * 9000000000)}`,
        specialization: 'Cardiology',
        professionalDesignation: 'Senior Consultant',
        clinicHospital: 'Apollo Heart Center',
        registrationNumber: 'MCI-2026-98765',
      }),
    }).then(r => r.json());

    assert(docARes.token && docARes.user.role === 'doctor', 'Doctor A registered with verified doctor role');
    assert(docARes.user.verificationStatus === 'pending', 'Doctor A starts with "pending" verification status');

    const tokenDocA = docARes.token;
    const headersDocA = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tokenDocA}` };

    // Doctor A should have ZERO authorized patients initially
    const docAPatients = await fetch(`${API_URL}/doctor/patients`, { headers: headersDocA }).then(r => r.json());
    assert(docAPatients.patients.length === 0, 'Doctor A starts with ZERO patients (no unauthorized access)');

    // ----------------------------------------------------
    // TEST 5: Role-based Authorization Guard
    // ----------------------------------------------------
    // Patient A attempts to access Doctor Dashboard API
    const patientDoctorAccess = await fetch(`${API_URL}/doctor/patients`, { headers: headersA });
    assert(patientDoctorAccess.status === 403, 'Patient A is blocked with 403 from accessing doctor-only routes');

    // ----------------------------------------------------
    // TEST 6: Patient-Doctor Consent Sharing (Phases 6 & 7)
    // ----------------------------------------------------
    // Patient A explicitly grants access to Doctor A
    const shareRes = await fetch(`${API_URL}/doctor/share`, {
      method: 'POST',
      headers: headersA,
      body: JSON.stringify({
        doctorId: docARes.user._id,
        permissions: { profile: true, reports: true, medicines: true, timeline: true },
      }),
    }).then(r => r.json());
    assert(shareRes.status === 'success' && shareRes.access._id, 'Patient A successfully granted consent to Doctor A');

    // Doctor A now sees Patient A
    const docAPatientsAfter = await fetch(`${API_URL}/doctor/patients`, { headers: headersDocA }).then(r => r.json());
    assert(docAPatientsAfter.patients.length === 1 && docAPatientsAfter.patients[0].patient.name === 'Pragath Patient A', 'Doctor A can now see Patient A under active consent');

    // Doctor B is created
    const doctorBEmail = `doctor_b_${Date.now()}@healthify.test`;
    const docBRes = await fetch(`${API_URL}/auth/doctor/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Dr. Bhavna Rao, MD',
        email: doctorBEmail,
        password: 'DoctorPassword123!',
        phone: `91${Math.floor(1000000000 + Math.random() * 9000000000)}`,
        specialization: 'Neurology',
      }),
    }).then(r => r.json());
    const headersDocB = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${docBRes.token}` };

    // Doctor B MUST NOT see Patient A
    const docBPatients = await fetch(`${API_URL}/doctor/patients`, { headers: headersDocB }).then(r => r.json());
    assert(docBPatients.patients.length === 0, 'Doctor B CANNOT see Patient A (isolated doctor tenant workspaces)');

    // ----------------------------------------------------
    // TEST 7: Patient Consent Revocation
    // ----------------------------------------------------
    const revokeRes = await fetch(`${API_URL}/doctor/share/${shareRes.access._id}`, {
      method: 'DELETE',
      headers: headersA,
    }).then(r => r.json());
    assert(revokeRes.status === 'success', 'Patient A revoked access from Doctor A');

    // Doctor A can no longer see Patient A
    const docAPatientsRevoked = await fetch(`${API_URL}/doctor/patients`, { headers: headersDocA }).then(r => r.json());
    assert(docAPatientsRevoked.patients.length === 0, 'Doctor A no longer has access to Patient A after revocation');

    console.log(`\n======================================================`);
    console.log(`   ALL TESTS COMPLETED: ${passed}/${total} PASSED`);
    console.log(`======================================================\n`);
  } catch (err) {
    console.error('Test run error:', err);
  }
}

runIsolationTests();
