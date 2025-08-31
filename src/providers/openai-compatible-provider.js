const OpenAI = require('openai');
const BaseProvider = require('./base-provider');
const CacheMixin = require('./mixins/cache-mixin');

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

    // Initialize cache mixin after super() call
    this._initializeCacheMixin();
  }

  /**
   * Initialize cache mixin with provider-specific configuration
   */
  _initializeCacheMixin() {
    // Initialize cache mixin for models and vision support caching
    Object.assign(this, new CacheMixin({
      defaultExpiry: 5 * 60 * 1000, // 5 minutes
      defaultMaxSize: 100,
      cleanupInterval: 2 * 60 * 1000 // 2 minutes
    }));

    // Create caches
    this.createCache('models', {
      expiry: 5 * 60 * 1000,
      maxSize: 100
    });

    this.createCache('visionSupport', {
      expiry: 10 * 60 * 1000, // 10 minutes
      maxSize: 100
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
  // SDK-SPECIFIC OVERRIDES WITH PERFORMANCE OPTIMIZATIONS
  // ============================================================================

  /**
   * Override checkSDKAvailability to use OpenAI's models endpoint
   */
  async checkSDKAvailability () {
    try {
      // Use cached models if available and not expired
      if (this.hasCache('models', 'availability')) {
        return this.getCache('models', 'availability');
      }

      const response = await this.client.models.list();
      const hasModels = response.data.length > 0;
      
      // Cache the result
      this.setCache('models', 'availability', hasModels, { expiry: 5 * 60 * 1000 });
      
      return hasModels;
    } catch (error) {
      return false;
    }
  }

  /**
   * Override listSDKModels to provide OpenAI-specific model information
   */
  async listSDKModels () {
    try {
      // Check cache first
      if (this.hasCache('models', 'list')) {
        return this.getCache('models', 'list');
      }

      const response = await this.client.models.list();
      const models = response.data.map(model => ({
        id: model.id,
        name: model.id,
        type: 'chat_completion',
        supports_vision: this.checkVisionSupport(model.id),
        created: model.created,
        owned_by: model.owned_by
      }));

      // Cache the result
      this.setCache('models', 'list', models, { expiry: 5 * 60 * 1000 });

      return models;
    } catch (error) {
      this.handleError(error, 'list models');
      return [];
    }
  }

  /**
   * Override getModelInfo to provide OpenAI-specific model details
   */
  async getModelInfo(modelName = null) {
    try {
      const targetModel = modelName || this.config.model;
      if (!targetModel) {
        throw new Error('No model specified in configuration');
      }

      // Try to get detailed model info from OpenAI
      try {
        const response = await this.client.models.retrieve(targetModel);
        return {
          name: response.id,
          context_length: response.context_length,
          supports_vision: this.checkVisionSupport(response.id),
          description: response.description || `${this.name} model: ${response.id}`,
          provider: this.name,
          created: response.created,
          owned_by: response.owned_by,
          permissions: response.permission
        };
      } catch (apiError) {
        // Fall back to basic info if API call fails
        return {
          name: targetModel,
          context_length: null,
          supports_vision: this.checkVisionSupport(targetModel),
          description: `${this.name} model: ${targetModel}`,
          provider: this.name
        };
      }
    } catch (error) {
      throw new Error(`Failed to get model info: ${error.message}`);
    }
  }

  // ============================================================================
  // PROVIDER CAPABILITIES - Vision support with caching
  // ============================================================================

  /**
   * Check if a specific model supports vision with caching
   */
  checkVisionSupport (modelName) {
    if (!this.supportsVision()) {
      return false;
    }

    // Check cache first
    if (this.hasCache('visionSupport', modelName)) {
      return this.getCache('visionSupport', modelName);
    }

    const supportsVision = modelName.toLowerCase().includes('vision');
    
    // Cache the result
    this.setCache('visionSupport', modelName, supportsVision, { expiry: 10 * 60 * 1000 });
    
    return supportsVision;
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

  /**
   * Prefetch models to warm up cache
   */
  async prefetchModels () {
    try {
      await this.listSDKModels();
      return true;
    } catch (error) {
      return false;
    }
  }
}

module.exports = OpenAICompatibleProvider;
