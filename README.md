# Easy LLM Accessor

**License: MIT** **Node.js Version**

### **One Client → Multiple LLM Providers + Chat + Vision + Streaming + Hot Switching**

# 🚀 **Quick Start (30 seconds)** 

## 1\. Install

```bash
npm install easy-llm-accessor dotenv
```

## 2\. Create configuration

```bash
# .env
LLM_PROVIDER=openai
OPENAI_API_KEY=your_api_key_here
OPENAI_MODEL=gpt-4
```

## 3\. Start chatting

```javascript
require('dotenv').config();
const { LLMClient } = require('easy-llm-accessor');

const client = new LLMClient();
const response = await client.chat('Hello, how are you?');
console.log(response.content);
```

## 🎉 Done! You now have:

* **Multi-Provider Support**: OpenAI, Anthropic, Ollama, Groq, Grok
* **Chat & Vision**: Text conversations and image analysis
* **Streaming**: Real-time responses
* **Hot Switching**: Change providers without restarting
* **Unified API**: Same interface for all providers

# 🌟 **Key Features** 

* **🔀 Multi-Provider** - Support for 5 major LLM providers
* **💬 Chat & Vision** - Text conversations and image analysis
* **📡 Streaming** - Real-time streaming responses
* **🔄 Hot Switching** - Change providers on the fly
* **⚙️ Unified API** - Consistent interface across all providers
* **🔧 Auto Configuration** - Automatic provider detection from environment
* **📊 Health Monitoring** - Provider health checks and metrics
* **🎯 Conversation Management** - Automatic history tracking

# 📁 **Supported Providers** 

| Provider | Best For | Key Features | Models |
|----------|----------|--------------|---------|
| **OpenAI** | General purpose, vision | GPT-4, GPT-4 Vision, DALL-E | `gpt-4`, `gpt-4-vision-preview` |
| **Anthropic** | Safety, research | Claude 3 Sonnet, Haiku, Opus | `claude-3-sonnet-20240229` |
| **Ollama** | Privacy, local | Local deployment, custom models | `llama2`, `mistral`, `codellama` |
| **Groq** | Speed, real-time | Ultra-fast inference | `llama3-8b-8192`, `mixtral-8x7b-32768` |
| **Grok** | Current events | Real-time knowledge | `grok-beta` |

# 💬 **Core Usage Examples** 

## **Basic Chat**

```javascript
const { LLMClient } = require('easy-llm-accessor');

const client = new LLMClient();
const response = await client.chat('Hello, how are you?');
console.log(response.content);
```

## **Provider Switching**

```javascript
// Switch between providers seamlessly
await client.switchProvider('openai');
const gptResponse = await client.chat('Explain quantum computing');

await client.switchProvider('anthropic');
const claudeResponse = await client.chat('Explain quantum computing');

await client.switchProvider('ollama');
const localResponse = await client.chat('Explain quantum computing');
```

## **Vision & Image Analysis**

```javascript
// Analyze images with vision models
const visionResponse = await client.vision([
  'What do you see in this image?',
  'path/to/image.jpg'  // or URL or base64
]);

// Multi-modal conversations
const multiModalResponse = await client.vision([
  { role: 'user', content: [
    { type: 'text', text: 'Describe this image' },
    { type: 'image_url', image_url: 'https://example.com/image.jpg' }
  ]}
]);
```

## **Streaming Responses**

```javascript
// Real-time streaming chat
const stream = await client.streamChat('Write a story about a robot');
stream.on('data', (chunk) => {
  process.stdout.write(chunk.content);
});
stream.on('end', (final) => {
  console.log('\nFinal response:', final.content);
});
```

## **Conversation Management**

```javascript
// Automatic conversation tracking
await client.sendChat('My name is Alice');
await client.sendChat('What did I just tell you?');
// Client remembers: "You told me your name is Alice"

// Get conversation history
const history = client.getHistory();
console.log('Conversation length:', history.length);

// Clear conversation
client.clearHistory();
```

# ⚙️ **Configuration** 

## **Environment Variables (Recommended)**

```bash
# .env
LLM_PROVIDER=openai
OPENAI_API_KEY=your_api_key_here
OPENAI_MODEL=gpt-4
```

**The client automatically detects provider-specific environment variables based on `LLM_PROVIDER`.**

## **Provider-Specific Configuration**

```bash
# OpenAI
OPENAI_API_KEY=your_openai_key
OPENAI_MODEL=gpt-4

# Anthropic
ANTHROPIC_API_KEY=your_anthropic_key
ANTHROPIC_MODEL=claude-3-sonnet-20240229

# Ollama
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama2

# Groq
GROQ_API_KEY=your_groq_key
GROQ_MODEL=llama3-8b-8192

# Grok
GROK_API_KEY=your_grok_key
GROK_MODEL=grok-beta
```

## **Programmatic Configuration**

```javascript
const client = new LLMClient({
  // Provider selection
  provider: 'openai',  // 'openai', 'anthropic', 'ollama', 'groq', 'grok'
  
  // API configuration
  apiKey: process.env.API_KEY,
  baseURL: 'https://api.openai.com/v1',  // For custom endpoints
  
  // Model settings
  model: 'gpt-4',
  defaultVisionModel: 'gpt-4-vision-preview',
  
  // Performance settings
  timeout: 30000,
  retryAttempts: 3,
  retryDelay: 1000,
  
  // Conversation settings
  maxHistorySize: 100,
  
  // Provider-specific options
  temperature: 0.7,
  maxTokens: 1000
});
```

# 🔧 **Advanced Features** 

## **Provider Health & Model Management**

