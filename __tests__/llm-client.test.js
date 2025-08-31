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

  describe('Provider-specific methods', () => {
    beforeEach(() => {
      client = new LLMClient();
    });

    test('should check health status when provider supports it', async () => {
      client.provider.isHealthy = jest.fn().mockResolvedValue(true);
      
      const isHealthy = await client.isHealthy();
      
      expect(isHealthy).toBe(true);
      expect(client.provider.isHealthy).toHaveBeenCalled();
    });

    test('should throw error when provider does not support health monitoring', async () => {
      delete client.provider.isHealthy;
      
      await expect(client.isHealthy()).rejects.toThrow('Provider openai does not support health monitoring');
    });

    test('should get detailed health status when provider supports it', async () => {
      const mockHealthStatus = {
        status: 'healthy',
        available: true,
        models: 5,
        response_time_ms: 100
      };
      
      client.provider.getHealthStatus = jest.fn().mockResolvedValue(mockHealthStatus);
      
      const healthStatus = await client.getHealthStatus();
      
      expect(healthStatus).toEqual(mockHealthStatus);
      expect(client.provider.getHealthStatus).toHaveBeenCalled();
    });

    test('should throw error when provider does not support health status monitoring', async () => {
      delete client.provider.getHealthStatus;
      
      await expect(client.getHealthStatus()).rejects.toThrow('Provider openai does not support health status monitoring');
    });

    test('should switch model when provider supports it', async () => {
      client.provider.switchModel = jest.fn().mockResolvedValue(true);
      
      const result = await client.switchModel('new-model');
      
      expect(result).toBe(true);
      expect(client.provider.switchModel).toHaveBeenCalledWith('new-model');
    });

    test('should throw error when provider does not support model switching', async () => {
      delete client.provider.switchModel;
      
      await expect(client.switchModel('new-model')).rejects.toThrow('Provider openai does not support model switching');
    });

    test('should get model info when provider supports it', async () => {
      const mockModelInfo = {
        name: 'test-model',
        size: '1.5 GB',
        parameters: '7B'
      };
      
      client.provider.getModelInfo = jest.fn().mockResolvedValue(mockModelInfo);
      
      const modelInfo = await client.getModelInfo();
      
      expect(modelInfo).toEqual(mockModelInfo);
      expect(client.provider.getModelInfo).toHaveBeenCalledWith(null);
    });

    test('should get model info for specific model when provider supports it', async () => {
      const mockModelInfo = {
        name: 'specific-model',
        size: '2.0 GB',
        parameters: '13B'
      };
      
      client.provider.getModelInfo = jest.fn().mockResolvedValue(mockModelInfo);
      
      const modelInfo = await client.getModelInfo('specific-model');
      
      expect(modelInfo).toEqual(mockModelInfo);
      expect(client.provider.getModelInfo).toHaveBeenCalledWith('specific-model');
    });

    test('should throw error when provider does not support model information retrieval', async () => {
      delete client.provider.getModelInfo;
      
      await expect(client.getModelInfo()).rejects.toThrow('Provider openai does not support model information retrieval');
    });
  });
});
