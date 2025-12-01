const { connectToDatabase, getDatabase } = require('../config/database');

async function purgeAllGPUCollections() {
  try {
    console.log('🔌 Connecting to database...');
    await connectToDatabase();
    const db = getDatabase();
    
    // Get all collections that start with "gpus"
    console.log('🔍 Finding all GPU collections...');
    const collections = await db.listCollections({ name: /^gpus/ }).toArray();
    const gpuCollectionNames = collections.map(col => col.name);
    
    console.log(`📋 Found ${gpuCollectionNames.length} GPU collections:`);
    gpuCollectionNames.forEach(name => console.log(`   - ${name}`));
    
    if (gpuCollectionNames.length === 0) {
      console.log('✅ No GPU collections found to purge');
      return;
    }
    
    // Count total GPUs before purging
    let totalGPUs = 0;
    for (const collectionName of gpuCollectionNames) {
      const count = await db.collection(collectionName).countDocuments();
      totalGPUs += count;
      console.log(`📊 ${collectionName}: ${count} GPUs`);
    }
    
    console.log(`\n🗑️  About to purge ${totalGPUs} GPUs from ${gpuCollectionNames.length} collections`);
    console.log('⚠️  This action cannot be undone!');
    
    // Drop all GPU collections
    for (const collectionName of gpuCollectionNames) {
      try {
        await db.collection(collectionName).drop();
        console.log(`✅ Dropped collection: ${collectionName}`);
      } catch (error) {
        console.log(`⚠️  Could not drop ${collectionName}: ${error.message}`);
      }
    }
    
    console.log('\n🎉 GPU purge completed!');
    console.log('💡 You can now run the import script to recalculate fresh data');
    
  } catch (error) {
    console.error('❌ Error during GPU purge:', error);
  }
}

// Run if called directly
if (require.main === module) {
  purgeAllGPUCollections()
    .then(() => {
      console.log('\n🏁 Purge process finished');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Purge failed:', error);
      process.exit(1);
    });
}

module.exports = { purgeAllGPUCollections };