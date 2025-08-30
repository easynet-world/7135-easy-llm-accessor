const Config = require('./config');
const OpenAICompatibleProvider = require('./providers/openai-compatible-provider');
const AnthropicProvider = require('./providers/anthropic-provider');
const OllamaProvider = require('./providers/ollama-provider');

class LLMClient {
  constructor (options = {}) {
    this.config = new Config();

    // Override config with options if provided
    if (options.provider) {
      this.config.provider = options.provider;
    }

    // Merge custom configuration options into the config
    if (options.config) {
      // Merge the custom config with the provider config
      const providerConfig = this.config.getProviderConfig();
      const mergedConfig = { ...providerConfig, ...options.config };
      
      // Update the config object with merged values
      Object.assign(this.config, mergedConfig);
      
      // Also expose the merged config directly for easy access
      this._mergedConfig = mergedConfig;
    }

    // Validate configuration
    this.config.validate();

    // Performance optimizations
    this._providerCache = new Map();
    this._lastProviderSwitch = Date.now();
    this._providerWarmupCache = new Set();

    // Initialize provider
    this.provider = this.initializeProvider();
    
    // Expose configuration properties directly for backward compatibility
    this._exposeConfigProperties();
  }

  /**
   * Expose configuration properties directly on the client instance
   * for easy access like client.baseURL, client.model, etc.
   */
  _exposeConfigProperties() {
    const providerConfig = this.config.getProviderConfig();
    
    // Expose common configuration properties
    Object.defineProperties(this, {
      baseURL: {
        get: () => this._mergedConfig?.baseURL || providerConfig.baseURL,
        enumerable: true,
        configurable: true
      },
      model: {
        get: () => this._mergedConfig?.model || providerConfig.model,
        enumerable: true,
        configurable: true
      },
      temperature: {
        get: () => this._mergedConfig?.temperature || providerConfig.temperature,
        enumerable: true,
        configurable: true
      },
      maxTokens: {
        get: () => this._mergedConfig?.maxTokens || providerConfig.maxTokens,
        enumerable: true,
        configurable: true
      },
      apiKey: {
        get: () => this._mergedConfig?.apiKey || providerConfig.apiKey,
        enumerable: true,
        configurable: true
      }
    });
  }

  initializeProvider () {
    const providerConfig = this.config.getProviderConfig();
    const providerKey = `${this.config.provider}-${JSON.stringify(providerConfig)}`;

    // Check cache first
    if (this._providerCache.has(providerKey)) {
      return this._providerCache.get(providerKey);
    }

    let provider;
    switch (this.config.provider.toLowerCase()) {
    case 'openai':
      provider = new OpenAICompatibleProvider(providerConfig, 'openai', 'gpt-4-vision-preview');
      break;

    case 'anthropic':
      provider = new AnthropicProvider(providerConfig);
      break;

    case 'ollama':
      provider = new OllamaProvider(providerConfig);
      break;

    case 'groq':
      provider = new OpenAICompatibleProvider(providerConfig, 'groq', null);
      break;

    case 'grok':
      provider = new OpenAICompatibleProvider(providerConfig, 'grok', 'grok-vision');
      break;

    default:
      throw new Error(`Unsupported provider: ${this.config.provider}`);
    }

    // Cache the provider instance
    this._providerCache.set(providerKey, provider);
    
    // Limit cache size
    if (this._providerCache.size > 10) {
      const keys = Array.from(this._providerCache.keys()).slice(0, 2);
      keys.forEach(k => this._providerCache.delete(k));
    }

    return provider;
  }

  // ============================================================================
  // CHAT METHODS - Using base provider's generic features with performance optimizations
  // ============================================================================

  /**
   * Send a chat message
   * @param {string|Array} messages - Message or array of messages
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} Response from LLM
   */
  async chat (messages, options = {}) {
    return this.provider.sendChat(messages, options);
  }

  /**
   * Simple chat alias
   * @param {string} message - Text message
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} Response from LLM
   */
  async ask (message, options = {}) {
    return this.provider.sendChat(message, options);
  }

  // ============================================================================
  // VISION METHODS - Using base provider's generic features
  // ============================================================================

  /**
   * Send a vision request with image
   * @param {Array} messages - Array of messages with image content
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} Response from LLM
   */
  async vision (messages, options = {}) {
    return this.provider.sendVision(messages, options);
  }

  /**
   * Simple vision request
   * @param {string} prompt - Text prompt
   * @param {string} image - Image URL, base64, or file path
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} Response from LLM
   */
  async see (prompt, image, options = {}) {
    const messages = [
      {
        role: 'user',
        content: [
          { type: 'text', text: prompt },
          { type: 'image_url', image_url: image }
        ]
      }
    ];

    return this.provider.sendVision(messages, options);
  }

  // ============================================================================
  // STREAMING METHODS - Using base provider's generic features
  // ============================================================================

  /**
   * Stream chat response
   * @param {string|Array} messages - Message or array of messages
   * @param {Object} options - Additional options
   * @returns {Promise<Stream>} Streaming response
   */
  async streamChat (messages, options = {}) {
    return this.provider.getStreamChat(messages, options);
  }

  /**
   * Stream vision response
   * @param {Array} messages - Array of messages with image content
   * @param {Object} options - Additional options
   * @returns {Promise<Stream>} Streaming response
   */
  async streamVision (messages, options = {}) {
    return this.provider.getStreamVision(messages, options);
  }

  // ============================================================================
  // CONVERSATION MANAGEMENT - Delegated to base provider
  // ============================================================================

  /**
   * Get conversation history
   * @returns {Array} Conversation history
   */
  getHistory () {
    return this.provider.getHistory();
  }

