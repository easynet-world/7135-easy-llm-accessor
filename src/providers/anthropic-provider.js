const Anthropic = require('@anthropic-ai/sdk');
const BaseProvider = require('./base-provider');
const CacheMixin = require('./mixins/cache-mixin');

class AnthropicProvider extends BaseProvider {
  constructor (config) {
    super(config, 'anthropic', {
      providerType: 'sdk',
      defaultVisionModel: 'claude-3-sonnet-20240229',
      client: new Anthropic({
        apiKey: config.apiKey,
        timeout: 30000,
        maxRetries: 3
      })
    });

    // Initialize cache mixin after super() call
    this._initializeCacheMixin();
  }

  /**
   * Initialize cache mixin with provider-specific configuration
   */
  _initializeCacheMixin() {
    // Initialize cache mixin for message caching
    Object.assign(this, new CacheMixin({
      defaultExpiry: 5 * 60 * 1000, // 5 minutes
      defaultMaxSize: 100,
      cleanupInterval: 2 * 60 * 1000 // 2 minutes
    }));

    // Create message caches
    this.createCache('messages', {
      expiry: 5 * 60 * 1000,
      maxSize: 100
    });

    this.createCache('visionMessages', {
      expiry: 5 * 60 * 1000,
      maxSize: 100
    });
  }

  // ============================================================================
  // IMPLEMENTATION OF ABSTRACT METHODS
  // ============================================================================

  async createMessage (params) {
    return await this.client.messages.create(params);
  }

  extractContentFromSDK (response) {
    return response.content[0].text;
  }

  extractUsageFromSDK (response) {
    return {
      input_tokens: response.usage.input_tokens,
      output_tokens: response.usage.output_tokens
    };
  }

  extractFinishReason (response) {
    return response.stop_reason;
  }

  // ============================================================================
  // ANTHROPIC-SPECIFIC MESSAGE FORMATTING WITH PERFORMANCE OPTIMIZATIONS
  // ============================================================================

  formatMessages (messages) {
    // Use the message formatting mixin
    return this.formatMessagesForAnthropic(messages);
  }

  formatVisionMessages (messages) {
    // Use the message formatting mixin
    return this.formatVisionMessagesForAnthropic(messages);
  }

  // ============================================================================
  // SDK-SPECIFIC OVERRIDES
  // ============================================================================

  /**
   * Override checkSDKAvailability for Anthropic
   * Anthropic doesn't have a models.list() endpoint, so we use a simple check
   */
  async checkSDKAvailability () {
    try {
      // For Anthropic, we can check if the API key is valid by making a simple request
      // or just return true since Anthropic doesn't have a models endpoint
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Override listSDKModels for Anthropic
   * Anthropic doesn't have a models.list() endpoint, so we return configured models
   */
  async listSDKModels () {
    // Anthropic doesn't have a models.list() endpoint like OpenAI
    // Return the models that are typically available with Anthropic
    return [
      {
        id: 'claude-3-opus-20240229',
        name: 'claude-3-opus-20240229',
        type: 'chat_completion',
        supports_vision: true,
        description: 'Claude 3 Opus - Most capable model',
        provider: this.name
      },
      {
        id: 'claude-3-sonnet-20240229',
        name: 'claude-3-sonnet-20240229',
        type: 'chat_completion',
        supports_vision: true,
        description: 'Claude 3 Sonnet - Balanced capability and speed',
        provider: this.name
      },
      {
        id: 'claude-3-haiku-20240307',
        name: 'claude-3-haiku-20240307',
        type: 'chat_completion',
        supports_vision: true,
        description: 'Claude 3 Haiku - Fastest and most compact',
        provider: this.name
      }
    ];
  }

  /**
   * Override getModelInfo for Anthropic
   * Provide Anthropic-specific model information
   */
  async getModelInfo(modelName = null) {
    try {
      const targetModel = modelName || this.config.model;
      if (!targetModel) {
        throw new Error('No model specified in configuration');
      }

      // Anthropic model information
      const modelInfo = {
        'claude-3-opus-20240229': {
          name: 'claude-3-opus-20240229',
          context_length: 200000,
          supports_vision: true,
          description: 'Claude 3 Opus - Most capable model for complex tasks',
          provider: this.name,
          family: 'claude-3',
          capabilities: ['chat', 'vision', 'code', 'analysis']
        },
        'claude-3-sonnet-20240229': {
          name: 'claude-3-sonnet-20240229',
          context_length: 200000,
          supports_vision: true,
          description: 'Claude 3 Sonnet - Balanced capability and speed',
          provider: this.name,
          family: 'claude-3',
          capabilities: ['chat', 'vision', 'code', 'analysis']
        },
        'claude-3-haiku-20240307': {
          name: 'claude-3-haiku-20240307',
          context_length: 200000,
          supports_vision: true,
          description: 'Claude 3 Haiku - Fastest and most compact model',
          provider: this.name,
          family: 'claude-3',
          capabilities: ['chat', 'vision', 'code', 'analysis']
        }
      };

      return modelInfo[targetModel] || {
        name: targetModel,
        context_length: 200000, // Default for Claude models
        supports_vision: true,   // All Claude 3 models support vision
        description: `Claude model: ${targetModel}`,
        provider: this.name,
        family: 'claude-3',
        capabilities: ['chat', 'vision', 'code', 'analysis']
      };
    } catch (error) {
      throw new Error(`Failed to get model info: ${error.message}`);
    }
  }

  // ============================================================================
  // CACHE MANAGEMENT METHODS (Delegated to CacheMixin)
  // ============================================================================

  /**
   * Clear all caches
   */
  clearCaches () {
    this.clearAllCaches();
  }

  /**
   * Get cache statistics
   */
  getCacheStats () {
    return this.getAllCacheStats();
  }
}

module.exports = AnthropicProvider;
