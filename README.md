# Easy LLM Client

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D16.0.0-brightgreen.svg)](https://nodejs.org/)

# Easy LLM Client

License: MIT Node.js Version

### **One Client → Multiple LLM Providers + Chat + Vision + Streaming**

# 🚀 **Quick Start (30 seconds)** 

## 1\. Install

```bash
npm install easy-llm-cli
```

## 2\. Configure

Create a `.env` file:

```bash
LLM_PROVIDER=openai
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_MODEL=gpt-4
```

## 3\. Use

```javascript
const LLMClient = require('easy-llm-cli');
const client = new LLMClient();

// Chat
const response = await client.ask('Hello! How are you?');
console.log(response.content);

// Vision
const visionResponse = await client.see(
  'What do you see in this image?',
  'https://example.com/image.jpg'
);
```

## 🎉 Done! You now have:

* **Multi-Provider Support**: OpenAI, Anthropic, Ollama, Groq, Grok
* **Chat & Vision**: Text conversations and image analysis
* **Streaming**: Real-time responses
* **Easy Configuration**: Simple `.env` setup
* **Provider Switching**: Change providers on the fly

# 🌟 **Key Features** 

* **🔄 Multi-Provider** - OpenAI, Anthropic, Ollama, Groq, Grok
* **💬 Chat & Vision** - Text conversations and image analysis
* **📡 Streaming** - Real-time responses
* **⚙️ Easy Config** - Simple `.env` setup
* **🔧 Hot Switching** - Change providers seamlessly

# 📝 **API Reference** 

## **Basic Usage**

```javascript
// Initialize
const client = new LLMClient({ provider: 'openai' });

// Chat
const response = await client.ask('Your message');
const chatResponse = await client.chat(messages, options);

// Vision
const visionResponse = await client.see('Describe this', 'image.jpg');

// Streaming
const stream = await client.streamChat('Your prompt');
for await (const chunk of stream) {
  console.log(chunk.choices[0]?.delta?.content || '');
}

// Provider switching
client.switchProvider('anthropic');
```

## **Configuration**

```bash
# Required for each provider
OPENAI_API_KEY=your_key
ANTHROPIC_API_KEY=your_key
GROQ_API_KEY=your_key
GROK_API_KEY=your_key

# Optional settings
OPENAI_MODEL=gpt-4
ANTHROPIC_MODEL=claude-3-sonnet-20240229
OLLAMA_BASE_URL=http://localhost:11434
```

# 🚀 **Supported Providers** 

| Provider | Type | Best For |
|----------|------|----------|
| **OpenAI** | SDK | General purpose, vision, creativity |
| **Anthropic** | SDK | Safety, long conversations |
| **Ollama** | HTTP | Privacy, offline, local models |
| **Groq** | SDK | Speed, real-time apps |
| **Grok** | SDK | Research, current events |

# 📚 **Examples** 

Run comprehensive examples:

```bash
node examples/comprehensive-usage.js
```

# 🧪 **Testing** 

```bash
npm test
npm run test:watch
```

# 🔌 **Adding Custom Providers** 

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
}
```

# 🎯 **Use Cases** 

* AI Integration, Chatbots, Image Analysis
* Content Generation, Multi-Provider Apps
* Rapid Prototyping, MVP Development

# 🤝 **Contributing** 

1. Fork the repository
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open Pull Request

# 📄 **License** 

MIT License

---

**🎯 One Client, Multiple Providers, Unlimited Possibilities** 🚀✨

**Made with ❤️ for developers who want to build AI-powered applications without complexity.**
