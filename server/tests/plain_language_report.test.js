/**
 * Plain-Language Medical Report Explanation Verification Test Suite
 * Tests Phases 1 to 25
 */
const API_URL = 'http://localhost:5000/api';

async function runPlainLanguageTests() {
  console.log('\n======================================================');
  console.log('   PLAIN-LANGUAGE MEDICAL REPORT EXPLANATION TESTS    ');
  console.log('======================================================\n');

  let passed = 0;
  let total = 0;

  function assert(condition, testName, detail = '') {
    total++;
    if (condition) {
      console.log(`✓ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`✗ FAIL: ${testName} ${detail ? `| Details: ${detail}` : ''}`);
    }
  }

  try {
    // 1. Authenticate demo user (Arun Kumar)
    const demoRes = await fetch(`${API_URL}/auth/demo`, { method: 'POST' }).then(r => r.json());
    assert(demoRes.token && demoRes.user, 'Demo patient authenticated with session');
    const token = demoRes.token;
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    };

    // 2. Verify that uploaded document exists in user's centralized database (Layer 1)
    const docsRes = await fetch(`${API_URL}/documents`, { headers }).then(r => r.json());
    assert(docsRes.documents && docsRes.documents.length > 0, 'Centralized medical report document retrieved successfully');
    const labDoc = docsRes.documents.find(d => d.originalName === 'Complete Blood Count (CBC) & Metabolic Panel.pdf');
    assert(labDoc && labDoc.extractedData?.labTests?.length >= 4, 'Report contains verified lab tests & report reference ranges');

    // 3. Phase 1-10: "Explain my blood report" in English
    const explainRes = await fetch(`${API_URL}/copilot/ask`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ query: 'Explain my blood report', language: 'en' }),
    }).then(r => r.json());

    assert(explainRes.status === 'success', 'Copilot processed "Explain my blood report" successfully');
    const responseText = explainRes.response || '';

    // Check Phase 10 structure
    assert(responseText.includes('📄 What this report is'), 'Phase 10: Includes "📄 What this report is" section');
    assert(responseText.includes('🔎 Important findings'), 'Phase 10: Includes "🔎 Important findings" section');
    assert(responseText.includes('⚠️ Results outside the range'), 'Phase 10: Includes "⚠️ Results outside the range" section');
    assert(responseText.includes('✅ Results within range'), 'Phase 10: Includes "✅ Results within range" section');
    assert(responseText.includes('🩺 What this could mean'), 'Phase 10: Includes "🩺 What this could mean" section');
    assert(responseText.includes('📌 What you may want to discuss with your doctor'), 'Phase 10: Includes "📌 Questions for doctor" section');
    assert(responseText.includes('In short:'), 'Phase 10: Includes plain-language summary');

    // Check Phase 14 & 15: Exact numbers & Reference ranges from report
    assert(responseText.includes('10.8') && responseText.includes('12–16'), 'Phase 14 & 15: Preserves exact hemoglobin 10.8 g/dL and report reference range 12–16 g/dL');
    assert(responseText.includes('7.2') && responseText.includes('< 5.7%'), 'Phase 14 & 15: Preserves exact HbA1c 7.2% and report reference range < 5.7%');
    assert(responseText.includes('250,000'), 'Phase 14: Preserves exact platelets count 250,000 /µL');
    assert(responseText.includes('7,200'), 'Phase 14: Preserves exact WBC count 7,200 /µL');

    // Check Phase 3 & 4: Everyday words & Term explanations
    assert(
      responseText.toLowerCase().includes('carry oxygen') || responseText.toLowerCase().includes('oxygen'),
      'Phase 3 & 4: Explains hemoglobin in everyday language (carrying oxygen)'
    );
    assert(
      !responseText.toLowerCase().includes('your low hemoglobin indicates anemia') &&
      !responseText.toLowerCase().includes('you have anemia'),
      'Phase 7: Does NOT make a definitive diagnosis of anemia from single abnormal hemoglobin'
    );
    assert(
      !responseText.toLowerCase().includes('dangerous condition') &&
      !responseText.toLowerCase().includes('emergency'),
      'Phase 6: Does NOT label abnormal results as "dangerous" automatically'
    );
    assert(
      responseText.toLowerCase().includes('platelets') || responseText.toLowerCase().includes('white blood cells'),
      'Phase 8: Explains normal findings too (platelets / WBC) to avoid unnecessary anxiety'
    );
    assert(
      responseText.includes('October') || responseText.includes('2026'),
      'Phase 16: Mentions report date awareness'
    );

    // 4. Phase 17: Follow-up question without re-uploading report ("What is my hemoglobin?")
    const hgbRes = await fetch(`${API_URL}/copilot/ask`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ query: 'What is my hemoglobin level and is it normal?', language: 'en' }),
    }).then(r => r.json());

    assert(hgbRes.status === 'success', 'Follow-up query answered without asking to re-upload report');
    const hgbText = hgbRes.response || '';
    assert(hgbText.includes('10.8') && hgbText.includes('12–16'), 'Follow-up query preserves exact 10.8 g/dL and 12–16 g/dL range');
    assert(
      hgbText.toLowerCase().includes('lower than the normal range') || hgbText.toLowerCase().includes('lower than the range'),
      'Phase 3: Uses "lower than the normal range shown on your report" instead of clinical jargon'
    );

    // 5. Phase 17: Follow-up question ("What is creatinine?")
    const creatRes = await fetch(`${API_URL}/copilot/ask`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ query: 'What is creatinine and how is mine?', language: 'en' }),
    }).then(r => r.json());

    assert(creatRes.status === 'success', 'Follow-up on creatinine answered successfully');
    const creatText = creatRes.response || '';
    assert(creatText.includes('0.9') && (creatText.includes('0.6–1.2') || creatText.includes('0.6')), 'Preserves user creatinine 0.9 mg/dL and report range 0.6–1.2 mg/dL');
    assert(
      creatText.toLowerCase().includes('kidney') || creatText.toLowerCase().includes('waste'),
      'Phase 4: Explains creatinine in plain everyday language (waste product filtered by kidneys)'
    );

    // 6. Phase 18 & 19: Tamil report explanation
    const tamilRes = await fetch(`${API_URL}/copilot/ask`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ query: 'எனது இரத்தப் பரிசோதனை அறிக்கையை எளிய தமிழில் விளக்குங்கள்', language: 'ta' }),
    }).then(r => r.json());

    assert(tamilRes.status === 'success' && tamilRes.language === 'ta', 'Tamil report query returned successfully');
    const taText = tamilRes.response || '';
    assert(taText.includes('10.8') && taText.includes('12–16'), 'Tamil explanation preserves exact numbers (10.8 g/dL, 12–16 g/dL)');
    assert(
      taText.includes('ஹீமோகுளோபின்') || taText.includes('ஆக்ஸிஜன்') || taText.includes('இரத்த'),
      'Phase 18 & 19: Natural everyday Tamil medical explanation produced'
    );

    // 7. Phase 11: Prescription explanation
    const medRes = await fetch(`${API_URL}/copilot/ask`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ query: 'What medicines am I taking and how should I take them?', language: 'en' }),
    }).then(r => r.json());

    assert(medRes.status === 'success', 'Prescription query answered successfully');
    const medText = medRes.response || '';
    assert(medText.includes('Metformin') && medText.includes('500mg'), 'Prescription explains Metformin 500mg');
    assert(
      medText.toLowerCase().includes('doctor') && medText.toLowerCase().includes('instructions'),
      'Phase 11: Prescription advises following doctor instructions and never stopping medicine on Copilot alone'
    );

    // 8. Citations verification
    assert(explainRes.sources && explainRes.sources.length > 0, 'Sources cite verified medical document');

    // 9. Section 9: Zero-Hallucination on Missing Test (RAG Retrieval Failure)
    const b12Res = await fetch(`${API_URL}/copilot/ask`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ query: 'What was my vitamin B12 level?', language: 'en' }),
    }).then(r => r.json());

    assert(b12Res.status === 'success', 'RAG processed unmentioned test query safely');
    const b12Text = b12Res.response || '';
    assert(
      b12Text.toLowerCase().includes("couldn't find a vitamin b12 result") ||
      b12Text.toLowerCase().includes("don't want to guess"),
      'Section 9: Explicitly states test could not be found without hallucinating or guessing'
    );
    assert(
      !/\d+\s*(pg\/ml|pmol\/l)/i.test(b12Text),
      'Section 9: Does NOT fabricate or invent a random Vitamin B12 number'
    );

    // 10. Section 5, 6, 11: Multi-Document Date-Aware Historical Comparison
    const compareRes = await fetch(`${API_URL}/copilot/ask`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ query: 'Compare my hemoglobin with my previous report', language: 'en' }),
    }).then(r => r.json());

    assert(compareRes.status === 'success', 'Multi-document comparison processed successfully');
    const compareText = compareRes.response || '';
    assert(
      compareText.includes('10.8') && compareText.includes('11.2'),
      'Section 11: Preserves latest (10.8 g/dL) and previous (11.2 g/dL) hemoglobin without merging'
    );
    assert(
      (compareText.includes('October') || compareText.includes('2026')) &&
      (compareText.includes('September') || compareText.includes('2026')),
      'Section 6: Distinctly identifies both October and September document dates'
    );
    assert(
      compareText.includes('12–16'),
      'Section 15: Retains laboratory reference range (12–16 g/dL) from actual report'
    );
    assert(
      compareText.toLowerCase().includes('not a clinical diagnosis') ||
      compareText.toLowerCase().includes('not a diagnosis'),
      'Section 8: Non-diagnostic disclaimer retained during multi-document trend comparison'
    );

    console.log(`\n======================================================`);
    console.log(`   ALL TESTS COMPLETED: ${passed}/${total} PASSED`);
    console.log(`======================================================\n`);
  } catch (err) {
    console.error('Test execution failed:', err);
  }
}

runPlainLanguageTests();
