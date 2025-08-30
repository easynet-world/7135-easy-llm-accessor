const axios = require('axios');

class BaseProvider {
  constructor (config, providerName, options = {}) {
    this.config = config;
    this.name = providerName || 'base';
    this.conversationHistory = [];
    
    // Provider type configuration
    this.providerType = options.providerType || 'http'; // 'http' or 'sdk'
    this.defaultVisionModel = options.defaultVisionModel || null;
    
    // HTTP-specific options
    this.baseURL = options.baseURL || config.baseURL;
    this.endpoint = options.endpoint || '/api/chat';
    this.requestFormat = options.requestFormat || 'ollama';
    this.responseFormat = options.responseFormat || 'ollama';
    
    // SDK-specific options
    this.client = options.client || null;
  }

  // ============================================================================
  // CORE IMPLEMENTATIONS - Unified API methods
  // ============================================================================

  async chat (messages, options = {}) {
    try {
      const formattedMessages = this.formatMessages(messages);
      const mergedOptions = this.mergeOptions(this.getDefaultOptions(), options);
      const validOptions = this.validateOptions(mergedOptions);

      if (this.providerType === 'http') {
        return await this.httpChat(formattedMessages, validOptions, options);
      } else {
        return await this.sdkChat(formattedMessages, validOptions, options);
      }
    } catch (error) {
      this.handleError(error, 'chat');
    }
  }

  async vision (messages, options = {}) {
    try {
      const formattedMessages = this.formatVisionMessages(messages);
      const mergedOptions = this.mergeOptions(this.getDefaultOptions(), options);
      const validOptions = this.validateOptions(mergedOptions);

      if (this.providerType === 'http') {
        return await this.httpVision(formattedMessages, validOptions, options);
      } else {
        return await this.sdkVision(formattedMessages, validOptions, options);
      }
    } catch (error) {
      this.handleError(error, 'vision');
    }
  }

  async streamChat (messages, options = {}) {
    try {
      const formattedMessages = this.formatMessages(messages);
      const mergedOptions = this.mergeOptions(this.getDefaultOptions(), options);
      const validOptions = this.validateOptions(mergedOptions);

      if (this.providerType === 'http') {
        return await this.httpStreamChat(formattedMessages, validOptions, options);
      } else {
        return await this.sdkStreamChat(formattedMessages, validOptions, options);
      }
    } catch (error) {
      this.handleError(error, 'stream chat');
    }
  }

  async streamVision (messages, options = {}) {
    try {
      const formattedMessages = this.formatVisionMessages(messages);
      const mergedOptions = this.mergeOptions(this.getDefaultOptions(), options);
      const validOptions = this.validateOptions(mergedOptions);

      if (this.providerType === 'http') {
        return await this.httpStreamVision(formattedMessages, validOptions, options);
      } else {
        return await this.sdkStreamVision(formattedMessages, validOptions, options);
      }
    } catch (error) {
      this.handleError(error, 'stream vision');
    }
  }

  // ============================================================================
  // HTTP IMPLEMENTATIONS - For HTTP-based providers
  // ============================================================================

  async httpChat (formattedMessages, validOptions, options) {
    const requestData = this.formatRequestData(
      options.model || this.config.model,
      formattedMessages,
      validOptions,
      false
    );

    const response = await this.makeRequest(requestData, { stream: false });

    return this.formatResponse(
      this.extractContent(response),
      response.model,
      this.extractUsage(response),
      'stop'
    );
  }

  async httpVision (formattedMessages, validOptions, options) {
    const requestData = this.formatRequestData(
      options.model || this.defaultVisionModel || this.config.model,
      formattedMessages,
      validOptions,
      false
    );

    const response = await this.makeRequest(requestData, { stream: false });

    return this.formatResponse(
      this.extractContent(response),
      response.model,
      this.extractUsage(response),
      'stop'
    );
  }

  async httpStreamChat (formattedMessages, validOptions, options) {
    const requestData = this.formatRequestData(
      options.model || this.config.model,
      formattedMessages,
      validOptions,
      true
    );

    const response = await this.makeRequest(requestData, {
      stream: true,
      responseType: 'stream'
    });

    return response.data;
  }

