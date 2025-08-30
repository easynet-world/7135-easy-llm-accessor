const CacheMixin = require('../src/providers/mixins/cache-mixin');
const ImageProcessingMixin = require('../src/providers/mixins/image-processing-mixin');
const MessageFormattingMixin = require('../src/providers/mixins/message-formatting-mixin');

describe('Mixins', () => {
  describe('CacheMixin', () => {
    let cacheMixin;

    beforeEach(() => {
      cacheMixin = new CacheMixin({
        defaultExpiry: 1000, // 1 second for testing
        defaultMaxSize: 10,
        cleanupInterval: 500 // 0.5 seconds for testing
      });
    });

    afterEach(() => {
      jest.clearAllTimers();
    });

    test('should create and manage named caches', () => {
      cacheMixin.createCache('test', { maxSize: 5 });
      
      expect(cacheMixin.hasCache('test', 'key1')).toBe(false);
      
      cacheMixin.setCache('test', 'key1', 'value1');
      expect(cacheMixin.getCache('test', 'key1')).toBe('value1');
      expect(cacheMixin.hasCache('test', 'key1')).toBe(true);
    });

    test('should handle cache expiry', async () => {
      cacheMixin.setCache('test', 'key1', 'value1', { expiry: 100 });
      
      expect(cacheMixin.getCache('test', 'key1')).toBe('value1');
      
      // Wait for expiry
      await new Promise(resolve => setTimeout(resolve, 150));
      
      expect(cacheMixin.getCache('test', 'key1')).toBe(null);
    });

    test('should trim cache when size limit reached', () => {
      cacheMixin.createCache('test', { maxSize: 3 });
      
      // Add 4 items to exceed limit
      cacheMixin.setCache('test', 'key1', 'value1');
      cacheMixin.setCache('test', 'key2', 'value2');
      cacheMixin.setCache('test', 'key3', 'value3');
      cacheMixin.setCache('test', 'key4', 'value4');
      
      // Should have trimmed to stay under limit
      expect(cacheMixin.getCacheSize('test')).toBeLessThanOrEqual(3);
    });

    test('should provide cache statistics', () => {
      cacheMixin.createCache('test');
      cacheMixin.setCache('test', 'key1', 'value1');
      cacheMixin.setCache('test', 'key2', 'value2');
      cacheMixin.getCache('test', 'key1'); // Hit
      cacheMixin.getCache('test', 'key3'); // Miss
      
      const stats = cacheMixin.getCacheStats('test');
      expect(stats.hits).toBe(1);
      expect(stats.misses).toBe(1);
      expect(stats.sets).toBe(2);
    });

    test('should clear all caches', () => {
      cacheMixin.createCache('cache1');
      cacheMixin.createCache('cache2');
      
      cacheMixin.setCache('cache1', 'key1', 'value1');
      cacheMixin.setCache('cache2', 'key2', 'value2');
      
      cacheMixin.clearAllCaches();
      
      expect(cacheMixin.getCacheSize('cache1')).toBe(0);
      expect(cacheMixin.getCacheSize('cache2')).toBe(0);
    });
  });

  describe('ImageProcessingMixin', () => {
    let imageMixin;

    beforeEach(() => {
      imageMixin = new ImageProcessingMixin({
        maxImageSize: 1024, // 1KB for testing
        supportedFormats: ['jpg', 'jpeg', 'png', 'webp', 'gif']
      });
    });

    test('should process base64 images', () => {
      const base64Image = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD';
      const result = imageMixin.processImage(base64Image);
      
      expect(result.type).toBe('base64');
      expect(result.format).toBe('jpeg');
      expect(result.mimeType).toBe('image/jpeg');
    });

    test('should process URL images', () => {
      const urlImage = 'https://example.com/image.jpg';
      const result = imageMixin.processImage(urlImage);
      
      expect(result.type).toBe('url');
      expect(result.format).toBe('jpg');
      expect(result.url).toBe(urlImage);
    });

    test('should validate image format', () => {
      const validation = imageMixin.validateImage('https://example.com/image.jpg');
      
      expect(validation.isValid).toBe(true);
      expect(validation.format).toBe('jpg');
      expect(validation.errors).toHaveLength(0);
    });

    test('should reject unsupported formats', () => {
      const validation = imageMixin.validateImage('https://example.com/image.bmp');
      
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Unsupported image format: bmp');
    });

    test('should convert to provider-specific formats', () => {
      const base64Image = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD';
      
      const openaiFormat = imageMixin.processImageForOpenAI(base64Image);
      expect(openaiFormat.url).toBe(base64Image);
      
      const anthropicFormat = imageMixin.processImageForAnthropic(base64Image);
      expect(anthropicFormat.type).toBe('base64');
      expect(anthropicFormat.media_type).toBe('image/jpeg');
      
      const ollamaFormat = imageMixin.processImageForOllama(base64Image);
      expect(ollamaFormat.url).toBe(base64Image);
    });

    test('should get MIME type from file extension', () => {
      expect(imageMixin.getMimeType('image.jpg')).toBe('image/jpeg');
      expect(imageMixin.getMimeType('image.png')).toBe('image/png');
      expect(imageMixin.getMimeType('image.unknown')).toBe('image/jpeg'); // Default
    });
  });

  describe('MessageFormattingMixin', () => {
    let messageMixin;

    beforeEach(() => {
      messageMixin = new MessageFormattingMixin({
        maxMessageLength: 1000,
        maxMessages: 10,
        supportedRoles: ['user', 'assistant', 'system']
      });
    });

    test('should format string messages', () => {
      const result = messageMixin.formatMessages('Hello world');
      
      expect(result).toHaveLength(1);
      expect(result[0].role).toBe('user');
      expect(result[0].content).toBe('Hello world');
    });

    test('should format object messages', () => {
      const messages = [
        { role: 'user', content: 'Hello' },
        { role: 'assistant', content: 'Hi there!' }
      ];
      
      const result = messageMixin.formatMessages(messages);
      
      expect(result).toHaveLength(2);
      expect(result[0].role).toBe('user');
      expect(result[1].role).toBe('assistant');
    });

    test('should validate message format', () => {
      const validation = messageMixin.validateMessage({
        role: 'user',
        content: 'Hello'
      });
      
      expect(validation.isValid).toBe(true);
      expect(validation.normalized.role).toBe('user');
      expect(validation.normalized.content).toBe('Hello');
    });

    test('should reject invalid roles', () => {
      const validation = messageMixin.validateMessage({
        role: 'invalid',
        content: 'Hello'
      });
      
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Unsupported role: invalid');
    });

    test('should reject messages without content', () => {
      const validation = messageMixin.validateMessage({
        role: 'user'
      });
      
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Message missing content');
    });

    test('should format messages for OpenAI', () => {
      const messages = [
        { role: 'user', content: 'Hello' },
        { role: 'assistant', content: 'Hi there!' }
      ];
      
      const result = messageMixin.formatMessagesForOpenAI(messages);
      
      expect(result).toHaveLength(2);
      expect(result[0].role).toBe('user');
      expect(result[1].role).toBe('assistant');
    });

    test('should format messages for Anthropic', () => {
      const messages = [
        { role: 'system', content: 'You are helpful' },
        { role: 'user', content: 'Hello' }
      ];
      
      const result = messageMixin.formatMessagesForAnthropic(messages);
      
      expect(result).toHaveLength(1);
      expect(result[0].role).toBe('user');
      expect(result[0].content).toContain('System: You are helpful');
      expect(result[0].content).toContain('User: Hello');
    });

    test('should format vision messages', () => {
      const visionMessage = {
        role: 'user',
        content: [
          { type: 'text', text: 'Describe this image' },
          { type: 'image_url', image_url: 'https://example.com/image.jpg' }
        ]
      };
      
      const result = messageMixin.formatVisionMessages([visionMessage]);
      
      expect(result).toHaveLength(1);
      expect(result[0].content).toHaveLength(2);
      expect(result[0].content[0].type).toBe('text');
      expect(result[0].content[1].type).toBe('image_url');
    });

    test('should handle multimodal content for Anthropic', () => {
      const visionMessage = {
        role: 'user',
        content: [
          { type: 'text', text: 'Describe this image' },
          { type: 'image_url', image_url: 'https://example.com/image.jpg' }
        ]
      };
      
      const result = messageMixin.formatVisionMessagesForAnthropic([visionMessage]);
      
      expect(result).toHaveLength(1);
      expect(result[0].content[1].type).toBe('image');
      expect(result[0].content[1].source).toBeDefined();
    });
  });

  describe('Mixin Integration', () => {
    test('should work together in a provider context', () => {
      // Simulate how mixins would be used in a provider
      const provider = {};
      
      // Apply all mixins by copying their prototype methods
      const cacheMixin = new CacheMixin();
      const imageMixin = new ImageProcessingMixin();
      const messageMixin = new MessageFormattingMixin();
      
      // Copy all methods from the mixins
      Object.getOwnPropertyNames(Object.getPrototypeOf(cacheMixin)).forEach(key => {
        if (key !== 'constructor') {
          provider[key] = cacheMixin[key].bind(provider);
        }
      });
      
      Object.getOwnPropertyNames(Object.getPrototypeOf(imageMixin)).forEach(key => {
        if (key !== 'constructor') {
          provider[key] = imageMixin[key].bind(provider);
        }
      });
      
      Object.getOwnPropertyNames(Object.getPrototypeOf(messageMixin)).forEach(key => {
        if (key !== 'constructor') {
          provider[key] = messageMixin[key].bind(provider);
        }
      });
      
      // Copy instance properties
      Object.assign(provider, cacheMixin);
      Object.assign(provider, imageMixin);
      Object.assign(provider, messageMixin);
      
      // Test that all mixin methods are available
      expect(typeof provider.createCache).toBe('function');
      expect(typeof provider.processImage).toBe('function');
      expect(typeof provider.formatMessages).toBe('function');
      
      // Test basic functionality
      provider.createCache('test');
      provider.setCache('test', 'key1', 'value1');
      expect(provider.getCache('test', 'key1')).toBe('value1');
      
      const messages = provider.formatMessages('Hello');
      expect(messages).toHaveLength(1);
      expect(messages[0].content).toBe('Hello');
    });
  });
});
