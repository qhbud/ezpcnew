const { connectToDatabase, getDatabase } = require('../config/database');

async function purgeAllCPUCollections() {
  try {
    console.log('🔌 Connecting to database...');
    await connectToDatabase();
    const db = getDatabase();
    
    // Get all collections that start with "cpus"
    console.log('🔍 Finding all CPU collections...');
    const collections = await db.listCollections({ name: /^cpus/ }).toArray();
    const cpuCollectionNames = collections.map(col => col.name);
    
    console.log(`📋 Found ${cpuCollectionNames.length} CPU collections:`);
    cpuCollectionNames.forEach(name => console.log(`   - ${name}`));
    
    if (cpuCollectionNames.length === 0) {
      console.log('✅ No CPU collections found to purge');
      return;
    }
    
    // Count total CPUs before purging
    let totalCPUs = 0;
    for (const collectionName of cpuCollectionNames) {
      const count = await db.collection(collectionName).countDocuments();
      totalCPUs += count;
      console.log(`📊 ${collectionName}: ${count} CPUs`);
    }
    
    console.log(`\n🗑️  About to purge ${totalCPUs} CPUs from ${cpuCollectionNames.length} collections`);
    console.log('⚠️  This action cannot be undone!');
    console.log('💡 GPU collections will remain untouched');
    
    // Drop all CPU collections
    for (const collectionName of cpuCollectionNames) {
      try {
        await db.collection(collectionName).drop();
        console.log(`✅ Dropped collection: ${collectionName}`);
      } catch (error) {
        console.log(`⚠️  Could not drop ${collectionName}: ${error.message}`);
      }
    }
    
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