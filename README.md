# Easy LLM Client

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)](https://nodejs.org/)

**One client for multiple LLM providers. Switch between OpenAI, Anthropic, Ollama, Groq, and Grok seamlessly.**

## 🚀 Quick Start

```bash
npm install easy-llm-accessor
```

```javascript
const LLMClient = require('easy-llm-accessor');
const client = new LLMClient();

// Chat with any provider
const response = await client.ask('Hello!');
console.log(response.content);

// Switch providers on the fly
client.switchProvider('anthropic');
```

## 🌟 Supported Providers

| Provider | Best For | Key Features |
|----------|----------|--------------|
| **OpenAI** | General purpose, vision | GPT-4, GPT-4 Vision |
| **Anthropic** | Safety, research | Claude 3 Sonnet, Haiku, Opus |
| **Ollama** | Privacy, local | Local deployment, custom models |
| **Groq** | Speed, real-time | Ultra-fast inference |
| **Grok** | Current events | Real-time knowledge |

## ⚙️ Configuration

```bash
# .env file
LLM_PROVIDER=openai  # openai, anthropic, ollama, groq, grok
OPENAI_API_KEY=your_key
OPENAI_MODEL=gpt-4

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
