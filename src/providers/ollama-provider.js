const BaseProvider = require('./base-provider');
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

    // Performance optimizations
    this._responseCache = new Map();
    this._maxCacheSize = 50;
    this._cacheExpiry = 2 * 60 * 1000; // 2 minutes
    this._lastCacheCleanup = Date.now();
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
      // Single response, parse normally
      try {
        return JSON.parse(responseText);
      } catch (error) {
        return { content: responseText };
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
    if (this._responseCache.has(cacheKey)) {
      const cached = this._responseCache.get(cacheKey);
      if (Date.now() - cached.timestamp < this._cacheExpiry) {
        return cached.response;
      }
    }

    const lines = responseText.trim().split('\n');
    const lineCount = lines.length;
    
    // Start from the last line and work backwards for efficiency
    for (let i = lineCount - 1; i >= 0; i--) {
      try {
        const parsed = JSON.parse(lines[i]);
        if (parsed.message || parsed.content) {
          // Cache the result
          this._cacheResult(cacheKey, parsed);
          return parsed;
        }
      } catch (e) {
        continue;
      }
    }
    
    // If we can't parse any line, return the raw response
    const fallbackResponse = { content: responseText };
    this._cacheResult(cacheKey, fallbackResponse);
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
   * Cache result with size management and cleanup
   */
  _cacheResult (key, value) {
    // Periodic cache cleanup
    if (Date.now() - this._lastCacheCleanup > this._cacheExpiry) {
      this._cleanupCache();
      this._lastCacheCleanup = Date.now();
    }

    // Check cache size and trim if necessary
    if (this._responseCache.size >= this._maxCacheSize) {
      // Remove oldest entries (first 20% of cache)
      const removeCount = Math.floor(this._maxCacheSize * 0.2);
      const keys = Array.from(this._responseCache.keys()).slice(0, removeCount);
      keys.forEach(k => this._responseCache.delete(k));
    }

    this._responseCache.set(key, {
      response: value,
      timestamp: Date.now()
    });
  }

  /**
   * Clean up expired cache entries
   */
  _cleanupCache () {
    const now = Date.now();
    for (const [key, value] of this._responseCache.entries()) {
      if (now - value.timestamp > this._cacheExpiry) {
        this._responseCache.delete(key);
      }
    }
  }

  // ============================================================================
  // CACHE MANAGEMENT METHODS
  // ============================================================================

  /**
   * Clear all caches
   */
  clearCaches () {
    this._responseCache.clear();
    this._lastCacheCleanup = Date.now();
  }

  /**
   * Get cache statistics
   */
  getCacheStats () {
    return {
      responseCacheSize: this._responseCache.size,
      maxCacheSize: this._maxCacheSize,
      cacheExpiry: this._cacheExpiry,
      lastCleanup: this._lastCacheCleanup
    };
  }

  // All other core functionality is inherited from BaseProvider
}

module.exports = OllamaProvider;
