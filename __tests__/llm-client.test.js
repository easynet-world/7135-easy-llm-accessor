const LLMClient = require('../src/llm-client');
const Config = require('../src/config');

describe('LLMClient', () => {
  let client;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();

    // Mock the config
    jest.spyOn(Config.prototype, 'validate').mockReturnValue(true);
    jest.spyOn(Config.prototype, 'getProviderConfig').mockReturnValue({
      apiKey: 'test-key',
      model: 'test-model',
      temperature: 0.7,
      maxTokens: 1000
    });

    // Mock the provider initialization with base provider methods
    jest.spyOn(LLMClient.prototype, 'initializeProvider').mockReturnValue({
      name: 'openai',
      config: {
        apiKey: 'test-key',
        model: 'test-model',
        temperature: 0.7,
        maxTokens: 1000
      },
      // Mock the base provider methods
      sendChat: jest.fn(),
      sendVision: jest.fn(),
      getStreamChat: jest.fn(),
      getStreamVision: jest.fn(),
      getHistory: jest.fn(),
      clearHistory: jest.fn(),
      getSummary: jest.fn(),
      isAvailable: jest.fn(),
      listModels: jest.fn()
    });
  });

  describe('Initialization', () => {
    test('should initialize with default provider', () => {
      jest.spyOn(Config.prototype, 'getProviderConfig').mockReturnValue({
        apiKey: 'test-key',
        model: 'test-model',
        temperature: 0.7,
        maxTokens: 1000
      });

      client = new LLMClient();
      expect(client.config.provider).toBe('openai');
    });

    test('should initialize with custom provider', () => {
      client = new LLMClient({ provider: 'anthropic' });
      expect(client.config.provider).toBe('anthropic');
    });

    test('should validate configuration on initialization', () => {
      client = new LLMClient();
      expect(client.config.validate).toHaveBeenCalled();
    });
  });

  describe('Chat functionality', () => {
    beforeEach(() => {
      client = new LLMClient();
    });

    test('should add messages to conversation history', async () => {
      const mockResponse = {
        content: 'Test response',
        provider: 'openai',
        model: 'test-model'
      };

      // Mock the provider's sendChat method
      client.provider.sendChat = jest.fn().mockResolvedValue(mockResponse);

      await client.chat('Hello');

      expect(client.provider.sendChat).toHaveBeenCalledWith('Hello', {});
    });

    test('should handle chat errors gracefully', async () => {
      client.provider.sendChat = jest.fn().mockRejectedValue(new Error('API Error'));

      await expect(client.chat('Hello')).rejects.toThrow('API Error');
    });
  });

  describe('Vision functionality', () => {
    beforeEach(() => {
      client = new LLMClient();
    });

    test('should add vision messages to conversation history', async () => {
      const mockResponse = {
        content: 'Vision response',
        provider: 'openai',
        model: 'test-model'
      };

      client.provider.sendVision = jest.fn().mockResolvedValue(mockResponse);

      await client.vision([
        { role: 'user', content: 'Analyze this image' }
      ]);

      expect(client.provider.sendVision).toHaveBeenCalled();
    });
  });

  describe('Utility methods', () => {
    beforeEach(() => {
      client = new LLMClient();
    });

    test('should clear conversation history', () => {
      client.clearHistory();
      expect(client.provider.clearHistory).toHaveBeenCalled();
    });

    test('should get conversation summary', () => {
      client.provider.getSummary = jest.fn().mockReturnValue('Test summary');
      const summary = client.getSummary();
      expect(summary).toBe('Test summary');
    });

    test('should get provider info', () => {
      const info = client.getProviderInfo();
      expect(info.name).toBe('openai');
      expect(info.config).toBeDefined();
    });
  });

  describe('Provider switching', () => {
    beforeEach(() => {
      client = new LLMClient();
    });

    test('should switch provider successfully', () => {
      // Mock the new provider
      const mockNewProvider = {
        name: 'anthropic',
        config: { apiKey: 'test-key' },
        sendChat: jest.fn(),
        sendVision: jest.fn(),
        getStreamChat: jest.fn(),
        getStreamVision: jest.fn(),
        getHistory: jest.fn(),
        clearHistory: jest.fn(),
        getSummary: jest.fn(),
        isAvailable: jest.fn(),
        listModels: jest.fn()
      };

      jest.spyOn(LLMClient.prototype, 'initializeProvider').mockReturnValue(mockNewProvider);

      client.switchProvider('anthropic');

      expect(client.config.provider).toBe('anthropic');
      expect(client.provider.name).toBe('anthropic');
    });
  });

  describe('Helper methods', () => {
    beforeEach(() => {
      client = new LLMClient();
    });

    test('should use ask method as alias for chat', async () => {
      const mockResponse = { content: 'Test response' };
      client.provider.sendChat = jest.fn().mockResolvedValue(mockResponse);

      await client.ask('Hello');

      expect(client.provider.sendChat).toHaveBeenCalledWith('Hello', {});
    });

    test('should use see method for vision requests', async () => {
      const mockResponse = { content: 'Vision response' };
      client.provider.sendVision = jest.fn().mockResolvedValue(mockResponse);

      await client.see('Analyze this', 'image.jpg');

      expect(client.provider.sendVision).toHaveBeenCalled();
    });
  });
});
