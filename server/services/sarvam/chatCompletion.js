import { sarvamClient } from './sarvamClient.js';
import { config } from '../../config/config.js';

/**
 * Sarvam AI Chat Completions Service
 * Connects to Sarvam's official OpenAI-compatible endpoint
 */
export const generateSarvamChatCompletion = async ({
  messages,
  systemPrompt = '',
  temperature = 0.3,
}) => {
  if (!sarvamClient.isConfigured()) {
    sarvamClient.logOperation('chat_skipped_no_key');
    return null;
  }

  const model = config.sarvamChatModel || 'sarvam-105b';
  const formattedMessages = [];

  if (systemPrompt) {
    formattedMessages.push({ role: 'system', content: systemPrompt });
  }

  if (Array.isArray(messages)) {
    formattedMessages.push(...messages);
  }

  sarvamClient.logOperation('chat_request_start', { model, messageCount: formattedMessages.length });

  try {
    const response = await fetch(`${sarvamClient.baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'api-subscription-key': sarvamClient.apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: formattedMessages,
        temperature,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      sarvamClient.logOperation('chat_request_error', {
        status: response.status,
        message: errText.substring(0, 100),
      });
      return null;
    }

    const data = await response.json();
    sarvamClient.logOperation('chat_request_success');

    const reply = data.choices?.[0]?.message?.content || '';
    return reply.trim() || null;
  } catch (err) {
    sarvamClient.logOperation('chat_exception', { message: err.message });
    return null;
  }
};

export default {
  generateSarvamChatCompletion,
};
