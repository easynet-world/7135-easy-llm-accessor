const LLMClient = require('../src/llm-client');

describe('Configuration Access Fixes', () => {
  let client;

  beforeEach(() => {
    // Clear any environment variables that might interfere
    delete process.env.OLLAMA_BASE_URL;
    delete process.env.OLLAMA_MODEL;
    delete process.env.OLLAMA_TEMPERATURE;
    delete process.env.OLLAMA_MAX_TOKENS;
  });

  afterEach(() => {
    if (client) {
      client.clearHistory();
    }
  });

  describe('Configuration Access', () => {
    test('should expose configuration properties directly on client instance', () => {
      client = new LLMClient({
        provider: 'ollama',
        config: {
          baseURL: 'https://ollama-rtx-4070.easynet.world',
          model: 'gemma3:latest',
          temperature: 0.7,
          maxTokens: 4096
        }
      });

      // Test direct property access
      expect(client.baseURL).toBe('https://ollama-rtx-4070.easynet.world');
      expect(client.model).toBe('gemma3:latest');
      expect(client.temperature).toBe(0.7);
      expect(client.maxTokens).toBe(4096);

      // Test config object access
      expect(client.config.baseURL).toBe('https://ollama-rtx-4070.easynet.world');
      expect(client.config.model).toBe('gemma3:latest');
      expect(client.config.temperature).toBe(0.7);
      expect(client.config.maxTokens).toBe(4096);
    });

    test('should merge custom config with provider config', () => {
      client = new LLMClient({
        provider: 'ollama',
        config: {
          baseURL: 'https://custom-ollama.example.com',
          model: 'llama3.2:latest'
        }
      });

      // Custom values should override defaults
      expect(client.baseURL).toBe('https://custom-ollama.example.com');
      expect(client.model).toBe('llama3.2:latest');
      
      // Default values should still be available
      expect(client.temperature).toBe(0.7); // Default from provider config
      expect(client.maxTokens).toBe(4096); // Default from provider config
    });

    test('should handle configuration without custom config', () => {
      client = new LLMClient({
        provider: 'ollama'
      });

      // Should use default values from provider config
      expect(client.baseURL).toBe('http://localhost:11434'); // Default from provider config
      expect(client.model).toBe('llama3.2'); // Default from provider config
      expect(client.temperature).toBe(0.7); // Default from provider config
      expect(client.maxTokens).toBe(4096); // Default from provider config
    });
  });

  describe('Conversation History', () => {
    test('should maintain conversation history between requests', async () => {
      client = new LLMClient({
        provider: 'ollama',
        config: {
          baseURL: 'https://ollama-rtx-4070.easynet.world',
          model: 'gemma3:latest'
        }
      });

      // Mock the provider to avoid actual API calls
      const mockProvider = {
        sendChat: jest.fn().mockResolvedValue({
          content: 'Hello! How can I help you?',
          model: 'gemma3:latest',
          usage: { input_tokens: 5, output_tokens: 10 },
          finishReason: 'stop',
          timestamp: new Date().toISOString()
        }),
        _conversationHistory: [],
        addToHistory: jest.fn(),
        getHistory: jest.fn().mockReturnValue([]),
        clearHistory: jest.fn()
      };

      // Replace the provider with our mock
      client.provider = mockProvider;

      // Send first message
      await client.ask('Hello');
      expect(mockProvider.sendChat).toHaveBeenCalledWith('Hello', {});

      // Send second message
      await client.ask('How are you?');
      expect(mockProvider.sendChat).toHaveBeenCalledWith('How are you?', {});

      // Check that conversation history methods are available
      expect(typeof client.getHistory).toBe('function');
      expect(typeof client.getHistoryLength).toBe('function');
      expect(typeof client.getLastMessage).toBe('function');
      expect(typeof client.getFormattedHistory).toBe('function');
      expect(typeof client.clearHistory).toBe('function');
    });

    test('should provide access to conversation history array', () => {
      client = new LLMClient({
        provider: 'ollama',
        config: {
          baseURL: 'https://ollama-rtx-4070.easynet.world',
          model: 'gemma3:latest'
        }
      });

      // Mock the provider with conversation history
      const mockHistory = [
        { role: 'user', content: 'Hello', timestamp: '2024-01-01T00:00:00.000Z' },
        { role: 'assistant', content: 'Hi there!', timestamp: '2024-01-01T00:00:01.000Z' }
      ];

      const mockProvider = {
        _conversationHistory: mockHistory,
        getHistory: jest.fn().mockReturnValue(mockHistory),
        clearHistory: jest.fn()
      };

      client.provider = mockProvider;

      // Test direct access to conversation history
      expect(client._conversationHistory).toEqual(mockHistory);
      expect(client.getHistory()).toEqual(mockHistory);
      expect(client.getHistoryLength()).toBe(2);
      expect(client.getLastMessage()).toEqual(mockHistory[1]);
    });

    test('should handle empty conversation history gracefully', () => {
      client = new LLMClient({
        provider: 'ollama',
        config: {
          baseURL: 'https://ollama-rtx-4070.easynet.world',
          model: 'gemma3:latest'
        }
      });

      // Mock the provider with empty history
      const mockProvider = {
        _conversationHistory: [],
        getHistory: jest.fn().mockReturnValue([]),
        clearHistory: jest.fn()
      };

      client.provider = mockProvider;

      // Test empty history handling
      expect(client._conversationHistory).toEqual([]);
      expect(client.getHistory()).toEqual([]);
      expect(client.getHistoryLength()).toBe(0);
      expect(client.getLastMessage()).toBeNull();
      expect(client.getFormattedHistory()).toBe('No conversation history');
    });
  });

  describe('Configuration Property Descriptors', () => {
    test('should have configurable and enumerable properties', () => {
      client = new LLMClient({
        provider: 'ollama',
        config: {
          baseURL: 'https://test.example.com',
          model: 'test-model',
          temperature: 0.5,
          maxTokens: 2048
        }
      });

      // Check property descriptors
      const baseURLDescriptor = Object.getOwnPropertyDescriptor(client, 'baseURL');
      const modelDescriptor = Object.getOwnPropertyDescriptor(client, 'model');
      const temperatureDescriptor = Object.getOwnPropertyDescriptor(client, 'temperature');
      const maxTokensDescriptor = Object.getOwnPropertyDescriptor(client, 'maxTokens');

      expect(baseURLDescriptor.enumerable).toBe(true);
      expect(baseURLDescriptor.configurable).toBe(true);
      expect(typeof baseURLDescriptor.get).toBe('function');

      expect(modelDescriptor.enumerable).toBe(true);
      expect(modelDescriptor.configurable).toBe(true);
      expect(typeof modelDescriptor.get).toBe('function');

      expect(temperatureDescriptor.enumerable).toBe(true);
      expect(temperatureDescriptor.configurable).toBe(true);
      expect(typeof temperatureDescriptor.get).toBe('function');

      expect(maxTokensDescriptor.enumerable).toBe(true);
      expect(maxTokensDescriptor.configurable).toBe(true);
      expect(typeof maxTokensDescriptor.get).toBe('function');
    });
  });
});
