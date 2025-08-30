const OpenAI = require('openai');
const BaseProvider = require('./base-provider');

class OpenAICompatibleProvider extends BaseProvider {
  constructor (config, providerName, defaultVisionModel = null) {
    super(config, providerName, {
      providerType: 'sdk',
      defaultVisionModel,
      client: new OpenAI({
        apiKey: config.apiKey,
        baseURL: config.baseURL,
        timeout: 30000,
        maxRetries: 3
      })
    });
  }

  // ============================================================================
  // IMPLEMENTATION OF ABSTRACT METHODS
  // ============================================================================

  async createMessage (params) {
    return await this.client.chat.completions.create(params);
  }

  extractContentFromSDK (response) {
    return response.choices[0].message.content;
  }

  extractUsageFromSDK (response) {
    return response.usage;
  }

  extractFinishReason (response) {
    return response.choices[0].finish_reason;
  }

  // ============================================================================
  // SDK-SPECIFIC OVERRIDES
  // ============================================================================

  async checkSDKAvailability () {
    try {
      const response = await this.client.models.list();
      return response.data.length > 0;
    } catch (error) {
      return false;
    }
  }

  async listSDKModels () {
    try {
      const response = await this.client.models.list();
      return response.data.map(model => ({
        id: model.id,
        name: model.id,
        type: 'chat_completion',
        supports_vision: this.checkVisionSupport(model.id)
      }));
    } catch (error) {
      this.handleError(error, 'list models');
    }
  }

  // ============================================================================
  // PROVIDER CAPABILITIES - Vision support
  // ============================================================================

  /**
   * Check if a specific model supports vision
   */
  checkVisionSupport (modelName) {
    if (!this.supportsVision()) {
      return false;
    }
    return modelName.toLowerCase().includes('vision');
  }
}

module.exports = OpenAICompatibleProvider;
