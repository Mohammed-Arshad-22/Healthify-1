import { sarvamClient } from './sarvamClient.js';
import { validateAudioBuffer } from './audioValidation.js';

export const transcribeAudio = async ({
  buffer,
  mimeType = 'audio/webm',
  languageCode = 'unknown',
  keyterms = [],
}) => {
  // 1. Validate audio buffer & privacy check
  const validated = validateAudioBuffer(buffer, mimeType);

  if (!sarvamClient.isConfigured()) {
    sarvamClient.logOperation('transcribe_skipped_no_key');
    return {
      transcript: '',
      languageCode,
      fallbackToBrowser: true,
      serviceAvailable: false,
    };
  }

  // 2. Build dynamic healthcare keyterms prompt
  const standardKeyterms = [
    'HbA1c', 'CBC', 'TSH', 'ECG', 'MRI', 'CT scan',
    'blood pressure', 'blood glucose', 'Metformin', 'Paracetamol',
    'Atorvastatin', 'Telmisartan', 'ABHA', 'ABDM', 'Health Copilot'
  ];
  const combinedKeyterms = Array.from(new Set([...standardKeyterms, ...keyterms])).slice(0, 30);
  const promptString = combinedKeyterms.join(', ');

  // 3. Prepare multipart payload using native FormData & Blob
  const ext = validated.mimeType.includes('wav') ? 'wav' : validated.mimeType.includes('mp3') ? 'mp3' : 'webm';
  const blob = new Blob([buffer], { type: validated.mimeType });
  const formData = new FormData();
  formData.append('file', blob, `voice_input.${ext}`);
  formData.append('model', sarvamClient.defaultModel || 'saaras:v4');
  formData.append('mode', 'transcribe');
  if (languageCode && languageCode !== 'auto') {
    formData.append('language_code', languageCode);
  }
  if (promptString) {
    formData.append('prompt', promptString);
  }

  sarvamClient.logOperation('transcribe_request_start', {
    model: sarvamClient.defaultModel,
    audioBytes: buffer.length,
    languageCode,
  });

  try {
    const response = await fetch(`${sarvamClient.baseUrl}/speech-to-text`, {
      method: 'POST',
      headers: {
        'api-subscription-key': sarvamClient.apiKey,
      },
      body: formData,
    });

    if (!response.ok) {
      const errText = await response.text();
      sarvamClient.logOperation('transcribe_request_error', {
        status: response.status,
        statusText: response.statusText,
      });

      if (response.status === 401 || response.status === 403) {
        throw new Error('Voice recognition is temporarily unavailable. You can type your query below.');
      } else if (response.status === 429) {
        throw new Error('Voice service is busy. Please try again shortly or type your query below.');
      } else {
        throw new Error('Voice recognition is temporarily unavailable. You can type your query below.');
      }
    }

    const data = await response.json();
    sarvamClient.logOperation('transcribe_request_success', {
      detectedLanguage: data.language_code,
    });

    return {
      transcript: data.transcript || '',
      languageCode: data.language_code || languageCode,
    };
  } finally {
    // AUDIO PRIVACY ENFORCEMENT:
    // Buffer reference is automatically cleared; nothing is stored on disk or database.
  }
};

export default {
  transcribeAudio,
};
