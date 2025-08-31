#!/usr/bin/env node

/**
 * Ollama Advanced Features Demo
 * 
 * This example demonstrates all the new features added to the Ollama provider:
 * - Model Management (list, switch, info)
 * - Health Monitoring (health checks, status)
 * - Streaming Support (real-time chat)
 * - Advanced Configuration (Ollama-specific options)
 * 
 * Prerequisites:
 * - Ollama running locally on http://localhost:11434
 * - At least one model pulled (e.g., llama3.2, gemma3)
 */

const LLMClient = require('../index');

async function demonstrateOllamaFeatures() {
  console.log('🚀 Ollama Advanced Features Demo\n');

  // Initialize the LLM client with Ollama provider
  const client = new LLMClient({
    provider: 'ollama',
    config: {
      baseURL: 'http://localhost:11434',
      model: 'llama3.2',
      temperature: 0.7,
      maxTokens: 4096,
      // Advanced Ollama-specific options
      topK: 40,
      topP: 0.9,
      repeatPenalty: 1.1,
      seed: 42,
      numCtx: 4096,
      numGpu: 1
    }
  });

  try {
    // ============================================================================
    // FEATURE 1: HEALTH MONITORING
    // ============================================================================
    console.log('📊 Checking Ollama Health Status...');
    
    const isHealthy = await client.isHealthy();
    console.log(`✅ Health Check: ${isHealthy ? 'HEALTHY' : 'UNHEALTHY'}`);
    
    if (isHealthy) {
      const healthStatus = await client.getHealthStatus();
      console.log('📈 Detailed Health Status:');
      console.log(`   Status: ${healthStatus.status}`);
      console.log(`   Available: ${healthStatus.available}`);
      console.log(`   Models: ${healthStatus.models}`);
      console.log(`   Response Time: ${healthStatus.response_time_ms}ms`);
      console.log(`   Base URL: ${healthStatus.base_url}`);
      console.log(`   Timestamp: ${healthStatus.timestamp}\n`);
    } else {
      console.log('❌ Ollama is not available. Please ensure it\'s running.\n');
      return;
    }

    // ============================================================================
    // FEATURE 2: MODEL MANAGEMENT
    // ============================================================================
    console.log('🤖 Model Management...');
    
    // List all available models
    console.log('📋 Listing available models:');
    const models = await client.listModels();
    
    if (models.length === 0) {
      console.log('   No models found. Please pull a model first:');
      console.log('   ollama pull llama3.2\n');
      return;
    }
    
    models.forEach((model, index) => {
      console.log(`   ${index + 1}. ${model.name}`);
      console.log(`      Size: ${model.size}`);
      console.log(`      Modified: ${model.modified_at}`);
      console.log(`      Digest: ${model.digest.substring(0, 12)}...`);
    });
    console.log();

    // Get current model information
    console.log('🔍 Current Model Information:');
    try {
      const modelInfo = await client.getModelInfo();
      console.log(`   Name: ${modelInfo.name}`);
      console.log(`   Size: ${modelInfo.size}`);
      console.log(`   Parameters: ${modelInfo.parameters}`);
      console.log(`   Quantization: ${modelInfo.quantization}`);
      console.log(`   Family: ${modelInfo.family}`);
      console.log(`   Modified: ${modelInfo.modified_at}`);
      console.log(`   Digest: ${modelInfo.digest.substring(0, 12)}...\n`);
    } catch (error) {
      console.log(`   ❌ Error getting model info: ${error.message}\n`);
    }

    // Switch to a different model if available
    if (models.length > 1) {
      const alternativeModel = models.find(m => m.name !== client.config.model)?.name;
      if (alternativeModel) {
        console.log(`🔄 Switching to alternative model: ${alternativeModel}`);
        try {
          await client.switchModel(alternativeModel);
          console.log(`   ✅ Successfully switched to ${alternativeModel}\n`);
          
          // Get info for the new model
          const newModelInfo = await client.getModelInfo();
          console.log(`   New model: ${newModelInfo.name} (${newModelInfo.size})\n`);
          
          // Switch back to original model
          await client.switchModel(models[0].name);
          console.log(`   ✅ Switched back to ${models[0].name}\n`);
        } catch (error) {
          console.log(`   ❌ Error switching model: ${error.message}\n`);
        }
      }
    }

    // ============================================================================
    // FEATURE 3: ADVANCED CONFIGURATION
    // ============================================================================
    console.log('⚙️  Advanced Configuration...');
    
    const currentConfig = client.getCurrentConfig();
    console.log('📋 Current Configuration:');
    console.log(`   Base URL: ${currentConfig.baseURL}`);
    console.log(`   Model: ${currentConfig.model}`);
    console.log(`   Temperature: ${currentConfig.temperature}`);
    console.log(`   Max Tokens: ${currentConfig.maxTokens}`);
    console.log('   Ollama-Specific Options:');
    Object.entries(currentConfig.ollama_options).forEach(([key, value]) => {
      console.log(`     ${key}: ${value}`);
    });
    console.log();

    // ============================================================================
    // FEATURE 4: STREAMING SUPPORT
    // ============================================================================
    console.log('🌊 Streaming Chat Demo...');
    
    const stream = await client.streamChat('Write a short story about a robot learning to paint', {
      model: client.config.model,
      temperature: 0.8,
      maxTokens: 200
    });

    let streamedContent = '';
    let chunkCount = 0;

    console.log('   Streaming response:\n   ');

    return new Promise((resolve) => {
      stream.on('data', (chunk) => {
        if (chunk.done) {
          console.log(`\n   ✅ Stream complete!`);
          console.log(`   Final content: ${chunk.final_content}`);
          console.log(`   Total tokens: ${chunk.total_tokens}`);
        } else {
          process.stdout.write(chunk.content);
          streamedContent += chunk.content;
          chunkCount++;
        }
      });

      stream.on('end', (final) => {
        console.log(`\n   📊 Stream Summary:`);
        console.log(`   Chunks received: ${chunkCount}`);
        console.log(`   Total content length: ${streamedContent.length} characters`);
        console.log(`   Model used: ${final.model}`);
        console.log(`   Input tokens: ${final.usage.input_tokens}`);
        console.log(`   Output tokens: ${final.usage.output_tokens}\n`);
        resolve();
      });

      stream.on('error', (error) => {
        console.log(`\n   ❌ Stream error: ${error.message}\n`);
        resolve();
      });
    });

  } catch (error) {
    console.error('❌ Error during demo:', error.message);
    console.error(error.stack);
  }
}

