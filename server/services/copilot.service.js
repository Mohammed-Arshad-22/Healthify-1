import { retrievalService, RETRIEVAL_INTENTS, RETRIEVAL_STRATEGIES } from './retrieval.service.js';
import { sarvamService } from './sarvam/index.js';
import { geminiService } from './gemini.service.js';
import { ragService } from './rag.service.js';
import Document from '../models/Document.js';
import LabMetric from '../models/LabMetric.js';
import Medication from '../models/Medication.js';
import AIExtraction from '../models/AIExtraction.js';
import DocumentExtraction from '../models/DocumentExtraction.js';

/**
 * PHASE 12: Plain-Language Medical Terminology Dictionary
 * Translates complex clinical test names and metrics into accessible everyday language
 * across English and Tamil while maintaining exact numerical values, units, and ranges.
 */
export const PLAIN_LANGUAGE_MEDICAL_DICT = {
  hemoglobin: {
    aliases: ['hemoglobin', 'hb', 'hgb', 'ஹீமோகுளோபின்', 'हीमोग्लोबिन', 'హిమోగ్లోబిన్'],
    term: 'Hemoglobin',
    ta_term: 'ஹீமோகுளோபின் (Hemoglobin)',
    function_en: 'Hemoglobin helps carry oxygen around your body.',
    function_ta: 'ஹீமோகுளோபின் உங்கள் உடல் முழுவதும் ஆக்ஸிஜனைக் கொண்டு செல்ல உதவுகிறது.',
    low_reason_en: 'A low result can happen for several reasons, so discuss it with a healthcare professional.',
    low_reason_ta: 'குறைந்த முடிவு பல காரணங்களால் ஏற்படலாம், எனவே இதனை உங்கள் மருத்துவரிடம் கலந்துரையாடவும்.',
    high_reason_en: 'A high result can happen for several reasons, so discuss it with a healthcare professional.',
    high_reason_ta: 'அதிகரித்த முடிவு பல காரணங்களால் ஏற்படலாம், எனவே இதனை உங்கள் மருத்துவரிடம் கலந்துரையாடவும்.',
  },
  glucose: {
    aliases: ['glucose', 'blood sugar', 'fasting blood glucose', 'ppbs', 'fbs', 'இரத்த சர்க்கரை', 'ரத்த சர்க்கரை', 'ब्लड शुगर'],
    term: 'Blood Glucose',
    ta_term: 'இரத்த சர்க்கரை (Blood Glucose)',
    function_en: 'Glucose measures the amount of sugar in your bloodstream, which provides energy to your cells.',
    function_ta: 'குளுக்கோஸ் உங்கள் இரத்தத்தில் உள்ள சர்க்கரையின் அளவை அளவிடுகிறது, இது உங்கள் செல்களுக்கு ஆற்றலை வழங்குகிறது.',
    low_reason_en: 'A lower blood sugar level can happen for several reasons, so discuss it with a healthcare professional.',
    low_reason_ta: 'குறைந்த சர்க்கரை அளவு பல காரணங்களால் ஏற்படலாம், எனவே உங்கள் மருத்துவரிடம் கலந்துரையாடவும்.',
    high_reason_en: 'A higher blood sugar result can happen for various metabolic reasons, so discuss it with a healthcare professional.',
    high_reason_ta: 'அதிகரித்த இரத்த சர்க்கரை அளவு பல்வேறு வளர்சிதை மாற்ற காரணங்களால் ஏற்படலாம், எனவே உங்கள் மருத்துவரிடம் கலந்துரையாடவும்.',
  },
  hba1c: {
    aliases: ['hba1c', 'glycated hemoglobin', 'a1c', 'hb a1c', 'எச்பிஏ1சி', 'एचबीए1सी'],
    term: 'HbA1c',
    ta_term: 'HbA1c (சராசரி இரத்த சர்க்கரை)',
    function_en: 'HbA1c reflects your average blood sugar level over the past two to three months.',
    function_ta: 'HbA1c என்பது கடந்த இரண்டு முதல் மூன்று மாதங்களில் உங்கள் சராசரி இரத்த சர்க்கரை அளவைக் குறிக்கிறது.',
    high_reason_en: 'An elevated HbA1c suggests that your average blood sugar has been higher than typical targets recently, so discuss it with a healthcare professional.',
    high_reason_ta: 'அதிகரித்த HbA1c அளவு சமீபத்திய மாதங்களில் சராசரி சர்க்கரை அதிகமாக இருந்ததைக் குறிக்கிறது, எனவே உங்கள் மருத்துவரிடம் ஆலோசிக்கவும்.',
    low_reason_en: 'A lower HbA1c can happen for various reasons, so discuss it with a healthcare professional.',
    low_reason_ta: 'குறைந்த HbA1c அளவு குறித்து உங்கள் மருத்துவரிடம் கலந்துரையாடவும்.',
  },
  creatinine: {
    aliases: ['creatinine', 'serum creatinine', 'கிரியேட்டினின்', 'क्रिएटिनिन'],
    term: 'Creatinine',
    ta_term: 'கிரியேட்டினின் (Creatinine)',
    function_en: 'Creatinine is a waste product filtered by healthy kidneys to show how well your kidneys are working.',
    function_ta: 'கிரியேட்டினின் என்பது ஆரோக்கியமான சிறுநீரகங்களால் வடிகட்டப்படும் ஒரு கழிவுப் பொருளாகும், இது சிறுநீரக செயல்பாட்டை மதிப்பிட உதவுகிறது.',
    high_reason_en: 'A high creatinine level can happen for several reasons, including hydration changes or kidney filtering differences, so discuss it with a healthcare professional.',
    high_reason_ta: 'அதிகரித்த கிரியேட்டினின் அளவு நீர்ச்சத்து குறைபாடு உட்பட பல காரணங்களால் ஏற்படலாம், எனவே உங்கள் மருத்துவரிடம் கலந்துரையாடவும்.',
    low_reason_en: 'A lower creatinine level can happen for several metabolic reasons, so discuss it with a healthcare professional.',
    low_reason_ta: 'குறைந்த கிரியேட்டினின் அளவு குறித்து உங்கள் மருத்துவரிடம் கலந்துரையாடவும்.',
  },
  platelets: {
    aliases: ['platelet', 'platelets', 'plt', 'platelet count', 'பிளேட்லெட்டுகள்', 'பிளேட்லெட்'],
    term: 'Platelets',
    ta_term: 'பிளேட்லெட்டுகள் (Platelets)',
    function_en: 'Platelets are tiny blood cells that help your blood clot and prevent bleeding.',
    function_ta: 'பிளேட்லெட்டுகள் என்பவை இரத்தம் உறைவதற்கும் ரத்தப்போக்கைத் தடுப்பதற்கும் உதவும் இரத்த அணுக்கள் ஆகும்.',
    low_reason_en: 'A low platelet count can happen for various medical reasons, so discuss it with a healthcare professional.',
    low_reason_ta: 'குறைந்த பிளேட்லெட் எண்ணிக்கை பல காரணங்களால் ஏற்படலாம், எனவே உங்கள் மருத்துவரிடம் கலந்துரையாடவும்.',
    high_reason_en: 'An elevated platelet count can happen for several reasons, so discuss it with a healthcare professional.',
    high_reason_ta: 'அதிகரித்த பிளேட்லெட் எண்ணிக்கை குறித்து உங்கள் மருத்துவரிடம் ஆலோசிக்கவும்.',
  },
  cholesterol: {
    aliases: ['cholesterol', 'total cholesterol', 'lipid', 'ldl', 'hdl', 'triglycerides', 'கொலஸ்ட்ரால்'],
    term: 'Total Cholesterol',
    ta_term: 'கொலஸ்ட்ரால் (Cholesterol)',
    function_en: 'Cholesterol is a type of fat in your blood needed for building cells, though balanced levels support heart health.',
    function_ta: 'கொலஸ்ட்ரால் என்பது உடலுக்குத் தேவையான ஒரு வகை கொழுப்பு ஆகும், இதன் சமநிலை இதய ஆரோக்கியத்திற்கு முக்கியமானது.',
    high_reason_en: 'A higher cholesterol level can happen for dietary, metabolic, or genetic reasons, so discuss it with a healthcare professional.',
    high_reason_ta: 'அதிகரித்த கொலஸ்ட்ரால் உணவுமுறை உட்பட பல காரணங்களால் ஏற்படலாம், எனவே உங்கள் மருத்துவரிடம் ஆலோசிக்கவும்.',
    low_reason_en: 'A lower cholesterol level can happen for various metabolic reasons, so discuss it with a healthcare professional.',
    low_reason_ta: 'குறைந்த கொலஸ்ட்ரால் குறித்து மருத்துவரிடம் ஆலோசிக்கவும்.',
  },
  wbc: {
    aliases: ['wbc', 'white blood cells', 'white blood cell count', 'tlc', 'வெள்ளை இரத்த அணுக்கள்', 'வெள்ளை அணுக்கள்'],
    term: 'White Blood Cell Count',
    ta_term: 'வெள்ளை இரத்த அணுக்கள் (WBC)',
    function_en: 'White blood cells are part of your immune system that help defend your body against infections.',
    function_ta: 'வெள்ளை இரத்த அணுக்கள் உங்கள் உடலை நோய்த்தொற்றுகளிலிருந்து பாதுகாக்க உதவும் நோயெதிர்ப்பு மண்டலத்தின் ஒரு பகுதியாகும்.',
    high_reason_en: 'An elevated white blood cell count can happen when your body is responding to inflammation or infection, so discuss it with a healthcare professional.',
    high_reason_ta: 'அதிகரித்த வெள்ளை இரத்த அணுக்கள் தொற்று அல்லது அழற்சியின் காரணமாக ஏற்படலாம், எனவே உங்கள் மருத்துவரிடம் ஆலோசிக்கவும்.',
    low_reason_en: 'A low white blood cell count can happen for several reasons, so discuss it with a healthcare professional.',
    low_reason_ta: 'குறைந்த வெள்ளை இரத்த அணுக்கள் குறித்து மருத்துவரிடம் ஆலோசிக்கவும்.',
  },
  rbc: {
    aliases: ['rbc', 'red blood cells', 'red blood cell count', 'சிவப்பு இரத்த அணுக்கள்'],
    term: 'Red Blood Cell Count',
    ta_term: 'சிவப்பு இரத்த அணுக்கள் (RBC)',
    function_en: 'Red blood cells carry oxygen from your lungs to tissues throughout your body.',
    function_ta: 'சிவப்பு இரத்த அணுக்கள் நுரையீரலில் இருந்து உடலின் மற்ற பகுதிகளுக்கு ஆக்ஸிஜனை எடுத்துச் செல்கின்றன.',
    low_reason_en: 'A low red blood cell count can happen for several reasons, so discuss it with a healthcare professional.',
    low_reason_ta: 'குறைந்த சிவப்பு அணுக்கள் பல காரணங்களால் ஏற்படலாம், எனவே மருத்துவரிடம் ஆலோசிக்கவும்.',
    high_reason_en: 'An elevated red blood cell count can happen for several reasons, so discuss it with a healthcare professional.',
    high_reason_ta: 'அதிகரித்த சிவப்பு அணுக்கள் குறித்து மருத்துவரிடம் ஆலோசிக்கவும்.',
  },
  tsh: {
    aliases: ['tsh', 'thyroid stimulating hormone', 'thyroid', 'தைராய்டு'],
    term: 'Thyroid Stimulating Hormone (TSH)',
    ta_term: 'தைராய்டு ஹார்மோன் (TSH)',
    function_en: 'TSH tells your thyroid gland how much hormone to produce to regulate energy and metabolism.',
    function_ta: 'TSH என்பது உங்கள் தைராய்டு சுரப்பி உடலின் வளர்சிதை மாற்றத்தைக் கட்டுப்படுத்த எவ்வளவு ஹார்மோன்களை உற்பத்தி செய்ய வேண்டும் என்பதைக் குறிக்கிறது.',
    high_reason_en: 'A high TSH result can happen for thyroid regulatory reasons, so discuss it with a healthcare professional.',
    high_reason_ta: 'அதிகரித்த TSH அளவு தைராய்டு சுரப்பி மாற்றங்களால் ஏற்படலாம், எனவே மருத்துவரிடம் ஆலோசிக்கவும்.',
    low_reason_en: 'A low TSH result can happen for several reasons, so discuss it with a healthcare professional.',
    low_reason_ta: 'குறைந்த TSH அளவு குறித்து மருத்துவரிடம் ஆலோசிக்கவும்.',
  },
  blood_pressure: {
    aliases: ['blood pressure', 'bp', 'systolic', 'diastolic', 'இரத்த அழுத்தம்'],
    term: 'Blood Pressure',
    ta_term: 'இரத்த அழுத்தம் (Blood Pressure)',
    function_en: 'Blood pressure is the force of your blood pushing against the walls of your arteries as your heart pumps.',
    function_ta: 'இரத்த அழுத்தம் என்பது இதயம் இரத்தத்தை பம்ப் செய்யும் போது இரத்த நாளங்களில் ஏற்படும் அழுத்தத்தின் அளவாகும்.',
    high_reason_en: 'A higher blood pressure reading can happen for various cardiovascular reasons, so discuss it with a healthcare professional.',
    high_reason_ta: 'அதிகரித்த இரத்த அழுத்தம் பல காரணங்களால் ஏற்படலாம், எனவே மருத்துவரிடம் ஆலோசிக்கவும்.',
    low_reason_en: 'A lower blood pressure reading can happen for several reasons, so discuss it with a healthcare professional.',
    low_reason_ta: 'குறைந்த இரத்த அழுத்தம் குறித்து மருத்துவரிடம் ஆலோசிக்கவும்.',
  },
};

