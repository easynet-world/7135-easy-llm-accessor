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

    // Validate configuration
    this.config.validate();

    // Initialize provider
    this.provider = this.initializeProvider();
  }

  initializeProvider () {
    const providerConfig = this.config.getProviderConfig();

    switch (this.config.provider.toLowerCase()) {
    case 'openai':
      return new OpenAICompatibleProvider(providerConfig, 'openai', 'gpt-4-vision-preview');

    case 'anthropic':
      return new AnthropicProvider(providerConfig);

    case 'ollama':
      return new OllamaProvider(providerConfig);

    case 'groq':
      return new OpenAICompatibleProvider(providerConfig, 'groq', null);

    case 'grok':
      return new OpenAICompatibleProvider(providerConfig, 'grok', 'grok-vision');

    default:
      throw new Error(`Unsupported provider: ${this.config.provider}`);
    }
  }

  // ============================================================================
  // CHAT METHODS - Using base provider's generic features
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

  // ============================================================================
  // PROVIDER MANAGEMENT
  // ============================================================================

  /**
   * Get current provider information
   * @returns {Object} Provider information
   */
  getProviderInfo () {
    return {
      name: this.provider.name,
      config: this.config.getProviderConfig()
    };
  }

  /**
   * Switch provider
   * @param {string} provider - New provider name
   */
  switchProvider (provider) {
    this.config.provider = provider;
    this.config.validate();
    this.provider = this.initializeProvider();
  }

  /**
   * Check if current provider is available
   * @returns {Promise<boolean>} Provider availability
   */
  async isProviderAvailable () {
    return this.provider.isAvailable();
  }

  /**
   * List available models for current provider
   * @returns {Promise<Array>} Available models
   */
  async listModels () {
    if (this.provider.listModels) {
      return this.provider.listModels();
    }
    throw new Error(`Provider ${this.provider.name} does not support model listing`);
  }
}

module.exports = LLMClient;
