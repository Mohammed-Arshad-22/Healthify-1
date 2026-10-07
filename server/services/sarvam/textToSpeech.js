import { sarvamClient } from './sarvamClient.js';

export const synthesizeSpeech = async ({
  text,
  language = 'en',
  speaker = 'meera',
}) => {
  if (!text || text.trim().length === 0) {
    throw new Error('Please provide text to read aloud.');
  }

  if (!sarvamClient.isConfigured()) {
    sarvamClient.logOperation('tts_skipped_no_key');
    return { audioBase64: null, mimeType: null };
  }

  // Map language code to Sarvam language targets
  const langMap = {
    ta: 'ta-IN',
    hi: 'hi-IN',
    te: 'te-IN',
    en: 'en-IN',
  };
  const targetLanguage = langMap[language] || 'en-IN';

  // Sanitize and limit text length for TTS playback
  const cleanText = text
    .replace(/[*#_~`]/g, '') // remove markdown symbols
    .replace(/\[USER RECORD\]|\[AI EXPLANATION\]|\[GENERAL GUIDANCE\]/g, '')
    .trim()
    .substring(0, 1000); // 1000 chars limit for audio response

  sarvamClient.logOperation('tts_request_start', {
    targetLanguage,
    speaker,
    charLength: cleanText.length,
  });

  try {
    const response = await fetch(`${sarvamClient.baseUrl}/text-to-speech`, {
      method: 'POST',
      headers: {
        'api-subscription-key': sarvamClient.apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        inputs: [cleanText],
        target_language_code: targetLanguage,
        speaker,
        model: 'bulbul:v1', // standard stable TTS model on Sarvam
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      sarvamClient.logOperation('tts_request_error', {
        status: response.status,
      });
      throw new Error(`Text-to-speech failed (${response.status}): ${errText.substring(0, 100)}`);
    }

    const data = await response.json();
    sarvamClient.logOperation('tts_request_success');

    // Sarvam returns { audios: ["base64..."] }
    const audioBase64 = data.audios && data.audios.length > 0 ? data.audios[0] : null;

    return {
      audioBase64,
      mimeType: 'audio/wav',
    };
  } catch (err) {
    sarvamClient.logOperation('tts_error', { message: err.message });
    throw err;
  }
};

export default {
  synthesizeSpeech,
};
