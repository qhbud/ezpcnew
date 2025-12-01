#!/usr/bin/env node

const { connectToDatabase, getDatabase } = require('./config/database');

async function clearGPUs() {
  try {
    console.log('🔌 Connecting to database...');
    await connectToDatabase();
    const db = getDatabase();
    
    // Get all collections
    const collections = await db.listCollections().toArray();
    const gpuCollections = collections.filter(col => col.name.startsWith('gpus_'));
    
    console.log(`🗑️ Found ${gpuCollections.length} GPU collections to clear:`);
    gpuCollections.forEach(col => console.log(`   - ${col.name}`));
    
    // Clear each GPU collection
    for (const collection of gpuCollections) {
      console.log(`\n🗑️ Clearing ${collection.name}...`);
      const result = await db.collection(collection.name).deleteMany({});
      console.log(`   ✅ Deleted ${result.deletedCount} GPUs from ${collection.name}`);
    }
    
    console.log('\n✅ All GPU collections cleared successfully!');
    
  } catch (error) {
    console.error('❌ Error clearing GPUs:', error);
  } finally {
    process.exit(0);
  }
}

clearGPUs();