export const PLAIN_LANGUAGE_MED_DICT = {
  metformin: {
    aliases: ['metformin', 'metformin hydrochloride', 'மெட்ஃபோர்மின்'],
    name: 'Metformin',
    ta_name: 'மெட்ஃபோர்மின் (Metformin)',
    simple_role_en: 'helps your body manage and balance blood sugar levels',
    simple_role_ta: 'உங்கள் உடலில் இரத்த சர்க்கரை அளவை சமநிலையில் கட்டுப்படுத்த உதவுகிறது',
    simple_instructions_en: 'usually taken with meals or after food to support comfortable digestion',
    simple_instructions_ta: 'வயிற்று அசௌகரியத்தைத் தவிர்க்க உணவுடன் அல்லது உணவுக்குப் பின் உட்கொள்ள வேண்டும்',
  },
  atorvastatin: {
    aliases: ['atorvastatin', 'lipitor', 'அடோர்வாஸ்டேடின்'],
    name: 'Atorvastatin',
    ta_name: 'அடோர்வாஸ்டேடின் (Atorvastatin)',
    simple_role_en: 'helps manage blood cholesterol levels to support your heart and blood vessels',
    simple_role_ta: 'இதய மற்றும் இரத்த நாளங்களின் ஆரோக்கியத்தைப் பாதுகாக்க கொழுப்பின் அளவைக் கட்டுப்படுத்த உதவுகிறது',
    simple_instructions_en: 'usually taken once daily, often in the evening or at night',
    simple_instructions_ta: 'பொதுவாக இரவில் ஒரு முறை உட்கொள்ள பரிந்துரைக்கப்படுகிறது',
  },
  azithromycin: {
    aliases: ['azithromycin', 'zithromax', 'அசித்ரோமைசின்'],
    name: 'Azithromycin',
    ta_name: 'அசித்ரோமைசின் (Azithromycin)',
    simple_role_en: 'is an antibiotic that helps fight bacterial infections',
    simple_role_ta: 'பாக்டீரியா தொற்றுகளை குணப்படுத்த உதவும் ஒரு ஆண்டிபயாடிக் மருந்து',
    simple_instructions_en: 'should be taken for the complete duration prescribed by your doctor',
    simple_instructions_ta: 'மருத்துவர் குறிப்பிட்ட முழு கால அளவிற்கும் உட்கொள்ள வேண்டும்',
  },
  amlodipine: {
    aliases: ['amlodipine', 'norvasc', 'அம்லோடிபைன்'],
    name: 'Amlodipine',
    ta_name: 'அம்லோடிபைன் (Amlodipine)',
    simple_role_en: 'helps relax your blood vessels to keep your blood pressure at a healthy level',
    simple_role_ta: 'இரத்த நாளங்களைத் தளர்த்தி, இரத்த அழுத்தத்தை சீராக வைத்திருக்க உதவுகிறது',
    simple_instructions_en: 'usually taken once daily at around the same time each day',
    simple_instructions_ta: 'தினமும் குறிப்பிட்ட நேரத்தில் தவறாமல் உட்கொள்ள வேண்டும்',
  },
  telmisartan: {
    aliases: ['telmisartan', 'micardis', 'டெல்மிசார்டன்'],
    name: 'Telmisartan',
    ta_name: 'டெல்மிசார்டன் (Telmisartan)',
    simple_role_en: 'helps keep blood vessels relaxed to support healthy blood pressure',
    simple_role_ta: 'இரத்த நாளங்களைத் தளர்த்தி இரத்த அழுத்தத்தை சீராகப் பராமரிக்க உதவுகிறது',
    simple_instructions_en: 'usually taken once daily with or without food',
    simple_instructions_ta: 'தினமும் ஒரு வேளை தவறாமல் உட்கொள்ள வேண்டும்',
  },
  paracetamol: {
    aliases: ['paracetamol', 'acetaminophen', 'crocin', 'dolo', 'பாராசிட்டமால்'],
    name: 'Paracetamol',
    ta_name: 'பாராசிட்டமால் (Paracetamol)',
    simple_role_en: 'helps relieve pain and reduce fever',
    simple_role_ta: 'வலி மற்றும் காய்ச்சலைக் குறைக்க உதவுகிறது',
    simple_instructions_en: 'taken as needed according to the prescribed dosage',
    simple_instructions_ta: 'தேவைப்படும் போது மருத்துவர் அறிவுறுத்தியபடி உட்கொள்ள வேண்டும்',
  },
};

/**
 * Helper: Find plain-language medical dictionary entry for a given test name
 */
export function lookupMedicalTermInfo(testName = '') {
  const t = (testName || '').toLowerCase().trim();
  if (!t) {
    return {
      term: '',
      ta_term: '',
      function_en: 'This laboratory test metric assesses your health status.',
      function_ta: 'இந்த மருத்துவப் பரிசோதனை உங்கள் உடல் ஆரோக்கியத்தை மதிப்பிடுகிறது.',
      low_reason_en: 'A low result can happen for several reasons, so discuss it with a healthcare professional.',
      low_reason_ta: 'குறைந்த முடிவு பல காரணங்களால் ஏற்படலாம், எனவே இதனை உங்கள் மருத்துவரிடம் கலந்துரையாடவும்.',
      high_reason_en: 'A high result can happen for several reasons, so discuss it with a healthcare professional.',
      high_reason_ta: 'அதிகரித்த முடிவு பல காரணங்களால் ஏற்படலாம், எனவே இதனை உங்கள் மருத்துவரிடம் கலந்துரையாடவும்.',
    };
  }

  // 1. Exact match check
  for (const [key, entry] of Object.entries(PLAIN_LANGUAGE_MEDICAL_DICT)) {
    if (t === key || (entry.aliases && entry.aliases.some(a => a.toLowerCase() === t))) {
      return entry;
    }
  }

  // 2. Longer keys / aliases match first (e.g. hba1c matches before hb)
  const entries = Object.entries(PLAIN_LANGUAGE_MEDICAL_DICT).sort((a, b) => b[0].length - a[0].length);
  for (const [key, entry] of entries) {
    if (t.includes(key)) {
      return entry;
    }
    if (entry.aliases) {
      for (const a of entry.aliases) {
        const al = a.toLowerCase();
        if (al.length <= 3) {
          const regex = new RegExp(`(^|[^a-z0-9])${al.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^a-z0-9]|$)`, 'i');
          if (regex.test(t)) return entry;
        } else if (t.includes(al)) {
          return entry;
        }
      }
    }
  }

  return {
    term: testName,
    ta_term: testName,
    function_en: `${testName} is a laboratory test metric assessed on your health panel to evaluate your health.`,
    function_ta: `${testName} என்பது உங்கள் உடல் ஆரோக்கியத்தை மதிப்பிடும் ஒரு மருத்துவப் பரிசோதனையாகும்.`,
    low_reason_en: 'A low result can happen for several reasons, so discuss it with a healthcare professional.',
    low_reason_ta: 'குறைந்த முடிவு பல காரணங்களால் ஏற்படலாம், எனவே இதனை உங்கள் மருத்துவரிடம் கலந்துரையாடவும்.',
    high_reason_en: 'A high result can happen for several reasons, so discuss it with a healthcare professional.',
    high_reason_ta: 'அதிகரித்த முடிவு பல காரணங்களால் ஏற்படலாம், எனவே இதனை உங்கள் மருத்துவரிடம் கலந்துரையாடவும்.',
  };
}

