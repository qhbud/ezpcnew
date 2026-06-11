const { connectToDatabase, getDatabase } = require('../config/database');

async function purgeAllCPUCollections() {
  try {
    console.log('🔌 Connecting to database...');
    await connectToDatabase();
    const db = getDatabase();

    // All CPUs now live in the single `cpus` collection (migrated from per-model
    // cpus_* subcollections). Purge by clearing the documents, not dropping the
    // collection, so its indexes are preserved.
    console.log('🔍 Counting CPUs in the cpus collection...');
    const cpuCollection = db.collection('cpus');
    const totalCPUs = await cpuCollection.countDocuments();

    console.log(`📊 cpus: ${totalCPUs} CPUs`);

    if (totalCPUs === 0) {
      console.log('✅ No CPUs found to purge');
      return;
    }

    console.log(`\n🗑️  About to purge ${totalCPUs} CPUs from the cpus collection`);
    console.log('⚠️  This action cannot be undone!');
    console.log('💡 GPU collections will remain untouched');

    // Clear all CPU documents (do NOT drop the collection)
    const result = await cpuCollection.deleteMany({});
    console.log(`✅ Deleted ${result.deletedCount} CPUs from cpus`);

    console.log('\n🎉 CPU purge completed!');
    console.log('💡 GPU data remains safe and untouched');
    console.log('💡 You can now run CPU import scripts to get fresh data');

  } catch (error) {
    console.error('❌ Error during CPU purge:', error);
  }
}

// Run if called directly
if (require.main === module) {
  purgeAllCPUCollections()
    .then(() => {
      console.log('\n🏁 CPU purge process finished');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 CPU purge failed:', error);
      process.exit(1);
    });
}

module.exports = { purgeAllCPUCollections };