  async httpStreamVision (formattedMessages, validOptions, options) {
    const requestData = this.formatRequestData(
      options.model || this.defaultVisionModel || this.config.model,
      formattedMessages,
      validOptions,
      true
    );

    const response = await this.makeRequest(requestData, {
      stream: true,
      responseType: 'stream'
    });

    return response.data;
  }

  // ============================================================================
  // SDK IMPLEMENTATIONS - For SDK-based providers
  // ============================================================================

  async sdkChat (formattedMessages, validOptions, options) {
    const response = await this.createMessage({
      model: options.model || this.config.model,
      messages: formattedMessages,
      temperature: validOptions.temperature,
      max_tokens: validOptions.maxTokens,
      stream: false
    });

    return this.formatResponse(
      this.extractContent(response),
      response.model,
      this.extractUsage(response),
      this.extractFinishReason(response)
    );
  }

  async sdkVision (formattedMessages, validOptions, options) {
    const response = await this.createMessage({
      model: options.model || this.defaultVisionModel || this.config.model,
      messages: formattedMessages,
      temperature: validOptions.temperature,
      max_tokens: validOptions.maxTokens,
      stream: false
    });

    return this.formatResponse(
      this.extractContent(response),
      response.model,
      this.extractUsage(response),
      this.extractFinishReason(response)
    );
  }

  async sdkStreamChat (formattedMessages, validOptions, options) {
    return await this.createMessage({
      model: options.model || this.config.model,
      messages: formattedMessages,
      temperature: validOptions.temperature,
      max_tokens: validOptions.maxTokens,
      stream: true
    });
  }

  async sdkStreamVision (formattedMessages, validOptions, options) {
    return await this.createMessage({
      model: options.model || this.defaultVisionModel || this.config.model,
      messages: formattedMessages,
      temperature: validOptions.temperature,
      max_tokens: validOptions.maxTokens,
      stream: true
    });
  }

  // ============================================================================
  // ABSTRACT METHODS - Must be implemented by SDK-based subclasses
  // ============================================================================

  async createMessage (_params) {
    if (this.providerType === 'sdk') {
      throw new Error('createMessage method must be implemented by SDK-based subclass');
    }
    throw new Error('createMessage is not available for HTTP-based providers');
  }

  extractContentFromSDK (_response) {
    throw new Error('extractContentFromSDK method must be implemented by SDK-based subclass');
  }

  extractUsageFromSDK (_response) {
    throw new Error('extractUsageFromSDK method must be implemented by SDK-based subclass');
  }

  extractFinishReason (_response) {
    throw new Error('extractFinishReason method must be implemented by SDK-based subclass');
  }

  // ============================================================================
  // HIGH-LEVEL INTERFACE - Automatic conversation tracking
  // ============================================================================

  /**
   * Send a chat message with automatic conversation tracking
   */
  async sendChat (messages, options = {}) {
    try {
      this.addToHistory('user', messages);
      const response = await this.chat(messages, options);
      this.addToHistory('assistant', response.content);
      return response;
    } catch (error) {
      throw new Error(`Chat error: ${error.message}`);
    }
  }

  /**
   * Send a vision request with automatic conversation tracking
   */
  async sendVision (messages, options = {}) {
    try {
      this.addToHistory('user', messages);
      const response = await this.vision(messages, options);
      this.addToHistory('assistant', response.content);
      return response;
    } catch (error) {
      throw new Error(`Vision error: ${error.message}`);
    }
  }

  /**
   * Get streaming chat response with conversation tracking
   */
  async getStreamChat (messages, options = {}) {
    try {
      this.addToHistory('user', messages);
      return await this.streamChat(messages, options);
    } catch (error) {
      throw new Error(`Stream chat error: ${error.message}`);
    }
  }

  /**
   * Get streaming vision response with conversation tracking
   */
  async getStreamVision (messages, options = {}) {
    try {
      this.addToHistory('user', messages);
      return await this.streamVision(messages, options);
    } catch (error) {
      throw new Error(`Stream vision error: ${error.message}`);
    }
  }

  // ============================================================================
  // MESSAGE PROCESSING - Universal message formatting
  // ============================================================================

  /**
   * Format messages for provider consumption
   */
  formatMessages (messages) {
    if (typeof messages === 'string') {
      return [{ role: 'user', content: messages }];
    }

    if (!Array.isArray(messages)) {
      throw new Error('Messages must be an array or string');
    }

    return messages.map(msg => {
      if (typeof msg === 'string') {
        return { role: 'user', content: msg };
      }
      return msg;
    });
  }

