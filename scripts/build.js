#!/usr/bin/env node

/**
 * Simple build script for the Easy LLM Client
 * This script validates the project and prepares it for release
 */

const fs = require('fs');
const path = require('path');

console.log('🏗️  Building Easy LLM Client...');

// Check if essential files exist
const essentialFiles = [
  'src/llm-client.js',
  'src/providers/base-provider.js',
  'src/providers/anthropic-provider.js',
  'src/providers/openai-compatible-provider.js',
  'src/providers/ollama-provider.js',
  'package.json',
  'README.md'
];

console.log('📁 Checking essential files...');
essentialFiles.forEach(file => {
  if (fs.existsSync(file)) {
    console.log(`✅ ${file}`);
  } else {
    console.error(`❌ ${file} - Missing!`);
    process.exit(1);
  }
});

// Check if tests pass
console.log('🧪 Running tests...');
const { execSync } = require('child_process');
try {
  execSync('npm test', { stdio: 'inherit' });
  console.log('✅ All tests passed');
} catch (error) {
  console.error('❌ Tests failed');
  process.exit(1);
}

console.log('🎉 Build completed successfully!');
console.log('📦 Ready for release');
