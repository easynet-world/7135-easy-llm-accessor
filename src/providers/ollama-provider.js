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
  }

  // ============================================================================
  // OLLAMA-SPECIFIC FEATURES
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
      const lines = responseText.trim().split('\n');
      const lastLine = lines[lines.length - 1];
      
      try {
        // Try to parse the last line as JSON (this should be the final response)
        const finalResponse = JSON.parse(lastLine);
        return finalResponse;
      } catch (error) {
        // If the last line isn't valid JSON, try to find the last valid JSON response
        for (let i = lines.length - 1; i >= 0; i--) {
          try {
            const parsed = JSON.parse(lines[i]);
            if (parsed.message || parsed.content) {
              return parsed;
            }
          } catch (e) {
            continue;
          }
        }
        
        // If we can't parse any line, return the raw response
        return { content: responseText };
      }
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

  // All other core functionality is inherited from BaseProvider
}

module.exports = OllamaProvider;
