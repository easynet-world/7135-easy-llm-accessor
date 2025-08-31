const BaseProvider = require('./base-provider');
const CacheMixin = require('./mixins/cache-mixin');
const axios = require('axios');

class OllamaProvider extends BaseProvider {
  constructor (config) {
    super(config, 'ollama', {
      providerType: 'http',
      baseURL: config.baseURL,
      endpoint: '/api/chat',
      requestFormat: 'ollama',
      responseFormat: 'ollama'
    });

    // Initialize mixins after super() call
    this._initializeMixins();
  }

  /**
   * Initialize mixins with provider-specific configuration
   */
  _initializeMixins() {
    // Initialize cache mixin for response caching
    const cacheMixin = new CacheMixin({
      defaultExpiry: 2 * 60 * 1000, // 2 minutes
      defaultMaxSize: 50,
      cleanupInterval: 2 * 60 * 1000 // 2 minutes
    });

    // Copy all methods from the mixin
    Object.getOwnPropertyNames(Object.getPrototypeOf(cacheMixin)).forEach(key => {
      if (key !== 'constructor') {
        this[key] = cacheMixin[key].bind(this);
      }
    });

    // Copy instance properties
    Object.assign(this, cacheMixin);

    // Create response cache
    this.createCache('responses', {
      expiry: 2 * 60 * 1000,
      maxSize: 50
    });
  }

  // ============================================================================
  // PROVIDER-SPECIFIC IMPLEMENTATIONS FOR BASE PROVIDER
  // ============================================================================

  /**
   * Provider-specific health check implementation
   * @private
   */
  async _checkHttpHealth() {
    try {
      const response = await axios.get(`${this.baseURL}/api/tags`, {
        timeout: 5000 // 5 second timeout for health check
      });
      return response.status === 200;
    } catch (error) {
      return false;
    }
  }

  /**
   * Provider-specific model listing implementation
   * @private
   */
  async _listHttpModels() {
    try {
      const response = await axios.get(`${this.baseURL}/api/tags`);
      
      if (response.data && response.data.models) {
        return response.data.models.map(model => ({
          name: model.name,
          size: this._formatBytes(model.size),
          modified_at: model.modified_at,
          digest: model.digest
        }));
      }
      
      return [];
    } catch (error) {
      throw new Error(`Failed to list models: ${error.message}`);
    }
  }

  /**
   * Provider-specific model info implementation
   * @private
   */
  async _getHttpModelInfo(modelName) {
    try {
      const response = await axios.post(`${this.baseURL}/api/show`, {
        name: modelName
      });

      if (response.data) {
        return {
          name: response.data.name,
          size: this._formatBytes(response.data.size),
          parameters: response.data.parameter_size,
          quantization: response.data.quantization_level,
          family: response.data.family,
          modified_at: response.data.modified_at,
          digest: response.data.digest
        };
      }

      throw new Error('Failed to retrieve model information');
    } catch (error) {
      throw new Error(`Failed to get model info: ${error.message}`);
    }
  }

  // ============================================================================
  // OLLAMA-SPECIFIC FEATURES (Not available in base provider)
  // ============================================================================

  /**
   * Override makeRequest to handle Ollama's streaming response format
   * Even when stream: false, Ollama may return a streaming response
   */
  async makeRequest (data, options = {}) {
    // For Ollama, we need to handle the response as text to parse streaming responses
    const response = await axios.post(`${this.baseURL}${this.endpoint}`, data, {
      ...options,
      responseType: 'text' // Force text response to handle streaming format
    });

    const responseText = response.data;
    
    // If this is a streaming response (multiple JSON objects separated by newlines)
    if (responseText.includes('\n') && responseText.trim().split('\n').length > 1) {
      // Parse the streaming response and extract the final complete response
      const finalResponse = this._parseStreamingResponse(responseText);
      return finalResponse;
    } else {
      // Single response, try to parse normally
      try {
        const parsed = JSON.parse(responseText);
        return parsed;
      } catch (error) {
        // If it's not valid JSON, treat it as a malformed response
        return { content: '' };
      }
    }
  }

