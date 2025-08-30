const OllamaProvider = require('../src/providers/ollama-provider');

// Mock axios
jest.mock('axios');
const axios = require('axios');

describe('OllamaProvider', () => {
  let provider;

  beforeEach(() => {
    // Create provider instance
    provider = new OllamaProvider({
      baseURL: 'http://localhost:11434',
      model: 'llama3.2',
      temperature: 0.7,
      maxTokens: 4096
    });
    
    // Clear all mocks
    jest.clearAllMocks();
  });

  describe('Integration Tests - HTTP Request Flow', () => {
    test('should handle complete HTTP request flow correctly', async () => {
      // Mock the axios response
      const mockAxiosResponse = {
        data: JSON.stringify({
          model: 'llama3.2',
          message: {
            content: 'Hello! How can I help you today?'
          },
          done: true
        })
      };
      
      axios.post.mockResolvedValue(mockAxiosResponse);

      // Test the complete flow through the base provider
      const result = await provider.chat('Hello', { model: 'llama3.2' });
      
      expect(result.content).toBe('Hello! How can I help you today?');
      expect(axios.post).toHaveBeenCalledWith(
        'http://localhost:11434/api/chat',
        expect.objectContaining({
          model: 'llama3.2',
          messages: expect.arrayContaining([
            expect.objectContaining({
              role: 'user',
              content: 'Hello'
            })
          ])
        }),
        expect.any(Object)
      );
    });

    test('should handle streaming response format correctly', async () => {
      // Mock a streaming response (multiple JSON objects separated by newlines)
      const mockAxiosResponse = {
        data: '{"model":"llama3.2","message":{"content":"Hello"}}\n{"model":"llama3.2","message":{"content":"! How can I help you today?"}}\n{"model":"llama3.2","done":true}'
      };
      
      axios.post.mockResolvedValue(mockAxiosResponse);

      const result = await provider.chat('Hello', { model: 'llama3.2' });
      
      // Should extract content from the final complete response
      expect(result.content).toBe('Hello! How can I help you today?');
    });

    test('should handle response with direct content field', async () => {
      // Mock response with content field directly
      const mockAxiosResponse = {
        data: JSON.stringify({
          model: 'llama3.2',
          content: 'Hello! How can I help you today?',
          done: true
        })
      };
      
      axios.post.mockResolvedValue(mockAxiosResponse);

      const result = await provider.chat('Hello', { model: 'llama3.2' });
      
      expect(result.content).toBe('Hello! How can I help you today?');
    });

    test('should handle response with response field', async () => {
      // Mock response with response field
      const mockAxiosResponse = {
        data: JSON.stringify({
          model: 'llama3.2',
          response: 'Hello! How can I help you today?',
          done: true
        })
      };
      
      axios.post.mockResolvedValue(mockAxiosResponse);

      const result = await provider.chat('Hello', { model: 'llama3.2' });
      
      expect(result.content).toBe('Hello! How can I help you today?');
    });

    test('should handle malformed response gracefully', async () => {
      // Mock malformed response
      const mockAxiosResponse = {
        data: 'invalid json response'
      };
      
      axios.post.mockResolvedValue(mockAxiosResponse);

      const result = await provider.chat('Hello', { model: 'llama3.2' });
      
      // Should handle gracefully and return empty content
      expect(result.content).toBe('');
    });

    test('should handle empty response data', async () => {
      // Mock empty response
      const mockAxiosResponse = {
        data: ''
      };
      
      axios.post.mockResolvedValue(mockAxiosResponse);

      const result = await provider.chat('Hello', { model: 'llama3.2' });
      
      // Should handle gracefully and return empty content
      expect(result.content).toBe('');
    });
  });

  describe('extractContent', () => {
    test('should extract content from message.content', () => {
      const response = {
        message: {
          content: 'Hello! How can I help you today?'
        }
      };

      const content = provider.extractContent(response);
      expect(content).toBe('Hello! How can I help you today?');
    });

    test('should extract content from content field', () => {
      const response = {
        content: 'Hello! How can I help you today?'
      };

      const content = provider.extractContent(response);
      expect(content).toBe('Hello! How can I help you today?');
    });

    test('should extract content from response field', () => {
      const response = {
        response: 'Hello! How can I help you today?'
      };

      const content = provider.extractContent(response);
      expect(content).toBe('Hello! How can I help you today?');
    });

    test('should return empty string for malformed response', () => {
      const response = {};

      const content = provider.extractContent(response);
      expect(content).toBe('');
    });
  });

  describe('extractUsage', () => {
    test('should extract usage from prompt_eval_count and eval_count', () => {
      const response = {
        prompt_eval_count: 10,
        eval_count: 25
      };

      const usage = provider.extractUsage(response);
      expect(usage).toEqual({
        input_tokens: 10,
        output_tokens: 25
      });
    });

    test('should extract usage from prompt_eval_tokens and eval_tokens', () => {
      const response = {
        prompt_eval_tokens: 15,
        eval_tokens: 30
      };

      const usage = provider.extractUsage(response);
      expect(usage).toEqual({
        input_tokens: 15,
        output_tokens: 30
      });
    });

    test('should return zero usage for response without tokens', () => {
      const response = {};

      const usage = provider.extractUsage(response);
      expect(usage).toEqual({
        input_tokens: 0,
        output_tokens: 0
      });
    });
  });
});
