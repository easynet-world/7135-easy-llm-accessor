const BaseProvider = require('../src/providers/base-provider');
const AnthropicProvider = require('../src/providers/anthropic-provider');
const OpenAICompatibleProvider = require('../src/providers/openai-compatible-provider');
const OllamaProvider = require('../src/providers/ollama-provider');

// Mock axios for HTTP requests
jest.mock('axios');
const axios = require('axios');

// Mock file system
jest.mock('fs');
const fs = require('fs');

describe('Provider Classes', () => {
  let mockConfig;

  beforeEach(() => {
    mockConfig = {
      apiKey: 'test-key',
      model: 'test-model',
      temperature: 0.7,
      maxTokens: 1000,
      baseURL: 'http://localhost:11434'
    };

    // Clear all mocks
    jest.clearAllMocks();
    
    // Mock axios responses
    axios.post.mockResolvedValue({ data: { content: 'test response' } });
    axios.get.mockResolvedValue({ status: 200, data: { models: [] } });
    
    // Mock fs responses
    fs.readFileSync.mockReturnValue(Buffer.from('test-image-data'));
    fs.statSync.mockReturnValue({ size: 1024 });
  });

  describe('BaseProvider', () => {
    let provider;

    beforeEach(() => {
      provider = new BaseProvider(mockConfig, 'test-provider');
    });

    test('should initialize with correct properties', () => {
      expect(provider.name).toBe('test-provider');
      expect(provider.config).toBe(mockConfig);
      expect(provider.providerType).toBe('http');
      expect(provider.conversationHistory).toEqual([]);
    });

    test('should format messages correctly', () => {
      const result = provider.formatMessages('Hello');
      expect(result).toEqual([{ role: 'user', content: 'Hello' }]);

      const result2 = provider.formatMessages([{ role: 'user', content: 'Hello' }]);
      expect(result2).toEqual([{ role: 'user', content: 'Hello' }]);
    });

    test('should process image URLs correctly', () => {
      // Test HTTP URL
      const httpResult = provider.processImageUrl('https://example.com/image.jpg');
      expect(httpResult).toEqual({ url: 'https://example.com/image.jpg' });

      // Test base64
      const base64Result = provider.processImageUrl('data:image/jpeg;base64,test');
      expect(base64Result).toEqual({ url: 'data:image/jpeg;base64,test' });

      // Test file path
      const fileResult = provider.processImageUrl('image.jpg');
      expect(fileResult).toEqual({ url: 'data:image/jpeg;base64,dGVzdC1pbWFnZS1kYXRh' });
    });

    test('should validate options correctly', () => {
      const options = { temperature: 1.5, maxTokens: 500 };
      const result = provider.validateOptions(options);
      expect(result.temperature).toBe(1.5);
      expect(result.maxTokens).toBe(500);
    });

    test('should handle conversation history', () => {
      provider.addToHistory('user', 'Hello');
      provider.addToHistory('assistant', 'Hi there!');
      
      expect(provider.getHistory()).toHaveLength(2);
      expect(provider.getHistory()[0].role).toBe('user');
      expect(provider.getHistory()[1].role).toBe('assistant');
      
      provider.clearHistory();
      expect(provider.getHistory()).toHaveLength(0);
    });

    test('should format responses consistently', () => {
      const response = provider.formatResponse('test content', 'test-model', { input_tokens: 10 });
      expect(response).toHaveProperty('provider', 'test-provider');
      expect(response).toHaveProperty('model', 'test-model');
      expect(response).toHaveProperty('content', 'test content');
      expect(response).toHaveProperty('timestamp');
    });
  });

  describe('HTTP Provider (Ollama)', () => {
    let provider;

    beforeEach(() => {
      provider = new OllamaProvider(mockConfig);
    });

    test('should initialize as HTTP provider', () => {
      expect(provider.providerType).toBe('http');
      expect(provider.baseURL).toBe(mockConfig.baseURL);
      expect(provider.endpoint).toBe('/api/chat');
    });

    test('should format Ollama request data correctly', () => {
      const requestData = provider.formatRequestData('llama2', [{ role: 'user', content: 'Hello' }], { temperature: 0.7 }, false);
      expect(requestData.model).toBe('llama2');
      expect(requestData.options.temperature).toBe(0.7);
      expect(requestData.options.stream).toBe(false);
    });

    test('should extract content from Ollama response', () => {
      const response = { message: { content: 'test response' } };
      const content = provider.extractContent(response);
      expect(content).toBe('test response');
    });

    test('should check availability via HTTP', async () => {
      const result = await provider.isAvailable();
      expect(result).toBe(true);
      expect(axios.get).toHaveBeenCalledWith('http://localhost:11434/api/tags');
    });
  });

  describe('SDK Provider (OpenAI Compatible)', () => {
    let provider;

    beforeEach(() => {
      // Mock OpenAI client
      provider = new OpenAICompatibleProvider(mockConfig, 'openai', 'gpt-4-vision');
      provider.client = {
        chat: {
          completions: {
            create: jest.fn()
          }
        },
        models: {
          list: jest.fn()
        }
      };
    });

    test('should initialize as SDK provider', () => {
      expect(provider.providerType).toBe('sdk');
      expect(provider.defaultVisionModel).toBe('gpt-4-vision');
    });

    test('should create messages via SDK', async () => {
      const mockResponse = {
        choices: [{ message: { content: 'test response' } }],
        usage: { input_tokens: 10, output_tokens: 20 },
        model: 'gpt-4'
      };
      
      provider.client.chat.completions.create.mockResolvedValue(mockResponse);
      
      const result = await provider.sdkChat([{ role: 'user', content: 'Hello' }], { temperature: 0.7 }, { model: 'gpt-4' });
      expect(result.content).toBe('test response');
      expect(result.model).toBe('gpt-4');
    });

    test('should extract content from SDK response', () => {
      const response = { choices: [{ message: { content: 'test response' } }] };
      const content = provider.extractContentFromSDK(response);
      expect(content).toBe('test response');
    });

    test('should check SDK availability', async () => {
      provider.client.models.list.mockResolvedValue({ data: [{ id: 'gpt-4' }] });
      const result = await provider.checkSDKAvailability();
      expect(result).toBe(true);
    });
  });

  describe('SDK Provider (Anthropic)', () => {
    let provider;

    beforeEach(() => {
      // Mock Anthropic client
      provider = new AnthropicProvider(mockConfig);
      provider.client = {
        messages: {
          create: jest.fn()
        }
      };
    });

    test('should initialize with Anthropic-specific settings', () => {
      expect(provider.providerType).toBe('sdk');
      expect(provider.defaultVisionModel).toBe('claude-3-sonnet-20240229');
    });

    test('should format messages for Anthropic', () => {
      const messages = [
        { role: 'system', content: 'You are helpful' },
        { role: 'user', content: 'Hello' }
      ];
      
      const result = provider.formatMessages(messages);
      expect(result[0].role).toBe('user');
      expect(result[0].content).toContain('System: You are helpful');
    });

    test('should process vision messages for Anthropic', () => {
      const messages = [{
        role: 'user',
        content: [
          { type: 'text', text: 'Analyze this image' },
          { type: 'image_url', image_url: 'image.jpg' }
        ]
      }];
      
      const result = provider.formatVisionMessages(messages);
      expect(result[0].content[1].type).toBe('image');
      expect(result[0].content[1].source.type).toBe('base64');
    });

    test('should create messages via Anthropic SDK', async () => {
      const mockResponse = {
        content: [{ text: 'test response' }],
        usage: { input_tokens: 10, output_tokens: 20 },
        stop_reason: 'end_turn'
      };
      
      provider.client.messages.create.mockResolvedValue(mockResponse);
      
      const result = await provider.sdkChat([{ role: 'user', content: 'Hello' }], { temperature: 0.7 }, { model: 'claude-3-sonnet' });
      expect(result.content).toBe('test response');
      expect(result.finishReason).toBe('end_turn');
    });
  });

  describe('Provider Integration', () => {
    test('should handle chat with conversation tracking', async () => {
      const provider = new OllamaProvider(mockConfig);
      
      // Mock the chat method
      provider.chat = jest.fn().mockResolvedValue({
        content: 'Hello there!',
        model: 'llama2',
        usage: { input_tokens: 5, output_tokens: 10 }
      });
      
      const result = await provider.sendChat('Hello');
      
      expect(provider.chat).toHaveBeenCalledWith('Hello', {});
      expect(result.content).toBe('Hello there!');
      expect(provider.getHistory()).toHaveLength(2); // user + assistant
    });

    test('should handle vision with conversation tracking', async () => {
      const provider = new AnthropicProvider(mockConfig);
      
      // Mock the vision method
      provider.vision = jest.fn().mockResolvedValue({
        content: 'I can see the image',
        model: 'claude-3-sonnet',
        usage: { input_tokens: 15, output_tokens: 8 }
      });
      
      const messages = [{ role: 'user', content: 'What do you see?' }];
      const result = await provider.sendVision(messages);
      
      expect(provider.vision).toHaveBeenCalledWith(messages, {});
      expect(result.content).toBe('I can see the image');
      expect(provider.getHistory()).toHaveLength(2);
    });

    test('should handle streaming responses', async () => {
      const provider = new OllamaProvider(mockConfig);
      
      // Mock the stream chat method
      provider.streamChat = jest.fn().mockResolvedValue('stream-data');
      
      const result = await provider.getStreamChat('Hello');
      
      expect(provider.streamChat).toHaveBeenCalledWith('Hello', {});
      expect(result).toBe('stream-data');
      expect(provider.getHistory()).toHaveLength(1); // Only user message for streaming
    });
  });

  describe('Error Handling', () => {
    test('should handle provider errors gracefully', () => {
      const provider = new BaseProvider(mockConfig, 'test-provider');
      
      const error = new Error('API Error');
      error.response = { data: { error: { message: 'Rate limit exceeded' } } };
      
      expect(() => provider.handleError(error, 'chat')).toThrow('test-provider chat error: Rate limit exceeded');
    });

    test('should handle image processing errors', () => {
      const provider = new BaseProvider(mockConfig, 'test-provider');
      
      // Mock fs.readFileSync to throw error
      fs.readFileSync.mockImplementation(() => {
        throw new Error('File not found');
      });
      
      expect(() => provider.processImageUrl('nonexistent.jpg')).toThrow('Failed to read image file: File not found');
    });
  });
});