  /**
   * Get conversation history array directly
   * @returns {Array} Raw conversation history array
   */
  get _conversationHistory() {
    return this.provider._conversationHistory || [];
  }

  /**
   * Clear conversation history
   */
  clearHistory () {
    this.provider.clearHistory();
  }

  /**
   * Get conversation summary
   * @returns {string} Summary of the conversation
   */
  getSummary () {
    return this.provider.getSummary();
  }

  /**
   * Get conversation history length
   * @returns {number} Number of messages in conversation history
   */
  getHistoryLength() {
    return this.provider._conversationHistory?.length || 0;
  }

  /**
   * Get the last message from conversation history
   * @returns {Object|null} Last message or null if no history
   */
  getLastMessage() {
    const history = this.provider._conversationHistory;
    return history && history.length > 0 ? history[history.length - 1] : null;
  }

  /**
   * Get conversation history as a formatted string
   * @returns {string} Formatted conversation history
   */
  getFormattedHistory() {
    const history = this.provider._conversationHistory;
    if (!history || history.length === 0) {
      return 'No conversation history';
    }

    return history.map(msg => `${msg.role}: ${msg.content}`).join('\n');
  }

  /**
   * Get conversation history length
   * @returns {number} Number of messages in conversation history
   */
  getHistoryLength() {
    return this.provider._conversationHistory?.length || 0;
  }

  /**
   * Get the last message from conversation history
   * @returns {Object|null} Last message or null if no history
   */
  getLastMessage() {
    const history = this.provider._conversationHistory;
    return history && history.length > 0 ? history[history.length - 1] : null;
  }

  /**
   * Get conversation history as a formatted string
   * @returns {string} Formatted conversation history
   */
  getFormattedHistory() {
    const history = this.provider._conversationHistory;
    if (!history || history.length === 0) {
      return 'No conversation history';
    }

    return history.map(msg => `${msg.role}: ${msg.content}`).join('\n');
  }

  // ============================================================================
  // PROVIDER MANAGEMENT WITH PERFORMANCE OPTIMIZATIONS
  // ============================================================================

  /**
   * Get current provider information
   * @returns {Object} Provider information
   */
  getProviderInfo () {
    return {
      name: this.provider.name,
      config: this.config.getProviderConfig(),
      cacheStats: this.getCacheStats()
    };
  }

  /**
   * Switch provider with performance optimizations
   * @param {string} provider - New provider name
   */
  switchProvider (provider) {
    if (this.config.provider === provider) {
      return; // No need to switch if it's the same provider
    }

    this.config.provider = provider;
    this.config.validate();
    
    // Clear provider cache when switching
    this._providerCache.clear();
    
    this.provider = this.initializeProvider();
    this._lastProviderSwitch = Date.now();
  }

  /**
   * Check if current provider is available with caching
   * @returns {Promise<boolean>} Provider availability
   */
  async isProviderAvailable () {
    const cacheKey = `availability-${this.provider.name}`;
    
    // Check if we have a recent availability check
    if (this._providerWarmupCache.has(cacheKey)) {
      return true;
    }

    const isAvailable = await this.provider.isAvailable();
    
    if (isAvailable) {
      this._providerWarmupCache.add(cacheKey);
      
      // Limit warmup cache size
      if (this._providerWarmupCache.size > 20) {
        const entries = Array.from(this._providerWarmupCache).slice(0, 10);
        entries.forEach(entry => this._providerWarmupCache.delete(entry));
      }
    }
    
    return isAvailable;
  }

  /**
   * List available models for current provider with caching
   * @returns {Promise<Array>} Available models
   */
  async listModels () {
    if (this.provider.listModels) {
      return this.provider.listModels();
    }
    throw new Error(`Provider ${this.provider.name} does not support model listing`);
  }

  // ============================================================================
  // PERFORMANCE OPTIMIZATION METHODS
  // ============================================================================

  /**
   * Warm up provider caches for better performance
   * @returns {Promise<boolean>} Success status
   */
  async warmupCaches () {
    try {
      // Warm up provider availability
      await this.isProviderAvailable();
      
      // Warm up models if supported
      if (this.provider.listModels) {
        await this.listModels();
      }
      
      // Warm up provider-specific caches
      if (this.provider.prefetchModels) {
        await this.provider.prefetchModels();
      }
      
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get cache statistics for all providers
   * @returns {Object} Cache statistics
   */
  getCacheStats () {
    const stats = {
      providerCacheSize: this._providerCache.size,
      providerWarmupCacheSize: this._providerWarmupCache.size,
      lastProviderSwitch: this._lastProviderSwitch
    };

    // Add provider-specific cache stats
    if (this.provider.getCacheStats) {
      stats.providerSpecific = this.provider.getCacheStats();
    }

    return stats;
  }

  /**
   * Clear all caches for better memory management
   */
  clearAllCaches () {
    this._providerCache.clear();
    this._providerWarmupCache.clear();
    
    // Clear provider-specific caches
    if (this.provider.clearCaches) {
      this.provider.clearCaches();
    }
  }

  /**
   * Optimize memory usage by trimming caches
   */
  optimizeMemory () {
    // Trim provider cache
    if (this._providerCache.size > 5) {
      const keys = Array.from(this._providerCache.keys()).slice(0, 2);
      keys.forEach(k => this._providerCache.delete(k));
    }

    // Trim warmup cache
    if (this._providerWarmupCache.size > 10) {
      const entries = Array.from(this._providerWarmupCache).slice(0, 5);
      entries.forEach(entry => this._providerWarmupCache.delete(entry));
    }

    // Clear provider-specific caches if they support it
    if (this.provider.clearCaches) {
      this.provider.clearCaches();
    }
  }
}

module.exports = LLMClient;