  /**
   * Format vision messages for provider consumption
   */
  formatVisionMessages (messages) {
    const formattedMessages = [];

    for (const message of messages) {
      if (typeof message === 'string') {
        formattedMessages.push({ role: 'user', content: message });
      } else if (message.role === 'user' && message.content) {
        if (Array.isArray(message.content)) {
          const content = message.content.map(item => {
            if (item.type === 'text') {
              return item;
            } else if (item.type === 'image_url') {
              return {
                type: 'image_url',
                image_url: this.processImageUrl(item.image_url)
              };
            }
            return item;
          });
          formattedMessages.push({ role: 'user', content });
        } else {
          formattedMessages.push(message);
        }
      } else {
        formattedMessages.push(message);
      }
    }

    return formattedMessages;
  }

  // ============================================================================
  // IMAGE PROCESSING - Universal image handling
  // ============================================================================

  /**
   * Process image URLs, file paths, or base64 data
   */
  processImageUrl (imageUrl) {
    if (!imageUrl) {
      throw new Error('Image is required for vision requests');
    }

    if (typeof imageUrl === 'string') {
      if (imageUrl.startsWith('data:image/')) {
        return { url: imageUrl };
      } else if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
        return { url: imageUrl };
      } else {
        // Assume it's a file path
        try {
          const fs = require('fs');
          const imageBuffer = fs.readFileSync(imageUrl);
          const base64 = imageBuffer.toString('base64');
          const mimeType = this.getMimeType(imageUrl);
          return { url: `data:${mimeType};base64,${base64}` };
        } catch (error) {
          throw new Error(`Failed to read image file: ${error.message}`);
        }
      }
    }