  /**
   * Override extractContent to handle Ollama's response format properly
   */
  extractContent (response) {
    if (this.providerType === 'http') {
      if (this.responseFormat === 'ollama') {
        // Handle both streaming and non-streaming response formats
        if (response.message?.content) {
          return response.message.content;
        } else if (response.content) {
          return response.content;
        } else if (response.response) {
          // Some Ollama models return content in 'response' field
          return response.response;
        } else {
          return '';
        }
      } else {
        return response.choices?.[0]?.message?.content || response.content || '';
      }
    } else {
      // SDK-based providers implement their own extractContent
      return this.extractContentFromSDK(response);
    }
  }

  /**
   * Override extractUsage to handle Ollama's usage format
   */
  extractUsage (response) {
    if (this.providerType === 'http') {
      if (this.responseFormat === 'ollama') {
        return {
          input_tokens: response.prompt_eval_count || response.prompt_eval_tokens || 0,
          output_tokens: response.eval_count || response.eval_tokens || 0
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
  // OLLAMA-SPECIFIC STREAMING IMPLEMENTATION
  // ============================================================================

  /**
   * Stream chat responses in real-time (Ollama-specific implementation)
   * @param {Array|string} messages - Messages to send
   * @param {Object} options - Streaming options
   * @returns {Promise<EventEmitter>} Stream emitter
   */
  async streamChat(messages, options = {}) {
    const { EventEmitter } = require('events');
    const stream = new EventEmitter();
    
    try {
      const formattedMessages = this.formatMessages(messages);
      const mergedOptions = this.mergeOptions(this.getDefaultOptions(), options);
      const validOptions = this.validateOptions(mergedOptions);
      
      // Ensure streaming is enabled
      validOptions.stream = true;
      
      // Prepare request data
      const requestData = {
        model: validOptions.model || this.config.model,
        messages: formattedMessages,
        stream: true,
        ...this._extractOllamaOptions(validOptions)
      };

      // Make streaming request
      const response = await axios.post(`${this.baseURL}${this.endpoint}`, requestData, {
        ...options,
        responseType: 'stream'
      });

      let accumulatedContent = '';
      let tokenCount = 0;

      response.data.on('data', (chunk) => {
        const lines = chunk.toString().split('\n');
        
        for (const line of lines) {
          if (line.trim()) {
            try {
              const parsed = JSON.parse(line);
              
              if (parsed.message?.content) {
                const content = parsed.message.content;
                accumulatedContent += content;
                tokenCount++;
                
                // Emit chunk data
                stream.emit('data', {
                  content,
                  model: parsed.model,
                  done: false,
                  token_count: tokenCount
                });
              }
              
              if (parsed.done === true) {
                // Emit final response
                stream.emit('data', {
                  content: '',
                  model: parsed.model,
                  done: true,
                  final_content: accumulatedContent,
                  total_tokens: tokenCount
                });
                
                stream.emit('end', {
                  content: accumulatedContent,
                  model: parsed.model,
                  usage: {
                    input_tokens: validOptions.messages?.length || 0,
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
      });

      response.data.on('error', (error) => {
        stream.emit('error', error);
      });

      response.data.on('end', () => {
        if (!stream.listenerCount('end')) {
          // If no end event was emitted, emit it now
          stream.emit('end', {
            content: accumulatedContent,
            model: requestData.model,
            usage: {
              input_tokens: validOptions.messages?.length || 0,
              output_tokens: tokenCount
            }
          });
        }
      });

    } catch (error) {
      stream.emit('error', error);
    }

    return stream;
  }

  // ============================================================================
  // OLLAMA-SPECIFIC ADVANCED CONFIGURATION OPTIONS
  // ============================================================================

  /**
   * Extract Ollama-specific configuration options
   * @param {Object} options - Options object
   * @returns {Object} Ollama-specific options
   */
  _extractOllamaOptions(options) {
    const ollamaOptions = {};
    
    // Standard options
    if (options.temperature !== undefined) ollamaOptions.temperature = options.temperature;
    if (options.maxTokens !== undefined) ollamaOptions.num_predict = options.maxTokens;
    
    // Ollama-specific options
    if (options.topK !== undefined) ollamaOptions.top_k = options.topK;
    if (options.topP !== undefined) ollamaOptions.top_p = options.topP;
    if (options.repeatPenalty !== undefined) ollamaOptions.repeat_penalty = options.repeatPenalty;
    if (options.seed !== undefined) ollamaOptions.seed = options.seed;
    if (options.numCtx !== undefined) ollamaOptions.num_ctx = options.numCtx;
    if (options.numGpu !== undefined) ollamaOptions.num_gpu = options.numGpu;
    if (options.numThread !== undefined) ollamaOptions.num_thread = options.numThread;
    if (options.repeatLastN !== undefined) ollamaOptions.repeat_last_n = options.repeatLastN;
    if (options.tfsZ !== undefined) ollamaOptions.tfs_z = options.tfsZ;
    if (options.typicalP !== undefined) ollamaOptions.typical_p = options.typicalP;
    
    return ollamaOptions;
  }

  /**
   * Override getCurrentConfig to include Ollama-specific options
   * @returns {Object} Current configuration with Ollama options
   */
  getCurrentConfig() {
    const baseConfig = super.getCurrentConfig();
    return {
      ...baseConfig,
      ollama_options: this._extractOllamaOptions(this.config)
    };
  }

  // ============================================================================
  // PRIVATE HELPER METHODS FOR PERFORMANCE OPTIMIZATION
  // ============================================================================

  /**
   * Parse streaming response with optimized processing
   */
  _parseStreamingResponse (responseText) {
    // Check cache first
    const cacheKey = this._generateCacheKey(responseText);
    if (this.hasCache('responses', cacheKey)) {
      return this.getCache('responses', cacheKey);
    }

    const lines = responseText.trim().split('\n');
    const lineCount = lines.length;
    
    // For streaming responses, we need to reconstruct the complete content
    let completeContent = '';
    let finalResponse = null;
    
    // Process all lines to build complete content
    for (let i = 0; i < lineCount; i++) {
      try {
        const parsed = JSON.parse(lines[i]);
        
        // If this line has content, accumulate it
        if (parsed.message?.content) {
          completeContent += parsed.message.content;
          finalResponse = parsed;
        } else if (parsed.content) {
          completeContent += parsed.content;
          finalResponse = parsed;
        } else if (parsed.response) {
          completeContent += parsed.response;
          finalResponse = parsed;
        }
        
        // If this is the final response (done: true), use it as the base
        if (parsed.done === true) {
          finalResponse = parsed;
        }
      } catch (e) {
        // Skip malformed lines
        continue;
      }
    }
    
    // If we have accumulated content, create a proper response
    if (completeContent && finalResponse) {
      // Create a response with the complete content
      const reconstructedResponse = {
        ...finalResponse,
        message: finalResponse.message ? {
          ...finalResponse.message,
          content: completeContent
        } : { content: completeContent }
      };
      
      // Cache the result
      this.setCache('responses', cacheKey, reconstructedResponse);
      return reconstructedResponse;
    }
    
    // If we can't parse any line or no content, return empty response
    const fallbackResponse = { content: '' };
    this.setCache('responses', cacheKey, fallbackResponse);
    return fallbackResponse;
  }

  /**
   * Generate cache key for response caching
   */
  _generateCacheKey (responseText) {
    // Use a hash of the response text for caching
    let hash = 0;
    const str = responseText.slice(0, 100); // Only hash first 100 chars for performance
    
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    return hash.toString();
  }

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
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
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

  // All other core functionality is inherited from BaseProvider
}

module.exports = OllamaProvider;
