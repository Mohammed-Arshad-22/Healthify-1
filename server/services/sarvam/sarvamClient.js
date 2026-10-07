import { config } from '../../config/config.js';

class SarvamClient {
  constructor() {
    this.apiKey = config.sarvamApiKey;
    this.baseUrl = 'https://api.sarvam.ai';
    this.defaultModel = config.sarvamSttModel || 'saaras:v4';
  }

  isConfigured() {
    return Boolean(this.apiKey && this.apiKey.trim().length > 0);
  }

  getHeaders(customHeaders = {}) {
    return {
      'api-subscription-key': this.apiKey,
      ...customHeaders,
    };
  }

  /**
   * Safe operational logging without recording raw speech or confidential medical data
   */
  logOperation(action, metadata = {}) {
    console.log(`[SarvamClient] ${JSON.stringify({
      action,
      hasKey: this.isConfigured(),
      timestamp: new Date().toISOString(),
      ...metadata,
    })}`);
  }
}

export const sarvamClient = new SarvamClient();
export default sarvamClient;