    return imageUrl;
  }

  /**
   * Get MIME type from file extension
   */
  getMimeType (filePath) {
    const path = require('path');
    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.webp': 'image/webp',
      '.gif': 'image/gif'
    };
    return mimeTypes[ext] || 'image/jpeg';
  }

  /**
   * Validate image format and size
   */
  validateImage (image, maxSize = 20971520) { // 20MB default
    if (!image) {
      throw new Error('Image is required for vision requests');
    }

    if (typeof image === 'string') {
      if (image.startsWith('http://') || image.startsWith('https://')) {
        return { type: 'url', value: image };
      } else if (image.startsWith('data:image/')) {
        return { type: 'base64', value: image };
      } else {
        // Assume it's a file path
        try {
          const fs = require('fs');
          const stats = fs.statSync(image);
          if (stats.size > maxSize) {
            throw new Error(`Image file too large: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
          }
          return { type: 'file', value: image };
        } catch (error) {
          throw new Error(`Invalid image file: ${error.message}`);
        }
      }
    }

    throw new Error('Invalid image format. Must be URL, base64 string, or file path');
  }

  // ============================================================================
  // HTTP REQUEST HANDLING - For HTTP-based providers
  // ============================================================================

  async makeRequest (data, options = {}) {
    const response = await axios.post(`${this.baseURL}${this.endpoint}`, data, options);
    return response.data;
  }

  formatRequestData (model, messages, options, stream) {
    if (this.requestFormat === 'ollama') {
      return {
        model,
        messages,
        options: {
          temperature: options.temperature,
          num_predict: options.maxTokens,
          stream
        }
      };
    } else {
      // OpenAI-compatible format
      return {
        model,
        messages,
        temperature: options.temperature,
        max_tokens: options.maxTokens,
        stream
      };
    }
  }

  // ============================================================================
  // RESPONSE PROCESSING - Unified for both types
  // ============================================================================

  extractContent (response) {
    if (this.providerType === 'http') {
      if (this.responseFormat === 'ollama') {
        return response.message?.content || response.content || '';
      } else {
        return response.choices?.[0]?.message?.content || response.content || '';
      }
    } else {
      // SDK-based providers implement their own extractContent
      return this.extractContentFromSDK(response);
    }
  }

  extractUsage (response) {
    if (this.providerType === 'http') {
      if (this.responseFormat === 'ollama') {
        return {
          input_tokens: response.prompt_eval_count || 0,
          output_tokens: response.eval_count || 0
        };
      } else {
        return response.usage || {
          input_tokens: 0,
          output_tokens: 0
        };
      }
    } else {
      // SDK-based providers implement their own extractUsage
      return this.extractUsageFromSDK(response);
    }
  }

  // ============================================================================
  // CONVERSATION MANAGEMENT - Built-in conversation tracking
  // ============================================================================

  /**
   * Add message to conversation history
   */
  addToHistory (role, content) {
    this.conversationHistory.push({
      role,
      content: Array.isArray(content) ? content : [{ type: 'text', text: content }],
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Get conversation history
   */
  getHistory () {
    return this.conversationHistory;
  }

  /**
   * Clear conversation history
   */
  clearHistory () {
    this.conversationHistory = [];
  }

  /**
   * Get conversation summary
   */
  getSummary () {
    if (this.conversationHistory.length === 0) {
      return 'No conversation history';
    }

    const userMessages = this.conversationHistory
      .filter(msg => msg.role === 'user')
      .map(msg => msg.content)
      .join(', ');

    const assistantMessages = this.conversationHistory
      .filter(msg => msg.role === 'assistant')
      .map(msg => msg.content)
      .join(', ');

    return `Conversation Summary:
    - User messages: ${userMessages}
    - Assistant responses: ${assistantMessages}
    - Total exchanges: ${this.conversationHistory.length}`;
  }

  // ============================================================================
  // OPTIONS MANAGEMENT - Universal configuration handling
  // ============================================================================

  /**
   * Get default options for this provider
   */
  getDefaultOptions () {
    return {
      temperature: this.config.temperature || 0.7,
      maxTokens: this.config.maxTokens || null,
      stream: false
    };
  }

  /**
   * Merge default options with user options
   */
  mergeOptions (defaultOpts, userOpts) {
    return { ...defaultOpts, ...userOpts };
  }

  /**
   * Validate options before sending to provider
   */
  validateOptions (options) {
    const validOptions = { ...options };

    if (validOptions.temperature !== undefined) {
      validOptions.temperature = Math.max(0, Math.min(2, validOptions.temperature));
    }

    if (validOptions.maxTokens !== undefined) {
      validOptions.maxTokens = Math.max(1, validOptions.maxTokens);
    }

    return validOptions;
  }

  // ============================================================================
  // PROVIDER CAPABILITIES - Vision support
  // ============================================================================

  supportsVision () {
    return this.defaultVisionModel !== null;
  }

  // ============================================================================
  // SERVICE MANAGEMENT - Availability and model discovery
  // ============================================================================

  async isAvailable () {
    if (this.providerType === 'http') {
      try {
        const response = await axios.get(`${this.baseURL}/api/tags`);
        return response.status === 200;
      } catch (error) {
        return false;
      }
    } else {
      // SDK-based providers implement their own availability check
      return this.checkSDKAvailability();
    }
  }

  async checkSDKAvailability () {
    // Default implementation - can be overridden by subclasses
    return true;
  }

  async listModels () {
    if (this.providerType === 'http') {
      try {
        const response = await axios.get(`${this.baseURL}/api/tags`);
        return response.data.models.map(model => ({
          name: model.name,
          size: model.size,
          modified_at: model.modified_at
        }));
      } catch (error) {
        this.handleError(error, 'list models');
      }
    } else {
      // SDK-based providers implement their own model listing
      return this.listSDKModels();
    }
  }

  async listSDKModels () {
    // Default implementation - can be overridden by subclasses
    return [];
  }

  // ============================================================================
  // MODEL INFORMATION - Dynamic model details
  // ============================================================================

  getModelInfo (modelName) {
    return {
      name: modelName,
      context_length: null,
      supports_vision: this.supportsVision(),
      description: `${this.name} model`
    };
  }

  // ============================================================================
  // UTILITY METHODS - Common helper functions
  // ============================================================================

  /**
   * Generate a unique ID
   */
  generateId () {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  /**
   * Format response consistently across providers
   */
  formatResponse (content, model, usage = {}, finishReason = 'stop') {
    return {
      provider: this.name,
      model: model || this.config.model,
      content,
      usage,
      finishReason,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Handle provider-specific errors gracefully
   */
  handleError (error, operation) {
    const errorMessage = error.response?.data?.error?.message ||
                        error.message ||
                        'Unknown error occurred';

    throw new Error(`${this.name} ${operation} error: ${errorMessage}`);
  }
}

module.exports = BaseProvider;
