const Anthropic = require('@anthropic-ai/sdk');
const BaseProvider = require('./base-provider');
const CacheMixin = require('./mixins/cache-mixin');
const ImageProcessingMixin = require('./mixins/image-processing-mixin');
const MessageFormattingMixin = require('./mixins/message-formatting-mixin');

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

    // Initialize mixins
    this._initializeMixins();
  }

  /**
   * Initialize mixins with provider-specific configuration
   */
  _initializeMixins() {
    // Initialize cache mixin for message caching
    Object.assign(this, new CacheMixin({
      defaultExpiry: 5 * 60 * 1000, // 5 minutes
      defaultMaxSize: 100,
      cleanupInterval: 2 * 60 * 1000 // 2 minutes
    }));

    // Initialize image processing mixin
    Object.assign(this, new ImageProcessingMixin({
      maxImageSize: 20971520, // 20MB
      supportedFormats: ['jpg', 'jpeg', 'png', 'webp', 'gif']
    }));

    // Initialize message formatting mixin
    Object.assign(this, new MessageFormattingMixin({
      maxMessageLength: 100000, // 100KB
      maxMessages: 100,
      supportedRoles: ['user', 'assistant', 'system']
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
  // ANTHROPIC-SPECIFIC FEATURES WITH PERFORMANCE OPTIMIZATIONS
  // ============================================================================

  /**
   * Process image sources for Anthropic's format with caching
   */
  processImageSourceForAnthropic (imageUrl) {
    // Use the image processing mixin
    return this.processImageForAnthropic(imageUrl);
  }

  // ============================================================================
  // SDK-SPECIFIC OVERRIDES
  // ============================================================================

  async checkSDKAvailability () {
    // Simple availability check for Anthropic
    return true;
  }

  async listSDKModels () {
    // Anthropic doesn't have a models.list() endpoint like OpenAI
    // Return empty array - models should be configured in .env
    return [];
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
