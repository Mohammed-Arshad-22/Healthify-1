import fs from 'fs';
import path from 'path';
import { GoogleGenAI } from '@google/genai';
import { config } from '../config/config.js';
import { ragService, QUERY_INTENTS } from './rag.service.js';

/**
 * Plain-Language Medical Dictionary
 * Used to translate complex medical terms and lab tests into everyday language
 * across English, Tamil, Hindi, and Telugu.
 */
export const MEDICAL_TERMS_DICTIONARY = {
  hemoglobin: {
    aliases: ['hemoglobin', 'hb', 'hgb', 'ஹீமோகுளோபின்', 'हीमोग्लोबिन', 'హిమోగ్లోబిన్'],
    whatIsIt: {
      en: 'Hemoglobin is a protein in your red blood cells that helps carry oxygen from your lungs to the rest of your body.',
      ta: 'ஹீமோகுளோபின் என்பது உங்கள் இரத்த சிவப்பணுக்களில் உள்ள ஒரு புரதமாகும், இது உடலின் அனைத்து பகுதிகளுக்கும் ஆக்ஸிஜனை கொண்டு செல்ல உதவுகிறது.',
      hi: 'हीमोग्लोबिन आपके लाल रक्त कोशिकाओं में पाया जाने वाला एक प्रोटीन है, जो आपके फेफड़ों से पूरे शरीर में ऑक्सीजन पहुंचाने का काम करता है।',
      te: 'హిమోగ్లోబిన్ అనేది మీ రక్త కణాలలో ఉండే ఒక ప్రోటీన్, ఇది శరీరంలోని అన్ని భాగాలకు ఆక్సిజన్‌ను మోసుకెళ్లడానికి సహాయపడుతుంది.',
    },
    whyMattersLow: {
      en: 'Your hemoglobin level is lower than the normal range shown on your report. Hemoglobin helps your blood carry oxygen around your body. A low level can sometimes be associated with tiredness or weakness. Your doctor can look at this result together with your other test results to understand the reason.',
      ta: 'உங்கள் ஹீமோகுளோபின் அளவு அறிக்கையில் காட்டப்பட்டுள்ள இயல்பான வரம்பை விடக் குறைவாக உள்ளது. இது சில நேரங்களில் சோர்வு அல்லது பலவீனத்தை ஏற்படுத்தலாம், ஆனால் இந்த ஒரு முடிவை வைத்து மட்டுமே காரணத்தை அறிய முடியாது. உங்கள் மருத்துவர் மற்ற பரிசோதனைகளுடன் ஒப்பிட்டு மதிப்பீடு செய்வார்.',
      hi: 'आपका हीमोग्लोबिन स्तर आपकी रिपोर्ट में दिखाई गई सामान्य सीमा से कम है। कम स्तर कभी-कभी थकान या कमजोरी से जुड़ा हो सकता है, लेकिन इसका कारण केवल इस परिणाम से तय नहीं किया जा सकता। आपके डॉक्टर अन्य परीक्षणों के साथ इसका मूल्यांकन करेंगे।',
      te: 'మీ హిమోగ్లోబిన్ స్థాయి నివేదికలోని సాధారణ పరిధి కంటే తక్కువగా ఉంది. తక్కువ స్థాయి అలసట లేదా బలహీనతతో ముడిపడి ఉండవచ్చు, కానీ కారణాన్ని మీ వైద్యుడు ఇతర పరీక్షలతో కలిపి నిర్ధారిస్తారు.',
    },
    whyMattersHigh: {
      en: 'Your hemoglobin level is higher than the normal range shown on your report. Your doctor will evaluate factors like hydration and red blood cell count to understand the context.',
      ta: 'உங்கள் ஹீமோகுளோபின் அளவு அறிக்கையில் காட்டப்பட்டுள்ள வரம்பை விட அதிகமாக உள்ளது. மருத்துவர் உடலின் நீரேற்றம் மற்றும் பிற காரணிகளை ஆய்வு செய்வார்.',
      hi: 'आपका हीमोग्लोबिन स्तर रिपोर्ट में दी गई सामान्य सीमा से अधिक है। डॉक्टर हाइड्रेशन और अन्य कारकों के संदर्भ में इसे देखेंगे।',
      te: 'మీ హిమోగ్లోబిన్ స్థాయి సాధారణ పరిధి కంటే ఎక్కువగా ఉంది.',
    },
    whyMattersNormal: {
      en: 'Your hemoglobin is within the reference range shown on your report, indicating a typical level of oxygen-carrying protein in your blood.',
      ta: 'உங்கள் ஹீமோகுளோபின் அளவு அறிக்கையின் இயல்பான வரம்பிற்குள் உள்ளது.',
      hi: 'आपका हीमोग्लोबिन स्तर रिपोर्ट में दिखाई गई सामान्य सीमा के भीतर है।',
      te: 'మీ హిమోగ్లోబిన్ సాధారణ పరిధిలో ఉంది.',
    },
  },

  hba1c: {
    aliases: ['hba1c', 'glycated hemoglobin', 'a1c', 'hb a1c', 'எச்பிஏ1சி', 'एचबीए1सी'],
    whatIsIt: {
      en: 'HbA1c is a blood test that gives an idea of your average blood sugar level over the past 2 to 3 months.',
      ta: 'HbA1c என்பது கடந்த 2 முதல் 3 மாதங்களில் உங்கள் சராசரி இரத்த சர்க்கரை அளவைக் காட்டும் பரிசோதனையாகும்.',
      hi: 'HbA1c एक ब्लड टेस्ट है जो पिछले 2 से 3 महीनों में आपके औसत ब्लड शुगर का स्तर दिखाता है।',
      te: 'HbA1c అనేది గత 2-3 నెలల్లో మీ సగటు రక్తంలో చక్కెర స్థాయిని చూపే పరీక్ష.',
    },
    whyMattersHigh: {
      en: 'Your HbA1c is higher than the reference/target range shown on your report. In simple terms, your average blood sugar has been higher than desired over recent months. It is something worth discussing with your doctor regarding diet, physical activity, or medications.',
      ta: 'உங்கள் HbA1c அறிக்கையில் உள்ள இலக்கு அளவை விட அதிகமாக உள்ளது. கடந்த சில மாதங்களில் உங்கள் சராசரி இரத்த சர்க்கரை சற்று அதிகமாக இருந்துள்ளது. உணவு மற்றும் வாழ்க்கை முறை குறித்து மருத்துவரிடம் பேசுவது நல்லது.',
      hi: 'आपका HbA1c रिपोर्ट में दी गई लक्षित सीमा से अधिक है। पिछले कुछ महीनों में आपका औसत ब्लड शुगर स्तर अधिक रहा है। आहार या जीवनशैली के संदर्भ में डॉक्टर से सलाह लें।',
      te: 'మీ HbA1c నివేదిక పరిధి కంటే ఎక్కువగా ఉంది.',
    },
    whyMattersNormal: {
      en: 'Your HbA1c is within the reference/target range shown on your report, indicating that your average blood sugar over the last few months has remained in a healthy range.',
      ta: 'உங்கள் HbA1c அறிக்கையின் இயல்பான வரம்பிற்குள் ஆரோக்கியமாக உள்ளது.',
      hi: 'आपका HbA1c रिपोर्ट की सामान्य सीमा के भीतर है।',
      te: 'మీ HbA1c సాధారణ పరిధిలో ఉంది.',
    },
  },

  creatinine: {
    aliases: ['creatinine', 'serum creatinine', 'கிரியேட்டினின்', 'क्रिएटिनिन', 'క్రియాటినిన్'],
    whatIsIt: {
      en: 'Creatinine is a waste product that your kidneys normally filter and remove from your blood. This test is commonly used to get an idea of how well your kidneys are working.',
      ta: 'கிரியேட்டினின் என்பது சிறுநீரகங்கள் இரத்தத்திலிருந்து வடிகட்டி வெளியேற்றும் ஒரு கழிவுப் பொருளாகும். இது உங்கள் சிறுநீரகங்கள் எவ்வாறு செயல்படுகின்றன என்பதை அறிய உதவுகிறது.',
      hi: 'क्रिएटिनिन एक अपशिष्ट (वेस्ट) उत्पाद है जिसे स्वस्थ गुर्दे (किडनी) रक्त से साफ करते हैं। यह बताता है कि आपकी किडनी कितनी अच्छी तरह काम कर रही है।',
      te: 'క్రియాటినిన్ అనేది మూత్రపిండాలు రక్తం నుండి తొలగించే ఒక వ్యర్థ పదార్థం. మూత్రపిండాల పనితీరును పరిశీలించడానికి ఇది ఉపయోగపడుతుంది.',
    },
    whyMattersHigh: {
      en: 'Your creatinine level is higher than the range shown on your report. This result is usually interpreted together with other kidney tests, your hydration, and your overall health by your doctor.',
      ta: 'உங்கள் கிரியேட்டினின் அளவு அறிக்கையில் காட்டப்பட்டுள்ள வரம்பை விட அதிகமாக உள்ளது. உங்கள் மருத்துவர் இதனை மற்ற சிறுநீரக பரிசோதனைகளுடன் சேர்த்து மதிப்பீடு செய்வார்.',
      hi: 'आपका क्रिएटिनिन स्तर रिपोर्ट में दिखाई गई सामान्य सीमा से अधिक है। डॉक्टर अन्य परीक्षणों और हाइड्रेशन के साथ इसका मूल्यांकन करेंगे।',
      te: 'మీ క్రియాటినిన్ స్థాయి సాధారణ పరిధి కంటే ఎక్కువగా ఉంది.',
    },
    whyMattersNormal: {
      en: 'Your creatinine is within the reference range shown on your report, indicating typical kidney waste filtering on this test.',
      ta: 'உங்கள் கிரியேட்டினின் அளவு அறிக்கையின் இயல்பான வரம்பிற்குள் உள்ளது.',
      hi: 'आपका क्रिएटिनिन रिपोर्ट की सामान्य सीमा के भीतर है।',
      te: 'మీ క్రియాటినిన్ సాధారణ పరిధిలో ఉంది.',
    },
  },

  platelets: {
    aliases: ['platelet', 'platelets', 'plt', 'platelet count', 'பிளேட்லெட்', 'प्लेटलेट्स', 'ప్లేట్‌లెట్స్'],
    whatIsIt: {
      en: 'Platelets are tiny parts of your blood that help stop bleeding and form clots when you have an injury.',
      ta: 'பிளேட்லெட்டுகள் என்பவை காயம் ஏற்படும் போது இரத்தம் உறைந்து ரத்தப்போக்கை நிறுத்த உதவும் சிறிய இரத்த அணுக்கள் ஆகும்.',
      hi: 'प्लेटलेट्स रक्त की छोटी कोशिकाएं हैं जो चोट लगने पर खून का थक्का बनाकर रक्तस्राव रोकने में मदद करती हैं।',
      te: 'ప్లేట్‌లెట్స్ అనేవి గాయం అయినప్పుడు రక్తం గడ్డకట్టడానికి సహాయపడే చిన్న రక్త కణాలు.',
    },
    whyMattersLow: {
      en: 'Your platelet count is lower than the range shown on your report. Your doctor will review this to ensure your blood clots effectively and to look into possible reasons.',
      ta: 'உங்கள் பிளேட்லெட் எண்ணிக்கை அறிக்கையின் வரம்பை விடக் குறைவாக உள்ளது. உங்கள் மருத்துவர் இதனை மதிப்பாய்வு செய்வார்.',
      hi: 'आपकी प्लेटलेट संख्या रिपोर्ट में दी गई सीमा से कम है। डॉक्टर इसकी समीक्षा करेंगे।',
      te: 'మీ ప్లేట్‌లెట్ సంఖ్య నివేదిక పరిధి కంటే తక్కువగా ఉంది.',
    },
    whyMattersHigh: {
      en: 'Your platelet count is higher than the reference range shown on your report. This can sometimes occur with temporary inflammation or recovery.',
      ta: 'உங்கள் பிளேட்லெட் எண்ணிக்கை அறிக்கையின் வரம்பை விட அதிகமாக உள்ளது.',
      hi: 'आपकी प्लेटलेट संख्या रिपोर्ट की सामान्य सीमा से अधिक है।',
      te: 'మీ ప్లేట్‌లెట్ సంఖ్య సాధారణ పరిధి కంటే ఎక్కువగా ఉంది.',
    },
    whyMattersNormal: {
      en: 'Your platelet count is within the reference range shown on your report. In simple terms, the number of platelets in your blood is within the range the laboratory considers typical.',
      ta: 'உங்கள் பிளேட்லெட் எண்ணிக்கை அறிக்கையின் இயல்பான வரம்பிற்குள் உள்ளது.',
      hi: 'आपकी प्लेटलेट संख्या रिपोर्ट में दी गई सामान्य सीमा के भीतर है।',
      te: 'మీ ప్లేట్‌లెట్ సంఖ్య సాధారణ పరిధిలో ఉంది.',
    },
  },

  wbc: {
    aliases: ['wbc', 'white blood cells', 'white blood cell count', 'total leukocyte count', 'tlc', 'வெள்ளை அணுக்கள்', 'श्वेत रक्त कोशिकाएं'],
    whatIsIt: {
      en: 'White blood cells are part of your immune defense system that help your body fight infections and respond to inflammation.',
      ta: 'வெள்ளை இரத்த அணுக்கள் உங்கள் உடலின் நோய் எதிர்ப்பு மண்டலத்தின் ஒரு பகுதியாகும், அவை நோய்த்தொற்றுகளை எதிர்த்துப் போராட உதவுகின்றன.',
      hi: 'सफेद रक्त कोशिकाएं (WBC) आपकी प्रतिरक्षा प्रणाली का हिस्सा हैं जो शरीर को संक्रमण से लड़ने में मदद करती हैं।',
      te: 'తెల్ల రక్త కణాలు శరీర రోగనిరోధక వ్యవస్థలో భాగం మరియు ఇన్ఫెక్షన్లతో పోరాడటానికి సహాయపడతాయి.',
    },
    whyMattersHigh: {
      en: 'Your white blood cell count is higher than the range shown on your report. This commonly happens when your immune system is responding to an infection, inflammation, or physical stress.',
      ta: 'உங்கள் வெள்ளை அணுக்கள் எண்ணிக்கை அறிக்கையின் வரம்பை விட அதிகமாக உள்ளது. உடல் ஏதேனும் தொற்று அல்லது அழற்சியை எதிர்த்துப் போராடும் போது இது பொதுவாக நிகழும்.',
      hi: 'आपकी WBC संख्या रिपोर्ट की सामान्य सीमा से अधिक है, जो अक्सर संक्रमण या सूजन की प्रतिक्रिया में होती है।',
      te: 'మీ WBC సంఖ్య సాధారణ పరిధి కంటే ఎక్కువగా ఉంది.',
    },
    whyMattersLow: {
      en: 'Your white blood cell count is lower than the range shown on your report. Your doctor will review if any medications or immune factors are involved.',
      ta: 'உங்கள் வெள்ளை அணுக்கள் எண்ணிக்கை அறிக்கையின் வரம்பை விடக் குறைவாக உள்ளது.',
      hi: 'आपकी WBC संख्या रिपोर्ट की सामान्य सीमा से कम है।',
      te: 'మీ WBC సంఖ్య సాధారణ పరిధి కంటే తక్కువగా ఉంది.',
    },
    whyMattersNormal: {
      en: 'Your white blood cell count is within the reference range shown on your report, indicating a typical level of infection-fighting cells.',
      ta: 'உங்கள் வெள்ளை அணுக்கள் எண்ணிக்கை அறிக்கையின் இயல்பான வரம்பிற்குள் உள்ளது.',
      hi: 'आपकी WBC संख्या सामान्य सीमा के भीतर है।',
      te: 'మీ WBC సంఖ్య సాధారణ పరిధిలో ఉంది.',
    },
  },
};

