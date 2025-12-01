const { AmazonGpuImporter } = require('./amazonGpuImporter');
const { connectToDatabase, getDatabase } = require('../config/database');

// Test with just one GPU chipset to avoid rate limits
async function testSingleGpu() {
  try {
    console.log('🧪 Testing single GPU import (RTX 4090)...\n');
    
    await connectToDatabase();
    const importer = new AmazonGpuImporter();
    
    // Test just RTX 4090
    const chipset = 'RTX 4090';
    const chipsetInfo = {
      searchTerms: ['RTX 4090', 'GeForce RTX 4090'],
      manufacturer: 'NVIDIA',
      architecture: 'Ada Lovelace',
      memorySize: 24,
      memoryType: 'GDDR6X'
    };
    
    console.log(`🔍 Searching for ${chipset} GPUs...`);
    const gpus = await importer.searchGpusByChipset(chipset, chipsetInfo);
    
    console.log(`✅ Found ${gpus.length} GPUs`);
    
    if (gpus.length > 0) {
      console.log('\n📋 Sample GPU data:');
      console.log(JSON.stringify(gpus[0], null, 2));
      
      console.log('\n💾 Inserting into database...');
      const db = getDatabase();
      const result = await db.collection('gpus').insertMany(gpus);
      console.log(`✅ Inserted ${result.insertedCount} GPUs`);
    }
    
    console.log('\n🎉 Single GPU test completed!');
    
  } catch (error) {
    if (error.message.includes('TooManyRequests')) {
      console.error('\n⏰ Rate limit hit. Amazon API allows limited requests.');
      console.error('Try again in a few minutes or consider using fewer search terms.');
    } else {
      console.error('\n❌ Test failed:', error.message);
    }
  }
}

testSingleGpu();