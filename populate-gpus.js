#!/usr/bin/env node

// Simple wrapper for GPU Data Populator
// Usage: node populate-gpus.js "RTX 4070" "https://amazon.com/..."

const { GPUDataPopulator } = require('./scripts/gpuDataPopulator');

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length < 2) {
    console.log('🚀 GPU Data Populator');
    console.log('=====================\n');
    console.log('Usage: node populate-gpus.js "CARD_NAME" "SOURCE_URL"');
    console.log('Example: node populate-gpus.js "RTX 4070" "https://amazon.com/nvidia-geforce-rtx-4070"');
    console.log('');
    console.log('Or run without arguments for interactive mode: node populate-gpus.js');
    process.exit(1);
  }
  
  const cardName = args[0];
  const url = args[1];
  
  console.log(`🎯 GPU Data Populator - Command Line Mode`);
  console.log(`🔍 Card: ${cardName}`);
  console.log(`🌐 URL: ${url}`);
  console.log('');
  
  const populator = new GPUDataPopulator();
  
  try {
    await populator.connect();
    await populator.initBrowser();
    
    await populator.populateGPUData(url, cardName);
    
    console.log('✅ GPU population completed successfully!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await populator.closeBrowser();
  }
}

if (require.main === module) {
  main().catch(console.error);
}