export function lookupMedicalTerm(term = '') {
  if (!term) return null;
  const t = term.toLowerCase().trim();
  for (const [key, entry] of Object.entries(MEDICAL_TERMS_DICTIONARY)) {
    if (entry.aliases.some(a => t.includes(a.toLowerCase()) || a.toLowerCase().includes(t))) {
      return { key, ...entry };
    }
  }
  return null;
}

export function formatDocumentsDetails(documents = []) {
  if (!documents || documents.length === 0) return 'None on file.';
  return documents.slice(0, 5).map((d, idx) => {
    const lines = [
      `Document #${idx + 1}: ${d.title || d.fileName || 'Medical Document'} (${d.category || 'General'})`,
      `  • Date: ${d.documentDate ? new Date(d.documentDate).toLocaleDateString() : 'Not dated'}`,
    ];
    if (d.doctorName) lines.push(`  • Doctor: ${d.doctorName}`);
    if (d.hospitalName) lines.push(`  • Hospital/Clinic: ${d.hospitalName}`);

    const ext = d.extractedData || {};
    if (ext.labTests && ext.labTests.length > 0) {
      lines.push(`  • Lab Tests from Document:`);
      ext.labTests.forEach(t => {
        const range = t.referenceRange
          ? `Reference range on report: ${t.referenceRange}`
          : 'Reference range: Not specified on report';
        const flag = t.status && t.status !== 'unknown' ? ` | Flag: ${t.status}` : '';
        lines.push(`    * ${t.testName}: ${t.value} ${t.unit || ''} (${range}${flag})`);
      });
    }

    if (ext.medicines && ext.medicines.length > 0) {
      lines.push(`  • Prescribed Medicines from Document:`);
      ext.medicines.forEach(m => {
        lines.push(`    * ${m.name}: ${m.dosage || 'Standard dose'}, ${m.frequency || 'As advised'}${m.duration ? `, Duration: ${m.duration}` : ''}`);
      });
    }

    if (ext.summary) {
      lines.push(`  • Report Summary: ${ext.summary}`);
    }

    if (d.ocrRawText && d.ocrRawText.trim()) {
      const excerpt = d.ocrRawText.replace(/\s+/g, ' ').trim().slice(0, 400);
      lines.push(`  • OCR Text Excerpt: "${excerpt}"`);
    }

    return lines.join('\n');
  }).join('\n\n');
}

export function formatLabMetricsDetails(labMetrics = []) {
  if (!labMetrics || labMetrics.length === 0) return 'None on file.';
  return labMetrics.slice(0, 20).map(l => {
    let range = 'Reference range: Not recorded';
    if (l.referenceMin !== undefined && l.referenceMax !== undefined) {
      range = `Reference range on report: ${l.referenceMin}–${l.referenceMax} ${l.unit || ''}`;
    } else if (l.referenceMin !== undefined) {
      range = `Reference range on report: >= ${l.referenceMin} ${l.unit || ''}`;
    } else if (l.referenceMax !== undefined) {
      range = `Reference range on report: <= ${l.referenceMax} ${l.unit || ''}`;
    }
    const status = l.status ? ` | Status: ${l.status}` : '';
    const date = l.date ? new Date(l.date).toLocaleDateString() : 'Recent';
    return `- ${l.metricName}: ${l.value} ${l.unit || ''} (${range}${status}, Date: ${date})`;
  }).join('\n');
}

class GeminiService {
  constructor() {
    this.apiKey = config.geminiApiKey;
    this.modelName = config.geminiModel || 'gemini-2.5-flash';
    this.client = null;

    if (this.apiKey) {
      try {
        this.client = new GoogleGenAI({ apiKey: this.apiKey });
      } catch (err) {
        console.warn('[GeminiService] Warning: Failed to initialize GoogleGenAI client:', err.message);
      }
    } else {
      console.info('[AI Intelligence] Active engine: Sarvam AI & Clinical Plain-Language Engine.');
    }
  }

  isAvailable() {
    return Boolean(this.client && this.apiKey);
  }

  logOperation(action, details = {}) {
    const sanitized = {
      action,
      model: this.modelName,
      hasKey: Boolean(this.apiKey),
      timestamp: new Date().toISOString(),
      ...details,
    };
    delete sanitized.query;
    delete sanitized.prompt;
    delete sanitized.records;
    console.log(`[GeminiService] ${JSON.stringify(sanitized)}`);
  }