```javascript
// Check provider health
const isHealthy = await client.isHealthy();
console.log('Provider healthy:', isHealthy);

// Get detailed health status
const healthStatus = await client.getHealthStatus();
console.log('Response time:', healthStatus.response_time_ms);

// List available models
const models = await client.listModels();
console.log('Available models:', models.map(m => m.name));

// Switch models
await client.switchModel('gpt-4-turbo');
```

## **Performance Monitoring**

```javascript
// Get performance metrics
const metrics = client.getPerformanceMetrics();
console.log('Success rate:', metrics.success_rate);
console.log('Average response time:', metrics.averageResponseTime);

// Reset metrics
client.resetPerformanceMetrics();
```

## **Custom Provider Implementation**

```javascript
const { BaseProvider } = require('easy-llm-accessor');

class CustomProvider extends BaseProvider {
  async chat(messages, options = {}) {
    // Custom implementation
    return this.formatResponse('Custom response', 'custom-model');
  }
}

const customClient = new LLMClient({
  provider: CustomProvider,
  customOption: 'value'
});
```

## **Batch Processing**

```javascript
// Process multiple requests efficiently
const questions = [
  'What is AI?',
  'How does machine learning work?',
  'Explain neural networks'
];

const responses = await Promise.all(
  questions.map(q => client.chat(q))
);

responses.forEach((response, i) => {
  console.log(`Q${i + 1}:`, questions[i]);
  console.log(`A${i + 1}:`, response.content);
});
```

# 🎯 **Real-World Usage Patterns** 

## **Chatbot with Memory**

```javascript
class Chatbot {
  constructor() {
    this.client = new LLMClient({
      provider: 'openai',
      apiKey: process.env.OPENAI_API_KEY,
      model: 'gpt-4'
    });
  }

  async respond(message) {
    try {
      const response = await this.client.sendChat(message);
      return response.content;
    } catch (error) {
      return `Sorry, I encountered an error: ${error.message}`;
    }
  }

  async analyzeImage(imagePath, question) {
    try {
      const response = await this.client.vision([question, imagePath]);
      return response.content;
    } catch (error) {
      return `Sorry, I couldn't analyze the image: ${error.message}`;
    }
  }
}

// Usage
const bot = new Chatbot();
const textResponse = await bot.respond('Hello!');
const imageAnalysis = await bot.analyzeImage('photo.jpg', 'What do you see?');
```

## **Multi-Provider Load Balancing**

```javascript
class LoadBalancedLLM {
  constructor(providers) {
    this.providers = providers.map(p => new LLMClient(p));
    this.currentIndex = 0;
  }

  async chat(message) {
    const client = this.providers[this.currentIndex];
    try {
      const response = await client.chat(message);
      return response;
    } catch (error) {
      // Try next provider
      this.currentIndex = (this.currentIndex + 1) % this.providers.length;
      return this.chat(message);
    }
  }
}

const loadBalancer = new LoadBalancedLLM([
  { provider: 'openai', apiKey: process.env.OPENAI_API_KEY },
  { provider: 'anthropic', apiKey: process.env.ANTHROPIC_API_KEY },
  { provider: 'groq', apiKey: process.env.GROQ_API_KEY }
]);
```

# 🧪 **Testing & Examples** 

## **Run Examples**

```bash
# Comprehensive usage examples
node examples/comprehensive-usage.js

# Configuration fix demo
node examples/config-fix-demo.js

# Ollama advanced features
node examples/ollama-advanced-features.js

# Ollama test
node examples/ollama-test.js
```

## **Run Tests**

```bash
npm test
```

## **Available Test Files**

- `configuration-fix.test.js` - Configuration validation tests
- `llm-client.test.js` - Core client functionality tests
- `mixins.test.js` - Mixin functionality tests
- `ollama-provider.test.js` - Ollama provider specific tests
- `providers.test.js.disabled` - Disabled provider tests

# 📚 **File Structure** 

```
src/
├── config/
│   └── index.js          → Configuration management
├── llm-client.js         → Main client class
├── providers/
│   ├── base-provider.js  → Base provider class
│   ├── anthropic-provider.js → Anthropic implementation
│   ├── ollama-provider.js    → Ollama implementation
│   ├── openai-compatible-provider.js → OpenAI implementation
│   └── mixins/
│       ├── cache-mixin.js           → Caching functionality
│       ├── image-processing-mixin.js → Image processing
│       └── message-formatting-mixin.js → Message formatting
examples/
├── comprehensive-usage.js → Complete usage examples
├── config-fix-demo.js     → Configuration examples
├── ollama-advanced-features.js → Ollama specific features
└── ollama-test.js         → Ollama testing
```

# 🔄 **How It Works** 

1. **Provider Detection** - Automatically detects configuration from environment variables
2. **Provider Selection** - Loads appropriate provider based on `LLM_PROVIDER`
3. **Unified Interface** - Provides consistent API across all providers
4. **Hot Switching** - Allows changing providers without restarting
5. **Automatic Fallback** - Handles errors and provider-specific issues gracefully

# 🎯 **Use Cases** 

* **AI Integration** - Easy integration with multiple LLM providers
* **Rapid Prototyping** - Quick testing with different AI models
* **Multi-Provider Applications** - Applications that need to use multiple AI services
* **AI Tools** - Building custom AI-powered tools and applications
* **Provider Comparison** - Testing and comparing different AI providers

# 💡 **Best Practices** 

1. **Use Environment Variables** - Keep API keys secure in `.env` files
2. **Provider Selection** - Choose providers based on your specific needs
3. **Error Handling** - Implement proper error handling for production use
4. **Model Selection** - Use appropriate models for your use case
5. **Streaming** - Use streaming for real-time applications
6. **Health Checks** - Monitor provider health in production

---

**🎯 The Future of LLM Integration: One Client, Multiple Providers, Unlimited Possibilities** 🚀✨

**Made with ❤️ for developers who want AI without complexity.**
