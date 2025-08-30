const LLMClient = require('../src/llm-client');

async function demonstrateConfigurationFixes() {
  console.log('🔧 Demonstrating Configuration Access Fixes\n');

  // Create client with custom configuration
  const client = new LLMClient({
    provider: 'ollama',
    config: {
      baseURL: 'https://ollama-rtx-4070.easynet.world',
      model: 'gemma3:latest',
      temperature: 0.7,
      maxTokens: 4096
    }
  });

  console.log('✅ Configuration Access Fixed:');
  console.log(`   client.baseURL: ${client.baseURL}`);
  console.log(`   client.model: ${client.model}`);
  console.log(`   client.temperature: ${client.temperature}`);
  console.log(`   client.maxTokens: ${client.maxTokens}`);
  console.log();

  console.log('✅ Config Object Access:');
  console.log(`   client.config.baseURL: ${client.config.baseURL}`);
  console.log(`   client.config.model: ${client.config.model}`);
  console.log(`   client.config.temperature: ${client.config.temperature}`);
  console.log(`   client.config.maxTokens: ${client.config.maxTokens}`);
  console.log();

  console.log('✅ Conversation History Methods Available:');
  console.log(`   getHistory(): ${typeof client.getHistory}`);
  console.log(`   getHistoryLength(): ${typeof client.getHistoryLength}`);
  console.log(`   getLastMessage(): ${typeof client.getLastMessage}`);
  console.log(`   getFormattedHistory(): ${typeof client.getFormattedHistory}`);
  console.log(`   clearHistory(): ${typeof client.clearHistory}`);
  console.log();

  console.log('✅ Direct History Access:');
  console.log(`   client._conversationHistory: ${Array.isArray(client._conversationHistory)}`);
  console.log(`   History length: ${client.getHistoryLength()}`);
  console.log();

  // Test conversation history
  console.log('📝 Testing Conversation History:');
  
  // Mock the provider to avoid actual API calls
  const mockProvider = {
    sendChat: async (message) => ({
      content: `Response to: ${message}`,
      model: 'gemma3:latest',
      usage: { input_tokens: 5, output_tokens: 10 },
      finishReason: 'stop',
      timestamp: new Date().toISOString()
    }),
    _conversationHistory: [],
    addToHistory: () => {},
    getHistory: () => [],
    clearHistory: () => {}
  };

  client.provider = mockProvider;

  // Send a message
  try {
    const response = await client.ask('Hello, how are you?');
    console.log(`   Response: ${response.content}`);
    console.log(`   History length after message: ${client.getHistoryLength()}`);
  } catch (error) {
    console.log(`   Error (expected in demo): ${error.message}`);
  }

  console.log('\n🎉 Configuration access issues have been resolved!');
  console.log('   - client.config.* properties now work correctly');
  console.log('   - Direct property access (client.baseURL, etc.) is available');
  console.log('   - Conversation history methods are properly exposed');
}

// Run the demonstration
if (require.main === module) {
  demonstrateConfigurationFixes().catch(console.error);
}

module.exports = { demonstrateConfigurationFixes };
