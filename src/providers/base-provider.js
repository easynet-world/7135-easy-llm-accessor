const axios = require('axios');
const ImageProcessingMixin = require('./mixins/image-processing-mixin');
const MessageFormattingMixin = require('./mixins/message-formatting-mixin');

// HTTP client with connection pooling and retry logic
const httpClient = axios.create({
  timeout: 30000,
  maxRedirects: 5,
  // Connection pooling
  httpAgent: new (require('http').Agent)({
    keepAlive: true,
    maxSockets: 10,
    maxFreeSockets: 5
  }),
  httpsAgent: new (require('https').Agent)({
    keepAlive: true,
    maxSockets: 10,
    maxFreeSockets: 5
  })
});

class BaseProvider {
  constructor (config, providerName, options = {}) {
    this.config = config;
    this.name = providerName || 'base';
    
    // Use WeakMap for conversation history to allow garbage collection
    this._conversationHistory = [];
    this._historySize = 0;
    this._maxHistorySize = options.maxHistorySize || 100; // Configurable limit
    
    // Provider type configuration
    this.providerType = options.providerType || 'http';
    this.defaultVisionModel = options.defaultVisionModel || null;
    
    // HTTP-specific options
    this.baseURL = options.baseURL || config.baseURL;
    this.endpoint = options.endpoint || '/api/chat';
    this.requestFormat = options.requestFormat || 'ollama';
    this.responseFormat = options.responseFormat || 'ollama';
    
    // SDK-specific options
    this.client = options.client || null;
    
    // Performance optimizations
    this._defaultOptions = null;
    this._defaultOptionsCache = new Map();
    
    // Error handling improvements
    this._retryAttempts = options.retryAttempts || 3;
    this._retryDelay = options.retryDelay || 1000;

    // Performance monitoring
    this._performanceMetrics = {
      requestCount: 0,
      totalResponseTime: 0,
      averageResponseTime: 0,
      errorCount: 0,
      lastRequestTime: null
    };

    // Health monitoring
    this._healthStatus = {
      lastCheck: null,
      isHealthy: null,
      consecutiveFailures: 0,
      uptime: Date.now()
    };

    // Mixins will be initialized by individual providers
  }

  /**
   * Initialize mixins with provider-specific configuration
   */
  _initializeMixins() {
    // Mixins will be initialized by individual providers
    // This method can be overridden by subclasses
  }

  // ============================================================================
  // GENERIC HEALTH MONITORING & AVAILABILITY
  // ============================================================================

  /**
   * Check if provider is healthy and available
   * @returns {Promise<boolean>} Health status
   */
  async isHealthy() {
    try {
      const startTime = Date.now();
      
      if (this.providerType === 'http') {
        // For HTTP providers, use the provider's own implementation if available
        if (this._checkHttpHealth) {
          const isHealthy = await this._checkHttpHealth();
          this._updateHealthStatus(isHealthy, Date.now() - startTime);
          return isHealthy;
        }
        
        // Fallback to generic HTTP health check
        const response = await httpClient.get(`${this.baseURL}/api/tags`, {
          timeout: 5000 // 5 second timeout for health check
        });
        const isHealthy = response.status === 200;
        this._updateHealthStatus(isHealthy, Date.now() - startTime);
        return isHealthy;
      } else {
        // SDK-based providers implement their own availability check
        const isHealthy = await this.checkSDKAvailability();
        this._updateHealthStatus(isHealthy, Date.now() - startTime);
        return isHealthy;
      }
    } catch (error) {
      this._updateHealthStatus(false, 0, error);
      return false;
    }
  }

