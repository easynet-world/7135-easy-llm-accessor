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
  // OLLAMA-SPECIFIC FEATURES WITH PERFORMANCE OPTIMIZATIONS
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
