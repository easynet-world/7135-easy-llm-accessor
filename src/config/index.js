const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

class Config {
  constructor () {
    this.provider = process.env.LLM_PROVIDER || 'openai';
    this.logLevel = process.env.LOG_LEVEL || 'info';
    this.requestTimeout = parseInt(process.env.REQUEST_TIMEOUT) || 30000;
    this.retryAttempts = parseInt(process.env.RETRY_ATTEMPTS) || 3;
    this.retryDelay = parseInt(process.env.RETRY_DELAY) || 1000;

    // Vision settings
    this.vision = {
      maxImageSize: parseInt(process.env.VISION_MAX_IMAGE_SIZE) || 20971520, // 20MB
      supportedFormats: (process.env.VISION_SUPPORTED_FORMATS || 'jpg,jpeg,png,webp,gif').split(',')
    };
  }

  getProviderConfig () {
    switch (this.provider.toLowerCase()) {
    // ============================================================================
    // OPENAI-COMPATIBLE PROVIDERS - Use same configuration structure
    // These providers (OpenAI, Groq, Grok) all use OpenAI-compatible APIs
    // and can be configured with the same environment variables pattern
    // ============================================================================
    case 'openai':
      return {
        apiKey: process.env.OPENAI_API_KEY,
        model: process.env.OPENAI_MODEL || 'gpt-4',
        baseURL: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
        temperature: parseFloat(process.env.OPENAI_TEMPERATURE) || 0.7,
        maxTokens: parseInt(process.env.OPENAI_MAX_TOKENS) || 4096
      };

    case 'groq':
      return {
        apiKey: process.env.GROQ_API_KEY,
        model: process.env.GROQ_MODEL || 'llama3-70b-8192',
        baseURL: process.env.GROQ_BASE_URL || 'https://api.groq.com/openai/v1',
        temperature: parseFloat(process.env.GROQ_TEMPERATURE) || 0.7,
        maxTokens: parseInt(process.env.GROQ_MAX_TOKENS) || 4096
      };

    case 'grok':
      return {
        apiKey: process.env.GROK_API_KEY,
        model: process.env.GROK_MODEL || 'grok-beta',
        baseURL: process.env.GROK_BASE_URL || 'https://api.x.ai/v1',
        temperature: parseFloat(process.env.GROK_TEMPERATURE) || 0.7,
        maxTokens: parseInt(process.env.GROK_MAX_TOKENS) || 4096
      };

    // ============================================================================
    // UNIQUE PROVIDERS - Use different configuration structures
    // These providers have their own specific API formats and requirements
    // ============================================================================
    case 'anthropic':
      return {
        apiKey: process.env.ANTHROPIC_API_KEY,
        model: process.env.ANTHROPIC_MODEL || 'claude-3-sonnet-20240229',
        temperature: parseFloat(process.env.ANTHROPIC_TEMPERATURE) || 0.7,
        maxTokens: parseInt(process.env.ANTHROPIC_MAX_TOKENS) || 4096
      };

    case 'ollama':
      return {
        baseURL: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
        model: process.env.OLLAMA_MODEL || 'llama3.2',
        maxTokens: parseInt(process.env.OLLAMA_MAX_TOKENS) || 4096,
        temperature: parseFloat(process.env.OLLAMA_TEMPERATURE) || 0.7
      };

    case 'custom':
      return {
        apiKey: process.env.CUSTOM_API_KEY,
        baseURL: process.env.CUSTOM_BASE_URL,
        model: process.env.CUSTOM_MODEL,
        temperature: parseFloat(process.env.CUSTOM_TEMPERATURE) || 0.7,
        maxTokens: parseInt(process.env.CUSTOM_MAX_TOKENS) || 4096
      };

    default:
      throw new Error(`Unsupported provider: ${this.provider}`);
    }
  }

  validate () {
    const providerConfig = this.getProviderConfig();

    // Ollama doesn't require an API key
    if (this.provider !== 'ollama' && !providerConfig.apiKey) {
      throw new Error(`API key not found for provider: ${this.provider}`);
    }

    if (this.provider === 'custom' && !providerConfig.baseURL) {
      throw new Error('Custom provider requires CUSTOM_BASE_URL to be set');
    }

    return true;
  }
}

module.exports = Config;