  /**
   * Get detailed health status information
   * @returns {Promise<Object>} Detailed health status
   */
  async getHealthStatus() {
    try {
      const startTime = Date.now();
      
      // Check basic availability
      const isAvailable = await this.isHealthy();
      
      if (!isAvailable) {
        return {
          status: 'unhealthy',
          available: false,
          error: `${this.name} instance is not responding`,
          consecutive_failures: this._healthStatus.consecutiveFailures,
          uptime_ms: Date.now() - this._healthStatus.uptime,
          last_check: this._healthStatus.lastCheck,
          timestamp: new Date().toISOString()
        };
      }

      // Get model count
      const models = await this.listModels();
      
      // Calculate response time
      const responseTime = Date.now() - startTime;
      
      return {
        status: 'healthy',
        available: true,
        models: models.length,
        response_time_ms: responseTime,
        base_url: this.baseURL,
        consecutive_failures: this._healthStatus.consecutiveFailures,
        uptime_ms: Date.now() - this._healthStatus.uptime,
        last_check: this._healthStatus.lastCheck,
        performance_metrics: this.getPerformanceMetrics(),
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        status: 'error',
        available: false,
        error: error.message,
        consecutive_failures: this._healthStatus.consecutiveFailures,
        uptime_ms: Date.now() - this._healthStatus.uptime,
        last_check: this._healthStatus.lastCheck,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Update health status internally
   * @private
   */
  _updateHealthStatus(isHealthy, responseTime, error = null) {
    this._healthStatus.lastCheck = new Date().toISOString();
    
    if (isHealthy) {
      this._healthStatus.isHealthy = true;
      this._healthStatus.consecutiveFailures = 0;
    } else {
      this._healthStatus.isHealthy = false;
      this._healthStatus.consecutiveFailures++;
    }

    // Update performance metrics
    this._updatePerformanceMetrics(responseTime, error);
  }

  // ============================================================================
  // GENERIC MODEL MANAGEMENT
  // ============================================================================

  /**
   * List all available models
   * @returns {Promise<Array>} Array of model objects
   */
  async listModels() {
    try {
      if (this.providerType === 'http') {
        // For HTTP providers, use the provider's own implementation if available
        if (this._listHttpModels) {
          return await this._listHttpModels();
        }
        
        // Fallback to generic HTTP model listing
        const response = await httpClient.get(`${this.baseURL}/api/tags`);
        if (response.data && response.data.models) {
          return response.data.models.map(model => ({
            name: model.name,
            size: this._formatBytes(model.size),
            modified_at: model.modified_at,
            digest: model.digest || null
          }));
        }
        return [];
      } else {
        // SDK-based providers implement their own model listing
        return await this.listSDKModels();
      }
    } catch (error) {
      this.handleError(error, 'list models');
      return [];
    }
  }

  /**
   * Switch to a different model
   * @param {string} modelName - Name of the model to switch to
   * @returns {Promise<boolean>} Success status
   */
  async switchModel(modelName) {
    try {
      // Update the current model in config
      this.config.model = modelName;
      
      // Verify the model exists and is available
      const models = await this.listModels();
      const modelExists = models.some(model => model.name === modelName);
      
      if (!modelExists) {
        throw new Error(`Model '${modelName}' not found. Available models: ${models.map(m => m.name).join(', ')}`);
      }
      
      return true;
    } catch (error) {
      throw new Error(`Failed to switch model: ${error.message}`);
    }
  }

  /**
   * Get information about the current model
   * @returns {Promise<Object>} Model information
   */
  async getModelInfo(modelName = null) {
    try {
      const targetModel = modelName || this.config.model;
      if (!targetModel) {
        throw new Error('No model specified in configuration');
      }

      if (this.providerType === 'http') {
        // For HTTP providers, use the provider's own implementation if available
        if (this._getHttpModelInfo) {
          return await this._getHttpModelInfo(targetModel);
        }
        
        // Fallback to generic HTTP model info
        try {
          const response = await httpClient.post(`${this.baseURL}/api/show`, {
            name: targetModel
          });

          if (response.data) {
            return {
              name: response.data.name,
              size: this._formatBytes(response.data.size),
              parameters: response.data.parameter_size || null,
              quantization: response.data.quantization_level || null,
              family: response.data.family || null,
              modified_at: response.data.modified_at,
              digest: response.data.digest || null
            };
          }
        } catch (apiError) {
          // Fall back to basic info if API call fails
        }
      }

      // Return basic model info
      return {
        name: targetModel,
        context_length: null,
        supports_vision: this.supportsVision(),
        description: `${this.name} model: ${targetModel}`,
        provider: this.name
      };
    } catch (error) {
      throw new Error(`Failed to get model info: ${error.message}`);
    }
  }

  // ============================================================================
  // GENERIC STREAMING SUPPORT
  // ============================================================================

  /**
   * Create a generic streaming response handler
   * @param {Object} response - Response object
   * @param {Object} options - Streaming options
   * @returns {EventEmitter} Stream emitter
   */
  _createGenericStream(response, options = {}) {
    const { EventEmitter } = require('events');
    const stream = new EventEmitter();
    
    let accumulatedContent = '';
    let tokenCount = 0;
    let isComplete = false;

    const processChunk = (chunk) => {
      try {
        const lines = chunk.toString().split('\n');
        
        for (const line of lines) {
          if (line.trim() && !isComplete) {
            try {
              const parsed = JSON.parse(line);
              
              // Handle different response formats
              let content = '';
              if (parsed.message?.content) {
                content = parsed.message.content;
              } else if (parsed.content) {
                content = parsed.content;
              } else if (parsed.response) {
                content = parsed.response;
              } else if (parsed.choices?.[0]?.delta?.content) {
                content = parsed.choices[0].delta.content;
              }
              
              if (content) {
                accumulatedContent += content;
                tokenCount++;
                
                // Emit chunk data
                stream.emit('data', {
                  content,
                  model: parsed.model || this.config.model,
                  done: false,
                  token_count: tokenCount
                });
              }
              
              // Check for completion
              if (parsed.done === true || parsed.choices?.[0]?.finish_reason) {
                isComplete = true;
                
                // Emit final response
                stream.emit('data', {
                  content: '',
                  model: parsed.model || this.config.model,
                  done: true,
                  final_content: accumulatedContent,
                  total_tokens: tokenCount
                });
                
                stream.emit('end', {
                  content: accumulatedContent,
                  model: parsed.model || this.config.model,
                  usage: {
                    input_tokens: options.messages?.length || 0,
                    output_tokens: tokenCount
                  }
                });
              }
            } catch (e) {
              // Skip malformed lines
              continue;
            }
          }
        }
      } catch (error) {
        stream.emit('error', error);
      }
    };

    // Handle different response types
    if (response.data && typeof response.data.on === 'function') {
      // Stream response
      response.data.on('data', processChunk);
      response.data.on('error', (error) => stream.emit('error', error));
      response.data.on('end', () => {
        if (!isComplete) {
          stream.emit('end', {
            content: accumulatedContent,
            model: this.config.model,
            usage: {
              input_tokens: options.messages?.length || 0,
              output_tokens: tokenCount
            }
          });
        }
      });
    } else if (response.data && typeof response.data === 'string') {
      // String response (parse line by line)
      const lines = response.data.split('\n');
      lines.forEach(line => processChunk(Buffer.from(line + '\n')));
    }

    return stream;
  }

  // ============================================================================
  // GENERIC PERFORMANCE MONITORING
  // ============================================================================

  /**
   * Update performance metrics
   * @private
   */
  _updatePerformanceMetrics(responseTime, error = null) {
    this._performanceMetrics.requestCount++;
    this._performanceMetrics.totalResponseTime += responseTime;
    this._performanceMetrics.averageResponseTime = 
      this._performanceMetrics.totalResponseTime / this._performanceMetrics.requestCount;
    this._performanceMetrics.lastRequestTime = new Date().toISOString();
    
    if (error) {
      this._performanceMetrics.errorCount++;
    }
  }

  /**
   * Get performance metrics
   * @returns {Object} Performance metrics
   */
  getPerformanceMetrics() {
    return {
      ...this._performanceMetrics,
      success_rate: this._performanceMetrics.requestCount > 0 
        ? ((this._performanceMetrics.requestCount - this._performanceMetrics.errorCount) / this._performanceMetrics.requestCount * 100).toFixed(2) + '%'
        : '0%'
    };
  }

  /**
   * Reset performance metrics
   */
  resetPerformanceMetrics() {
    this._performanceMetrics = {
      requestCount: 0,
      totalResponseTime: 0,
      averageResponseTime: 0,
      errorCount: 0,
      lastRequestTime: null
    };
  }

  // ============================================================================
  // GENERIC CONFIGURATION MANAGEMENT
  // ============================================================================

  /**
   * Get current configuration with provider-specific options
   * @returns {Object} Current configuration
   */
  getCurrentConfig() {
    const baseConfig = {
      ...this.config,
      provider: this.name,
      providerType: this.providerType,
      baseURL: this.baseURL,
      endpoint: this.endpoint,
      requestFormat: this.requestFormat,
      responseFormat: this.responseFormat
    };

    // Add provider-specific options if available
    if (this._extractProviderOptions) {
      baseConfig.provider_options = this._extractProviderOptions(this.config);
    }

    return baseConfig;
  }

  /**
   * Validate configuration
   * @returns {Object} Validation result
   */
  validateConfiguration() {
    const errors = [];
    const warnings = [];

    // Check required fields
    if (!this.config) {
      errors.push('Configuration object is required');
    } else {
      if (this.providerType === 'http' && !this.baseURL) {
        errors.push('baseURL is required for HTTP providers');
      }
      
      if (this.providerType === 'sdk' && !this.config.apiKey) {
        warnings.push('apiKey is recommended for SDK providers');
      }
    }

    // Check performance settings
    if (this._retryAttempts < 1 || this._retryAttempts > 10) {
      warnings.push('retryAttempts should be between 1 and 10');
    }

    if (this._retryDelay < 100 || this._retryDelay > 10000) {
      warnings.push('retryDelay should be between 100ms and 10s');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  // ============================================================================
  // GENERIC UTILITY METHODS
  // ============================================================================

  /**
   * Format bytes to human readable format
   * @param {number} bytes - Number of bytes
   * @returns {string} Formatted string
   */
  _formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  /**
   * Generate cache key for response caching
   * @param {string} text - Text to hash
   * @returns {string} Cache key
   */
  _generateCacheKey(text) {
    let hash = 0;
    const str = text.slice(0, 100); // Only hash first 100 chars for performance
    
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    return hash.toString();
  }

  // ============================================================================
  // CORE IMPLEMENTATIONS - Unified API methods with performance optimizations
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
      return this.handleError(error, 'chat');
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
      return this.handleError(error, 'vision');
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
      return this.handleError(error, 'stream chat');
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
      return this.handleError(error, 'stream vision');
    }
  }

  // ============================================================================
  // HTTP IMPLEMENTATIONS - For HTTP-based providers with retry logic
  // ============================================================================

  async httpChat (formattedMessages, validOptions, options) {
    const requestData = this.formatRequestData(
      options.model || this.config.model,
      formattedMessages,
      validOptions,
      false
    );

    const response = await this.makeRequestWithRetry(requestData, { stream: false });

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

    const response = await this.makeRequestWithRetry(requestData, { stream: false });

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

    const response = await this.makeRequestWithRetry(requestData, {
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

    const response = await this.makeRequestWithRetry(requestData, {
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
      'stop'
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
  // HIGH-LEVEL INTERFACE - Automatic conversation tracking with memory optimization
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
  // MESSAGE PROCESSING - Universal message formatting with performance optimizations
  // ============================================================================

  /**
   * Format messages for provider consumption with caching
   */
  formatMessages (messages) {
    // Cache key for message formatting
    const cacheKey = JSON.stringify(messages);
    if (this._defaultOptionsCache.has(cacheKey)) {
      return this._defaultOptionsCache.get(cacheKey);
    }

    let result;
    if (typeof messages === 'string') {
      result = [{ role: 'user', content: messages }];
    } else if (!Array.isArray(messages)) {
      throw new Error('Messages must be an array or string');
    } else {
      result = messages.map(msg => {
        if (typeof msg === 'string') {
          return { role: 'user', content: msg };
        }
        return msg;
      });
    }

    // Cache the result (limit cache size)
    if (this._defaultOptionsCache.size < 50) {
      this._defaultOptionsCache.set(cacheKey, result);
    }

    return result;
  }

  /**
   * Format vision messages for provider consumption with optimized processing
   */
  formatVisionMessages (messages) {
    // Use the message formatting mixin if available, otherwise use default implementation
    if (this.formatVisionMessagesForAnthropic) {
      return this.formatVisionMessagesForAnthropic(messages);
    }
    
    // Default implementation
    const formattedMessages = [];
    const messageCount = messages.length;

    for (let i = 0; i < messageCount; i++) {
      const message = messages[i];
      
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
                image_url: this.processImageUrl ? this.processImageUrl(item.image_url) : item.image_url
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
  // IMAGE PROCESSING - Universal image handling with performance optimizations
  // ============================================================================

  /**
   * Process image URLs, file paths, or base64 data with caching
   */
  processImageUrl (imageUrl) {
    // Use the image processing mixin if available, otherwise use default implementation
    if (this.processImage) {
      return this.processImage(imageUrl);
    }
    
    // Default implementation
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
   * Get MIME type from file extension with caching
   */
  getMimeType (filePath) {
    // Use the image processing mixin if available, otherwise use default implementation
    if (this.getMimeType && this !== this.getMimeType) {
      return this.getMimeType(filePath);
    }
    
    // Default implementation
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
   * Validate image format and size with optimized file operations
   */
  validateImage (image, maxSize = 20971520) { // 20MB default
    // Use the image processing mixin if available, otherwise use default implementation
    if (this.validateImage && this !== this.validateImage) {
      return this.validateImage(image, { maxSize });
    }
    
    // Default implementation
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
  // HTTP REQUEST HANDLING - For HTTP-based providers with retry logic and connection pooling
  // ============================================================================

  /**
   * Make HTTP request with retry logic and connection pooling
   */
  async makeRequest (data, options = {}) {
    const response = await httpClient.post(`${this.baseURL}${this.endpoint}`, data, options);
    return response.data;
  }

  /**
   * Make HTTP request with retry logic
   */
  async makeRequestWithRetry (data, options = {}, attempt = 1) {
    try {
      return await this.makeRequest(data, options);
    } catch (error) {
      if (attempt < this._retryAttempts && this.isRetryableError(error)) {
        await this.delay(this._retryDelay * attempt);
        return this.makeRequestWithRetry(data, options, attempt + 1);
      }
      throw error;
    }
  }

  /**
   * Check if error is retryable
   */
  isRetryableError (error) {
    const retryableStatuses = [408, 429, 500, 502, 503, 504];
    const retryableCodes = ['ECONNRESET', 'ECONNREFUSED', 'ETIMEDOUT'];
    
    return (
      (error.response && retryableStatuses.includes(error.response.status)) ||
      (error.code && retryableCodes.includes(error.code)) ||
      error.message.includes('timeout')
    );
  }

  /**
   * Delay utility for retry logic
   */
  delay (ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
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
  // CONVERSATION MANAGEMENT - Built-in conversation tracking with memory optimization
  // ============================================================================

  /**
   * Add message to conversation history with size management
   */
  addToHistory (role, content) {
    // Check if we need to trim history
    if (this._historySize >= this._maxHistorySize) {
      // Remove oldest messages (first 20% of history)
      const removeCount = Math.floor(this._maxHistorySize * 0.2);
      this._conversationHistory.splice(0, removeCount);
      this._historySize -= removeCount;
    }

    this._conversationHistory.push({
      role,
      content: Array.isArray(content) ? content : [{ type: 'text', text: content }],
      timestamp: new Date().toISOString()
    });
    this._historySize++;
  }

  /**
   * Get conversation history
   */
  getHistory () {
    return [...this._conversationHistory]; // Return copy to prevent external modification
  }

  /**
   * Clear conversation history
   */
  clearHistory () {
    this._conversationHistory = [];
    this._historySize = 0;
  }

  /**
   * Get conversation summary with optimized string building
   */
  getSummary () {
    if (this._historySize === 0) {
      return 'No conversation history';
    }

    const userMessages = [];
    const assistantMessages = [];
    
    for (let i = 0; i < this._historySize; i++) {
      const msg = this._conversationHistory[i];
      if (msg.role === 'user') {
        userMessages.push(msg.content);
      } else if (msg.role === 'assistant') {
        assistantMessages.push(msg.content);
      }
    }

    return `Conversation Summary:
    - User messages: ${userMessages.join(', ')}
    - Assistant responses: ${assistantMessages.join(', ')}
    - Total exchanges: ${this._historySize}`;
  }

  // ============================================================================
  // OPTIONS MANAGEMENT - Universal configuration handling with caching
  // ============================================================================

  /**
   * Get default options for this provider with caching
   */
  getDefaultOptions () {
    if (this._defaultOptions) {
      return this._defaultOptions;
    }

    this._defaultOptions = {
      temperature: this.config.temperature || 0.7,
      maxTokens: this.config.maxTokens || null,
      stream: false
    };

    return this._defaultOptions;
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
  // SERVICE MANAGEMENT - Availability and model discovery with caching
  // ============================================================================

  async isAvailable () {
    if (this.providerType === 'http') {
      try {
        const response = await httpClient.get(`${this.baseURL}/api/tags`);
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

  async listSDKModels () {
    // Default implementation - can be overridden by subclasses
    return [];
  }

  // ============================================================================
  // UTILITY METHODS - Common helper functions
  // ============================================================================

  /**
   * Generate a unique ID with improved randomness
   */
  generateId () {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
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
   * Handle provider-specific errors gracefully with improved error types
   */
  handleError (error, operation) {
    const errorMessage = error.response?.data?.error?.message ||
                        error.message ||
                        'Unknown error occurred';

    // Create custom error with more context
    const customError = new Error(`${this.name} ${operation} error: ${errorMessage}`);
    customError.originalError = error;
    customError.operation = operation;
    customError.provider = this.name;
    
    throw customError;
  }
}

module.exports = BaseProvider;
