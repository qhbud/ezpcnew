const { connectToDatabase, getDatabase } = require('../config/database');

async function removeDuplicateCPUs() {
    try {
        console.log('🔌 Connecting to database...');
        await connectToDatabase();
        const db = getDatabase();
        
        console.log('🧹 Removing duplicate CPUs from database...');
        
        // Get all collections that contain CPUs
        const collections = ['cpus', 'cpus_intel_core_i9', 'cpus_intel_core_i7', 'cpus_intel_core_i5', 'cpus_amd_ryzen_9', 'cpus_amd_ryzen_7', 'cpus_amd_ryzen_5'];
        
        let totalDuplicatesRemoved = 0;
        
        for (const collectionName of collections) {
            try {
                console.log(`\n📂 Processing collection: ${collectionName}`);
                
                const cpus = await db.collection(collectionName).find({}).toArray();
                console.log(`   Found ${cpus.length} CPUs in collection`);
                
                if (cpus.length === 0) continue;
                
                // Group CPUs by name to find duplicates
                const cpuGroups = {};
                cpus.forEach(cpu => {
                    const key = cpu.name || cpu.title || 'Unknown';
                    if (!cpuGroups[key]) {
                        cpuGroups[key] = [];
                    }
                    cpuGroups[key].push(cpu);
                });
                
                // Find duplicates and keep the best version
                const idsToRemove = [];
                let duplicatesInCollection = 0;
                
                Object.entries(cpuGroups).forEach(([name, cpuList]) => {
                    if (cpuList.length > 1) {
                        console.log(`   🔍 Found ${cpuList.length} duplicates of: ${name}`);
                        
                        // Sort by preference: scraped data > enhanced data > test data
                        cpuList.sort((a, b) => {
                            const sourceOrder = { 'Amazon': 0, 'Enhanced Data': 1, 'Test Data': 2 };
                            const scoreA = sourceOrder[a.source] || 3;
                            const scoreB = sourceOrder[b.source] || 3;
                            return scoreA - scoreB;
                        });
                        
                        // Keep the first (best) one, mark others for removal
                        for (let i = 1; i < cpuList.length; i++) {
                            idsToRemove.push(cpuList[i]._id);
                            duplicatesInCollection++;
                        }
                        
                        console.log(`      ✅ Keeping: ${cpuList[0].source} version`);
                        console.log(`      🗑️  Removing: ${cpuList.length - 1} duplicates`);
                    }
                });
                
                // Remove duplicates
                if (idsToRemove.length > 0) {
                    const result = await db.collection(collectionName).deleteMany({
                        _id: { $in: idsToRemove }
                    });
                    console.log(`   ✅ Removed ${result.deletedCount} duplicate CPUs from ${collectionName}`);
                    totalDuplicatesRemoved += result.deletedCount;
                } else {
                    console.log(`   ✨ No duplicates found in ${collectionName}`);
                }
                
            } catch (error) {
                console.error(`   ❌ Error processing ${collectionName}:`, error.message);
            }
        }
        
        console.log(`\\n🎉 Duplicate removal complete!`);
        console.log(`   📊 Total duplicates removed: ${totalDuplicatesRemoved}`);
        
        // Show final stats
        const stats = {};
        for (const collectionName of collections) {
            try {
                const count = await db.collection(collectionName).countDocuments();
                stats[collectionName] = count;
            } catch (error) {
                stats[collectionName] = 0;
            }
        }
        
        console.log('\\n📈 Final CPU collection stats:');
        Object.entries(stats).forEach(([collection, count]) => {
            if (count > 0) {
                console.log(`   ${collection}: ${count} CPUs`);
            }
        });
        
        const totalUniqueCpus = Object.values(stats).reduce((sum, count) => sum + count, 0);
        console.log(`\\n📊 Total unique CPUs across all collections: ${totalUniqueCpus}`);
        
    } catch (error) {
        console.error('❌ Error removing duplicate CPUs:', error);
    }
}

if (require.main === module) {
    removeDuplicateCPUs()
        .then(() => process.exit(0))
        .catch((error) => {
            console.error('💥 Failed to remove duplicate CPUs:', error);
            process.exit(1);
        });
}

module.exports = { removeDuplicateCPUs };