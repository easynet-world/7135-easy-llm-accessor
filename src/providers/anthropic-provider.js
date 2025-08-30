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
  // ANTHROPIC-SPECIFIC MESSAGE FORMATTING
  // ============================================================================

  formatMessages (messages) {
    const formattedMessages = [];

    for (const message of messages) {
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
          formattedMessages.push({
            role: 'user',
            content: `System: ${message.content}\n\nUser: ${messages[messages.indexOf(message) + 1]?.content || ''}`
          });
        }
      }
    }

    return formattedMessages;
  }

  formatVisionMessages (messages) {
    const formattedMessages = [];

    for (const message of messages) {
      if (typeof message === 'string') {
        formattedMessages.push({ role: 'user', content: message });
      } else if (message.role === 'user' && message.content) {
        if (Array.isArray(message.content)) {
          // Handle multimodal content for Anthropic
          const content = message.content.map(item => {
            if (item.type === 'text') {
              return { type: 'text', text: item.text || item.content };
            } else if (item.type === 'image_url') {
              return {
                type: 'image',
                source: this.processImageSourceForAnthropic(item.image_url)
              };
            }
            return item;
          });
          formattedMessages.push({ role: 'user', content });
        } else {
          formattedMessages.push(message);
        }
      } else if (message.role === 'assistant') {
        formattedMessages.push({ role: 'assistant', content: message.content });
      }
    }

    return formattedMessages;
  }

  // ============================================================================
  // ANTHROPIC-SPECIFIC FEATURES
  // ============================================================================

  /**
   * Process image sources for Anthropic's format
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
   * Get media type from data URL
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
}

module.exports = AnthropicProvider;
