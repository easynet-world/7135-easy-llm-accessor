# Easy LLM Accessor

A developer-friendly, configurable LLM client supporting multiple providers, chat, and vision capabilities.

## 🚀 Quick Start

### Installation

```bash
npm install easy-llm-accessor dotenv
```

**Note:** We use `dotenv` for secure configuration management via `.env` files.

### Basic Setup

**Create a `.env` file for your configuration:**

```bash
# .env
LLM_PROVIDER=openai
OPENAI_API_KEY=your_api_key_here
OPENAI_MODEL=gpt-4
```

**Load environment variables and initialize the client:**

```javascript
require('dotenv').config();
const { LLMClient } = require('easy-llm-accessor');

// Initialize - client automatically detects configuration from .env
const client = new LLMClient();
```

### 🎯 Core Features

#### 1. **Multi-Provider Chat**
```javascript
// Chat with any provider
const response = await client.chat('Hello, how are you?');
console.log(response.content);

// Switch providers on the fly
client.switchProvider('anthropic');
const claudeResponse = await client.chat('Tell me a joke');
```

#### 2. **Vision & Image Analysis**
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

#### 3. **Streaming Responses**
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

#### 4. **Conversation Management**
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

#### 5. **Provider Health & Model Management**
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

#### 6. **Advanced Configuration**
```javascript
// Custom provider configuration
const ollamaClient = new LLMClient({
  provider: 'ollama',
  baseURL: 'http://localhost:11434',
  model: 'llama2',
  temperature: 0.8,
  maxTokens: 1000
});

// Provider-specific options
const anthropicClient = new LLMClient({
  provider: 'anthropic',
  apiKey: process.env.ANTHROPIC_API_KEY,
  model: 'claude-3-sonnet-20240229',
  maxTokens: 4096
});
```

#### 7. **Error Handling & Retry Logic**
```javascript
try {
  const response = await client.chat('Generate code for a web app');
  console.log(response.content);
} catch (error) {
  if (error.operation === 'chat') {
    console.error('Chat failed:', error.message);
  } else if (error.provider === 'openai') {
    console.error('OpenAI error:', error.originalError.message);
  }
}
```

#### 8. **Performance Monitoring**
```javascript
// Get performance metrics
const metrics = client.getPerformanceMetrics();
console.log('Success rate:', metrics.success_rate);
console.log('Average response time:', metrics.averageResponseTime);

// Reset metrics
client.resetPerformanceMetrics();
```

#### 9. **Utility Methods**
```javascript
// Quick methods
const answer = await client.ask('What is 2+2?');  // Alias for chat
const imageAnalysis = await client.see('path/to/image.jpg');  // Alias for vision

// Get provider info
const providerInfo = client.getProviderInfo();
console.log('Current provider:', providerInfo.name);
console.log('Provider type:', providerInfo.type);
```

#### 10. **Configuration Management**
```javascript
// Get current configuration
const config = client.getCurrentConfig();
console.log('Model:', config.model);
console.log('Temperature:', config.temperature);

// Validate configuration
const validation = client.validateConfiguration();
if (!validation.isValid) {
  console.error('Configuration errors:', validation.errors);
}
```

### 🔄 Provider Switching Examples

```javascript
// Switch between providers seamlessly
await client.switchProvider('openai');
const gptResponse = await client.chat('Explain quantum computing');

await client.switchProvider('anthropic');
const claudeResponse = await client.chat('Explain quantum computing');

await client.switchProvider('ollama');
const localResponse = await client.chat('Explain quantum computing');
```

### 📱 Real-World Usage Patterns

```javascript
// Chatbot with memory
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

### 🚀 Advanced Features

#### **Custom Provider Implementation**
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

#### **Batch Processing**
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

### 📋 Environment Variables

**Automatic configuration detection (recommended):**
```bash
# .env
LLM_PROVIDER=openai
OPENAI_API_KEY=your_api_key_here
OPENAI_MODEL=gpt-4
```

**The client automatically detects provider-specific environment variables based on `LLM_PROVIDER`.**

**Provider-specific configuration (alternative):**
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

### 🔧 Configuration Options

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

---

## 🚀 Latest Update

**Version 1.0.16** - Complete Ollama Provider Features (100% Implementation)

- ✅ Health Monitoring & Availability
- ✅ Model Switching & Management  
- ✅ Model Information Retrieval
- ✅ Streaming Support
- ✅ Advanced Configuration Options

## ✨ Features

## 🌟 Supported Providers

| Provider | Best For | Key Features |
|----------|----------|--------------|
| **OpenAI** | General purpose, vision | GPT-4, GPT-4 Vision |
| **Anthropic** | Safety, research | Claude 3 Sonnet, Haiku, Opus |
| **Ollama** | Privacy, local | Local deployment, custom models |
| **Groq** | Speed, real-time | Ultra-fast inference |
| **Grok** | Current events | Real-time knowledge |

## ⚙️ Configuration

**We use `.env` files for secure configuration management:**

```bash
# .env file
LLM_PROVIDER=openai  # openai, anthropic, ollama, groq, grok
OPENAI_API_KEY=your_api_key_here
OPENAI_MODEL=gpt-4

# Load environment variables
require('dotenv').config();

# Switch providers anytime
client.switchProvider('groq');
client.switchProvider('ollama');
```

## 🎯 Key Features

- **🔄 Multi-Provider**: 5 major LLM providers in one client
- **💬 Chat & Vision**: Text and image analysis
- **📡 Streaming**: Real-time responses
- **🔧 Hot Switching**: Change providers without restarting
- **⚙️ Unified API**: Same interface for all providers

## 📚 Examples

```bash
node examples/comprehensive-usage.js
```

## 🧪 Testing

```bash
npm test
```

---

**One client, multiple providers, unlimited possibilities.** 🚀

**Made with ❤️ for developers who want AI without complexity.**
