# Easy LLM Accessor

A developer-friendly, configurable LLM client supporting multiple providers, chat, and vision capabilities.

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
