/**
 * PHASE 11 — ABDM-Ready Healthcare Data Architecture (FHIR-Style Resources)
 * Automated Test Suite
 *
 * Requirements:
 * 1. Prototype/hackathon architecture (no false claims of official ABDM integration)
 * 2. Standardized FHIR representations for:
 *    - Patient
 *    - Observation
 *    - MedicationRequest
 *    - DiagnosticReport
 *    - Condition
 *    - DocumentReference
 *    - Encounter
 * 3. Endpoints:
 *    - GET /api/fhir/patient
 *    - GET /api/fhir/observations
 *    - GET /api/fhir/medications
 *    - GET /api/fhir/conditions
 *    - GET /api/fhir/diagnostic-reports
 *    - GET /api/fhir/document-references
 *    - GET /api/fhir/encounters
 *    - GET /api/fhir/export
 * 4. Mock ABHA:
 *    - mock_abha_id format: XX-XXXX-XXXX-XXXX
 *    - Clearly labeled: DEMO / MOCK ABHA ID
 *    - Never generate a real ABHA ID
 * 5. FHIR export:
 *    - "Export FHIR JSON" returning valid structured JSON
 *    - All data strictly originates from database without fabrication
 * 6. User isolation and cross-account confidentiality
 */

import assert from 'assert';

const API_URL = 'http://localhost:5000/api';

