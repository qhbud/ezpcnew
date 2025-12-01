const { connectToDatabase, getDatabase } = require('../config/database');

async function clearGpuData() {
    try {
        console.log('🔌 Connecting to database...');
        await connectToDatabase();
        const db = getDatabase();
        
        console.log('🧹 Clearing GPU data from database...');
        
        // Get all collections that start with "gpus"
        const collections = await db.listCollections().toArray();
        const gpuCollections = collections.filter(col => col.name.startsWith('gpus'));
        
        let totalDeleted = 0;
        
        for (const collection of gpuCollections) {
            const collectionName = collection.name;
            try {
                const count = await db.collection(collectionName).countDocuments();
                if (count > 0) {
                    await db.collection(collectionName).deleteMany({});
                    console.log(`   ✅ Cleared ${count} GPUs from ${collectionName}`);
                    totalDeleted += count;
                } else {
                    console.log(`   ⚪ ${collectionName} was already empty`);
                }
            } catch (error) {
                console.error(`   ❌ Error clearing ${collectionName}:`, error.message);
            }
        }
        
        console.log(`\\n🎉 GPU data cleanup complete!`);
        console.log(`   📊 Total GPUs removed: ${totalDeleted}`);
        console.log(`   🗂️  Collections cleared: ${gpuCollections.length}`);
        
        // Show remaining stats
        const stats = {};
        const remainingCollections = ['cpus', 'motherboards', 'rams', 'storages', 'psus', 'cases', 'coolers'];
        for (const collectionName of remainingCollections) {
            try {
                const count = await db.collection(collectionName).countDocuments();
                stats[collectionName] = count;
            } catch (error) {
                stats[collectionName] = 0;
            }
        }
        
        console.log('\\n📈 Remaining database stats:');
        Object.entries(stats).forEach(([collection, count]) => {
            console.log(`   ${collection}: ${count}`);
        });
        
    } catch (error) {
        console.error('❌ Error clearing GPU data:', error);
    }
}

if (require.main === module) {
    clearGpuData()
        .then(() => process.exit(0))
        .catch((error) => {
            console.error('💥 Failed to clear GPU data:', error);
            process.exit(1);
        });
}

module.exports = { clearGpuData };