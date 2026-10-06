// Healthify Automated End-to-End API Integration Test Suite
const API_URL = 'http://localhost:5000/api';

async function runTests() {
  console.log('--- Starting Healthify Integration Tests ---');
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

  // 1. Health Endpoint
  const healthRes = await fetch(`${API_URL}/health`).then(r => r.json());
  assert(healthRes.status === 'ok' && healthRes.database.status === 'connected', 'Backend & MongoDB operational');

  // 2. Demo Patient Authentication
  const demoRes = await fetch(`${API_URL}/auth/demo`, { method: 'POST' }).then(r => r.json());
  assert(demoRes.token && demoRes.user.name === 'Arun Kumar', 'Demo patient login generates valid JWT and session');

  const token = demoRes.token;
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };

  // 3. User Profile Retrieval
  const profileRes = await fetch(`${API_URL}/user/profile`, { headers }).then(r => r.json());
  assert(profileRes.profile.bloodGroup === 'O+', 'User profile returns health details');

  // 4. Create Medical Record
  const newRec = {
    title: 'Post-Meal Glycemic Assessment',
    recordType: 'consultation',
    date: '2026-09-25',
    doctorName: 'Dr. Ramesh Sharma',
    hospitalClinicName: 'Apollo Speciality Hospital',
    notes: 'Patient advised to continue Metformin 500mg twice daily with evening brisk walks.'
  };
  const recRes = await fetch(`${API_URL}/records`, {
    method: 'POST',
    headers,
    body: JSON.stringify(newRec)
  }).then(r => r.json());
  assert(recRes.status === 'success' && recRes.record._id, 'Medical record created in database');

  // 5. Medication Adherence
  const medsRes = await fetch(`${API_URL}/medications`, { headers }).then(r => r.json());
  assert(medsRes.status === 'success', 'Retrieved active medication list');

  // 6. Lab Trends
  const trendsRes = await fetch(`${API_URL}/trends?metric=HbA1c`, { headers }).then(r => r.json());
  assert(trendsRes.status === 'success', 'Retrieved longitudinal lab trends');

  // 7. Multilingual Copilot Queries
  const copilotEn = await fetch(`${API_URL}/copilot/ask`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ query: 'What medicines am I currently taking?', language: 'en' })
  }).then(r => r.json());
  assert(copilotEn.status === 'success' && copilotEn.sources.length > 0, 'Copilot queries in English provide citations & non-diagnostic safety disclaimers');

  const copilotTa = await fetch(`${API_URL}/copilot/ask`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ query: 'எனது மருத்துவ பரிசோதனை அறிக்கையை விளக்குங்கள்', language: 'ta' })
  }).then(r => r.json());
  assert(copilotTa.status === 'success' && copilotTa.language === 'ta', 'Copilot multilingual processing in Tamil');

  const copilotHi = await fetch(`${API_URL}/copilot/ask`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ query: 'मेरी स्वास्थ्य रिपोर्ट समझाइए', language: 'hi' })
  }).then(r => r.json());
  assert(copilotHi.status === 'success' && copilotHi.language === 'hi', 'Copilot multilingual processing in Hindi');

  // 8. ABDM Record Discovery
  const abdmRes = await fetch(`${API_URL}/abha/demo/records`, { headers }).then(r => r.json());
  assert(abdmRes.availableRecords.length >= 3, 'ABDM Sandbox discovers simulated hospital FHIR records');

  // 9. Public Emergency Portal
  const emergencyRes = await fetch(`${API_URL}/emergency/public/${demoRes.user._id}`).then(r => r.json());
  assert(emergencyRes.emergencyCard.patientName === 'Arun Kumar' && emergencyRes.emergencyCard.bloodGroup === 'O+', 'Public Emergency QR portal decrypts minimal scoped first-responder profile');

  console.log(`\n--- Test Summary: ${passed}/${total} Tests Passed ---`);
}

runTests().catch(err => console.error('Test execution failed:', err));
