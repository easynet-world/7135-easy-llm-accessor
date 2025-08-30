# Easy LLM Client

1.0.0 • Public • Published

* Readme
* Code
* Dependencies
* Dependents

# Easy LLM Client

License: MIT Node.js Version

### **One Client → Multiple LLM Providers + Chat + Vision + Streaming**

# 🚀 **Quick Start (30 seconds)** 

## 1\. Install

```bash
npm install easy-llm-cli
```

## 2\. Configure

Create a `.env` file in your project root:

```bash
# LLM Provider Configuration
LLM_PROVIDER=openai

# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_MODEL=gpt-4
OPENAI_TEMPERATURE=0.7

# Anthropic Configuration (optional)
ANTHROPIC_API_KEY=your_anthropic_api_key_here
ANTHROPIC_MODEL=claude-3-sonnet-20240229
```

## 3\. Use

```javascript
const LLMClient = require('easy-llm-cli');

// Initialize client
const client = new LLMClient();

// Simple chat
const response = await client.ask('Hello! How are you?');
console.log(response.content);

// Vision analysis
const visionResponse = await client.see(
  'What do you see in this image?',
  'https://example.com/image.jpg'
);
console.log(visionResponse.content);
```

## 🎉 Done! You now have:

* **Multi-Provider Support**: OpenAI, Anthropic, Ollama, Groq, Grok
* **Chat & Vision**: Text conversations and image analysis
* **Streaming**: Real-time responses for better UX
* **Easy Configuration**: Simple `.env` file setup
* **Developer Friendly**: Clean API with conversation history
* **Hot Provider Switching**: Change providers on the fly

# 🌟 **Key Features** 

* **🔄 Multi-Provider Support** - OpenAI, Anthropic, Ollama, Groq, Grok
* **💬 Chat & Vision** - Text conversations and image analysis
* **📡 Streaming** - Real-time responses for better UX
* **⚙️ Easy Configuration** - Simple `.env` file setup
* **🎯 Developer Friendly** - Clean API with conversation history
* **🔧 Hot Provider Switching** - Change providers on the fly
* **📚 Auto Documentation** - Built-in conversation tracking

# 📁 **File Structure** 

**Clean, organized provider architecture:**

```
src/
├── config/           # Configuration management
├── providers/        # LLM provider implementations
│   ├── base-provider.js           # Unified base class
│   ├── anthropic-provider.js      # Anthropic Claude support
│   ├── openai-compatible-provider.js # OpenAI, Groq, Grok
│   └── ollama-provider.js         # Local Ollama support
└── llm-client.js     # Main client class
```

**Provider Types**: `sdk` (OpenAI, Anthropic) and `http` (Ollama, custom)

# 📝 **API Reference** 

## **Initialization**

```javascript
const client = new LLMClient(options);

// Options:
// - provider: 'openai' | 'anthropic' | 'ollama' | 'groq' | 'grok'
// - config: Custom configuration object
```

## **Chat Methods**

```javascript
// Simple chat
const response = await client.ask('Your message here');

// Advanced chat with options
const response = await client.chat([
  { role: 'system', content: 'You are a helpful assistant' },
  { role: 'user', content: 'Hello!' }
], {
  temperature: 0.8,
  maxTokens: 500
});

// Streaming chat
const stream = await client.streamChat('Your message');
for await (const chunk of stream) {
  console.log(chunk.choices[0]?.delta?.content || '');
}
```

## **Vision Methods**

```javascript
// Simple vision request
const response = await client.see(
  'Describe this image',
  'path/to/image.jpg'
);

// Advanced vision with multiple images
const response = await client.vision([
  {
    role: 'user',
    content: [
      { type: 'text', text: 'Compare these two images' },
      { type: 'image_url', image_url: 'image1.jpg' },
      { type: 'image_url', image_url: 'image2.jpg' }
    ]
  }
]);

// Streaming vision
const stream = await client.streamVision(messages);
```

## **Utility Methods**

```javascript
// Get conversation history
const history = client.getHistory();

// Clear conversation
client.clearHistory();

// Switch provider
client.switchProvider('anthropic');

// Get provider info
const info = client.getProviderInfo();
```

# 🔧 **Configuration** 

## **Environment Variables**

| Variable | Description | Default |
|----------|-------------|---------|
| `LLM_PROVIDER` | Provider to use | `openai` |
| `OPENAI_API_KEY` | OpenAI API key | Required |
| `OPENAI_MODEL` | OpenAI model | `gpt-4` |
| `ANTHROPIC_API_KEY` | Anthropic API key | Required |
| `ANTHROPIC_MODEL` | Anthropic model | `claude-3-sonnet-20240229` |
| `OLLAMA_BASE_URL` | Ollama server URL | `http://localhost:11434` |
| `GROQ_API_KEY` | Groq API key | Required |
| `GROK_API_KEY` | Grok API key | Required |

## **Provider-Specific Options**

```bash
# OpenAI
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_MAX_TOKENS=4096
OPENAI_TEMPERATURE=0.7

# Anthropic
ANTHROPIC_MAX_TOKENS=4096
ANTHROPIC_TEMPERATURE=0.7

# Ollama
OLLAMA_MODEL=llama3.2
OLLAMA_MAX_TOKENS=4096
OLLAMA_TEMPERATURE=0.7

# Groq
GROQ_MODEL=llama3-70b-8192
GROQ_MAX_TOKENS=4096
GROQ_TEMPERATURE=0.7

# Grok
GROK_MODEL=grok-beta
GROK_MAX_TOKENS=4096
GROK_TEMPERATURE=0.7
```