  /**
   * Format doctor information in plain language
   */
  formatDoctorExplanation({ doctors = [], records = [], documents = [], user = {}, language = 'en' }) {
    const isTamil = language === 'ta';
    const isHindi = language === 'hi';

    let doctorName = user.primaryDoctorName || '';
    let doctorPhone = user.primaryDoctorPhone || '';
    let hospitalName = '';
    let specialization = '';
    let lastDate = user.lastCheckupDate ? new Date(user.lastCheckupDate).toLocaleDateString('en-GB') : '';

    if (doctors && doctors.length > 0) {
      const d = doctors[0];
      if (!doctorName) doctorName = d.name;
      if (!doctorPhone) doctorPhone = d.phone;
      if (!hospitalName) hospitalName = d.hospitalClinic;
      if (!specialization) specialization = d.specialization;
    }

    const consultRecord = records.find(r => r.doctorName || r.recordType === 'consultation');
    if (consultRecord) {
      if (!doctorName) doctorName = consultRecord.doctorName;
      if (!hospitalName) hospitalName = consultRecord.hospitalClinicName;
      if (!lastDate && consultRecord.date) lastDate = new Date(consultRecord.date).toLocaleDateString('en-GB');
    }

    const docWithDoctor = documents.find(d => d.extractedData?.doctorName);
    if (docWithDoctor) {
      if (!doctorName) doctorName = docWithDoctor.extractedData.doctorName;
      if (!hospitalName) hospitalName = docWithDoctor.extractedData.hospitalName;
    }

    if (!doctorName) {
      if (isTamil) return 'உங்கள் பதிவேற்றப்பட்ட ஆவணங்களில் மருத்துவர் விவரங்கள் எதுவும் காணப்படவில்லை.';
      if (isHindi) return 'आपके अपलोड किए गए रिकॉर्ड में डॉक्टर की जानकारी नहीं मिली।';
      return "I couldn't find doctor information in your uploaded records.";
    }

    if (isTamil) {
      return `உங்கள் மருத்துவப் பதிவுகளின்படி உங்கள் மருத்துவர் விவரம்:
• மருத்துவர்: ${doctorName}
${specialization ? `• பிரிவு: ${specialization}\n` : ''}${hospitalName ? `• மருத்துவமனை / கிளினிக்: ${hospitalName}\n` : ''}${doctorPhone ? `• தொடர்பு எண்: ${doctorPhone}\n` : ''}${lastDate ? `• ஆலோசனை தேதி: ${lastDate}\n` : ''}
இந்தத் தகவல் உங்கள் பதிவேற்றப்பட்ட ஆவணங்கள் மற்றும் சுயவிவரத்திலிருந்து பெறப்பட்டது.`;
    }

    if (isHindi) {
      return `आपके मेडिकल रिकॉर्ड के अनुसार आपके डॉक्टर का विवरण:
• डॉक्टर: ${doctorName}
${specialization ? `• विशेषज्ञता: ${specialization}\n` : ''}${hospitalName ? `• अस्पताल / क्लिनिक: ${hospitalName}\n` : ''}${doctorPhone ? `• फोन: ${doctorPhone}\n` : ''}${lastDate ? `• परामर्श दिनांक: ${lastDate}\n` : ''}
यह जानकारी आपके रिकॉर्ड से सत्यापित है।`;
    }

    return `Based on your uploaded records, here is your doctor information:

👨‍⚕️ Consulting Doctor: ${doctorName}
${specialization ? `🩺 Specialization: ${specialization}\n` : ''}${hospitalName ? `🏥 Clinic / Hospital: ${hospitalName}\n` : ''}${doctorPhone ? `📞 Phone / Contact: ${doctorPhone}\n` : ''}${lastDate ? `📅 Consultation Date: ${lastDate}\n` : ''}
This information is retrieved from your verified clinical consultation records and profile.`;
  }

  /**
   * Format prescribed medications in plain language
   */
  formatMedicationExplanation({ medications = [], documents = [], language = 'en' }) {
    const isTamil = language === 'ta';
    const isHindi = language === 'hi';

    const allMeds = [];
    const seenMeds = new Set();

    // 1. From prescription documents
    documents.forEach(doc => {
      if (doc.extractedData?.medicines && Array.isArray(doc.extractedData.medicines)) {
        doc.extractedData.medicines.forEach(m => {
          const key = m.name.toLowerCase();
          if (!seenMeds.has(key)) {
            seenMeds.add(key);
            allMeds.push({
              name: m.name,
              dosage: m.dosage || 'Standard dose',
              frequency: m.frequency || 'As advised',
              instructions: m.instructions || '',
              prescribedBy: doc.extractedData.doctorName || '',
              sourceDoc: doc.originalName || 'Prescription',
            });
          }
        });
      }
    });

    // 2. From active Medications collection
    medications.forEach(m => {
      const key = m.name.toLowerCase();
      if (!seenMeds.has(key)) {
        seenMeds.add(key);
        allMeds.push({
          name: m.name,
          dosage: m.dosage || 'Standard dose',
          frequency: m.frequency || 'As advised',
          instructions: m.instructions || '',
          prescribedBy: m.prescribedBy || '',
          sourceDoc: 'Active Prescriptions',
        });
      }
    });

    if (allMeds.length === 0) {
      if (isTamil) return 'உங்கள் பதிவேற்றப்பட்ட ஆவணங்களில் மருந்து விவரங்கள் எதுவும் காணப்படவில்லை.';
      if (isHindi) return 'उपलब्ध मेडिकल दस्तावेजों में दवाइयों का कोई रिकॉर्ड नहीं मिला।';
      return "I couldn't find medication information in your uploaded records.";
    }

    if (isTamil) {
      const list = allMeds.map(m => `• ${m.name} (${m.dosage})
   முறை: ${m.frequency}${m.instructions ? `\n   குறிப்பு: ${m.instructions}` : ''}${m.prescribedBy ? `\n   பரிந்துரைத்த மருத்துவர்: ${m.prescribedBy}` : ''}`).join('\n\n');

      return `உங்கள் மருத்துவப் பதிவுகளின்படி பரிந்துரைக்கப்பட்ட மருந்துகள்:

${list}

முக்கிய குறிப்பு:
மருத்துவரின் ஆலோசனையின்படி மட்டுமே மருந்துகளை உட்கொள்ளவும். மருந்தின் அளவை சுயமாக மாற்ற வேண்டாம்.`;
    }

    if (isHindi) {
      const list = allMeds.map(m => `• ${m.name} (${m.dosage})
   खुराक: ${m.frequency}${m.instructions ? `\n   निर्देश: ${m.instructions}` : ''}${m.prescribedBy ? `\n   डॉक्टर: ${m.prescribedBy}` : ''}`).join('\n\n');

      return `आपकी मेडिकल रिपोर्ट के अनुसार डॉक्टर द्वारा निर्धारित दवाइयां:

${list}

महत्वपूर्ण सूचना:
कृपया अपने डॉक्टर द्वारा दिए गए निर्देशों के अनुसार ही दवाएं लें। बिना सलाह खुराक न बदलें।`;
    }

    const list = allMeds.map(m => `• ${m.name} (${m.dosage})
   Frequency: ${m.frequency}${m.instructions ? `\n   Instructions: ${m.instructions}` : ''}${m.prescribedBy ? `\n   Prescribed by: ${m.prescribedBy}` : ''}`).join('\n\n');

    return `Here are the medicines prescribed by your doctor based on your uploaded records:

${list}

Important:
Always take your medications exactly as prescribed by your doctor. Follow your doctor's instructions. Do not stop or alter dosages without consulting your physician.`;
  }

