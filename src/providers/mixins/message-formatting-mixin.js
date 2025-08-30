/**
 * Message Formatting Mixin
 * 
 * Provides unified message formatting functionality for all providers:
 * - Standard message formatting
 * - Vision message formatting with image processing
 * - Provider-specific format adaptations
 * - Message validation and normalization
 */

class MessageFormattingMixin {
  constructor(options = {}) {
    // Configuration
    this._maxMessageLength = options.maxMessageLength || 100000; // 100KB default
    this._maxMessages = options.maxMessages || 100;
    this._supportedRoles = options.supportedRoles || ['user', 'assistant', 'system'];
    
    // Message cache for performance
    this._messageCache = new Map();
    this._cacheMaxSize = options.cacheMaxSize || 50;
  }

  // ============================================================================
  // CORE MESSAGE FORMATTING METHODS
  // ============================================================================

  /**
   * Format messages for provider consumption
   */
  formatMessages(messages, options = {}) {
    if (!Array.isArray(messages)) {
      messages = [messages];
    }

    // Validate message count
    if (messages.length > this._maxMessages) {
      throw new Error(`Too many messages: ${messages.length} exceeds maximum ${this._maxMessages}`);
    }

    // Check cache first
    const cacheKey = this._generateMessageCacheKey(messages, options);
    if (this._messageCache.has(cacheKey)) {
      return this._messageCache.get(cacheKey);
    }

    const formattedMessages = [];
    const messageCount = messages.length;

    for (let i = 0; i < messageCount; i++) {
      const message = messages[i];
      const formatted = this._formatSingleMessage(message, options);
      
      if (formatted) {
        formattedMessages.push(formatted);
      }
    }

    // Cache the result
    this._cacheMessage(cacheKey, formattedMessages);
    
    return formattedMessages;
  }

  /**
   * Format vision messages with image processing
   */
  formatVisionMessages(messages, options = {}) {
    if (!Array.isArray(messages)) {
      messages = [messages];
    }

    // Check cache first
    const cacheKey = this._generateVisionCacheKey(messages, options);
    if (this._messageCache.has(cacheKey)) {
      return this._messageCache.get(cacheKey);
    }

    const formattedMessages = [];
    const messageCount = messages.length;

    for (let i = 0; i < messageCount; i++) {
      const message = messages[i];
      const formatted = this._formatVisionMessage(message, options);
      
      if (formatted) {
        formattedMessages.push(formatted);
      }
    }

    // Cache the result
    this._cacheMessage(cacheKey, formattedMessages);
    
    return formattedMessages;
  }

  /**
   * Validate message format
   */
  validateMessage(message) {
    const validation = {
      isValid: true,
      errors: [],
      warnings: [],
      normalized: null
    };

    try {
      if (typeof message === 'string') {
        // String message - convert to user message
        if (message.length > this._maxMessageLength) {
          validation.isValid = false;
          validation.errors.push(`Message too long: ${message.length} exceeds maximum ${this._maxMessageLength}`);
        }
        
        validation.normalized = {
          role: 'user',
          content: message
        };
      } else if (typeof message === 'object' && message !== null) {
        // Object message
        if (!message.role) {
          validation.errors.push('Message missing role');
        } else if (!this._supportedRoles.includes(message.role)) {
          validation.errors.push(`Unsupported role: ${message.role}`);
        }

        if (!message.content) {
          validation.errors.push('Message missing content');
        } else if (typeof message.content === 'string' && message.content.length > this._maxMessageLength) {
          validation.isValid = false;
          validation.errors.push(`Message content too long: ${message.content.length} exceeds maximum ${this._maxMessageLength}`);
        }

        if (validation.errors.length === 0) {
          validation.normalized = { ...message };
        } else {
          validation.isValid = false;
        }
      } else {
        validation.isValid = false;
        validation.errors.push(`Invalid message type: ${typeof message}`);
      }

      // Add warnings for potential issues
      if (validation.normalized && validation.normalized.content) {
        if (typeof validation.normalized.content === 'string' && validation.normalized.content.trim().length === 0) {
          validation.warnings.push('Message content is empty or whitespace only');
        }
      }

    } catch (error) {
      validation.isValid = false;
      validation.errors.push(`Validation error: ${error.message}`);
    }

    return validation;
  }