# 🖼️ **Vision Support** 

## **Supported Image Formats**

* **URLs**: `https://example.com/image.jpg`
* **File Paths**: `./images/photo.png`
* **Base64**: `data:image/jpeg;base64,/9j/4AAQ...`
* **Formats**: JPG, JPEG, PNG, WebP, GIF

## **Vision Examples**

```javascript
// Analyze image from URL
const response = await client.see(
  'What objects do you see in this image?',
  'https://images.unsplash.com/photo-1234567890'
);

// Analyze local image file
const response = await client.see(
  'Describe the mood of this image',
  './photos/sunset.jpg'
);

// Complex vision analysis
const response = await client.vision([
  {
    role: 'user',
    content: [
      { type: 'text', text: 'Analyze this image and provide: 1) Objects, 2) Colors, 3) Mood' },
      { type: 'image_url', image_url: 'image.jpg' }
    ]
  }
]);
```

# 🔄 **Provider Switching** 

Switch between providers seamlessly:

```javascript
// Start with OpenAI
const client = new LLMClient({ provider: 'openai' });

// Switch to Anthropic
client.switchProvider('anthropic');

// Switch back to OpenAI
client.switchProvider('openai');

// Each switch clears conversation history
console.log(client.getHistory()); // []
```

# 🚀 **Supported Providers** 

## **OpenAI** 🤖
* **Models**: GPT-4, GPT-3.5-turbo, GPT-4 Vision
* **Features**: Chat, Vision, Streaming, Function calling
* **Best for**: General purpose, creative tasks, vision analysis

## **Anthropic Claude** 🧠
* **Models**: Claude 3 Opus, Sonnet, Haiku
* **Features**: Chat, Vision, Streaming, Constitutional AI
* **Best for**: Safety-focused applications, long conversations

## **Ollama** 🦙
* **Models**: Llama, Mistral, CodeLlama, and many more
* **Features**: Chat, Vision (with supported models), Local deployment
* **Best for**: Privacy, offline use, custom model fine-tuning

## **Groq** ⚡
* **Models**: Llama 3 70B, Mixtral 8x7B, Gemma2
* **Features**: Ultra-fast inference, Chat, Streaming
* **Best for**: Real-time applications, high-throughput scenarios

## **Grok** 🤖
* **Models**: Grok Beta, Grok Ultra, Grok Vision
* **Features**: Chat, Vision, Real-time web search, Mathematical reasoning
* **Best for**: Research, current events, creative problem-solving

# 📚 **Examples** 

## **Quick Start**

```javascript
const LLMClient = require('easy-llm-cli');

// Initialize client
const client = new LLMClient();

// Simple chat
const response = await client.ask('Hello! How are you?');
console.log(response.content);
```

## **Comprehensive Examples**

For a complete demonstration of all features, run:

```bash
node examples/comprehensive-usage.js
```

This includes examples for:
* **Basic Setup**: Initialization with different providers
* **Simple Chat**: Basic conversation examples
* **Advanced Chat**: Custom options and system messages
* **Vision Analysis**: Image analysis with single and multiple images
* **Streaming**: Real-time response handling
* **Provider Switching**: Hot-swap between providers
* **Utilities**: Conversation history and management
* **Error Handling**: Best practices and graceful failure

## **Key Usage Patterns**

```javascript
// Simple chat
const response = await client.ask('Your question here');

// Vision analysis
const visionResponse = await client.see('Describe this image', 'image.jpg');

// Provider switching
client.switchProvider('anthropic');

// Streaming
const stream = await client.streamChat('Your prompt');
for await (const chunk of stream) {
  process.stdout.write(chunk.choices[0]?.delta?.content || '');
}
```

# 🧪 **Testing** 

Run the test suite:

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm test -- --coverage
```

# 🔌 **Adding Custom Providers** 

Extend the base provider to add custom LLM services:

```javascript
const BaseProvider = require('./src/providers/base-provider');

class CustomProvider extends BaseProvider {
  constructor(config) {
    super(config, 'custom', {
      providerType: 'http',
      baseURL: config.baseURL,
      endpoint: '/api/chat'
    });
  }
  
  // Implement custom methods if needed
}

module.exports = CustomProvider;
```

# 🎯 **Use Cases** 

* **AI Integration** - Build AI-powered applications
* **Chatbots** - Create conversational interfaces
* **Image Analysis** - Analyze and describe images
* **Content Generation** - Generate text, code, and creative content
* **Multi-Provider Apps** - Switch between different AI services
* **Rapid Prototyping** - Quick AI integration for MVPs

# 🚀 **Performance Tips** 

1. **Use Streaming** for long responses to improve perceived performance
2. **Batch Requests** when possible to reduce API calls
3. **Cache Responses** for repeated queries
4. **Monitor Usage** with conversation history
5. **Optimize Images** before sending to vision APIs

# 🤝 **Contributing** 

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

# 📄 **License** 

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

**🎯 The Future of AI Development: One Client, Multiple Providers, Unlimited Possibilities** 🚀✨

**Made with ❤️ for developers who want to build AI-powered applications without the complexity.**
