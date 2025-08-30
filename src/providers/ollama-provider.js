const BaseProvider = require('./base-provider');

class OllamaProvider extends BaseProvider {
  constructor (config) {
    super(config, 'ollama', {
      providerType: 'http',
      baseURL: config.baseURL,
      endpoint: '/api/chat',
      requestFormat: 'ollama',
      responseFormat: 'ollama'
    });
  }

  // ============================================================================
  // OLLAMA-SPECIFIC FEATURES
  // ============================================================================

  // All core functionality is inherited from BaseProvider
  // Ollama-specific features can be added here if needed
}

module.exports = OllamaProvider;
