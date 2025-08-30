const LLMClient = require('../index');

/**
 * 🚀 Easy LLM Client - Clean Examples
 *
 * Demonstrates key usage patterns in a minimal, focused way.
 */

// ============================================================================
// 1. BASIC USAGE PATTERNS
// ============================================================================

async function basicUsage () {
  // Initialize with default provider (OpenAI)
  const client = new LLMClient();

  // Simple chat
  const response = await client.ask('Hello, how are you?');
  console.log('Chat Response:', response.content);

  // Vision analysis
  try {
    const visionResponse = await client.see('Describe this image', 'https://example.com/image.jpg');
    console.log('Vision Response:', visionResponse.content);
  } catch (error) {
    console.log('Vision not supported or failed');
  }
}

// ============================================================================
// 2. PROVIDER SWITCHING
// ============================================================================

async function providerSwitching () {
  // Start with OpenAI
  const client = new LLMClient({ provider: 'openai' });

  // Switch to different providers
  client.switchProvider('anthropic');
  const claudeResponse = await client.ask('What is constitutional AI?');
  console.log('Claude Response:', claudeResponse.content);

  client.switchProvider('groq');
  const groqResponse = await client.ask('Explain quantum computing briefly');
  console.log('Groq Response:', groqResponse.content);
}

// ============================================================================
// 3. ADVANCED FEATURES
// ============================================================================

async function advancedFeatures () {
  const client = new LLMClient();

  // Custom options
  const response = await client.ask('Write a haiku about AI', {
    temperature: 0.9,
    maxTokens: 100
  });
  console.log('Custom Options Response:', response.content);

  // Streaming
  await client.streamChat('Count from 1 to 10');
  console.log('Streaming response available');

  // Conversation management
  client.clearHistory();
  console.log('Conversation history cleared');
}

// ============================================================================
// 4. REAL-WORLD SCENARIOS
// ============================================================================

async function realWorldScenarios () {
  // Content generation
  const openaiClient = new LLMClient({ provider: 'openai' });
  const blogPost = await openaiClient.ask('Write a blog post introduction about AI ethics');
  console.log('Blog Post Intro:', blogPost.content);

  // Local development
  const ollamaClient = new LLMClient({ provider: 'ollama' });
  const codeReview = await ollamaClient.ask('Review this code: function add(a, b) { return a + b; }');
  console.log('Code Review:', codeReview.content);

  // High-speed inference
  const groqClient = new LLMClient({ provider: 'groq' });
  const quickAnalysis = await groqClient.ask('Summarize the benefits of cloud computing in 3 points');
  console.log('Quick Analysis:', quickAnalysis.content);
}

// ============================================================================
// 5. ERROR HANDLING
// ============================================================================

async function errorHandling () {
  try {
    // Invalid provider
    // eslint-disable-next-line no-new
    new LLMClient({ provider: 'invalid-provider' });
  } catch (error) {
    console.log('Provider validation works:', error.message);
  }

  try {
    // Unsupported feature
    const groqClient = new LLMClient({ provider: 'groq' });
    await groqClient.see('Analyze image', 'test.jpg');
  } catch (error) {
    console.log('Feature limitation handling works:', error.message);
  }
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================

async function runExamples () {
  console.log('🚀 Easy LLM Client Examples\n');

  try {
    await basicUsage();
    console.log('\n---\n');

    await providerSwitching();
    console.log('\n---\n');

    await advancedFeatures();
    console.log('\n---\n');

    await realWorldScenarios();
    console.log('\n---\n');

    await errorHandling();

    console.log('\n✨ All examples completed successfully!');
  } catch (error) {
    console.log('Example error:', error.message);
  }
}

// Run examples if this file is executed directly
if (require.main === module) {
  runExamples().catch(console.error);
}

// Export functions for testing or external use
module.exports = {
  basicUsage,
  providerSwitching,
  advancedFeatures,
  realWorldScenarios,
  errorHandling,
  runExamples
};
