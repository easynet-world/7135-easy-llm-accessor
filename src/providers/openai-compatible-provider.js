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

    // Performance optimizations
    this._modelsCache = new Map();
    this._visionSupportCache = new Map();
    this._cacheExpiry = 5 * 60 * 1000; // 5 minutes
    this._lastModelsFetch = 0;
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

  async checkSDKAvailability () {
    try {
      // Use cached models if available and not expired
      if (this._modelsCache.size > 0 && (Date.now() - this._lastModelsFetch) < this._cacheExpiry) {
        return true;
      }

      const response = await this.client.models.list();
      return response.data.length > 0;
    } catch (error) {
      return false;
    }
  }

  async listSDKModels () {
    try {
      // Check cache first
      if (this._modelsCache.size > 0 && (Date.now() - this._lastModelsFetch) < this._cacheExpiry) {
        return Array.from(this._modelsCache.values());
      }

      const response = await this.client.models.list();
      const models = response.data.map(model => ({
        id: model.id,
        name: model.id,
        type: 'chat_completion',
        supports_vision: this.checkVisionSupport(model.id)
      }));

      // Update cache
      this._modelsCache.clear();
      models.forEach(model => {
        this._modelsCache.set(model.id, model);
      });
      this._lastModelsFetch = Date.now();

      return models;
    } catch (error) {
      this.handleError(error, 'list models');
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
    if (this._visionSupportCache.has(modelName)) {
      return this._visionSupportCache.get(modelName);
    }

    const supportsVision = modelName.toLowerCase().includes('vision');
    
    // Cache the result
    this._visionSupportCache.set(modelName, supportsVision);
    
    // Limit cache size
    if (this._visionSupportCache.size > 100) {
      const keys = Array.from(this._visionSupportCache.keys()).slice(0, 20);
      keys.forEach(k => this._visionSupportCache.delete(k));
    }

    return supportsVision;
  }

  // ============================================================================
  // CACHE MANAGEMENT METHODS
  // ============================================================================

  /**
   * Clear all caches
   */
  clearCaches () {
    this._modelsCache.clear();
    this._visionSupportCache.clear();
    this._lastModelsFetch = 0;
  }

  /**
   * Get cache statistics
   */
  getCacheStats () {
    return {
      modelsCacheSize: this._modelsCache.size,
      visionSupportCacheSize: this._visionSupportCache.size,
      lastModelsFetch: this._lastModelsFetch,
      cacheAge: Date.now() - this._lastModelsFetch
    };
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