  /**
   * Format prescription overview in plain language
   */
  formatPrescriptionExplanation({ documents = [], medications = [], language = 'en' }) {
    const isTamil = language === 'ta';
    const isHindi = language === 'hi';

    const prescriptionDocs = documents.filter(d =>
      d.category === 'prescription' ||
      (d.extractedData?.medicines && d.extractedData.medicines.length > 0)
    );

    if (prescriptionDocs.length === 0 && medications.length === 0) {
      if (isTamil) return 'உங்கள் பதிவேற்றப்பட்ட ஆவணங்களில் மருந்துச் சீட்டு அல்லது மருந்து விவரங்கள் எதுவும் காணப்படவில்லை.';
      if (isHindi) return 'उपलब्ध मेडिकल दस्तावेजों में प्रिस्क्रिप्शन या दवाइयों का कोई रिकॉर्ड नहीं मिला।';
      return "I couldn't find medication information in your uploaded records.";
    }

    if (prescriptionDocs.length > 0) {
      const topPres = prescriptionDocs[0];
      const ext = topPres.extractedData || {};
      const doctorName = ext.doctorName || 'Your Doctor';
      const clinicName = ext.hospitalName || 'Clinic';
      const presDate = ext.documentDate ? new Date(ext.documentDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : '';
      const medicines = ext.medicines || [];
      const diagnosis = ext.diagnosis || [];

      const medList = medicines.map(m => `• ${m.name} - ${m.dosage || 'Standard dose'}
   Frequency: ${m.frequency || 'As advised'}
   Instructions: ${m.instructions || 'Take as directed by physician'}`).join('\n\n');

      return `Here is a plain-language explanation of your prescription from ${doctorName}:

📄 Prescription Details:
• Prescribing Doctor: ${doctorName}
• Clinic / Facility: ${clinicName}${presDate ? `\n• Date: ${presDate}` : ''}${diagnosis.length > 0 ? `\n• Conditions / Indications: ${diagnosis.join(', ')}` : ''}

💊 Prescribed Medications:
${medList || 'None listed'}

🩺 What this means in simple terms:
Your doctor prescribed these medications to help manage your health. For example, blood sugar medications help your body maintain steady glucose levels, while blood pressure medications help support heart and blood vessel health.

📌 Important reminders:
1. Follow the exact timing and food instructions (such as taking with meals).
2. Never discontinue or change the dosage without discussing with ${doctorName}.`;
    }

    return this.formatMedicationExplanation({ medications, documents, language });
  }

  /**
   * Format abnormal laboratory observations in plain language
   */
  formatAbnormalValuesExplanation({ documents = [], labMetrics = [], language = 'en', ragResult }) {
    const isTamil = language === 'ta';
    const isHindi = language === 'hi';

    const abnormalTests = [];
    const seen = new Set();

    // 1. From chunks if provided
    if (ragResult && ragResult.chunks && ragResult.chunks.length > 0) {
      ragResult.chunks.forEach(c => {
        if (c.chunkType === 'lab_test') {
          const key = c.testName.toLowerCase();
          if (!seen.has(key)) {
            seen.add(key);
            abnormalTests.push({
              name: c.testName,
              value: c.value,
              unit: c.unit || '',
              referenceRange: c.referenceRange || '',
              status: c.status || 'abnormal',
              isLow: (c.status || '').toLowerCase() === 'low',
              isHigh: (c.status || '').toLowerCase() === 'high',
              docName: c.documentName,
              docDate: c.documentDateFormatted,
            });
          }
        }
      });
    }

    // 2. From documents if chunks didn't supply them
    if (abnormalTests.length === 0) {
      documents.forEach(doc => {
        if (doc.extractedData?.labTests) {
          doc.extractedData.labTests.forEach(t => {
            const status = (t.status || '').toLowerCase();
            if (status === 'high' || status === 'low' || status === 'abnormal') {
              const key = t.testName.toLowerCase();
              if (!seen.has(key)) {
                seen.add(key);
                abnormalTests.push({
                  name: t.testName,
                  value: String(t.value),
                  unit: t.unit || '',
                  referenceRange: t.referenceRange || '',
                  status,
                  isLow: status === 'low',
                  isHigh: status === 'high',
                  docName: doc.originalName || 'Lab Report',
                  docDate: doc.extractedData.documentDate ? new Date(doc.extractedData.documentDate).toLocaleDateString('en-GB') : '',
                });
              }
            }
          });
        }
      });

      labMetrics.forEach(m => {
        const status = (m.status || '').toLowerCase();
        if (status === 'high' || status === 'low' || status === 'abnormal') {
          const key = m.metricName.toLowerCase();
          if (!seen.has(key)) {
            seen.add(key);
            let range = '';
            if (m.referenceMin !== undefined && m.referenceMax !== undefined) range = `${m.referenceMin}–${m.referenceMax} ${m.unit || ''}`.trim();
            else if (m.referenceMax !== undefined) range = `< ${m.referenceMax} ${m.unit || ''}`.trim();
            else if (m.referenceMin !== undefined) range = `> ${m.referenceMin} ${m.unit || ''}`.trim();

            abnormalTests.push({
              name: m.metricName,
              value: String(m.value),
              unit: m.unit || '',
              referenceRange: range,
              status,
              isLow: status === 'low',
              isHigh: status === 'high',
              docName: 'Verified Clinical Records',
              docDate: m.date ? new Date(m.date).toLocaleDateString('en-GB') : '',
            });
          }
        }
      });
    }

    if (abnormalTests.length === 0) {
      if (isTamil) return 'உங்கள் பதிவேற்றப்பட்ட ஆய்வக அறிக்கைகளில் உள்ள அனைத்து முடிவுகளும் இயல்பான வரம்பிற்குள் உள்ளன.';
      if (isHindi) return 'आपकी अपलोड की गई लैब रिपोर्ट के सभी मान सामान्य सीमा के भीतर हैं। कोई भी असामान्य परिणाम नहीं पाया गया।';
      return 'All test values in your uploaded medical reports are within their expected reference ranges. No abnormal or out-of-range results were detected.';
    }

    if (isTamil) {
      const items = abnormalTests.map(t => {
        const term = lookupMedicalTerm(t.name);
        const meaning = term?.whatIsIt?.ta ? `\n   விளக்கம்: ${term.whatIsIt.ta}` : '';
        const why = t.isLow ? (term?.whyMattersLow?.ta || 'இயல்பான அளவை விடக் குறைவு.') : (term?.whyMattersHigh?.ta || 'இயல்பான அளவை விட அதிகம்.');
        return `• ${t.name}: ${t.value} ${t.unit} (வரம்பு: ${t.referenceRange || 'குறிப்பிடப்படவில்லை'})
   நிலை: ${t.status.toUpperCase()}
   பொருள்: ${why}${meaning}`;
      }).join('\n\n');

      return `உங்கள் பதிவேற்றப்பட்ட அறிக்கைகளில் இயல்பான வரம்பிற்கு வெளியே உள்ள முடிவுகள்:

${items}

முக்கிய குறிப்பு:
ஒரு முடிவு வரம்பை மீறியிருப்பதால் உடனடியாக கவலைப்பட வேண்டியதில்லை. உங்கள் மருத்துவர் பிற சோதனைகளுடன் ஒப்பிட்டு இதனை விளக்குவார்.`;
    }

    if (isHindi) {
      const items = abnormalTests.map(t => {
        const term = lookupMedicalTerm(t.name);
        const meaning = term?.whatIsIt?.hi ? `\n   सरल अर्थ: ${term.whatIsIt.hi}` : '';
        const why = t.isLow ? (term?.whyMattersLow?.hi || 'सामान्य सीमा से कम।') : (term?.whyMattersHigh?.hi || 'सामान्य सीमा से अधिक।');
        return `• ${t.name}: ${t.value} ${t.unit} (सीमा: ${t.referenceRange || 'उल्लेखित नहीं'})
   स्थिति: ${t.status.toUpperCase()}
   विवरण: ${why}${meaning}`;
      }).join('\n\n');

      return `आपकी रिपोर्ट में सामान्य सीमा से बाहर पाए गए परिणाम:

${items}

महत्वपूर्ण सूचना:
एक असामान्य मान का अर्थ कोई निश्चित बीमारी नहीं है। अपने डॉक्टर से इस पर चर्चा करें।`;
    }

    const items = abnormalTests.map(t => {
      const term = lookupMedicalTerm(t.name);
      const whatIsIt = term?.whatIsIt?.en ? `\n   In simple terms: ${term.whatIsIt.en}` : '';
      const whyMatters = t.isLow
        ? (term?.whyMattersLow?.en || `Your ${t.name} is lower than the reference range shown on your report.`)
        : (term?.whyMattersHigh?.en || `Your ${t.name} is higher than the reference range shown on your report.`);
      return `• ${t.name}
   Your result: ${t.value} ${t.unit} (Reference range: ${t.referenceRange || 'Not specified'})
   Status: ${t.status.toUpperCase()}
   What this means: ${whyMatters}${whatIsIt}`;
    }).join('\n\n');

    return `Here are the test results from your uploaded reports that are outside their standard reference range:

⚠️ Out-of-Range Results:
${items}

🩺 What this could mean:
Having a result outside the reference range shown on your report does not automatically mean a disease or illness. Everyday factors like diet, exercise, hydration, or temporary recovery can affect blood levels. 

📌 What you should discuss with your doctor:
Review these specific values with your doctor so they can interpret them in the context of your symptoms and overall medical history. This is based on your uploaded records and is not a clinical diagnosis.`;
  }

  /**
   * Process a health query using RAG retrieval over real authorized user documents
   */
  async generateHealthCopilotResponse({ query, userContext, language = 'en', ragResult: passedRagResult }) {
    const { medications = [], labMetrics = [], records = [], doctors = [], user = {}, documents = [] } = userContext;

    const langNameMap = {
      ta: 'Tamil (தமிழ்)',
      hi: 'Hindi (हिन्दी)',
      te: 'Telugu (తెలుగు)',
      en: 'English',
    };
    const targetLanguage = langNameMap[language] || 'English';

    const hasAnyRecords = medications.length > 0 || labMetrics.length > 0 || records.length > 0 || documents.length > 0 || doctors.length > 0;

    // 1. RAG RETRIEVAL: Retrieve relevant chunks strictly based on query intent
    const ragResult = passedRagResult || ragService.retrieveRelevantChunks({
      query,
      documents,
      labMetrics,
      medications,
      records,
      doctors,
      user,
    });

    // 2. RETRIEVAL FAILURE GUARDRAIL (Zero Hallucination)
    if (ragResult.retrievalStatus === 'NOT_FOUND') {
      const missingName = ragResult.missingEntity || 'Information';
      let notFoundMsg = ragResult.notFoundMessage || '';

      if (!notFoundMsg) {
        if (language === 'ta') {
          notFoundMsg = `தற்போது கிடைக்கக்கூடிய உங்கள் மருத்துவ ஆவணங்களில் ${missingName} தொடர்பான விவரங்கள் எதுவும் காணப்படவில்லை.`;
        } else if (language === 'hi') {
          notFoundMsg = `उपलब्ध मेडिकल दस्तावेजों में ${missingName} का कोई रिकॉर्ड नहीं मिला।`;
        } else if (language === 'te') {
          notFoundMsg = `ప్రస్తుతం అందుబాటులో ఉన్న మీ వైద్య పత్రాలలో ${missingName} వివరాలు కనుగొనబడలేదు.`;
        } else {
          if (missingName.toLowerCase().includes('prescription') || missingName.toLowerCase().includes('medication') || missingName.toLowerCase().includes('medicine')) {
            notFoundMsg = "I couldn't find medication information in your uploaded records.";
          } else if (missingName.toLowerCase().includes('doctor')) {
            notFoundMsg = "I couldn't find doctor information in your uploaded records.";
          } else {
            notFoundMsg = `I couldn't find a ${missingName.toLowerCase()} result in the medical documents currently available to me. I don't want to guess.`;
          }
        }
      }

      return {
        response: notFoundMsg,
        sources: [],
        safetyDisclaimer: this.getSafetyDisclaimer(language),
        language,
        provider: 'rag_grounded_engine',
      };
    }

    const ragContext = ragService.formatContextForLLM(ragResult);
    const sources = ragResult.sources && ragResult.sources.length > 0
      ? ragResult.sources
      : this.buildSourcesFromContext(userContext, query);

    // RAG-Aware System Instruction
    const systemPrompt = `You are "Personal Health Copilot", a compassionate, accurate, non-diagnostic AI health intelligence companion.

RAG-AWARE MEDICAL DOCUMENT RETRIEVAL RULES (MANDATORY):
1. When answering questions about a user's existing medical documents, use the retrieved RAG context as the primary source for report-specific facts.
2. The user's query intent MUST guide your answer:
   - If asking about doctors, answer ONLY about doctor and facility information. NEVER substitute lab reports.
   - If asking about medications or prescriptions, answer ONLY about prescribed medicines. NEVER substitute lab reports.
   - If asking about HbA1c or a specific test, answer ONLY about that specific test.
   - If asking which values are abnormal, answer ONLY about out-of-range results.
3. Never invent medical values, reference ranges, dates, diagnoses, medications, or other information not supported by the retrieved document context.
4. Preserve exact values, units, dates, test names, and reference ranges from the retrieved context.
5. When the retrieved context is insufficient or a test/medication is not found, state that the information could not be found rather than guessing.
6. Do not diagnose a medical condition from a single abnormal result.
7. Use simple everyday language suitable for a person without medical training. Explain important medical terms in plain words.
8. Never output internal retrieval tokens like <<<UNTRUSTED...>>> or pseudo-confidence tags.
9. Respond entirely in ${targetLanguage}.`;

    const userPromptContent = `
PATIENT PROFILE:
- Name: ${user.name || 'User'}
- Known Allergies: ${user.criticalAllergies?.join(', ') || 'None reported'}
- Chronic Conditions: ${user.criticalConditions?.join(', ') || 'None reported'}

${ragContext}

USER INQUIRY:
"${query}"

INSTRUCTION:
Answer the inquiry based strictly on the retrieved medical information above. Follow all RAG rules.`;

    // Attempt Gemini API call if client is configured
    if (this.isAvailable()) {
      let attempts = 0;
      const maxAttempts = 2;

      while (attempts < maxAttempts) {
        attempts++;
        try {
          this.logOperation('generateContent_start', { attempt: attempts, language });

          const response = await this.client.models.generateContent({
            model: this.modelName,
            contents: [
              { role: 'user', parts: [{ text: `${systemPrompt}\n\n${userPromptContent}` }] }
            ],
            config: {
              temperature: 0.2,
              topP: 0.85,
            }
          });

          const responseText = response?.text || '';
          if (responseText.trim()) {
            this.logOperation('generateContent_success', { attempt: attempts });

            const cleanText = responseText.trim()
              .replace(/<<<UNTRUSTED_DOCUMENT_CONTENT_START>>>/g, '')
              .replace(/<<<UNTRUSTED_DOCUMENT_CONTENT_END>>>/g, '')
              .replace(/Confidence:\s*100%/gi, 'Based on your uploaded records')
              .replace(/Confidence:\s*\d+%/gi, 'Based on your uploaded records');

            return {
              response: cleanText,
              sources,
              safetyDisclaimer: this.getSafetyDisclaimer(language),
              language,
              provider: 'gemini_rag',
              model: this.modelName,
            };
          }
        } catch (err) {
          const isRateLimit = err?.status === 429 || (err?.message && err.message.includes('429')) || (err?.message && err.message.includes('RESOURCE_EXHAUSTED'));
          this.logOperation('generateContent_error', {
            attempt: attempts,
            isRateLimit,
            status: err?.status,
            message: err?.message ? err.message.substring(0, 100) : 'Unknown error',
          });

          if (isRateLimit && attempts < maxAttempts) {
            await new Promise(res => setTimeout(res, 1200));
            continue;
          }
          break;
        }
      }
    }

    // High-Quality Deterministic Plain-Language Clinical RAG Engine
    return this.generateDeterministicResponse({ query, userContext, language, hasAnyRecords, ragResult });
  }

  /**
   * Deterministic real-data response when Gemini API key is unset or rate limited.
   * Fully grounded in RAG retrieval results and intent classification.
   */
  generateDeterministicResponse({ query, userContext, language = 'en', hasAnyRecords, ragResult }) {
    const qLower = query.toLowerCase();
    const { medications = [], labMetrics = [], records = [], doctors = [], user = {}, documents = [] } = userContext;

    const activeRag = ragResult || ragService.retrieveRelevantChunks({
      query,
      documents,
      labMetrics,
      medications,
      records,
      doctors,
      user,
    });

    const intent = activeRag.intent || ragService.classifyQueryIntent(query);

    // Zero-hallucination guardrail
    if (activeRag.retrievalStatus === 'NOT_FOUND') {
      const missingName = activeRag.missingEntity || 'Information';
      let notFoundMsg = activeRag.notFoundMessage || '';

      if (!notFoundMsg) {
        if (intent === QUERY_INTENTS.MEDICATION || intent === QUERY_INTENTS.PRESCRIPTION || missingName.toLowerCase().includes('prescription') || missingName.toLowerCase().includes('medication') || missingName.toLowerCase().includes('medicine')) {
          notFoundMsg = "I couldn't find medication information in your uploaded records.";
        } else if (intent === QUERY_INTENTS.DOCTOR || missingName.toLowerCase().includes('doctor')) {
          notFoundMsg = "I couldn't find doctor information in your uploaded records.";
        } else {
          notFoundMsg = `I couldn't find a ${missingName.toLowerCase()} result in the medical documents currently available to me. I don't want to guess.`;
        }
      }

      return {
        response: notFoundMsg,
        sources: [],
        safetyDisclaimer: this.getSafetyDisclaimer(language),
        language,
        provider: 'deterministic_rag_grounded',
      };
    }

    const sources = activeRag.sources && activeRag.sources.length > 0
      ? activeRag.sources
      : this.buildSourcesFromContext(userContext, query);

    const isTamil = language === 'ta';
    const isHindi = language === 'hi';
    const isTelugu = language === 'te';

    // 1. If user has zero records across the board
    if (!hasAnyRecords) {
      let responseText = '';
      if (isTamil) {
        responseText = `வணக்கம்! உங்கள் கணக்கில் தற்போது எந்த மருத்துவப் பதிவுகளும், ஆய்வக அறிக்கைகளும் அல்லது மருந்துகளும் சேர்க்கப்படவில்லை.
உங்கள் இரத்தப் பரிசோதனை அறிக்கை அல்லது மருந்துகளை பதிவேற்றினால், ஹெல்த் கோபைலட் அவற்றைப் படித்து எளிய அன்றாட மொழியில் விளக்கும்.`;
      } else if (isHindi) {
        responseText = `नमस्ते! आपके खाते में अभी तक कोई स्वास्थ्य रिकॉर्ड, लैब रिपोर्ट या दवाएं दर्ज नहीं हैं।
कृपया अपनी पहली मेडिकल रिपोर्ट या दवाएं अपलोड करें ताकि हेल्थ कोपायलट उनकी सरल, आम भाषा में व्याख्या कर सके।`;
      } else if (isTelugu) {
        responseText = `నమస్కారం! మీ ఖాతాలో ఇంకా ఎటువంటి వైద్య రికార్డులు, ల్యాబ్ నివేదికలు లేదా మందులు నమోదు కాలేదు.`;
      } else {
        responseText = `Welcome to Health Copilot! Your account currently has no medical documents, lab reports, or medications recorded yet.
To get a plain-language explanation, please upload your latest laboratory report, prescription, or add your medications in the Medicines section.`;
      }

      return {
        response: responseText,
        sources: [],
        safetyDisclaimer: this.getSafetyDisclaimer(language),
        language,
        provider: 'deterministic_plain_language',
      };
    }

    // 2. INTENT: DOCTOR ("Who is my doctor?", "Doctor name")
    if (intent === QUERY_INTENTS.DOCTOR) {
      const explanation = this.formatDoctorExplanation({ doctors, records, documents, user, language });
      return {
        response: explanation,
        sources,
        safetyDisclaimer: this.getSafetyDisclaimer(language),
        language,
        provider: 'deterministic_rag_grounded',
      };
    }

    // 3. INTENT: MEDICATION ("What medicines did my doctor prescribe?")
    if (intent === QUERY_INTENTS.MEDICATION) {
      const explanation = this.formatMedicationExplanation({ medications, documents, language });
      return {
        response: explanation,
        sources,
        safetyDisclaimer: this.getSafetyDisclaimer(language),
        language,
        provider: 'deterministic_rag_grounded',
      };
    }

    // 4. INTENT: PRESCRIPTION ("Explain my prescription")
    if (intent === QUERY_INTENTS.PRESCRIPTION) {
      const explanation = this.formatPrescriptionExplanation({ documents, medications, language });
      return {
        response: explanation,
        sources,
        safetyDisclaimer: this.getSafetyDisclaimer(language),
        language,
        provider: 'deterministic_rag_grounded',
      };
    }

    // 5. INTENT: ABNORMAL TEST RESULTS ("Which values are abnormal?")
    if (intent === QUERY_INTENTS.ABNORMAL_TESTS) {
      const explanation = this.formatAbnormalValuesExplanation({ documents, labMetrics, language, ragResult: activeRag });
      return {
        response: explanation,
        sources,
        safetyDisclaimer: this.getSafetyDisclaimer(language),
        language,
        provider: 'deterministic_rag_grounded',
      };
    }

    // 6. Multi-document historical comparison ("Compare my HbA1c")
    const isComparisonQuery = qLower.includes('compare') ||
      qLower.includes('trend') ||
      qLower.includes('previous') ||
      qLower.includes('earlier') ||
      qLower.includes('history') ||
      qLower.includes('past') ||
      qLower.includes('difference');

    if (activeRag.historicalComparison && isComparisonQuery) {
      const explanation = this.formatHistoricalComparisonExplanation({
        comparison: activeRag.historicalComparison,
        language,
      });

      return {
        response: explanation,
        sources,
        safetyDisclaimer: this.getSafetyDisclaimer(language),
        language,
        provider: 'deterministic_rag_grounded',
      };
    }

    // 7. INTENT: SPECIFIC LAB TEST or GENERAL LAB REPORT
    if (intent === QUERY_INTENTS.SPECIFIC_LAB_TEST || intent === QUERY_INTENTS.GENERAL_LAB_REPORT) {
      const explanation = this.explainMedicalReportInPlainLanguage({
        documents,
        labMetrics,
        query,
        language,
        ragResult: activeRag,
      });

      if (explanation) {
        return {
          response: explanation,
          sources,
          safetyDisclaimer: this.getSafetyDisclaimer(language),
          language,
          provider: 'deterministic_rag_grounded',
        };
      }
    }

    // 8. General Health or other queries
    let generalText = '';
    if (isTamil) {
      generalText = `ஹெல்த் கோபைலட்: உங்கள் கேள்வி "${query}".
உங்கள் பதிவேற்றப்பட்ட உண்மையான மருத்துவ அறிக்கைகள் மற்றும் மருந்துகளின் அடிப்படையில் எளிய அன்றாட மொழியில் விளக்கம் அளிக்கப்படுகிறது.`;
    } else if (isHindi) {
      generalText = `हेल्थ कोपायलट: आपके प्रश्न "${query}" के संदर्भ में, आपकी रिपोर्ट और दवाओं को सरल, आम भाषा में समझाया जाता है।`;
    } else if (isTelugu) {
      generalText = `హెల్త్ కోపైలట్: మీ ప్రశ్న "${query}". మీ నమోదిత నివేదికల ఆధారంగా సాధారణ భాషలో సమాచారం అందించబడుతుంది.`;
    } else {
      generalText = `Health Copilot: Regarding "${query}", I explain your verified medical reports, laboratory values, and prescriptions in simple, everyday language without medical jargon. You can ask me to explain your blood test, review specific values like HbA1c or hemoglobin, or check your medications.`;
    }

    return {
      response: generalText,
      sources,
      safetyDisclaimer: this.getSafetyDisclaimer(language),
      language,
      provider: 'deterministic_plain_language',
    };
  }

  /**
   * Explains multi-document historical comparison in plain language
   */
  formatHistoricalComparisonExplanation({ comparison, language = 'en' }) {
    const { testName, latest, previous } = comparison;
    const isTamil = language === 'ta';
    const isHindi = language === 'hi';
    const isTelugu = language === 'te';
    const langKey = isTamil ? 'ta' : isHindi ? 'hi' : isTelugu ? 'te' : 'en';

    const term = lookupMedicalTerm(testName);
    const whatIsIt = term?.whatIsIt?.[langKey] || `${testName} is a clinical test in your blood report.`;

    const latestStatusDesc = latest.status === 'low'
      ? (isTamil ? `அறிக்கையில் காட்டப்பட்டுள்ள இயல்பான வரம்பை விடக் குறைவாக உள்ளது` : isHindi ? `रिपोर्ट में दिखाई गई सामान्य सीमा से कम है` : `lower than the normal range shown on your report (${latest.referenceRange || 'None specified'})`)
      : latest.status === 'high'
      ? (isTamil ? `அறிக்கையில் காட்டப்பட்டுள்ள இயல்பான வரம்பை விட அதிகமாக உள்ளது` : isHindi ? `रिपोर्ट में दिखाई गई सामान्य सीमा से अधिक है` : `higher than the normal range shown on your report (${latest.referenceRange || 'None specified'})`)
      : (isTamil ? `அறிக்கையின் இயல்பான வரம்பிற்குள் உள்ளது` : isHindi ? `रिपोर्ट की सामान्य सीमा के भीतर है` : `within the reference range shown on your report (${latest.referenceRange || 'None specified'})`);

    if (isTamil) {
      return `இதோ உங்கள் ${testName} பரிசோதனையின் முந்தைய மற்றும் தற்போதைய அறிக்கைகளின் ஒப்பீடு:

📊 அறிக்கைகளின் ஒப்பீடு (தேதி வாரியாக):
• சமீபத்திய அறிக்கை ("${latest.documentName}", தேதி: ${latest.documentDateFormatted}):
  அளவு: ${latest.value} ${latest.unit || ''} (வரம்பு: ${latest.referenceRange || 'குறிப்பிடப்படவில்லை'})
• முந்தைய அறிக்கை ("${previous.documentName}", தேதி: ${previous.documentDateFormatted}):
  அளவு: ${previous.value} ${previous.unit || ''} (வரம்பு: ${previous.referenceRange || 'குறிப்பிடப்படவில்லை'})

💡 எளிய விளக்கம்:
${whatIsIt}

🩺 இதன் பொருள்:
உங்கள் சமீபத்திய அறிக்கையில் ${testName} அளவு ${latest.value} ${latest.unit || ''} ஆக உள்ளது, இது ${latestStatusDesc}; இது முந்தைய அறிக்கையின் ${previous.value} ${previous.unit || ''} உடன் ஒப்பிடப்படுகிறது. இது குறித்த மாற்றங்களை உங்கள் மருத்துவரிடம் கலந்துரையாடவும்.`;
    }

    if (isHindi) {
      return `यहाँ आपकी ${testName} जांच के नवीनतम और पिछले परिणामों की तुलना है:

📊 रिपोर्ट तुलना (दिनांक अनुसार):
• नवीनतम रिपोर्ट ("${latest.documentName}", तिथि: ${latest.documentDateFormatted}):
  परिणाम: ${latest.value} ${latest.unit || ''} (सीमा: ${latest.referenceRange || 'उल्लेखित नहीं'})
• पिछली रिपोर्ट ("${previous.documentName}", तिथि: ${previous.documentDateFormatted}):
  परिणाम: ${previous.value} ${previous.unit || ''} (सीमा: ${previous.referenceRange || 'उल्लेखित नहीं'})

💡 सरल अर्थ:
${whatIsIt}

🩺 इसका क्या अर्थ है:
आपकी नवीनतम रिपोर्ट में ${testName} का स्तर ${latest.value} ${latest.unit || ''} है, जो ${latestStatusDesc}, जबकि पिछली रिपोर्ट में यह ${previous.value} ${previous.unit || ''} था। डॉक्टर से इस बदलाव पर चर्चा करें।`;
    }

    return `Here’s a comparison of your ${testName} results across your reports.

📊 Report Comparison:
• Latest Report ("${latest.documentName}", Date: ${latest.documentDateFormatted}):
  Result: ${latest.value} ${latest.unit || ''}
  Reference range on report: ${latest.referenceRange || 'None specified'}

• Previous Report ("${previous.documentName}", Date: ${previous.documentDateFormatted}):
  Result: ${previous.value} ${previous.unit || ''}
  Reference range on report: ${previous.referenceRange || 'None specified'}

💡 In simple terms:
${whatIsIt}

🩺 What this means:
Your latest report shows a ${testName} level of ${latest.value} ${latest.unit || ''}, which is ${latestStatusDesc}, compared to ${previous.value} ${previous.unit || ''} in your previous report. Your doctor can review this trend alongside your overall health and any symptoms.

In short:
Your latest ${testName} is ${latest.value} ${latest.unit || ''} (from ${latest.documentDateFormatted}), whereas your previous test showed ${previous.value} ${previous.unit || ''} (from ${previous.documentDateFormatted}). This information is from your uploaded reports and is not a clinical diagnosis.`;
  }

  /**
   * Plain-Language Medical Report Explainer
   */
  explainMedicalReportInPlainLanguage({ documents = [], labMetrics = [], query = '', language = 'en', ragResult }) {
    const isTamil = language === 'ta';
    const isHindi = language === 'hi';
    const isTelugu = language === 'te';

    const activeRag = ragResult || ragService.retrieveRelevantChunks({ query, documents, labMetrics });

    if (activeRag.retrievalStatus === 'NOT_FOUND' && activeRag.missingEntity) {
      const missingName = activeRag.missingEntity;
      if (isTamil) return `தற்போது கிடைக்கக்கூடிய உங்கள் மருத்துவ ஆவணங்களில் ${missingName} தொடர்பான முடிவுகள் எதுவும் காணப்படவில்லை.`;
      if (isHindi) return `उपलब्ध मेडिकल दस्तावेजों में ${missingName} का कोई परिणाम नहीं मिला।`;
      if (isTelugu) return `ప్రస్తుతం అందుబాటులో ఉన్న మీ వైద్య పత్రాలలో ${missingName} ఫలితం కనుగొనబడలేదు.`;
      return `I couldn't find a ${missingName.toLowerCase()} result in the medical documents currently available to me. I don't want to guess.`;
    }

    // 1. Gather all lab test entries from documents and labMetrics
    const allTests = [];

    const labDocs = documents.filter(d =>
      d.category === 'laboratory_report' ||
      d.category === 'diagnostic_report' ||
      d.category === 'lab_report' ||
      d.document_type === 'LAB_REPORT' ||
      d.document_type === 'DIAGNOSTIC_REPORT' ||
      (d.extractedData?.labTests && d.extractedData.labTests.length > 0)
    );

    labDocs.sort((a, b) => {
      const testsA = a.extractedData?.labTests?.length || 0;
      const testsB = b.extractedData?.labTests?.length || 0;
      if (testsA !== testsB) return testsB - testsA;
      const dateA = new Date(a.extractedData?.documentDate || a.createdAt);
      const dateB = new Date(b.extractedData?.documentDate || b.createdAt);
      return dateB - dateA;
    });

    let reportDoctor = '';
    let reportFacility = '';
    let reportDateStr = '';

    if (labDocs.length > 0) {
      const topDoc = labDocs[0];
      const ext = topDoc.extractedData || {};
      reportDoctor = ext.doctorName || '';
      reportFacility = ext.hospitalName || '';
      if (ext.documentDate) {
        reportDateStr = new Date(ext.documentDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
      } else if (topDoc.createdAt) {
        reportDateStr = new Date(topDoc.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
      }

      if (ext.labTests && ext.labTests.length > 0) {
        ext.labTests.forEach(t => {
          allTests.push({
            name: t.testName,
            value: t.value,
            numericValue: t.numericValue,
            unit: t.unit || '',
            referenceRange: t.referenceRange || '',
            status: t.status || 'unknown',
            source: 'document',
          });
        });
      }
    }

    // Supplement from labMetrics if missing
    if (labMetrics.length > 0) {
      labMetrics.forEach(l => {
        const alreadyExists = allTests.some(t => t.name.toLowerCase() === l.metricName.toLowerCase());
        if (!alreadyExists) {
          let range = '';
          if (l.referenceMin !== undefined && l.referenceMax !== undefined) {
            range = `${l.referenceMin}–${l.referenceMax} ${l.unit || ''}`.trim();
          } else if (l.referenceMin !== undefined) {
            range = `>= ${l.referenceMin} ${l.unit || ''}`.trim();
          } else if (l.referenceMax !== undefined) {
            range = `<= ${l.referenceMax} ${l.unit || ''}`.trim();
          }

          if (!reportDateStr && l.date) {
            reportDateStr = new Date(l.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
          }

          allTests.push({
            name: l.metricName,
            value: String(l.value),
            numericValue: l.value,
            unit: l.unit || '',
            referenceRange: range,
            status: l.status || 'normal',
            source: 'metric',
          });
        }
      });
    }

    if (allTests.length === 0) {
      if (isTamil) return 'உங்கள் கணக்கில் இன்னும் எந்த ஆய்வகப் பரிசோதனை அறிக்கைகளும் சேர்க்கப்படவில்லை.';
      if (isHindi) return 'आपके रिकॉर्ड में कोई लैब टेस्ट रिपोर्ट उपलब्ध नहीं है।';
      if (isTelugu) return 'మీ రికార్డులలో ఇంకా ల్యాబ్ పరీక్షలు అందుబాటులో లేవు.';
      return 'No laboratory test values or uploaded reports were found in your records.';
    }

    // 2. Check if the user is asking about a specific test
    const qLower = query.toLowerCase();
    const targetedTerm = Object.keys(MEDICAL_TERMS_DICTIONARY).find(key => {
      const entry = MEDICAL_TERMS_DICTIONARY[key];
      return entry.aliases.some(alias => qLower.includes(alias.toLowerCase()));
    });

    if (targetedTerm) {
      const matchTest = allTests.find(t => {
        const term = lookupMedicalTerm(t.name);
        return term && term.key === targetedTerm;
      });

      if (matchTest) {
        return this.formatSingleTestExplanation({
          test: matchTest,
          reportDateStr,
          reportFacility,
          reportDoctor,
          language,
          previousReport: activeRag.historicalComparison?.previous,
        });
      }
    }

    // 3. Full Report Explanation
    const outsideRange = [];
    const withinRange = [];

    allTests.forEach(test => {
      const isLow = test.status === 'low';
      const isHigh = test.status === 'high';
      if (isLow || isHigh) {
        outsideRange.push({ ...test, isLow, isHigh });
      } else {
        withinRange.push(test);
      }
    });

    return this.buildPhase10ReportExplanation({
      allTests,
      outsideRange,
      withinRange,
      reportDateStr,
      reportFacility,
      reportDoctor,
      language,
    });
  }

  /**
   * Explains a single test in plain everyday words
   */
  formatSingleTestExplanation({ test, reportDateStr, reportFacility, reportDoctor, language, previousReport = null }) {
    const isTamil = language === 'ta';
    const isHindi = language === 'hi';
    const isTelugu = language === 'te';

    const langKey = isTamil ? 'ta' : isHindi ? 'hi' : isTelugu ? 'te' : 'en';
    const term = lookupMedicalTerm(test.name);

    const testTitle = test.name;
    const resultStr = `${test.value} ${test.unit || ''}`.trim();
    const rangeStr = test.referenceRange
      ? test.referenceRange
      : (isTamil ? 'அறிக்கையில் குறிப்பிடப்படவில்லை' : isHindi ? 'रिपोर्ट में उल्लेखित नहीं' : 'Not shown on report');

    const whatIsIt = term?.whatIsIt?.[langKey] ||
      (isTamil ? `${testTitle} என்பது உங்கள் மருத்துவ அறிக்கையின் ஒரு பகுதியாகும்.` : `${testTitle} is a routine clinical test in your report.`);

    let meaningStr = '';
    let whyMatters = '';

    if (test.status === 'low') {
      meaningStr = isTamil
        ? `உங்கள் ${testTitle} அளவு அறிக்கையில் காட்டப்பட்டுள்ள இயல்பான வரம்பை விடக் குறைவாக உள்ளது.`
        : isHindi
        ? `आपका ${testTitle} स्तर रिपोर्ट में दिखाई गई सामान्य सीमा से कम है।`
        : `Your ${testTitle} level is lower than the normal range shown on your report.`;
      whyMatters = term?.whyMattersLow?.[langKey] ||
        (isTamil
          ? 'இது பல காரணங்களால் ஏற்படலாம், ஆனால் இந்த ஒரு முடிவு மட்டும் எந்த ஒரு குறிப்பிட்ட நோயறிதலையும் உறுதிப்படுத்தாது. உங்கள் மருத்துவர் மற்ற பரிசோதனைகளுடன் ஒப்பிட்டுப் பார்ப்பார்.'
          : 'A low level can occur for several reasons, but this result alone cannot determine the cause. Your doctor will evaluate this in context.');
    } else if (test.status === 'high') {
      meaningStr = isTamil
        ? `உங்கள் ${testTitle} அளவு அறிக்கையில் காட்டப்பட்டுள்ள இயல்பான வரம்பை விட அதிகமாக உள்ளது.`
        : isHindi
        ? `आपका ${testTitle} स्तर रिपोर्ट में दिखाई गई सामान्य सीमा से अधिक है।`
        : `Your ${testTitle} level is higher than the normal range shown on your report.`;
      whyMatters = term?.whyMattersHigh?.[langKey] ||
        (isTamil
          ? 'இது தற்காலிகமாகவோ அல்லது பிற காரணங்களாலோ ஏற்படலாம். மருத்துவர் விரிவான காரணத்தை விளக்குவார்.'
          : 'A higher level can occur for several reasons. Your doctor will evaluate this along with your lifestyle and other findings.');
    } else {
      meaningStr = isTamil
        ? `உங்கள் ${testTitle} அளவு அறிக்கையில் காட்டப்பட்டுள்ள இயல்பான வரம்பிற்குள் உள்ளது.`
        : isHindi
        ? `आपका ${testTitle} स्तर रिपोर्ट में दिखाई गई सामान्य सीमा के भीतर है।`
        : `Your ${testTitle} level is within the reference range shown on your report.`;
      whyMatters = term?.whyMattersNormal?.[langKey] ||
        (isTamil
          ? 'இந்த அளவு பரிசோதனைக் கூடம் நிர்ணயித்துள்ள ஆரோக்கியமான வரம்பிற்குள் உள்ளது.'
          : 'In simple terms, this result is within the range the laboratory considers typical.');
    }

    if (isTamil) {
      return `இதோ உங்கள் ${testTitle} பரிசோதனைக்கான எளிய விளக்கம்:

📄 பரிசோதனை விவரம்
${whatIsIt}

🔎 உங்கள் அறிக்கை முடிவுகள்
• உங்கள் முடிவு: ${resultStr}
• அறிக்கையில் காட்டப்பட்டுள்ள வரம்பு: ${rangeStr}
${reportDateStr ? `• பரிசோதனை தேதி: ${reportDateStr}` : ''}
${previousReport ? `• முந்தைய அறிக்கையின் குறிப்பு (${previousReport.documentDateFormatted}): உங்கள் முந்தைய அறிக்கையில் அளவு ${previousReport.value} ${previousReport.unit || ''} ஆக இருந்தது.` : ''}

💡 இதன் பொருள்
${meaningStr}

🩺 இது ஏன் முக்கியம்
${whyMatters}

📌 மருத்துவரிடம் கேட்க வேண்டியவை
இந்த முடிவு உங்கள் ஒட்டுமொத்த உடல்நிலைக்கு எவ்வாறான தாக்கத்தை ஏற்படுத்துகிறது என்பதை உங்கள் மருத்துவரிடம் ஆலோசிக்கவும்.`;
    }

    if (isHindi) {
      return `यहाँ आपकी ${testTitle} जांच की सरल व्याख्या है:

📄 जांच का विवरण
${whatIsIt}

🔎 आपके रिपोर्ट के आंकड़े
• आपका परिणाम: ${resultStr}
• रिपोर्ट में दी गई सामान्य सीमा: ${rangeStr}
${reportDateStr ? `• जांच की तिथि: ${reportDateStr}` : ''}
${previousReport ? `• पिछली रिपोर्ट का संदर्भ (${previousReport.documentDateFormatted}): आपकी पिछली रिपोर्ट में परिणाम ${previousReport.value} ${previousReport.unit || ''} था।` : ''}

💡 इसका सरल अर्थ
${meaningStr}

🩺 यह क्यों महत्वपूर्ण है
${whyMatters}

📌 डॉक्टर से चर्चा करने योग्य बातें
अपने डॉक्टर से पूछें कि यह परिणाम आपके संपूर्ण स्वास्थ्य के संदर्भ में क्या दर्शाता है।`;
    }

    return `Here’s a simple explanation of your ${testTitle} test.

📄 What this test is
${whatIsIt}

🔎 From your report
• Your result: ${resultStr}
• Report reference range: ${rangeStr}
${reportDateStr ? `• Test date: ${reportDateStr}` : ''}
${previousReport ? `• Note from previous report (${previousReport.documentDateFormatted}): Your previous report showed ${previousReport.value} ${previousReport.unit || ''}.` : ''}

💡 What this means
${meaningStr}

🩺 Why it matters
${whyMatters}

📌 What you may want to discuss with your doctor
Ask your doctor how this test relates to your other blood results, current symptoms, and if any follow-up is recommended.

In short:
Your ${testTitle} is ${resultStr} compared to the report's range of ${rangeStr}. This explanation is for your understanding and is not a clinical diagnosis.`;
  }

  /**
   * Builds the comprehensive report explanation format
   */
  buildPhase10ReportExplanation({ allTests, outsideRange, withinRange, reportDateStr, reportFacility, reportDoctor, language }) {
    const isTamil = language === 'ta';
    const isHindi = language === 'hi';

    if (isTamil) {
      const outsideText = outsideRange.length > 0
        ? outsideRange.map(t => {
            const term = lookupMedicalTerm(t.name);
            const simpleMeaning = term?.whatIsIt?.ta ? `\n   ${term.whatIsIt.ta}` : '';
            const whyMatters = t.isLow
              ? (term?.whyMattersLow?.ta || 'இயல்பான வரம்பை விடக் குறைவாக உள்ளது; மருத்துவரிடம் ஆலோசிக்கவும்.')
              : (term?.whyMattersHigh?.ta || 'இயல்பான வரம்பை விட அதிகமாக உள்ளது; மருத்துவரிடம் ஆலோசிக்கவும்.');
            const rangeInfo = t.referenceRange ? ` (அறிக்கையின் வரம்பு: ${t.referenceRange})` : ' (அறிக்கையில் வரம்பு குறிப்பிடப்படவில்லை)';
            return `• ${t.name}: ${t.value} ${t.unit || ''}${rangeInfo}
  - எளிய விளக்கம்: ${whyMatters}${simpleMeaning}`;
          }).join('\n\n')
        : 'அறிக்கையில் எந்த அளவீடுகளும் வரம்பிற்கு வெளியே இல்லை.';

      const withinText = withinRange.length > 0
        ? withinRange.map(t => {
            const term = lookupMedicalTerm(t.name);
            const rangeInfo = t.referenceRange ? ` (வரம்பு: ${t.referenceRange})` : '';
            const simpleDesc = term?.whatIsIt?.ta ? ` — ${term.whatIsIt.ta}` : '';
            return `• ${t.name}: ${t.value} ${t.unit || ''}${rangeInfo}${simpleDesc}`;
          }).join('\n')
        : 'குறிப்பிடப்படவில்லை.';

      return `இதோ உங்கள் மருத்துவ அறிக்கையின் எளிய அன்றாட விளக்கம்.

📄 இந்த அறிக்கை எதைப் பற்றியது
இந்த இரத்தப் பரிசோதனை அறிக்கை${reportFacility ? ` (${reportFacility})` : ''} உங்கள் இரத்த சிவப்பணுக்கள், ஹீமோகுளோபின், இரத்த சர்க்கரை மற்றும் முக்கிய உறுப்புகளின் செயல்பாடுகளை ஆய்வு செய்கிறது.${reportDateStr ? `\nபரிசோதனை தேதி: ${reportDateStr}.` : ''}

🔎 முக்கியமான கண்டுபிடிப்புகள்
மொத்தம் ${allTests.length} அளவீடுகள் உங்கள் அறிக்கையில் பதிவாகியுள்ளன.

⚠️ வரம்பிற்கு வெளியே உள்ள அளவீடுகள்
${outsideText}

✅ வரம்பிற்குள் உள்ள அளவீடுகள்
${withinText}

🩺 இதன் ஒட்டுமொத்த விளக்கம்
ஒரே ஒரு அளவீடு வரம்பிற்கு வெளியே இருப்பதால் மட்டுமே எந்த ஒரு நோயையும் தானாகக் கண்டறிய முடியாது. பெரும்பாலான அளவீடுகள் வரம்பிற்குள் உள்ளனவா என்பதை உங்கள் மருத்துவர் ஒட்டுமொத்தமாகப் பார்த்து வழிகாட்டுவார்.

📌 உங்கள் மருத்துவரிடம் கேட்க வேண்டியவை
1. வரம்பிற்கு வெளியே உள்ள அளவீடுகளுக்கு உணவு அல்லது வாழ்க்கை முறையில் ஏதேனும் மாற்றங்கள் தேவையா?
2. இதற்கு ஏதேனும் கூடுதல் பரிசோதனைகள் அல்லது பின்தொடர்தல் அவசியமா?`;
    }

    if (isHindi) {
      const outsideText = outsideRange.length > 0
        ? outsideRange.map(t => {
            const term = lookupMedicalTerm(t.name);
            const whyMatters = t.isLow
              ? (term?.whyMattersLow?.hi || 'रिपोर्ट की सामान्य सीमा से कम है; डॉक्टर से चर्चा करें।')
              : (term?.whyMattersHigh?.hi || 'रिपोर्ट की सामान्य सीमा से अधिक है; डॉक्टर से चर्चा करें।');
            const rangeInfo = t.referenceRange ? ` (रिपोर्ट की सीमा: ${t.referenceRange})` : ' (रिपोर्ट में सीमा उल्लेखित नहीं)';
            return `• ${t.name}: ${t.value} ${t.unit || ''}${rangeInfo}
  - सरल अर्थ: ${whyMatters}`;
          }).join('\n\n')
        : 'रिपोर्ट में कोई भी मान सीमा से बाहर नहीं है।';

      const withinText = withinRange.length > 0
        ? withinRange.map(t => {
            const rangeInfo = t.referenceRange ? ` (सीमा: ${t.referenceRange})` : '';
            return `• ${t.name}: ${t.value} ${t.unit || ''}${rangeInfo}`;
          }).join('\n')
        : 'उपलब्ध नहीं।';

      return `यहाँ आपकी मेडिकल रिपोर्ट की सरल व्याख्या है।

📄 यह रिपोर्ट किस बारे में है
यह ब्लड टेस्ट रिपोर्ट${reportFacility ? ` (${reportFacility})` : ''} आपके रक्त के विभिन्न घटकों की जांच करती है।${reportDateStr ? `\nजांच की तिथि: ${reportDateStr}।` : ''}

🔎 महत्वपूर्ण निष्कर्ष
आपकी रिपोर्ट में कुल ${allTests.length} परीक्षण दर्ज हैं।

⚠️ सामान्य सीमा से बाहर के परिणाम
${outsideText}

✅ सामान्य सीमा के भीतर के परिणाम
${withinText}

🩺 इसका क्या अर्थ हो सकता है
किसी एक असामान्य परिणाम के आधार पर कोई पक्का रोग तय नहीं किया जाता। आपके डॉक्टर इन सभी परिणामों को एक साथ देखकर सही मार्गदर्शन करेंगे।`;
    }

    // Default: English
    const outsideText = outsideRange.length > 0
      ? outsideRange.map(t => {
          const term = lookupMedicalTerm(t.name);
          const whatIsIt = term?.whatIsIt?.en ? `\n   In simple terms: ${term.whatIsIt.en}` : '';
          const whyMatters = t.isLow
            ? (term?.whyMattersLow?.en || `Your ${t.name} is lower than the range shown on your report.`)
            : (term?.whyMattersHigh?.en || `Your ${t.name} is higher than the range shown on your report.`);
          const rangeInfo = t.referenceRange
            ? `Reference range on report: ${t.referenceRange}`
            : 'Reference range: Not shown on report';
          return `• ${t.name}
   Your result: ${t.value} ${t.unit || ''}
   ${rangeInfo}
   What this means: ${whyMatters}${whatIsIt}`;
        }).join('\n\n')
      : 'All test values in this report are within their stated reference ranges.';

    const withinText = withinRange.length > 0
      ? withinRange.map(t => {
          const term = lookupMedicalTerm(t.name);
          const rangeInfo = t.referenceRange ? ` (Report range: ${t.referenceRange})` : '';
          const simpleMeaning = term?.whatIsIt?.en ? ` — ${term.whatIsIt.en}` : '';
          return `• ${t.name}: ${t.value} ${t.unit || ''}${rangeInfo}${simpleMeaning}`;
        }).join('\n')
      : 'None recorded.';

    const dateNotice = reportDateStr ? `\nReport date: ${reportDateStr}.` : '';
    const facilityNotice = reportFacility ? ` (Analyzed at ${reportFacility})` : '';

    return `Here’s a simple explanation of your report.

📄 What this report is
This is a medical laboratory report${facilityNotice} checking important indicators in your blood, such as oxygen-carrying proteins, immune cells, clotting cells, and organ waste filtration.${dateNotice}

🔎 Important findings
There are ${allTests.length} tests recorded in your uploaded report.

⚠️ Results outside the range
${outsideText}

✅ Results within range
${withinText}

🩺 What this could mean
Having a result outside the reference range does not automatically mean a serious disease or confirmed diagnosis. Many routine factors such as diet, hydration, sleep, or temporary immune activity can influence blood values. Your doctor will interpret these results together with your medical history.

📌 What you may want to discuss with your doctor
1. Whether any out-of-range values require repeat testing or lifestyle modifications.
2. If any symptoms you may feel (such as tiredness or weakness) correlate with these results.

In short:
${outsideRange.length > 0
  ? `Your report shows that most values are typical, while ${outsideRange.map(o => o.name).join(', ')} is outside the reference range shown on your report. Discuss this with your doctor at your next visit.`
  : 'All documented test values are within the laboratory reference ranges shown on your report.'}
This explanation is based solely on your uploaded report data and is not a clinical diagnosis.`;
  }

  /**
   * Plain-Language Prescription Explainer
   */
  explainPrescriptionsInPlainLanguage({ medications = [], documents = [], language = 'en' }) {
    return this.formatPrescriptionExplanation({ documents, medications, language });
  }

  /**
   * Multimodal Medical Document Extraction using Gemini
   */
  async extractDocumentEntities({ filePath, mimeType, buffer, originalName, category }) {
    if (!this.isAvailable()) {
      return this.deterministicDocumentExtraction({ originalName, category });
    }

    try {
      this.logOperation('extractDocument_start', { category, mimeType });

      let base64Data = '';
      if (buffer) {
        base64Data = buffer.toString('base64');
      } else if (filePath && fs.existsSync(filePath)) {
        base64Data = fs.readFileSync(filePath).toString('base64');
      }

      if (!base64Data) {
        return this.deterministicDocumentExtraction({ originalName, category });
      }

      const prompt = `You are a medical document processing AI. Analyze this clinical document/image (${originalName}, Category: ${category || 'General'}).
Extract all visible clinical facts accurately.
DO NOT invent information. If an item is not present, omit it or leave it empty.
Return a valid JSON object ONLY with the following structure:
{
  "doctorName": "Doctor's name if present, else empty string",
  "hospitalName": "Hospital or clinic or lab name if present, else empty string",
  "documentDate": "YYYY-MM-DD or empty string",
  "diagnosis": ["List of identified conditions or diagnoses"],
  "medicines": [
    {
      "name": "Medicine name",
      "dosage": "e.g. 500mg",
      "frequency": "e.g. Twice daily",
      "duration": "e.g. 30 Days",
      "confidence": 90
    }
  ],
  "labTests": [
    {
      "testName": "e.g. HbA1c",
      "value": "7.2",
      "numericValue": 7.2,
      "unit": "%",
      "referenceRange": "< 5.7%",
      "status": "high",
      "confidence": 95
    }
  ],
  "summary": "Brief 2-line clinical summary",
  "overallConfidence": 90
}`;

      const response = await this.client.models.generateContent({
        model: this.modelName,
        contents: [
          {
            role: 'user',
            parts: [
              {
                inlineData: {
                  mimeType: mimeType || 'image/jpeg',
                  data: base64Data,
                },
              },
              { text: prompt },
            ],
          },
        ],
      });

      const text = response?.text || '';
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        this.logOperation('extractDocument_success');
        return {
          ocrRawText: text,
          overallConfidence: parsed.overallConfidence || 88,
          extractedData: {
            doctorName: parsed.doctorName || '',
            hospitalName: parsed.hospitalName || '',
            documentDate: parsed.documentDate ? new Date(parsed.documentDate) : new Date(),
            diagnosis: Array.isArray(parsed.diagnosis) ? parsed.diagnosis : [],
            medicines: Array.isArray(parsed.medicines) ? parsed.medicines : [],
            labTests: Array.isArray(parsed.labTests) ? parsed.labTests : [],
            summary: parsed.summary || '',
          },
        };
      }
    } catch (err) {
      this.logOperation('extractDocument_error', { message: err?.message?.substring(0, 100) });
    }

    return this.deterministicDocumentExtraction({ originalName, category });
  }

  /**
   * Safe document extraction fallback
   */
  deterministicDocumentExtraction({ originalName, category }) {
    return {
      ocrRawText: `Document uploaded: ${originalName} (Category: ${category})`,
      overallConfidence: 80,
      extractedData: {
        doctorName: '',
        hospitalName: '',
        documentDate: new Date(),
        diagnosis: [],
        medicines: [],
        labTests: [],
        summary: `Document "${originalName}" uploaded successfully for plain-language review.`,
      },
    };
  }

  /**
   * Citations including uploaded documents, clinical records, and lab metrics
   */
  buildSourcesFromContext(userContext) {
    const { medications = [], labMetrics = [], records = [], documents = [] } = userContext;
    const sources = [];

    if (documents.length > 0) {
      documents.slice(0, 2).forEach(d => {
        sources.push({
          title: d.originalName || 'Medical Document',
          date: d.extractedData?.documentDate
            ? new Date(d.extractedData.documentDate).toLocaleDateString()
            : new Date(d.createdAt).toLocaleDateString(),
          hospital: d.extractedData?.hospitalName || 'Clinical Laboratory',
          type: (d.category || 'laboratory_report').replace('_', ' ').toUpperCase(),
        });
      });
    }

    if (records.length > 0) {
      records.slice(0, 2).forEach(r => {
        sources.push({
          title: r.title || 'Clinical Encounter',
          date: new Date(r.date).toLocaleDateString(),
          hospital: r.hospitalClinicName || 'Verified Facility',
          type: r.recordType || 'Record',
        });
      });
    } else if (labMetrics.length > 0 && sources.length === 0) {
      sources.push({
        title: 'Laboratory Test Results',
        date: new Date(labMetrics[0].date).toLocaleDateString(),
        type: 'Laboratory Metric',
      });
    } else if (medications.length > 0 && sources.length === 0) {
      sources.push({
        title: 'Active Prescription List',
        date: new Date().toLocaleDateString(),
        type: 'Medications',
      });
    }

    return sources;
  }

  getSafetyDisclaimer(language) {
    const disclaimers = {
      ta: 'குறிப்பு: ஹெல்த் கோபைலட் உங்கள் மருத்துவ பதிவுகளைப் புரிந்துகொள்ள மட்டுமே உதவுகிறது. இது மருத்துவ ஆலோசனை அல்லது நோயறிதலுக்கு மாற்றாகாது.',
      hi: 'कृपया ध्यान दें: हेल्थ कोपायलट केवल आपकी मौजूदा स्वास्थ्य रिपोर्ट को समझाने में मदद करता है और यह किसी भी चिकित्सीय निदान का विकल्प नहीं है।',
      te: 'గమనిక: హెల్త్ కోపైలట్ మీ నివేదికలను అర్థం చేసుకోవడానికి మాత్రమే సమాచారాన్ని అందిస్తుంది. ఇది వైద్య నిర్ధారణకు ప్రత్యామ్నాయం కాదు.',
      en: 'Please note: Health Copilot provides plain-language explanations of your verified medical data only and does not diagnose medical conditions. Always consult your physician.',
    };
    return disclaimers[language] || disclaimers.en;
  }
}

export const geminiService = new GeminiService();
export default geminiService;
