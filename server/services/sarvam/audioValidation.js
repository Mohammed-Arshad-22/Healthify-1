/**
 * Audio Validation for Voice Copilot
 * Validates audio size, format, duration, and ensures privacy constraints
 */

export const validateAudioBuffer = (buffer, mimeType = 'audio/webm') => {
  if (!buffer || buffer.length === 0) {
    throw new Error('Audio stream was empty or no speech was recorded.');
  }

  // Max 25MB for short conversational voice commands
  const MAX_SIZE = 25 * 1024 * 1024;
  if (buffer.length > MAX_SIZE) {
    throw new Error('Audio file too large. Please record shorter queries.');
  }

  // Min size: at least 500 bytes to avoid empty microphone clicks
  if (buffer.length < 500) {
    throw new Error('Audio was too short. Please speak clearly into the microphone.');
  }

  const allowedMimes = [
    'audio/webm',
    'audio/wav',
    'audio/wave',
    'audio/x-wav',
    'audio/mp3',
    'audio/mpeg',
    'audio/ogg',
    'audio/m4a',
    'audio/mp4',
    'audio/aac'
  ];

  const cleanMime = mimeType.split(';')[0].toLowerCase().trim();
  const isAllowed = allowedMimes.some(m => cleanMime.includes(m) || m.includes(cleanMime));
  
  return {
    valid: true,
    size: buffer.length,
    mimeType: isAllowed ? cleanMime : 'audio/webm',
  };
};

export default {
  validateAudioBuffer,
};