  // ============================================================================
  // PROVIDER-SPECIFIC FORMATTING
  // ============================================================================

  /**
   * Format messages for OpenAI-compatible providers
   */
  formatMessagesForOpenAI(messages, options = {}) {
    const formatted = this.formatMessages(messages, options);
    
    // OpenAI expects specific format
    return formatted.map(message => ({
      role: message.role,
      content: message.content
    }));
  }

  /**
   * Format vision messages for OpenAI-compatible providers
   */
  formatVisionMessagesForOpenAI(messages, options = {}) {
    const formatted = this.formatVisionMessages(messages, options);
    
    return formatted.map(message => {
      if (message.role === 'user' && Array.isArray(message.content)) {
        // Process multimodal content
        const processedContent = message.content.map(item => {
          if (item.type === 'text') {
            return { type: 'text', text: item.text || item.content };
          } else if (item.type === 'image_url') {
            return { type: 'image_url', image_url: item.image_url };
          }
          return item;
        });
        
        return { role: 'user', content: processedContent };
      }
      
      return message;
    });
  }

  /**
   * Format messages for Anthropic
   */
  formatMessagesForAnthropic(messages, options = {}) {
    const formatted = this.formatMessages(messages, options);
    const anthropicMessages = [];
    
    for (let i = 0; i < formatted.length; i++) {
      const message = formatted[i];
      
      if (message.role === 'system') {
        // Anthropic doesn't support system messages in the same way
        // We'll prepend system messages to the first user message
        if (anthropicMessages.length === 0) {
          const nextMessage = formatted[i + 1];
          if (nextMessage && nextMessage.role === 'user') {
            const userContent = nextMessage.content || '';
            anthropicMessages.push({
              role: 'user',
              content: `System: ${message.content}\n\nUser: ${userContent}`
            });
            i++; // Skip the next message since we've combined it
          }
        }
      } else if (message.role === 'assistant') {
        anthropicMessages.push({
          role: 'assistant',
          content: message.content
        });
      } else if (message.role === 'user') {
        anthropicMessages.push({
          role: 'user',
          content: message.content
        });
      }
    }
    
    return anthropicMessages;
  }

  /**
   * Format vision messages for Anthropic
   */
  formatVisionMessagesForAnthropic(messages, options = {}) {
    const formatted = this.formatVisionMessages(messages, options);
    
    return formatted.map(message => {
      if (message.role === 'user' && Array.isArray(message.content)) {
        // Process multimodal content for Anthropic
        const processedContent = message.content.map(item => {
          if (item.type === 'text') {
            return { type: 'text', text: item.text || item.content };
          } else if (item.type === 'image_url') {
            return {
              type: 'image',
              source: this._processImageSourceForAnthropic(item.image_url)
            };
          }
          return item;
        });
        
        return { role: 'user', content: processedContent };
      }
      
      return message;
    });
  }

  /**
   * Format messages for Ollama
   */
  formatMessagesForOllama(messages, options = {}) {
    const formatted = this.formatMessages(messages, options);
    
    // Ollama uses standard format
    return formatted.map(message => ({
      role: message.role,
      content: message.content
    }));
  }

  /**
   * Format vision messages for Ollama
   */
  formatVisionMessagesForOllama(messages, options = {}) {
    const formatted = this.formatVisionMessages(messages, options);
    
    return formatted.map(message => {
      if (message.role === 'user' && Array.isArray(message.content)) {
        // Process multimodal content for Ollama
        const processedContent = message.content.map(item => {
          if (item.type === 'text') {
            return { type: 'text', text: item.text || item.content };
          } else if (item.type === 'image_url') {
            return { type: 'image_url', image_url: item.image_url };
          }
          return item;
        });
        
        return { role: 'user', content: processedContent };
      }
      
      return message;
    });
  }

  // ============================================================================
  // PRIVATE FORMATTING METHODS
  // ============================================================================

  /**
   * Format a single message
   */
  _formatSingleMessage(message, options) {
    const validation = this.validateMessage(message);
    
    if (!validation.isValid) {
      console.warn('Message validation failed:', validation.errors);
      return null;
    }
    
    if (validation.warnings.length > 0) {
      console.warn('Message validation warnings:', validation.warnings);
    }
    
    return validation.normalized;
  }