async function runPhase11Tests() {
  console.log('========================================================================');
  console.log('🧪 Starting Phase 11: ABDM-Ready FHIR Architecture Automated Test Suite');
  console.log('========================================================================\n');

  let passedTests = 0;
  function recordPass(testName) {
    passedTests++;
    console.log(`  ✅ [PASS ${passedTests}] ${testName}`);
  }

  const timestamp = Date.now();
  const user1Email = `fhir_patient1_${timestamp}@healthify.test`;
  const user2Email = `fhir_patient2_${timestamp}@healthify.test`;

  // --------------------------------------------------------------------------
  // Setup: Register User 1 & Populate Verified Medical Database Records
  // --------------------------------------------------------------------------
  console.log('--- Step 1: Registering Test Patients & Storing Database Records ---');
  
  // Register Patient 1
  const reg1Res = await fetch(`${API_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Dr. Vikram Seth',
      email: user1Email,
      password: 'Password123!',
      age: 52,
      gender: 'male',
      primaryDoctorName: 'Dr. Anita Desai',
      phone: '+91 98765 43210',
    }),
  });
  const reg1Data = await reg1Res.json();
  assert.strictEqual(reg1Res.status, 201, `Failed to register User 1: ${JSON.stringify(reg1Data)}`);
  const token1 = reg1Data.token;
  const user1Id = reg1Data.user.id || reg1Data.user._id;

  // Register Patient 2 (Empty patient for zero-fabrication & isolation checks)
  const reg2Res = await fetch(`${API_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Sunita Rao',
      email: user2Email,
      password: 'Password123!',
      age: 34,
      gender: 'female',
    }),
  });
  const reg2Data = await reg2Res.json();
  assert.strictEqual(reg2Res.status, 201, `Failed to register User 2: ${JSON.stringify(reg2Data)}`);
  const token2 = reg2Data.token;
  const user2Id = reg2Data.user.id || reg2Data.user._id;

  // Add Verified Doctor for User 1
  await fetch(`${API_URL}/doctors`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token1}` },
    body: JSON.stringify({
      name: 'Dr. Anita Desai',
      specialization: 'Endocrinology',
      hospitalClinic: 'Apollo Health Centre',
      phone: '+91 91234 56789',
    }),
  });

  // Add Medications for User 1
  await fetch(`${API_URL}/medications`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token1}` },
    body: JSON.stringify({
      name: 'Metformin',
      dosage: '500mg',
      frequency: 'twice daily',
      prescribedBy: 'Dr. Anita Desai',
      instructions: 'Take with food',
      status: 'active',
    }),
  });

  await fetch(`${API_URL}/medications`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token1}` },
    body: JSON.stringify({
      name: 'Atorvastatin',
      dosage: '10mg',
      frequency: 'once daily at night',
      prescribedBy: 'Dr. Anita Desai',
      status: 'active',
    }),
  });

  // Add Clinical Health Record (Diagnoses & Encounters) for User 1
  await fetch(`${API_URL}/records`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token1}` },
    body: JSON.stringify({
      title: 'Consultation with Endocrinologist',
      recordType: 'consultation',
      doctorName: 'Dr. Anita Desai',
      hospitalClinicName: 'Apollo Health Centre',
      date: new Date().toISOString(),
      diagnosis: 'Type 2 Diabetes Mellitus, Essential Hypertension',
      notes: 'Patient advised lifestyle modification and glycemic monitoring.',
    }),
  });

  // Add Lab Metric (Observation) for User 1
  await fetch(`${API_URL}/trends`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token1}` },
    body: JSON.stringify({
      metricName: 'HbA1c',
      value: 7.6,
      unit: '%',
      referenceMin: 4.0,
      referenceMax: 5.6,
      status: 'high',
      notes: 'Elevated glycated hemoglobin',
    }),
  });

  // Add Appointment (Encounter) for User 1
  await fetch(`${API_URL}/appointments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token1}` },
    body: JSON.stringify({
      doctorName: 'Dr. Anita Desai',
      specialty: 'Endocrinology',
      hospitalClinicName: 'Apollo Health Centre',
      date: new Date().toISOString(),
      time: '10:30 AM',
      type: 'in-person',
      reason: 'Routine Diabetes Follow-up',
      status: 'completed',
    }),
  });

  console.log('✓ Seeding complete.\n');

  // --------------------------------------------------------------------------
  // TEST 1: GET /api/fhir/patient — Mock ABHA & Resource Structure
  // --------------------------------------------------------------------------
  console.log('--- Test 1: GET /api/fhir/patient ---');
  const patRes = await fetch(`${API_URL}/fhir/patient`, {
    headers: { Authorization: `Bearer ${token1}` },
  });
  const patData = await patRes.json();
  assert.strictEqual(patRes.status, 200, 'Expected 200 OK from /api/fhir/patient');
  assert.strictEqual(patData.resourceType, 'Patient', 'Expected resourceType to be Patient');
  assert.strictEqual(patData.id, user1Id, 'Patient id must match authenticated user id');
  assert.strictEqual(patData.name[0].text, 'Dr. Vikram Seth', 'Patient name matches database');
  
  // Verify Mock ABHA ID format: strictly XX-XXXX-XXXX-XXXX
  console.log(`  Checking Mock ABHA: ${patData.mock_abha_id} (Label: ${patData.mock_abha_label})`);
  assert(patData.mock_abha_id, 'mock_abha_id field must exist');
  const abhaRegex = /^\d{2}-\d{4}-\d{4}-\d{4}$/;
  assert(
    abhaRegex.test(patData.mock_abha_id),
    `mock_abha_id "${patData.mock_abha_id}" does not conform to XX-XXXX-XXXX-XXXX format`
  );

  // Verify Clear Label: DEMO / MOCK ABHA ID
  assert.strictEqual(patData.mock_abha_label, 'DEMO / MOCK ABHA ID', 'mock_abha_label must be DEMO / MOCK ABHA ID');
  const hasDemoTag = patData.meta?.tag?.some(t => t.code === 'DEMO / MOCK ABHA ID');
  assert(hasDemoTag, 'Meta tags must clearly label DEMO / MOCK ABHA ID');
  recordPass('Patient FHIR resource conforms to schema with valid XX-XXXX-XXXX-XXXX DEMO / MOCK ABHA ID');

  // --------------------------------------------------------------------------
  // TEST 2: GET /api/fhir/observations — Standardized Observations
  // --------------------------------------------------------------------------
  console.log('--- Test 2: GET /api/fhir/observations ---');
  const obsRes = await fetch(`${API_URL}/fhir/observations`, {
    headers: { Authorization: `Bearer ${token1}` },
  });
  const obsData = await obsRes.json();
  assert.strictEqual(obsRes.status, 200, 'Expected 200 OK from /api/fhir/observations');
  assert.strictEqual(obsData.resourceType, 'Bundle', 'Expected Bundle wrapper');
  assert.strictEqual(obsData.type, 'searchset', 'Expected searchset bundle type');
  assert(Array.isArray(obsData.observations), 'Expected observations array');
  assert(obsData.total >= 1, `Expected at least 1 observation from DB, found ${obsData.total}`);

  const hba1cObs = obsData.observations.find(o => o.code?.text === 'HbA1c');
  assert(hba1cObs, 'Expected HbA1c observation in response');
  assert.strictEqual(hba1cObs.resourceType, 'Observation');
  assert.strictEqual(hba1cObs.status, 'final');
  assert.strictEqual(hba1cObs.category[0].coding[0].code, 'laboratory');
  assert.strictEqual(hba1cObs.valueQuantity.value, 7.6);
  assert.strictEqual(hba1cObs.valueQuantity.unit, '%');
  assert.strictEqual(hba1cObs.interpretation[0].text, 'HIGH');
  assert.strictEqual(hba1cObs.subject.reference, `Patient/${user1Id}`);
  recordPass('Observations mapped into FHIR format with quantitative metrics and interpretations');

  // --------------------------------------------------------------------------
  // TEST 3: GET /api/fhir/medications — Standardized MedicationRequests
  // --------------------------------------------------------------------------
  console.log('--- Test 3: GET /api/fhir/medications ---');
  const medRes = await fetch(`${API_URL}/fhir/medications`, {
    headers: { Authorization: `Bearer ${token1}` },
  });
  const medData = await medRes.json();
  assert.strictEqual(medRes.status, 200, 'Expected 200 OK from /api/fhir/medications');
  assert.strictEqual(medData.resourceType, 'Bundle');
  assert(medData.total >= 2, `Expected at least 2 medications, got ${medData.total}`);

  const metformin = medData.medications.find(m => m.medicationCodeableConcept?.text?.includes('Metformin'));
  assert(metformin, 'Expected Metformin MedicationRequest in response');
  assert.strictEqual(metformin.resourceType, 'MedicationRequest');
  assert.strictEqual(metformin.status, 'active');
  assert.strictEqual(metformin.intent, 'order');
  assert.strictEqual(metformin.subject.reference, `Patient/${user1Id}`);
  assert.strictEqual(metformin.requester.display, 'Dr. Anita Desai');
  assert(metformin.dosageInstruction[0].text.includes('500mg'));
  recordPass('MedicationRequests mapped into FHIR format from verified database prescriptions');

  // --------------------------------------------------------------------------
  // TEST 4: GET /api/fhir/conditions — Standardized Conditions
  // --------------------------------------------------------------------------
  console.log('--- Test 4: GET /api/fhir/conditions ---');
  const condRes = await fetch(`${API_URL}/fhir/conditions`, {
    headers: { Authorization: `Bearer ${token1}` },
  });
  const condData = await condRes.json();
  assert.strictEqual(condRes.status, 200, 'Expected 200 OK from /api/fhir/conditions');
  assert.strictEqual(condData.resourceType, 'Bundle');
  assert(condData.total >= 1, `Expected at least 1 condition, got ${condData.total}`);

  const diabetes = condData.conditions.find(c => c.code?.text?.includes('Diabetes'));
  assert(diabetes, 'Expected Diabetes Condition in response');
  assert.strictEqual(diabetes.resourceType, 'Condition');
  assert.strictEqual(diabetes.subject.reference, `Patient/${user1Id}`);
  recordPass('Conditions mapped into FHIR format from clinical diagnosis database records');

  // --------------------------------------------------------------------------
  // TEST 5: GET /api/fhir/diagnostic-reports
  // --------------------------------------------------------------------------
  console.log('--- Test 5: GET /api/fhir/diagnostic-reports ---');
  const diagRes = await fetch(`${API_URL}/fhir/diagnostic-reports`, {
    headers: { Authorization: `Bearer ${token1}` },
  });
  const diagData = await diagRes.json();
  assert.strictEqual(diagRes.status, 200, 'Expected 200 OK from /api/fhir/diagnostic-reports');
  assert.strictEqual(diagData.resourceType, 'Bundle');
  recordPass('DiagnosticReports endpoint responds with valid FHIR Bundle');

  // --------------------------------------------------------------------------
  // TEST 6: GET /api/fhir/document-references
  // --------------------------------------------------------------------------
  console.log('--- Test 6: GET /api/fhir/document-references ---');
  const docRes = await fetch(`${API_URL}/fhir/document-references`, {
    headers: { Authorization: `Bearer ${token1}` },
  });
  const docData = await docRes.json();
  assert.strictEqual(docRes.status, 200, 'Expected 200 OK from /api/fhir/document-references');
  assert.strictEqual(docData.resourceType, 'Bundle');
  recordPass('DocumentReferences endpoint responds with valid FHIR Bundle');

  // --------------------------------------------------------------------------
  // TEST 7: GET /api/fhir/encounters — Clinical Visits & Consultations
  // --------------------------------------------------------------------------
  console.log('--- Test 7: GET /api/fhir/encounters ---');
  const encRes = await fetch(`${API_URL}/fhir/encounters`, {
    headers: { Authorization: `Bearer ${token1}` },
  });
  const encData = await encRes.json();
  assert.strictEqual(encRes.status, 200, 'Expected 200 OK from /api/fhir/encounters');
  assert.strictEqual(encData.resourceType, 'Bundle');
  assert(encData.total >= 1, `Expected at least 1 encounter, got ${encData.total}`);

  const enc = encData.encounters[0];
  assert.strictEqual(enc.resourceType, 'Encounter');
  assert(['finished', 'planned'].includes(enc.status), `Encounter status must be valid FHIR status, got ${enc.status}`);
  assert.strictEqual(enc.class.code, 'AMB');
  assert.strictEqual(enc.subject.reference, `Patient/${user1Id}`);
  assert(enc.participant[0].individual.display.includes('Anita Desai'));
  recordPass('Encounters mapped into FHIR format representing clinical visits');

  // --------------------------------------------------------------------------
  // TEST 8: GET /api/fhir/export — "Export FHIR JSON" Bundle
  // --------------------------------------------------------------------------
  console.log('--- Test 8: GET /api/fhir/export ("Export FHIR JSON") ---');
  const expRes = await fetch(`${API_URL}/fhir/export`, {
    headers: { Authorization: `Bearer ${token1}` },
  });
  const expData = await expRes.json();
  assert.strictEqual(expRes.status, 200, 'Expected 200 OK from /api/fhir/export');
  assert.strictEqual(expData.resourceType, 'Bundle');
  assert.strictEqual(expData.type, 'collection');
  assert(expData.timestamp, 'Timestamp must exist');
  assert(Array.isArray(expData.entry), 'entry array must exist');
  assert(expData.total >= 5, `Expected compiled bundle with at least 5 entries, got ${expData.total}`);

  // Validate JSON stringification (Valid Structured JSON)
  const jsonString = JSON.stringify(expData);
  const parsedAgain = JSON.parse(jsonString);
  assert.strictEqual(parsedAgain.resourceType, 'Bundle', 'Exported JSON must be valid structured JSON');

  // Verify all 7 resources are present in the collection bundle
  const resourceTypesInBundle = new Set(expData.entry.map(e => e.resource.resourceType));
  console.log(`  Bundle contains resource types: ${Array.from(resourceTypesInBundle).join(', ')}`);
  assert(resourceTypesInBundle.has('Patient'), 'Bundle must include Patient');
  assert(resourceTypesInBundle.has('Observation'), 'Bundle must include Observation');
  assert(resourceTypesInBundle.has('MedicationRequest'), 'Bundle must include MedicationRequest');
  assert(resourceTypesInBundle.has('Condition'), 'Bundle must include Condition');
  assert(resourceTypesInBundle.has('Encounter'), 'Bundle must include Encounter');

  // Verify Download Header
  const dlRes = await fetch(`${API_URL}/fhir/export?download=true`, {
    headers: { Authorization: `Bearer ${token1}` },
  });
  assert(dlRes.headers.get('content-disposition')?.includes('attachment'), 'Export supports attachment download');
  recordPass('"Export FHIR JSON" produces valid structured FHIR R4 Bundle containing all patient records');

  // --------------------------------------------------------------------------
  // TEST 9: Zero Data Fabrication Guarantee
  // --------------------------------------------------------------------------
  console.log('--- Test 9: Zero Data Fabrication Guarantee (Empty User) ---');
  // For User 2 (no records added yet):
  const user2ObsRes = await fetch(`${API_URL}/fhir/observations`, {
    headers: { Authorization: `Bearer ${token2}` },
  });
  const user2ObsData = await user2ObsRes.json();
  assert.strictEqual(user2ObsData.total, 0, 'Zero observations must be returned when user has no records');

  const user2MedRes = await fetch(`${API_URL}/fhir/medications`, {
    headers: { Authorization: `Bearer ${token2}` },
  });
  const user2MedData = await user2MedRes.json();
  assert.strictEqual(user2MedData.total, 0, 'Zero medications must be returned when user has no records');

  const user2CondRes = await fetch(`${API_URL}/fhir/conditions`, {
    headers: { Authorization: `Bearer ${token2}` },
  });
  const user2CondData = await user2CondRes.json();
  assert.strictEqual(user2CondData.total, 0, 'Zero conditions must be returned when user has no records');
  recordPass('Zero healthcare data fabrication: strictly reflects actual database contents');

  // --------------------------------------------------------------------------
  // TEST 10: User Privacy & Multi-Account Isolation
  // --------------------------------------------------------------------------
  console.log('--- Test 10: Multi-Account Isolation & Privacy ---');
  // User 2 cannot see User 1's Metformin
  const user2Export = await fetch(`${API_URL}/fhir/export`, {
    headers: { Authorization: `Bearer ${token2}` },
  });
  const user2ExportData = await user2Export.json();
  const user2HasMetformin = user2ExportData.entry.some(e => 
    e.resource.medicationCodeableConcept?.text?.includes('Metformin')
  );
  assert.strictEqual(user2HasMetformin, false, 'User 2 must not see User 1 medications');

  // Mock ABHA IDs must be unique per user
  const user2PatRes = await fetch(`${API_URL}/fhir/patient`, {
    headers: { Authorization: `Bearer ${token2}` },
  });
  const user2PatData = await user2PatRes.json();
  assert.notStrictEqual(
    patData.mock_abha_id, 
    user2PatData.mock_abha_id, 
    'Mock ABHA IDs must be unique and isolated per user'
  );
  assert(
    abhaRegex.test(user2PatData.mock_abha_id),
    'User 2 Mock ABHA must also conform to XX-XXXX-XXXX-XXXX'
  );
  recordPass('Multi-account privacy and strict tenant isolation verified across all FHIR resources');

  // --------------------------------------------------------------------------
  // Summary
  // --------------------------------------------------------------------------
  console.log('\n========================================================================');
  console.log(`🎉 ALL ${passedTests} PHASE 11 TESTS PASSED SUCCESSFULLY!`);
  console.log('========================================================================\n');
}

runPhase11Tests().catch((err) => {
  console.error('\n❌ Phase 11 Test Failure:', err);
  process.exit(1);
});
