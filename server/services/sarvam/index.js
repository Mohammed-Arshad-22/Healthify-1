import { sarvamClient } from './sarvamClient.js';
import { transcribeAudio } from './speechToText.js';
import { synthesizeSpeech } from './textToSpeech.js';
import { generateSarvamChatCompletion } from './chatCompletion.js';
import { validateAudioBuffer } from './audioValidation.js';

export const sarvamService = {
  client: sarvamClient,
  transcribeAudio,
  synthesizeSpeech,
  generateChatCompletion: generateSarvamChatCompletion,
  validateAudioBuffer,
  isAvailable: () => sarvamClient.isConfigured(),
};

export default sarvamService;