  /**
   * Format a vision message
   */
  _formatVisionMessage(message, options) {
    const validation = this.validateMessage(message);
    
    if (!validation.isValid) {
      console.warn('Vision message validation failed:', validation.errors);
      return null;
    }
    
    const formatted = validation.normalized;
    
    // Handle multimodal content
    if (formatted.role === 'user' && Array.isArray(formatted.content)) {
      const processedContent = this._processMultimodalContent(formatted.content, options);
      return {
        ...formatted,
        content: processedContent
      };
    }
    
    return formatted;
  }

  /**
   * Process multimodal content
   */
  _processMultimodalContent(content, options) {
    if (!Array.isArray(content)) {
      return content;
    }
    
    const processedContent = [];
    const contentCount = content.length;
    
    for (let i = 0; i < contentCount; i++) {
      const item = content[i];
      
      if (item.type === 'text') {
        processedContent.push({
          type: 'text',
          text: item.text || item.content || ''
        });
      } else if (item.type === 'image_url') {
        processedContent.push({
          type: 'image_url',
          image_url: item.image_url
        });
      } else if (item.type === 'image') {
        processedContent.push({
          type: 'image_url',
          image_url: item.source || item.url || item.data
        });
      } else {
        // Unknown type, pass through
        processedContent.push(item);
      }
    }
    
    return processedContent;
  }

  /**
   * Process image source for Anthropic
   */
  _processImageSourceForAnthropic(imageUrl) {
    if (typeof imageUrl === 'string') {
      if (imageUrl.startsWith('data:image/')) {
        return {
          type: 'base64',
          media_type: this._getMediaTypeFromDataUrl(imageUrl),
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
          const mediaType = this._getMimeType(imageUrl);
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

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  /**
   * Generate cache key for messages
   */
  _generateMessageCacheKey(messages, options) {
    const key = JSON.stringify({
      messages: messages.map(m => ({ role: m.role, content: m.content })),
      options: { maxLength: options.maxLength, maxMessages: options.maxMessages }
    });
    
    // Simple hash for performance
    let hash = 0;
    for (let i = 0; i < key.length; i++) {
      const char = key.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    return `msg_${hash}`;
  }

  /**
   * Generate cache key for vision messages
   */
  _generateVisionCacheKey(messages, options) {
    const key = JSON.stringify({
      messages: messages.map(m => ({ role: m.role, content: m.content })),
      options: { maxLength: options.maxLength, maxMessages: options.maxMessages, vision: true }
    });
    
    let hash = 0;
    for (let i = 0; i < key.length; i++) {
      const char = key.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    
    return `vision_${hash}`;
  }

  /**
   * Cache formatted message
   */
  _cacheMessage(key, value) {
    // Check cache size and trim if necessary
    if (this._messageCache.size >= this._cacheMaxSize) {
      const removeCount = Math.floor(this._cacheMaxSize * 0.2);
      const keys = Array.from(this._messageCache.keys()).slice(0, removeCount);
      keys.forEach(k => this._messageCache.delete(k));
    }
    
    this._messageCache.set(key, value);
  }

  /**
   * Get media type from data URL
   */
  _getMediaTypeFromDataUrl(dataUrl) {
    const match = dataUrl.match(/data:([^;]+);/);
    return match ? match[1] : 'image/jpeg';
  }

  /**
   * Get MIME type from file path
   */
  _getMimeType(filePath) {
    const path = require('path');
    const ext = path.extname(filePath).toLowerCase();
    
    const mimeTypes = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.webp': 'image/webp',
      '.gif': 'image/gif',
      '.bmp': 'image/bmp',
      '.tiff': 'image/tiff'
    };
    
    return mimeTypes[ext] || 'image/jpeg';
  }

  /**
   * Clear message cache
   */
  clearMessageCache() {
    this._messageCache.clear();
  }

  /**
   * Get cache statistics
   */
  getMessageCacheStats() {
    return {
      size: this._messageCache.size,
      maxSize: this._cacheMaxSize,
      hitRate: 0 // Would need to implement hit tracking
    };
  }
}

module.exports = MessageFormattingMixin;