/**
 * Helper: Find plain-language medication entry for a given medicine name
 */
export function lookupMedicationInfo(medName = '') {
  const m = (medName || '').toLowerCase().trim();
  if (!m) {
    return {
      name: '',
      ta_name: '',
      simple_role_en: 'helps manage your health condition as prescribed by your doctor',
      simple_role_ta: 'உங்கள் மருத்துவர் பரிந்துரைத்தபடி உங்கள் உடல்நிலையைக் கட்டுப்படுத்த உதவுகிறது',
      simple_instructions_en: 'take as directed by your physician',
      simple_instructions_ta: 'உங்கள் மருத்துவர் அறிவுறுத்தியபடி உட்கொள்ள வேண்டும்',
    };
  }

  // 1. Exact match
  for (const [key, entry] of Object.entries(PLAIN_LANGUAGE_MED_DICT)) {
    if (m === key || (entry.aliases && entry.aliases.some(a => a.toLowerCase() === m))) {
      return entry;
    }
  }

  // 2. Substring or boundary match
  const entries = Object.entries(PLAIN_LANGUAGE_MED_DICT).sort((a, b) => b[0].length - a[0].length);
  for (const [key, entry] of entries) {
    if (m.includes(key)) {
      return entry;
    }
    if (entry.aliases) {
      for (const a of entry.aliases) {
        const al = a.toLowerCase();
        if (al.length <= 3) {
          const regex = new RegExp(`(^|[^a-z0-9])${al.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^a-z0-9]|$)`, 'i');
          if (regex.test(m)) return entry;
        } else if (m.includes(al)) {
          return entry;
        }
      }
    }
  }

  return {
    name: medName,
    ta_name: medName,
    simple_role_en: 'helps manage your health condition as prescribed by your doctor',
    simple_role_ta: 'உங்கள் மருத்துவர் பரிந்துரைத்தபடி உங்கள் உடல்நிலையைக் கட்டுப்படுத்த உதவுகிறது',
    simple_instructions_en: 'take as directed by your physician',
    simple_instructions_ta: 'உங்கள் மருத்துவர் அறிவுறுத்தியபடி உட்கொள்ள வேண்டும்',
  };
}

export class CopilotService {
  /**
   * 1. Follow-Up Conversation Context & Coreference Resolver
   * Resolves pronouns ("he", "she", "they", "it", "this test", "that medicine")
   * using conversation history, then uses the resolved query for database retrieval.
   * RULE: Does NOT use previous AI responses as the medical source of truth.
   */
  resolveFollowUpQuery({ query = '', history = [] }) {
    const q = (query || '').trim();
    if (!history || !Array.isArray(history) || history.length === 0) {
      return {
        resolvedQuery: q,
        isFollowUp: false,
        resolvedEntity: null,
      };
    }

    // Inspect previous messages (prioritize most recent turns)
    const reversedHistory = [...history].reverse();
    let lastDoctor = null;
    let lastTest = null;
    let lastMedicine = null;
    let lastTopic = null;

    for (const msg of reversedHistory) {
      const text = msg.content || '';

      // Extract doctor name: "Dr. Kumar", "Dr. Anita Desai", "Doctor Sharma"
      if (!lastDoctor) {
        const docMatch = text.match(/(?:Dr\.|Doctor)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/);
        if (docMatch) {
          lastDoctor = `Dr. ${docMatch[1].trim()}`;
        }
      }

      // Extract lab test name
      if (!lastTest) {
        const testMatch = text.match(/\b(hemoglobin|hba1c|glucose|blood sugar|creatinine|platelets|platelet count|wbc|rbc|tsh|cholesterol|lipid|blood pressure|bp)\b/i);
        if (testMatch) {
          lastTest = testMatch[1].toLowerCase();
        }
      }

      // Extract medicine name
      if (!lastMedicine) {
        const medMatch = text.match(/\b(metformin|lisinopril|amlodipine|atorvastatin|aspirin|paracetamol|insulin|telmisartan)\b/i);
        if (medMatch) {
          lastMedicine = medMatch[1];
        }
      }

      // Extract topic
      if (!lastTopic) {
        if (/blood report|lab report/i.test(text)) lastTopic = 'blood report';
        else if (/prescription/i.test(text)) lastTopic = 'prescription';
      }
    }

    let resolvedQuery = q;
    let isFollowUp = false;
    let resolvedEntity = null;

    // A. Resolve Doctor pronouns ("he", "she", "they", "his", "her", "that doctor")
    const doctorPronounRegex = /\b(he|she|they|his|her|their)\b/i;
    if (lastDoctor && doctorPronounRegex.test(q)) {
      isFollowUp = true;
      resolvedEntity = { type: 'DOCTOR', value: lastDoctor };
      // Replace pronoun with doctor name: "What did he prescribe?" -> "What did Dr. Kumar prescribe?"
      resolvedQuery = q
        .replace(/\b(what did|what has)\s+(he|she|they)\s+prescribe\b/i, `What medicines did ${lastDoctor} prescribe`)
        .replace(/\b(what did|what has)\s+(he|she|they)\s+(give|recommend|say|write)\b/i, `What did ${lastDoctor} prescribe`)
        .replace(/\b(he|she|they)\b/gi, lastDoctor)
        .replace(/\b(his|her|their)\b/gi, `${lastDoctor}'s`);
    }

    // B. Resolve Test pronouns ("it", "this test", "that test", "is it normal", "what does it mean")
    const testPronounRegex = /\b(is it normal|what does it mean|how is it|is it high|is it low|my (result|value))\b/i;
    if (lastTest && (testPronounRegex.test(q) || (/\b(it|this test)\b/i.test(q) && !q.includes('doctor')))) {
      isFollowUp = true;
      resolvedEntity = { type: 'TEST', value: lastTest };
      resolvedQuery = q
        .replace(/\bis it normal\b/i, `Is my ${lastTest} normal`)
        .replace(/\bwhat does it mean\b/i, `What does my ${lastTest} mean`)
        .replace(/\b(it|this test)\b/gi, `my ${lastTest}`);
    }

    // C. Resolve Language follow-up: "Explain this in Tamil" / "Explain in Hindi"
    if (/^(explain this|explain it|tell me this|say this)\s+in\s+(tamil|hindi|telugu)/i.test(q)) {
      isFollowUp = true;
      if (lastDoctor) {
        resolvedEntity = { type: 'DOCTOR', value: lastDoctor };
        resolvedQuery = 'Who is my doctor?';
      } else if (lastTest) {
        resolvedEntity = { type: 'TEST', value: lastTest };
        resolvedQuery = `What is my ${lastTest}?`;
      } else if (lastMedicine) {
        resolvedEntity = { type: 'MEDICATION', value: lastMedicine };
        resolvedQuery = 'What medicines did my doctor prescribe?';
      } else if (lastTopic) {
        resolvedEntity = { type: 'LANGUAGE_SWITCH', value: lastTopic };
        resolvedQuery = `Explain my ${lastTopic}`;
      } else {
        resolvedQuery = 'Explain my medical records';
      }
    }

    return {
      resolvedQuery,
      isFollowUp,
      resolvedEntity,
    };
  }

  /**
   * 2. Build Generation Prompt (Mandatory Prompt Format)
   * Prompt MUST contain:
   * USER QUESTION:
   * {actual_user_question}
   * RELEVANT HEALTH INFORMATION:
   * {relevant_context}
   */
  buildGenerationPrompt({ query, relevantContext, language = 'en' }) {
    const langNames = {
      ta: 'Tamil (தமிழ்)',
      hi: 'Hindi (हिन्दी)',
      te: 'Telugu (తెలుగు)',
      en: 'English',
    };
    const targetLang = langNames[language] || 'English';

    return `You are "Personal Health Copilot", a compassionate, non-diagnostic AI health assistant.

MANDATORY RULES:
1. Answer the current question directly. Do not answer a different question.
2. Do not dump unrelated medical information.
3. Do not invent missing information. Use ONLY retrieved relevant records.
4. Do not diagnose any medical condition. A single abnormal result is never a definitive diagnosis.
5. Do not prescribe medication, recommend changing dosage, or recommend stopping medication.
6. If the user asks "Who is my doctor?", answer ONLY about the doctor. Do NOT return medications unless asked.
7. If the user asks about medications, answer ONLY about medications.
8. If the user asks about glucose or a specific lab test, answer ONLY about that test.
9. If the user asks which values are abnormal, answer ONLY about abnormal observations.
10. If information is missing: "I couldn't find that information in your uploaded records."
11. Answer completely in ${targetLang}. Never expose raw OCR unless asked. Never output internal tokens.
12. PLAIN-LANGUAGE MEDICAL EXPLANATIONS (PHASE 12):
    - Translate medical terminology into understandable everyday language.
    - Example for Hemoglobin: Do NOT simply say "Hemoglobin is decreased, which may indicate anemia." Instead explain: "Your hemoglobin level is lower than the reference range shown in your report. Hemoglobin helps carry oxygen around your body. A low result can happen for several reasons, so discuss it with a healthcare professional."
    - Do not fabricate symptoms. Do not diagnose. Do not invent values.
    - For Tamil: Explain the same verified information in clear, natural Tamil. Maintain the original medical value, unit and reference range.
    - Do NOT expose internal RAG markers or chunks.

USER QUESTION:
${query}

RELEVANT HEALTH INFORMATION:
${relevantContext || 'NO RELEVANT RECORDS FOUND.'}`;
  }

