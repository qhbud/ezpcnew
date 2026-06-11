const { connectToDatabase, getDatabase } = require('../config/database');

async function purgeAllGPUCollections() {
  try {
    console.log('🔌 Connecting to database...');
    await connectToDatabase();
    const db = getDatabase();
    
    // All GPUs now live in the single `gpus` collection (per-model group preserved
    // in each doc's `modelCollection` field).
    console.log('🔍 Inspecting the GPU collection...');
    const gpusCollection = db.collection('gpus');

    // Count total GPUs before purging, broken down by model group for visibility
    const modelGroups = await gpusCollection.distinct('modelCollection');
    let totalGPUs = 0;
    for (const modelCollection of modelGroups) {
      const count = await gpusCollection.countDocuments({ modelCollection });
      totalGPUs += count;
      console.log(`📊 ${modelCollection}: ${count} GPUs`);
    }
    // Include any docs without a modelCollection value
    totalGPUs = await gpusCollection.countDocuments();

    if (totalGPUs === 0) {
      console.log('✅ No GPUs found to purge');
      return;
    }

    console.log(`\n🗑️  About to purge ${totalGPUs} GPUs from the 'gpus' collection (${modelGroups.length} model groups)`);
    console.log('⚠️  This action cannot be undone!');

    // Clear all documents from the single `gpus` collection (do NOT drop the collection itself)
    const result = await gpusCollection.deleteMany({});
    console.log(`✅ Cleared ${result.deletedCount} GPUs from the 'gpus' collection`);

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