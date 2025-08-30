const LLMClient = require('./src/llm-client');

// Export the main client
module.exports = LLMClient;

// Example usage
if (require.main === module) {
  (async () => {
    try {
      console.log('🚀 Easy LLM Client - Quick Start\n');

      // Initialize client
      const client = new LLMClient();

      console.log('✅ Client initialized successfully!');
      console.log(`📡 Provider: ${client.getProviderInfo().name}`);
      console.log(`🤖 Model: ${client.getProviderInfo().config.model}\n`);

      // Simple example
      console.log('💬 Quick Chat Example:');
      const response = await client.ask('Hello! Can you tell me a short joke?');
      console.log(`🤖 ${response.content}\n`);

      console.log('🎯 For comprehensive examples, run: node examples/comprehensive-usage.js');
      console.log('📚 For full documentation, see: README.md');
    } catch (error) {
      console.error('❌ Error:', error.message);
      console.log('\n💡 Make sure you have set up your .env file with the required API keys!');
    }
  })();
}