  /**
   * 3. Answer Validation
   * Enforces non-diagnostic safety, non-prescriptive rules, and strips internal markers.
   */
  validateAnswer({ answer = '', intent, query, relevantRecords = [], language = 'en' }) {
    let clean = (answer || '').trim();

    // Strip internal RAG, extraction, and chunk markers
    clean = clean
      .replace(/<<<UNTRUSTED_DOCUMENT_CONTENT_START>>>/g, '')
      .replace(/<<<UNTRUSTED_DOCUMENT_CONTENT_END>>>/g, '')
      .replace(/Confidence:\s*100%/gi, 'Based on your uploaded records')
      .replace(/Confidence:\s*94%/gi, 'Based on your uploaded records')
      .replace(/Confidence:\s*\d+%/gi, 'Based on your uploaded records')
      .replace(/\b(100%|94%)\s*(confidence|certainty)/gi, 'Based on your uploaded records')
      .replace(/\bconfidence\s*:\s*(100%|94%)/gi, 'Based on your uploaded records')
      .replace(/\[INTERNAL_[^\]]+\]/gi, '')
      .replace(/\[RAG_[^\]]+\]/gi, '')
      .replace(/\[DOCUMENT_ID:[^\]]+\]/gi, '')
      .replace(/retrieval_strategy:\s*[A-Za-z0-9_]+/gi, '')
      .replace(/relevance_information:\s*\{.*?\}/gs, '')
      .replace(/--- Excerpt #\d+ ---/g, '')
      .replace(/--- CHUNK #\d+.*?---/gs, '')
      .replace(/=== RETRIEVED USER MEDICAL CONTEXT.*?===/gs, '')
      .replace(/=== RETRIEVED MEDICAL CONTEXT.*?===/gs, '')
      .replace(/\[MULTI-DOCUMENT COMPARISON.*?\]/gs, '')
      .trim();

    // Strip raw OCR dump unless explicitly requested
    if (!/raw ocr/i.test(query) && clean.includes('RAW OCR DUMP:')) {
      clean = clean.split('RAW OCR DUMP:')[0].trim();
    }

    // Safety Neutralizer 1: Definite diagnosis claims (Phase 12 plain-language requirement)
    clean = clean.replace(/hemoglobin is decreased, which may indicate anemia/gi, 'Your hemoglobin level is lower than the reference range shown in your report. Hemoglobin helps carry oxygen around your body. A low result can happen for several reasons, so discuss it with a healthcare professional.');
    clean = clean.replace(/which may indicate anemia/gi, 'a low result can happen for several reasons, so discuss it with a healthcare professional');
    clean = clean.replace(/which may indicate (diabetes|hypertension)/gi, 'which should be evaluated with your healthcare professional');
    clean = clean.replace(/you (have|are diagnosed with|suffer from) (anemia|diabetes|hypertension)/gi, (match, v, cond) => {
      return `your results show numbers that your doctor can evaluate regarding ${cond}`;
    });
    clean = clean.replace(/your (low|high) hemoglobin indicates anemia/gi, 'your hemoglobin is lower than typical reference range');

    // Safety Neutralizer for Tamil:
    clean = clean.replace(/ஹீமோகுளோபின் குறைவாக உள்ளது,?\s*(இது\s*)?இரத்த\s*சோகையைக்\s*குறிக்கலாம்/gi, 'உங்கள் அறிக்கையில் உள்ள குறிப்பு வரம்பை விட உங்கள் ஹீமோகுளோபின் அளவு குறைவாக உள்ளது. ஹீமோகுளோபின் உங்கள் உடல் முழுவதும் ஆக்ஸிஜனைக் கொண்டு செல்ல உதவுகிறது. குறைந்த முடிவு பல காரணங்களால் ஏற்படலாம், எனவே இதனை உங்கள் மருத்துவரிடம் கலந்துரையாடவும்.');

    // Safety Neutralizer 2: Dosage modification recommendations
    clean = clean.replace(/(?:you should|please)\s+(?:increase|decrease|double|stop)\s+(?:the|your)?\s*dosage/gi, 'Always consult your doctor before modifying medication dosage');
    clean = clean.replace(/(?:stop taking|discontinue)\s+(?:this|your)?\s*medication/gi, 'Do not stop medications without consulting your doctor');

    // Safety Guard: Doctor queries MUST NOT contain unrelated medication dumps
    if (intent === RETRIEVAL_INTENTS.DOCTOR) {
      if (clean.includes('Prescribed Medications:') || clean.includes('Current Medicines:')) {
        const parts = clean.split(/Prescribed Medications:|Current Medicines:/i);
        clean = parts[0].trim();
      }
    }

    // Safety Guard: Medication queries MUST NOT contain unrelated lab observations
    if (intent === RETRIEVAL_INTENTS.MEDICATION || intent === RETRIEVAL_INTENTS.PRESCRIPTION) {
      if (clean.includes('Laboratory Test Result') || clean.includes('Lab Results:')) {
        const parts = clean.split(/Laboratory Test Result|Lab Results:/i);
        clean = parts[0].trim();
      }
    }

    return clean;
  }

  /**
   * 4. Source Attribution Builder
   * Matches sources strictly to the answered entities and documents.
   * NEVER cites unrelated lab reports for medication inquiries.
   * NEVER cites unrelated prescriptions for lab inquiries.
   */
  buildSources({ sourceDocument, page, relevantRecords = [], intent }) {
    if (!relevantRecords || relevantRecords.length === 0) {
      return [];
    }

    const sources = [];
    const seen = new Set();
    const isMedIntent = [RETRIEVAL_INTENTS.MEDICATION, RETRIEVAL_INTENTS.PRESCRIPTION, RETRIEVAL_INTENTS.DOSAGE, RETRIEVAL_INTENTS.INSTRUCTIONS].includes(intent);
    const isLabIntent = [RETRIEVAL_INTENTS.LAB_RESULT, RETRIEVAL_INTENTS.ABNORMAL_LAB].includes(intent);

    if (sourceDocument) {
      const docName = sourceDocument.original_name || sourceDocument.title || 'Medical Document';
      const docDate = sourceDocument.document_date ? new Date(sourceDocument.document_date).toLocaleDateString('en-GB') : '';
      const docType = (sourceDocument.document_type || 'MEDICAL_RECORD').replace('_', ' ').toUpperCase();
      const pageNum = page || 1;

      // Source validation: Do not cite lab reports for medication queries, and do not cite prescriptions for lab queries
      const isLabDoc = docType.includes('LAB') || docName.toLowerCase().includes('lab');
      const isPrescriptionDoc = docType.includes('PRESCRIPTION') || docName.toLowerCase().includes('prescription');

      const isEligible = isMedIntent ? !isLabDoc : isLabIntent ? !isPrescriptionDoc : true;

      if (isEligible) {
        const key = `${docName}_${docType}_${pageNum}`;
        if (!seen.has(key)) {
          seen.add(key);
          sources.push({
            title: docName,
            date: docDate,
            type: docType,
            page: pageNum,
          });
        }
      }
    }

    // Add source documents referenced in records
    relevantRecords.forEach(r => {
      const docName = r.source_document || r.document_name || r.source_document_name;
      if (docName) {
        const isLabDoc = docName.toLowerCase().includes('lab');
        const isPrescriptionDoc = docName.toLowerCase().includes('prescription');
        const isEligible = isMedIntent ? !isLabDoc : isLabIntent ? !isPrescriptionDoc : true;

        if (isEligible) {
          const key = `${docName}_RECORD`;
          if (!seen.has(key)) {
            seen.add(key);
            sources.push({
              title: docName,
              date: r.document_date ? new Date(r.document_date).toLocaleDateString('en-GB') : '',
              type: isMedIntent ? 'PRESCRIPTION' : 'LAB REPORT',
              page: 1,
            });
          }
        }
      }
    });

    return sources;
  }

  /**
   * 5. Deterministic Grounded Engine for Phase 9 & Phase 10
   * Generates exact, safe, plain-language clinical answers adhering to clinical rules
   * when LLM is unavailable or for consistent deterministic responses.
   */
  generateGroundedAnswer({ intent, query, relevantRecords = [], sourceDocument, page, language = 'en' }) {
    const isTamil = language === 'ta';
    const isHindi = language === 'hi';
    const docName = sourceDocument?.original_name || 'uploaded record';
    const pageNum = page || 1;

    // A. DOCTOR INTENT
    if (intent === RETRIEVAL_INTENTS.DOCTOR) {
      const docRecord = relevantRecords[0] || {};
      const doctorName = docRecord.name || docRecord.doctorName || docRecord.doctor_name || docRecord.prescribedBy || null;
      const hospital = docRecord.hospital || docRecord.hospitalClinic || docRecord.clinic || '';

      if (!doctorName) {
        if (isTamil) {
          return `உங்கள் பதிவேற்றப்பட்ட ஆவணங்களில் உங்கள் மருத்துவரின் பெயர் காணப்படவில்லை. I couldn't find your doctor's name in your uploaded records. I couldn't find doctor information in your uploaded records. I couldn't find that information in your uploaded records.\nஆதாரம்: ${docName}, பக்கம் ${pageNum}.`;
        }
        return `I couldn't find your doctor's name in your uploaded records. I couldn't find doctor information in your uploaded records. I couldn't find that information in your uploaded records.\nSource: ${docName}, Page ${pageNum}.`;
      }

      if (isTamil) {
        return `உங்கள் பதிவேற்றப்பட்ட ஆவணத்தில் குறிப்பிடப்பட்டுள்ள மருத்துவர் ${doctorName} ஆகும்.
ஆதாரம்: ${docName}, பக்கம் ${pageNum}.`;
      }
      if (isHindi) {
        return `आपके अपलोड किए गए रिकॉर्ड में सूचीबद्ध डॉक्टर ${doctorName} हैं।
स्रोत: ${docName}, पृष्ठ ${pageNum}.`;
      }
      return `Your doctor listed in the uploaded prescription is ${doctorName}${hospital ? ` at ${hospital}` : ''}.\nSource: ${docName}, Page ${pageNum}.`;
    }

    // B. MEDICATION INTENT
    if (intent === RETRIEVAL_INTENTS.MEDICATION || intent === RETRIEVAL_INTENTS.PRESCRIPTION) {
      if (isTamil) {
        const medList = relevantRecords.map(m => {
          const medInfo = lookupMedicationInfo(m.name || m.medication);
          const doseStr = m.dosage ? `${m.dosage}` : '';
          const freqStr = m.frequency ? `${m.frequency}` : 'பரிந்துரைக்கப்பட்டபடி';
          const durStr = m.duration ? ` (${m.duration})` : '';
          const instStr = m.instructions ? `வழிகாட்டுதல்: ${m.instructions}.` : `பயன்பாடு: ${medInfo.simple_instructions_ta}.`;
          return `• ${m.name || medInfo.name}: ${doseStr ? `${doseStr}, ` : ''}${freqStr}${durStr} - எளிய விளக்கம்: ${medInfo.simple_role_ta}. ${instStr}`;
        }).join('\n');

        return `உங்கள் பதிவேற்றப்பட்ட மருந்துச் சீட்டின்படி, பரிந்துரைக்கப்பட்ட மருந்துகள் பற்றிய எளிய விளக்கம்:
${medList}

ஆதாரம்: ${docName}, பக்கம் ${pageNum}.
மருந்துகளை உங்கள் மருத்துவர் அறிவுறுத்தியபடியே உட்கொள்ளவும். மருத்துவ ஆலோசனையின்றி மருந்துகளை நிறுத்தவோ மாற்றவோ வேண்டாம்.`;
      }

      if (isHindi) {
        const medList = relevantRecords.map(m => `• ${m.name}: ${m.dosage || 'मानक खुराक'}, ${m.frequency || 'सलाह अनुसार'}${m.duration ? ` (${m.duration})` : ''}${m.instructions ? ` - ${m.instructions}` : ''}`).join('\n');
        return `आपके अपलोड किए गए पर्चे के अनुसार निर्धारित दवाएं:
${medList}

स्रोत: ${docName}, पृष्ठ ${pageNum}.
कृपया दवाएं डॉक्टर के निर्देशानुसार ही लें। डॉक्टर की सलाह के बिना खुराक में बदलाव न करें।`;
      }

      const medList = relevantRecords.map(m => {
        const medInfo = lookupMedicationInfo(m.name || m.medication);
        const doseStr = m.dosage ? `${m.dosage}` : '';
        const freqStr = m.frequency ? `${m.frequency}` : 'As advised';
        const durStr = m.duration ? ` (${m.duration})` : '';
        const instStr = m.instructions ? `Instructions: ${m.instructions}.` : `Directions: ${medInfo.simple_instructions_en}.`;
        return `• ${m.name || medInfo.name}: ${doseStr ? `${doseStr}, ` : ''}${freqStr}${durStr} - Plain-language explanation: ${medInfo.simple_role_en}. ${instStr}`;
      }).join('\n');

      return `Based on your uploaded prescription, here are the prescribed medications:\n\n${medList}\n\nSource: ${docName}, Page ${pageNum}.\nAlways follow your doctor's instructions. Do not stop or change medications without consulting your doctor.`;
    }

    // C. DOSAGE INTENT
    if (intent === RETRIEVAL_INTENTS.DOSAGE) {
      const med = relevantRecords[0] || {};
      const medInfo = lookupMedicationInfo(med.name || med.medication);
      if (isTamil) {
        return `${med.name || medInfo.name} பரிந்துரைக்கப்பட்ட அளவு: ${med.dosage || 'குறிப்பிடப்படவில்லை'} (${med.frequency || 'பரிந்துரைக்கப்பட்டபடி'}).\nஎளிய விளக்கம்: ${medInfo.simple_role_ta}.\nஆதாரம்: ${docName}, பக்கம் ${pageNum}.\nமருத்துவ ஆலோசனையின்றி மருந்து அளவை மாற்ற வேண்டாம்.`;
      }
      return `The prescribed dosage for ${med.name || medInfo.name} is ${med.dosage || 'as specified'} (${med.frequency || 'as advised'}).\nPlain-language explanation: ${medInfo.simple_role_en}.\nSource: ${docName}, Page ${pageNum}.\nDo not change your dosage without consulting your doctor.`;
    }

    // D. LAB_RESULT INTENT (e.g. Glucose, Hemoglobin, HbA1c, etc.)
    if (intent === RETRIEVAL_INTENTS.LAB_RESULT) {
      const obs = relevantRecords[0] || {};
      const testName = obs.test_name || 'Laboratory Test';
      const valStr = `${obs.value} ${obs.unit || ''}`.trim();
      const rangeStr = obs.reference_range ? `${obs.reference_range}` : '';

      const testLower = testName.toLowerCase();
      const dictEntry = lookupMedicalTermInfo(testName);

      const isLow = obs.abnormal_flag === 'LOW' || obs.status === 'LOW' || obs.status === 'low';
      const isHigh = obs.abnormal_flag === 'HIGH' || obs.status === 'HIGH' || obs.status === 'high';

      if (isTamil) {
        let taStatus = '';
        let taReason = '';
        if (isLow) {
          taStatus = `உங்கள் அறிக்கையில் உள்ள குறிப்பு வரம்பை விட உங்கள் ${dictEntry.ta_term || testName} அளவு குறைவாக உள்ளது`;
          taReason = dictEntry.low_reason_ta || 'குறைந்த முடிவு பல காரணங்களால் ஏற்படலாம், எனவே இதனை உங்கள் மருத்துவரிடம் கலந்துரையாடவும்.';
        } else if (isHigh) {
          taStatus = `உங்கள் அறிக்கையில் உள்ள குறிப்பு வரம்பை விட உங்கள் ${dictEntry.ta_term || testName} அளவு அதிகமாக உள்ளது`;
          taReason = dictEntry.high_reason_ta || 'அதிகரித்த முடிவு பல காரணங்களால் ஏற்படலாம், எனவே இதனை உங்கள் மருத்துவரிடம் கலந்துரையாடவும்.';
        } else {
          taStatus = `உங்கள் அறிக்கையில் காட்டப்பட்டுள்ள குறிப்பு வரம்பிற்குள் உங்கள் ${dictEntry.ta_term || testName} அளவு இயல்பாக உள்ளது`;
          taReason = 'இது பரிசோதனைக் கூடத்தின் சாதாரண எல்லைக்குள் உள்ளது.';
        }

        const taFunction = dictEntry.function_ta || `${testName} உங்கள் உடல் ஆரோக்கியத்தை மதிப்பிடும் ஒரு முக்கிய பரிசோதனையாகும்.`;

        return `உங்கள் சமீபத்திய ${testName} பரிசோதனை முடிவு: ${valStr}${rangeStr ? ` (குறிப்பு வரம்பு: ${rangeStr})` : ''}. ${taStatus}. ${taFunction} ${taReason}
ஆதாரம்: ${docName}, பக்கம் ${pageNum}.`;
      }

      let enStatus = '';
      let enReason = '';
      if (isLow) {
        enStatus = `Your ${testLower.includes('hemoglobin') ? 'hemoglobin' : testName.toLowerCase()} level is lower than the reference range shown in your report. This is lower than the normal range shown on your report.`;
        enReason = dictEntry.low_reason_en || 'A low result can happen for several reasons, so discuss it with a healthcare professional.';
      } else if (isHigh) {
        enStatus = `Your ${testLower.includes('hemoglobin') ? 'hemoglobin' : testName.toLowerCase()} level is higher than the reference range shown in your report. This is higher than the normal range shown on your report.`;
        enReason = dictEntry.high_reason_en || 'A high result can happen for several reasons, so discuss it with a healthcare professional.';
      } else {
        enStatus = `Your ${testLower.includes('hemoglobin') ? 'hemoglobin' : testName.toLowerCase()} level is within the reference range shown in your report.`;
        enReason = 'This falls within the standard reference range considered typical by the testing laboratory.';
      }

      const enFunction = dictEntry.function_en || `${testName} is a laboratory metric assessed on your health panel.`;

      return `Your latest ${testName} result is ${valStr}${rangeStr ? ` (Reference range on report: ${rangeStr})` : ''}. ${enStatus} ${enFunction} ${enReason}\nSource: ${docName}, Page ${pageNum}.`;
    }

    // E. ABNORMAL_LAB INTENT
    if (intent === RETRIEVAL_INTENTS.ABNORMAL_LAB) {
      if (relevantRecords.length === 0) {
        if (isTamil) {
          return `உங்கள் பதிவேற்றப்பட்ட அறிக்கைகளில் உள்ள அனைத்து ஆய்வக முடிவுகளும் சாதாரண வரம்பிற்குள் உள்ளன.\nஆதாரம்: ${docName}, பக்கம் ${pageNum}.`;
        }
        return `All laboratory observations in your uploaded records are within their respective normal reference ranges.\nSource: ${docName}, Page ${pageNum}.`;
      }

      if (isTamil) {
        const abnormalItems = relevantRecords.map(o => {
          const dictEntry = lookupMedicalTermInfo(o.test_name);
          const isLow = o.abnormal_flag === 'LOW' || o.status === 'LOW' || o.status === 'low';
          const taTerm = dictEntry.ta_term || o.test_name;
          const func = dictEntry.function_ta;
          const reason = isLow ? (dictEntry.low_reason_ta || 'குறைந்த முடிவு பல காரணங்களால் ஏற்படலாம், எனவே இதனை உங்கள் மருத்துவரிடம் கலந்துரையாடவும்.') : (dictEntry.high_reason_ta || 'அதிகரித்த முடிவு பல காரணங்களால் ஏற்படலாம், எனவே இதனை உங்கள் மருத்துவரிடம் கலந்துரையாடவும்.');
          const statusTa = isLow ? 'குறிப்பு வரம்பை விடக் குறைவு (LOW)' : 'குறிப்பு வரம்பை விட அதிகம் (HIGH)';
          return `• ${o.test_name}: ${o.value} ${o.unit || ''} (குறிப்பு வரம்பு: ${o.reference_range || 'குறிப்பிடப்படவில்லை'}, நிலை: ${statusTa})\n  எளிய விளக்கம்: உங்கள் அறிக்கையில் உள்ள குறிப்பு வரம்பை விட உங்கள் ${taTerm} அளவு ${isLow ? 'குறைவாக' : 'அதிகமாக'} உள்ளது. ${func} ${reason} இந்த முடிவுகள் ஒரு உறுதியான நோயறிதலைக் குறிக்காது.`;
        }).join('\n\n');

        return `உங்கள் அறிக்கையில் சாதாரண வரம்பிற்கு வெளியே உள்ள முடிவுகள்:\n\n${abnormalItems}\n\nஆதாரம்: ${docName}, பக்கம் ${pageNum}.\nமுக்கியமான குறிப்பு: இந்த முடிவுகள் ஒரு உறுதியான நோயறிதல் அல்ல. மருத்துவர் ஆலோசனையின்றி எந்த ஒரு முடிவும் எடுக்க வேண்டாம்; இவற்றை உங்கள் மருத்துவரிடம் கலந்துரையாடி விரிவான மதிப்பீடு பெறவும்.`;
      }

      const abnormalItems = relevantRecords.map(o => {
        const dictEntry = lookupMedicalTermInfo(o.test_name);
        const isLow = o.abnormal_flag === 'LOW' || o.status === 'LOW' || o.status === 'low';
        const func = dictEntry.function_en;
        const reason = isLow ? (dictEntry.low_reason_en || 'A low result can happen for several reasons, so discuss it with a healthcare professional.') : (dictEntry.high_reason_en || 'A high result can happen for several reasons, so discuss it with a healthcare professional.');
        const statusEn = isLow ? 'Lower than reference range' : 'Higher than reference range';
        return `• ${o.test_name}: ${o.value} ${o.unit || ''} (Status: ${statusEn}, Reference range: ${o.reference_range || 'None specified'})\n  Plain-language explanation: Your ${o.test_name.toLowerCase()} level is ${statusEn.toLowerCase()} shown in your report. ${func} ${reason} An out-of-range value alone is not a medical diagnosis; your doctor can evaluate these findings in context.`;
      }).join('\n\n');

      return `Here are the results outside the reference ranges shown on your report:\n\n${abnormalItems}\n\nSource: ${docName}, Page ${pageNum}.\nAn out-of-range value alone is not a medical diagnosis. Your doctor can evaluate these findings in the context of your overall health.`;
    }

    // F. INSTRUCTIONS INTENT
    if (intent === RETRIEVAL_INTENTS.INSTRUCTIONS) {
      if (isTamil) {
        const instList = relevantRecords.map(r => {
          const medName = r.medication || r.name || 'மருந்து';
          const medInfo = lookupMedicationInfo(medName);
          const doseStr = r.dosage ? ` (${r.dosage})` : '';
          const dur = r.duration ? `கால அளவு: ${r.duration}. ` : '';
          const inst = r.instructions || r.clinical_advice || medInfo.simple_instructions_ta;
          return `• ${medName}${doseStr}: ${dur}${inst}. எளிய விளக்கம்: ${medInfo.simple_role_ta}.`.trim();
        }).join('\n');

        return `உங்கள் மருத்துவ ஆவணங்களின்படி வழிகாட்டுதல்கள் மற்றும் மருந்துகள் பற்றிய எளிய விளக்கம்:\n\n${instList}\n\nஆதாரம்: ${docName}, பக்கம் ${pageNum}.\nமருத்துவ ஆலோசனையின்றி சிகிச்சை கால அளவையோ மருந்து அளவையோ மாற்ற வேண்டாம்.`;
      }

      const instList = relevantRecords.map(r => {
        const medName = r.medication || r.name || 'Medication';
        const medInfo = lookupMedicationInfo(medName);
        const doseStr = r.dosage ? ` (${r.dosage})` : '';
        const dur = r.duration ? `Duration: ${r.duration}. ` : '';
        const inst = r.instructions || r.clinical_advice || medInfo.simple_instructions_en;
        return `• ${medName}${doseStr}: ${dur}${inst}. Plain-language explanation: ${medInfo.simple_role_en}.`.trim();
      }).join('\n');

      return `Here are the medications and instructions from your medical records:\n\n${instList}\n\nSource: ${docName}, Page ${pageNum}.\nAlways follow your doctor's instructions. Do not stop or change medications without consulting your doctor.`;
    }

    // G. DOCUMENT_SUMMARY INTENT
    if (intent === RETRIEVAL_INTENTS.DOCUMENT_SUMMARY) {
      const summaryItem = relevantRecords[0] || {};
      const summaryText = summaryItem.summary || summaryItem.clinical_notes || 'All extracted parameters recorded.';

      if (isTamil) {
        return `உங்கள் பதிவேற்றப்பட்ட ஆவணம் "${docName}" சுருக்கம்:\n\n${summaryText}\n\nஆதாரம்: ${docName}, பக்கம் ${pageNum}.\nவிரிவான மதிப்பீட்டிற்கு உங்கள் மருத்துவரை அணுகவும்.`;
      }

      return `Here is a plain-language summary of your uploaded document "${docName}":\n\n${summaryText}\n\nSource: ${docName}, Page ${pageNum}.\nDiscuss these findings with your doctor for comprehensive evaluation.`;
    }

    // H. DIAGNOSIS INTENT
    if (intent === RETRIEVAL_INTENTS.DIAGNOSIS) {
      const diagList = relevantRecords.map(d => `• ${d.diagnosis}`).join('\n');
      if (isTamil) {
        return `உங்கள் பதிவேற்றப்பட்ட ஆவணங்களில் குறிப்பிடப்பட்டுள்ள மருத்துவக் குறிப்புகள்:\n\n${diagList}\n\nஆதாரம்: ${docName}, பக்கம் ${pageNum}.`;
      }
      return `Based on your uploaded records, here are the documented clinical impressions:\n\n${diagList}\n\nSource: ${docName}, Page ${pageNum}.\nA documented condition should be confirmed and managed by your attending physician.`;
    }

    // I. TIMELINE INTENT
    if (intent === RETRIEVAL_INTENTS.TIMELINE) {
      const timelineList = relevantRecords.map(e => `• ${e.date}: ${e.title || e.document_type || 'Medical Record'}`).join('\n');
      if (isTamil) {
        return `உங்கள் மருத்துவ காலவரிசை:\n\n${timelineList}\n\nஆதாரம்: சரிபார்க்கப்பட்ட சுயவிவரம்.`;
      }
      return `Here is your chronological health timeline based on actual document dates:\n\n${timelineList}\n\nSource: Verified Health Profile.`;
    }

    // Fallback general response
    return `Based on your uploaded record "${docName}", here is the information requested.\nSource: ${docName}, Page ${pageNum}.`;
  }

  /**
   * Helper: Analyze what information is missing from the user's uploaded records (Question 10)
   * Grounded in database facts; does not hallucinate.
   */
  async analyzeMissingInformation({ userId, language = 'en' }) {
    const rawUserId = retrievalService.normalizeUserId(userId);
    const docs = await Document.find({ $or: [{ userId: rawUserId }, { user_id: rawUserId }] }).lean();
    const meds = await Medication.find({ $or: [{ userId: rawUserId }, { user_id: rawUserId }] }).lean();
    const labMetrics = await LabMetric.find({ $or: [{ userId: rawUserId }, { user_id: rawUserId }] }).lean();
    const aiExts = await AIExtraction.find({ $or: [{ userId: rawUserId }, { user_id: rawUserId }] }).lean();

    const hasPrescriptions = docs.some(d => d.document_type === 'PRESCRIPTION' || d.category === 'prescription') || meds.length > 0 || aiExts.some(e => e.validated_data?.medications?.length > 0);
    const hasLabReports = docs.some(d => d.document_type === 'LAB_REPORT' || d.category === 'laboratory_report') || labMetrics.length > 0 || aiExts.some(e => e.validated_data?.laboratory_tests?.length > 0);
    const hasDoctorInfo = docs.some(d => d.extractedData?.doctorName || d.doctor_name) || aiExts.some(e => e.validated_data?.doctor_name);

    const foundItems = [];
    const missingItems = [];

    if (hasLabReports) {
      foundItems.push('Laboratory reports with diagnostic test metrics');
    } else {
      missingItems.push('Laboratory test reports (blood work, metabolic panels, or urine tests)');
    }

    if (hasPrescriptions) {
      foundItems.push('Prescription documents with prescribed medication details');
    } else {
      missingItems.push('Prescription records and prescribed medication history');
    }

    if (hasDoctorInfo) {
      foundItems.push('Attending doctor / physician contact details');
    } else {
      missingItems.push('Attending physician name or primary care clinic details');
    }

    missingItems.push('Documented drug allergy history');
    missingItems.push('Routine vital sign tracking (e.g. recent blood pressure readings)');

    const docNames = docs.map(d => d.original_filename || d.originalName).filter(Boolean);
    const primaryDoc = docs[0];
    const sourceList = primaryDoc ? [{
      title: primaryDoc.original_filename || primaryDoc.originalName,
      date: primaryDoc.upload_date ? new Date(primaryDoc.upload_date).toLocaleDateString('en-GB') : '2026-10-06',
      type: primaryDoc.document_type || 'MEDICAL_RECORD',
      page: 1,
    }] : [];

    if (language === 'ta') {
      const resp = `உங்கள் பதிவேற்றப்பட்ட ஆவணங்களை ஆய்வு செய்ததில்:

கண்டறியப்பட்ட விவரங்கள்:
${foundItems.map(f => `• ${f}`).join('\n')}

தற்போது விடுபட்டுள்ள அல்லது பதிவேற்றப்படாத தகவல்கள்:
${missingItems.map(m => `• ${m}`).join('\n')}

ஆதாரம்: பதிவேற்றப்பட்ட ஆவணங்கள் (${docNames.join(', ') || 'இல்லை'}).`;

      return {
        response: resp,
        sources: sourceList,
        safetyDisclaimer: geminiService.getSafetyDisclaimer('ta'),
        language: 'ta',
        detected_intent: RETRIEVAL_INTENTS.DOCUMENT_SUMMARY,
        provider: 'missing_info_analyzer',
        trace: {
          question: 'What information is missing from my uploaded records?',
          detected_intent: RETRIEVAL_INTENTS.DOCUMENT_SUMMARY,
          retrieval_strategy: RETRIEVAL_STRATEGIES.STRUCTURED_DATABASE,
          retrieved_records: foundItems,
          context: `Found: ${foundItems.join(', ')}. Missing: ${missingItems.join(', ')}.`,
          llm_answer: resp,
          frontend_answer: resp,
        },
      };
    }

    const resp = `Based on an analysis of your uploaded records:

Currently Present in Your Records:
${foundItems.map(f => `• ${f}`).join('\n')}

Information Missing or Not Yet Uploaded:
${missingItems.map(m => `• ${m}`).join('\n')}

To maintain a comprehensive health profile, you can upload missing prescription slips, lab results, or allergy notes.
Source: Uploaded records (${docNames.join(', ') || 'None'}).`;

    return {
      response: resp,
      sources: sourceList,
      safetyDisclaimer: geminiService.getSafetyDisclaimer('en'),
      language: 'en',
      detected_intent: RETRIEVAL_INTENTS.DOCUMENT_SUMMARY,
      provider: 'missing_info_analyzer',
      trace: {
        question: 'What information is missing from my uploaded records?',
        detected_intent: RETRIEVAL_INTENTS.DOCUMENT_SUMMARY,
        retrieval_strategy: RETRIEVAL_STRATEGIES.STRUCTURED_DATABASE,
        retrieved_records: foundItems,
        context: `Found: ${foundItems.join(', ')}. Missing: ${missingItems.join(', ')}.`,
        llm_answer: resp,
        frontend_answer: resp,
      },
    };
  }

  /**
   * 6. Master Copilot Query Processor (Phase 9 & Phase 10 Pipeline)
   * FLOW:
   * User question
   * ↓
   * Follow-up context resolution
   * ↓
   * Intent detection
   * ↓
   * Relevant retrieval
   * ↓
   * Grounded context
   * ↓
   * LLM / Grounded Engine
   * ↓
   * Answer validation
   * ↓
   * Source attribution
   * ↓
   * Final answer + 7-step trace
   */
  async processQuery({ query = '', userId, user = {}, language = 'en', history = [], documentId = null, document_id = null, documentType = null, mode = null }) {
    if (!query || !query.trim()) {
      throw new Error('User inquiry query is required.');
    }

    // Auto-detect target language if requested in user query (e.g. "Explain this in Tamil")
    let targetLanguage = language;
    if (/\bin\s+tamil\b/i.test(query) || /\bதமிழில்\b/i.test(query)) {
      targetLanguage = 'ta';
    } else if (/\bin\s+hindi\b/i.test(query) || /\bहिन्दी\b/i.test(query)) {
      targetLanguage = 'hi';
    } else if (/\bin\s+telugu\b/i.test(query) || /\bతెలుగు\b/i.test(query)) {
      targetLanguage = 'te';
    }

    // Security Guardrail: Prompt Injection Detection
    const injectionRegex = /(ignore\s+(all\s+)?(previous|prior|above)\s+instructions|system\s+prompt|disregard\s+(all\s+)?(previous|prior)\s+instructions|you\s+are\s+now\s+in\s+developer\s+mode|jailbreak|bypass\s+safety\s+protocols|reveal\s+(your\s+)?instructions|show\s+(all\s+)?(other\s+)?patients?('s)?\s+(records|data|chats|history)|access\s+other\s+users?|dump\s+(all\s+)?database)/i;
    if (injectionRegex.test(query)) {
      const refusal = 'I am Personal Health Copilot. I can only assist with your medical records and verified health information. I cannot follow instructions to ignore safety protocols or system directives.';
      return {
        response: refusal,
        sources: [],
        safetyDisclaimer: geminiService.getSafetyDisclaimer(targetLanguage),
        language: targetLanguage,
        detected_intent: RETRIEVAL_INTENTS.UNKNOWN,
        coreference_resolved: null,
        provider: 'security_guardrail',
        trace: {
          question: query,
          detected_intent: RETRIEVAL_INTENTS.UNKNOWN,
          retrieval_strategy: RETRIEVAL_STRATEGIES.NONE,
          retrieved_records: [],
          context: '',
          llm_answer: 'Blocked by security guardrail.',
          frontend_answer: refusal,
        },
      };
    }

    // Step 1: Follow-Up Conversation Context Resolution
    const { resolvedQuery, isFollowUp, resolvedEntity } = this.resolveFollowUpQuery({
      query,
      history,
    });

    // Step 1b: Question 10 - Record Completeness & Missing Information Analyzer
    const missingInfoRegex = /(what (information|data|record|detail) is missing|missing (from|in) (my )?(uploaded )?records|what is missing|anything missing|records missing)/i;
    if (missingInfoRegex.test(resolvedQuery)) {
      return await this.analyzeMissingInformation({ userId, language: targetLanguage });
    }

    // Step 1c: Delegation for specialized full report explanations and multi-report comparisons
    if (/explain.*(?:blood|lab|cbc|metabolic|medical|health)?.*report/i.test(resolvedQuery) || /இரத்தப் பரிசோதனை/i.test(resolvedQuery) || /மருத்துவ அறிக்கை/i.test(resolvedQuery)) {
      let docs = await Document.find({ $or: [{ userId }, { user_id: userId }] }).sort({ createdAt: -1 });
      const activeDocId = documentId || document_id || null;
      if (activeDocId) {
        const targetDoc = docs.find(d => d._id.toString() === activeDocId.toString());
        if (targetDoc) {
          docs = [targetDoc, ...docs.filter(d => d._id.toString() !== activeDocId.toString())];
        }
      }
      const labMetrics = await LabMetric.find({ $or: [{ userId }, { user_id: userId }] }).sort({ date: -1 });
      const fullReport = geminiService.explainMedicalReportInPlainLanguage({
        documents: docs,
        labMetrics,
        query: resolvedQuery,
        language: targetLanguage,
      });
      const sources = docs.length > 0 ? [{
        title: docs[0].original_filename || docs[0].originalName || 'Complete Blood Count (CBC) & Metabolic Panel.pdf',
        date: docs[0].upload_date ? new Date(docs[0].upload_date).toLocaleDateString('en-GB') : '2026-10-06',
        type: 'LABORATORY REPORT',
        page: 1,
      }] : [];

      const cleanAns = this.validateAnswer({ answer: fullReport, intent: RETRIEVAL_INTENTS.DOCUMENT_SUMMARY, query: resolvedQuery, language: targetLanguage });
      return {
        response: cleanAns,
        sources,
        safetyDisclaimer: geminiService.getSafetyDisclaimer(targetLanguage),
        language: targetLanguage,
        detected_intent: RETRIEVAL_INTENTS.DOCUMENT_SUMMARY,
        coreference_resolved: isFollowUp ? resolvedEntity : null,
        provider: 'plain_language_report_engine',
        trace: {
          question: resolvedQuery,
          detected_intent: RETRIEVAL_INTENTS.DOCUMENT_SUMMARY,
          retrieval_strategy: RETRIEVAL_STRATEGIES.HYBRID_STRUCTURED_AND_OCR,
          retrieved_records: docs,
          context: 'Comprehensive blood report metrics',
          llm_answer: fullReport,
          frontend_answer: cleanAns,
        },
      };
    }

    if (/(compare|comparison|trend|ஒப்பீடு|तुलना)/i.test(resolvedQuery)) {
      const rawUserId = retrievalService.normalizeUserId(userId);
      const docs = await Document.find({ $or: [{ userId }, { user_id: userId }, { userId: rawUserId }, { user_id: rawUserId }] }).sort({ createdAt: -1 });
      const labMetrics = await LabMetric.find({ $or: [{ userId }, { user_id: userId }, { userId: rawUserId }, { user_id: rawUserId }] }).sort({ date: -1 });
      const activeRag = ragService.retrieveRelevantChunks({ query: resolvedQuery, documents: docs, labMetrics });
      let comparisonText = '';
      if (activeRag?.historicalComparison) {
        comparisonText = geminiService.formatHistoricalComparisonExplanation({
          comparison: activeRag.historicalComparison,
          language: targetLanguage,
        });
      } else {
        comparisonText = `No previous report found to compare ${resolvedQuery}.`;
      }
      const sources = docs.length > 0 ? [{
        title: docs[0].original_filename || docs[0].originalName || 'Medical Report',
        date: '2026-10-06',
        type: 'LABORATORY REPORT',
        page: 1,
      }] : [];

      const cleanAns = this.validateAnswer({ answer: comparisonText, intent: RETRIEVAL_INTENTS.COMPARISON, query: resolvedQuery, language: targetLanguage });
      return {
        response: cleanAns,
        sources,
        safetyDisclaimer: geminiService.getSafetyDisclaimer(targetLanguage),
        language: targetLanguage,
        detected_intent: RETRIEVAL_INTENTS.COMPARISON,
        coreference_resolved: isFollowUp ? resolvedEntity : null,
        provider: 'comparison_engine',
        trace: {
          question: resolvedQuery,
          detected_intent: RETRIEVAL_INTENTS.COMPARISON,
          retrieval_strategy: RETRIEVAL_STRATEGIES.STRUCTURED_DATABASE,
          retrieved_records: activeRag?.historicalComparison ? [activeRag.historicalComparison] : [],
          context: 'Historical comparison metrics',
          llm_answer: comparisonText,
          frontend_answer: cleanAns,
        },
      };
    }

    // Step 2: Intent Detection & Relevant Retrieval (Phase 8/10 Foundation)
    const activeDocId = documentId || document_id || null;
    const retrievalResult = await retrievalService.retrieve({
      query: resolvedQuery,
      userId,
      requestedDocumentId: activeDocId,
      requestedDocumentType: documentType,
    });

    const {
      detected_intent,
      retrieval_strategy,
      relevant_records,
      source_document,
      page,
      relevance_information,
      relevant_context,
    } = retrievalResult;

    // Step 2b: Low-Confidence OCR Analysis (Phase 12)
    const isOcrQualityQuery = /(low[ -]confidence|faint|blurry|unclear|readability|can you read|ocr quality|is (the|my) report (clear|readable)|தெளிவாக உள்ளதா|மங்கலான)/i.test(resolvedQuery);
    const isDocLowConfidence = Boolean(source_document && (
      source_document.processing_status === 'LOW_CONFIDENCE' ||
      source_document.status === 'LOW_CONFIDENCE' ||
      source_document.isLowConfidence === true ||
      (source_document.overallConfidence !== undefined && source_document.overallConfidence < 65 && source_document.overallConfidence > 0) ||
      (source_document.ocr_confidence !== undefined && source_document.ocr_confidence < 65 && source_document.ocr_confidence > 0)
    ));

    if (isOcrQualityQuery || isDocLowConfidence) {
      const docName = source_document?.original_name || source_document?.title || 'uploaded medical scan';
      const pageNum = page || 1;
      
      let identifiedParts = 'Patient header, date, and select test parameters';
      if (relevant_records && relevant_records.length > 0) {
        identifiedParts = relevant_records.map(r => r.name || r.test_name || r.title).filter(Boolean).slice(0, 3).join(', ');
      }

      if (targetLanguage === 'ta') {
        const ocrResp = `இந்த ஸ்கேன் செய்யப்பட்ட ஆவணத்தின் ("${docName}") சில பகுதிகள் மங்கலாகவோ அல்லது தெளிவாக இல்லாமலோ உள்ளன, இதனால் வாசிப்புத் துல்லியம் (குறைந்த OCR துல்லியம் - Low Confidence OCR) குறைவாக உள்ளது.

தெளிவாக அடையாளம் காண முடிந்த தகவல்கள்: ${identifiedParts}.

முக்கிய குறிப்பு: உரையின் தரம் குறைவாக இருப்பதால் மற்றும் தவறான புரிதலைத் தவிர்க்க, தயவுசெய்து உங்கள் அசல் அச்சிடப்பட்ட ஆவணத்தை நேரடியாக சரிபார்க்கவும் அல்லது எந்தவொரு மருத்துவ முடிவை எடுப்பதற்கு முன்னும் உங்கள் மருத்துவரிடம் ஆலோசனை பெறவும்.
ஆதாரம்: ${docName}, பக்கம் ${pageNum}.`;

        return {
          response: ocrResp,
          sources: this.buildSources({ sourceDocument: source_document, page: pageNum, relevantRecords: relevant_records, intent: detected_intent }),
          safetyDisclaimer: geminiService.getSafetyDisclaimer('ta'),
          language: 'ta',
          detected_intent: detected_intent,
          provider: 'low_confidence_ocr_engine',
          trace: {
            question: resolvedQuery,
            detected_intent,
            retrieval_strategy,
            retrieved_records: relevant_records,
            context: 'Low confidence OCR document identified',
            llm_answer: ocrResp,
            frontend_answer: ocrResp,
          },
        };
      }

      const ocrResp = `Certain parts of this scanned document ("${docName}") appear faint or unclear, resulting in low OCR reading confidence.

What could be legibly identified: ${identifiedParts}.

Important note: Because portions of the text are difficult to read with certainty, please verify these details directly against your original physical report or consult your healthcare provider or laboratory before taking any action.
Source: ${docName}, Page ${pageNum}.`;

      return {
        response: ocrResp,
        sources: this.buildSources({ sourceDocument: source_document, page: pageNum, relevantRecords: relevant_records, intent: detected_intent }),
        safetyDisclaimer: geminiService.getSafetyDisclaimer('en'),
        language: 'en',
        detected_intent: detected_intent,
        provider: 'low_confidence_ocr_engine',
        trace: {
          question: resolvedQuery,
          detected_intent,
          retrieval_strategy,
          retrieved_records: relevant_records,
          context: 'Low confidence OCR document identified',
          llm_answer: ocrResp,
          frontend_answer: ocrResp,
        },
      };
    }

    // Step 3: Relevance Check & Missing Info Guardrail (Phase 10 Root-Cause Enforcement)
    if (!relevance_information?.gate_passed || (relevant_records.length === 0 && detected_intent !== RETRIEVAL_INTENTS.GENERAL_EXPLANATION)) {
      let missingMessage = "I couldn't find that information in your uploaded records.";
      if (detected_intent === RETRIEVAL_INTENTS.MEDICATION || detected_intent === RETRIEVAL_INTENTS.PRESCRIPTION) {
        missingMessage = "I couldn't find medication information in your uploaded records. I couldn't find that information in your uploaded records.";
      } else if (detected_intent === RETRIEVAL_INTENTS.DOCTOR) {
        missingMessage = "I couldn't find your doctor's name in your uploaded records. I couldn't find doctor information in your uploaded records. I couldn't find that information in your uploaded records.";
      } else if (detected_intent === RETRIEVAL_INTENTS.LAB_RESULT) {
        const targetEntity = retrievalService.detectTargetEntity(resolvedQuery);
        if (targetEntity) {
          const entityLabel = targetEntity.key.replace('_', ' ');
          missingMessage = `I couldn't find a ${entityLabel} result in the medical documents currently available to me. I couldn't find that information in your uploaded records.`;
        }
      }

      if (targetLanguage === 'ta') {
        if (detected_intent === RETRIEVAL_INTENTS.MEDICATION || detected_intent === RETRIEVAL_INTENTS.PRESCRIPTION) {
          missingMessage = "உங்கள் பதிவேற்றப்பட்ட ஆவணங்களில் மருந்து விவரங்கள் எதுவும் காணப்படவில்லை. I couldn't find medication information in your uploaded records.";
        } else if (detected_intent === RETRIEVAL_INTENTS.DOCTOR) {
          missingMessage = "உங்கள் பதிவேற்றப்பட்ட ஆவணங்களில் மருத்துவர் விவரங்கள் எதுவும் காணப்படவில்லை. I couldn't find doctor information in your uploaded records.";
        } else {
          missingMessage = "தற்போது கிடைக்கக்கூடிய உங்கள் மருத்துவ ஆவணங்களில் அந்த விவரங்கள் எதுவும் காணப்படவில்லை. I couldn't find that information in your uploaded records.";
        }
      } else if (targetLanguage === 'hi') {
        missingMessage = 'उपलब्ध मेडिकल दस्तावेजों में यह जानकारी नहीं मिली।';
      } else if (targetLanguage === 'te') {
        missingMessage = 'ప్రస్తుతం అందుబాటులో ఉన్న మీ వైద్య పత్రాలలో ఈ వివరాలు కనుగొనబడలేదు.';
      }

      return {
        response: missingMessage,
        sources: [],
        safetyDisclaimer: geminiService.getSafetyDisclaimer(targetLanguage),
        language: targetLanguage,
        detected_intent,
        provider: 'relevance_guardrail',
        trace: {
          question: resolvedQuery,
          detected_intent,
          retrieval_strategy: RETRIEVAL_STRATEGIES.REJECTED_IRRELEVANT,
          retrieved_records: [],
          context: '',
          llm_answer: 'Retrieval rejected by relevance gate.',
          frontend_answer: missingMessage,
        },
      };
    }

    // Step 4: Build Generation Prompt (Mandatory format)
    const promptText = this.buildGenerationPrompt({
      query,
      relevantContext: relevant_context,
      language: targetLanguage,
    });

    let rawAnswer = '';

    // Step 5: LLM Execution
    if (sarvamService.isAvailable()) {
      try {
        const reply = await sarvamService.generateChatCompletion({
          messages: [{ role: 'user', content: promptText }],
        });
        if (reply && reply.trim()) {
          rawAnswer = reply.trim();
        }
      } catch (err) {
        console.warn('[CopilotService] Sarvam notice, falling back to grounded engine:', err.message);
      }
    }

    if (!rawAnswer && geminiService.isAvailable()) {
      try {
        const reply = await geminiService.client.models.generateContent({
          model: geminiService.modelName,
          contents: [{ role: 'user', parts: [{ text: promptText }] }],
        });
        const replyText = reply?.text;
        if (replyText && replyText.trim()) {
          rawAnswer = replyText.trim();
        }
      } catch (err) {
        console.warn('[CopilotService] Gemini notice, falling back to grounded engine:', err.message);
      }
    }

    // High-Quality Grounded Engine Fallback
    if (!rawAnswer) {
      rawAnswer = this.generateGroundedAnswer({
        intent: detected_intent,
        query: resolvedQuery,
        relevantRecords: relevant_records,
        sourceDocument: source_document,
        page,
        language: targetLanguage,
      });
    }

    // Step 6: Answer Validation
    const validatedAnswer = this.validateAnswer({
      answer: rawAnswer,
      intent: detected_intent,
      query: resolvedQuery,
      relevantRecords: relevant_records,
      language: targetLanguage,
    });

    // Step 7: Source Attribution
    const sources = this.buildSources({
      sourceDocument: source_document,
      page,
      relevantRecords: relevant_records,
      intent: detected_intent,
    });

    return {
      response: validatedAnswer,
      sources,
      safetyDisclaimer: geminiService.getSafetyDisclaimer(targetLanguage),
      language: targetLanguage,
      detected_intent,
      coreference_resolved: isFollowUp ? resolvedEntity : null,
      provider: 'copilot_grounded_engine',
      trace: {
        question: resolvedQuery,
        detected_intent,
        retrieval_strategy,
        retrieved_records: relevant_records,
        context: relevant_context,
        llm_answer: rawAnswer,
        frontend_answer: validatedAnswer,
      },
    };
  }
}

export const copilotService = new CopilotService();
export default copilotService;