// ============================================================================
// FEATURE 5: INTERACTIVE MODEL SWITCHING DEMO
// ============================================================================

async function interactiveModelSwitching() {
  console.log('🎮 Interactive Model Switching Demo\n');
  
  const client = new LLMClient({
    provider: 'ollama',
    config: {
      baseURL: 'http://localhost:11434',
      model: 'llama3.2'
    }
  });

  try {
    // Check health first
    if (!(await client.isHealthy())) {
      console.log('❌ Ollama is not available. Please ensure it\'s running.\n');
      return;
    }

    // List available models
    const models = await client.listModels();
    if (models.length === 0) {
      console.log('❌ No models available. Please pull a model first.\n');
      return;
    }

    console.log('📋 Available models:');
    models.forEach((model, index) => {
      console.log(`   ${index + 1}. ${model.name} (${model.size})`);
    });
    console.log();

    // Test each model with a simple prompt
    for (const model of models.slice(0, 3)) { // Test first 3 models
      console.log(`🧪 Testing model: ${model.name}`);
      
      try {
        // Switch to the model
        await client.switchModel(model.name);
        
        // Test with a simple prompt
        const result = await client.chat('Say "Hello" in one word', {
          maxTokens: 10,
          temperature: 0.1
        });
        
        console.log(`   Response: "${result.content.trim()}"`);
        console.log(`   Tokens: ${result.usage?.output_tokens || 'N/A'}\n`);
        
      } catch (error) {
        console.log(`   ❌ Error: ${error.message}\n`);
      }
    }

    // Switch back to original model
    await client.switchModel(models[0].name);
    console.log(`✅ Switched back to ${models[0].name}\n`);

  } catch (error) {
    console.error('❌ Error during interactive demo:', error.message);
  }
}

// ============================================================================
// FEATURE 6: PERFORMANCE MONITORING DEMO
// ============================================================================

async function performanceMonitoring() {
  console.log('📊 Performance Monitoring Demo\n');
  
  const client = new LLMClient({
    provider: 'ollama',
    config: {
      baseURL: 'http://localhost:11434',
      model: 'llama3.2'
    }
  });

  try {
    if (!(await client.isHealthy())) {
      console.log('❌ Ollama is not available.\n');
      return;
    }

    const testPrompts = [
      'Hello',
      'What is 2+2?',
      'Write a haiku about coding',
      'Explain quantum computing in simple terms'
    ];

    console.log('🧪 Running performance tests...\n');

    for (const prompt of testPrompts) {
      const startTime = Date.now();
      
      try {
        const result = await client.chat(prompt, { maxTokens: 100 });
        const endTime = Date.now();
        const responseTime = endTime - startTime;
        
        console.log(`📝 Prompt: "${prompt}"`);
        console.log(`   Response: "${result.content.trim()}"`);
        console.log(`   Response Time: ${responseTime}ms`);
        console.log(`   Input Tokens: ${result.usage?.input_tokens || 'N/A'}`);
        console.log(`   Output Tokens: ${result.usage?.output_tokens || 'N/A'}`);
        console.log(`   Tokens/Second: ${result.usage?.output_tokens ? Math.round((result.usage.output_tokens / responseTime) * 1000) : 'N/A'}\n`);
        
      } catch (error) {
        console.log(`   ❌ Error: ${error.message}\n`);
      }
    }

  } catch (error) {
    console.error('❌ Error during performance demo:', error.message);
  }
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================

async function main() {
  console.log('🎯 Ollama Advanced Features Comprehensive Demo\n');
  console.log('This demo showcases all the new features added to the Ollama provider.\n');

  try {
    // Run the main feature demonstration
    await demonstrateOllamaFeatures();
    
    console.log('\n' + '='.repeat(60) + '\n');
    
    // Run interactive model switching demo
    await interactiveModelSwitching();
    
    console.log('\n' + '='.repeat(60) + '\n');
    
    // Run performance monitoring demo
    await performanceMonitoring();
    
    console.log('🎉 Demo completed successfully!');
    console.log('\n📚 Features demonstrated:');
    console.log('   ✅ Health Monitoring & Availability');
    console.log('   ✅ Model Management (list, switch, info)');
    console.log('   ✅ Streaming Support (real-time chat)');
    console.log('   ✅ Advanced Configuration Options');
    console.log('   ✅ Performance Monitoring');
    console.log('   ✅ Interactive Model Switching');
    
  } catch (error) {
    console.error('\n❌ Demo failed:', error.message);
    process.exit(1);
  }
}

// Run the demo if this file is executed directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  demonstrateOllamaFeatures,
  interactiveModelSwitching,
  performanceMonitoring
};
