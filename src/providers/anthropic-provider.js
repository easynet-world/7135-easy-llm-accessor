const Anthropic = require('@anthropic-ai/sdk');
const BaseProvider = require('./base-provider');

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

    // Performance optimizations
    this._messageCache = new Map();
    this._visionMessageCache = new Map();
    this._maxCacheSize = 100;
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
    // Check cache first
    const cacheKey = JSON.stringify(messages);
    if (this._messageCache.has(cacheKey)) {
      return this._messageCache.get(cacheKey);
    }

    const formattedMessages = [];
    const messageCount = messages.length;

    for (let i = 0; i < messageCount; i++) {
      const message = messages[i];
      
      if (typeof message === 'string') {
        formattedMessages.push({ role: 'user', content: message });
      } else if (message.role === 'assistant') {
        formattedMessages.push({ role: 'assistant', content: message.content });
      } else if (message.role === 'user') {
        formattedMessages.push({ role: 'user', content: message.content });
      } else if (message.role === 'system') {
        // Anthropic doesn't support system messages in the same way
        // We'll prepend system messages to the first user message
        if (formattedMessages.length === 0) {
          const nextMessage = messages[i + 1];
          const userContent = nextMessage?.content || '';
          formattedMessages.push({
            role: 'user',
            content: `System: ${message.content}\n\nUser: ${userContent}`
          });
          i++; // Skip the next message since we've combined it
        }
      }
    }

    // Cache the result
    this._cacheResult(this._messageCache, cacheKey, formattedMessages);
    return formattedMessages;
  }

  formatVisionMessages (messages) {
    // Check cache first
    const cacheKey = JSON.stringify(messages);
    if (this._visionMessageCache.has(cacheKey)) {
      return this._visionMessageCache.get(cacheKey);
    }

    const formattedMessages = [];
    const messageCount = messages.length;

    for (let i = 0; i < messageCount; i++) {
      const message = messages[i];
      
      if (typeof message === 'string') {
        formattedMessages.push({ role: 'user', content: message });
      } else if (message.role === 'user' && message.content) {
        if (Array.isArray(message.content)) {
          // Handle multimodal content for Anthropic with optimized processing
          const content = this._processMultimodalContent(message.content);
          formattedMessages.push({ role: 'user', content });
        } else {
          formattedMessages.push(message);
        }
      } else if (message.role === 'assistant') {
        formattedMessages.push({ role: 'assistant', content: message.content });
      }
    }

    // Cache the result
    this._cacheResult(this._visionMessageCache, cacheKey, formattedMessages);
    return formattedMessages;
  }

  // ============================================================================
  // ANTHROPIC-SPECIFIC FEATURES WITH PERFORMANCE OPTIMIZATIONS
  // ============================================================================

  /**
   * Process image sources for Anthropic's format with caching
   */
  processImageSourceForAnthropic (imageUrl) {
    if (typeof imageUrl === 'string') {
      if (imageUrl.startsWith('data:image/')) {
        return {
          type: 'base64',
          media_type: this.getMediaTypeFromDataUrl(imageUrl),
          data: imageUrl.split(',')[1]
        };
      } else if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
        return {
          type: 'url',
          url: imageUrl
        };
      } else {
        // Assume it's a file path
        try {
          const fs = require('fs');
          const imageBuffer = fs.readFileSync(imageUrl);
          const base64 = imageBuffer.toString('base64');
          const mediaType = this.getMimeType(imageUrl);
          return {
            type: 'base64',
            media_type: mediaType,
            data: base64
          };
        } catch (error) {
          throw new Error(`Failed to read image file: ${error.message}`);
        }
      }
    }

    return imageUrl;
  }

  /**
   * Get media type from data URL with optimized regex
   */
  getMediaTypeFromDataUrl (dataUrl) {
    const match = dataUrl.match(/data:([^;]+);/);
    return match ? match[1] : 'image/jpeg';
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
  // PRIVATE HELPER METHODS FOR PERFORMANCE OPTIMIZATION
  // ============================================================================

  /**
   * Process multimodal content with optimized iteration
   */
  _processMultimodalContent (content) {
    const contentCount = content.length;
    const processedContent = new Array(contentCount);

    for (let i = 0; i < contentCount; i++) {
      const item = content[i];
      if (item.type === 'text') {
        processedContent[i] = { type: 'text', text: item.text || item.content };
      } else if (item.type === 'image_url') {
        processedContent[i] = {
          type: 'image',
          source: this.processImageSourceForAnthropic(item.image_url)
        };
      } else {
        processedContent[i] = item;
      }
    }

    return processedContent;
  }

  /**
   * Cache result with size management
   */
  _cacheResult (cache, key, value) {
    // Check cache size and trim if necessary
    if (cache.size >= this._maxCacheSize) {
      // Remove oldest entries (first 20% of cache)
      const removeCount = Math.floor(this._maxCacheSize * 0.2);
      const keys = Array.from(cache.keys()).slice(0, removeCount);
      keys.forEach(k => cache.delete(k));
    }

    cache.set(key, value);
  }

  /**
   * Clear all caches
   */
  clearCaches () {
    this._messageCache.clear();
    this._visionMessageCache.clear();
  }
}

module.exports = AnthropicProvider;
