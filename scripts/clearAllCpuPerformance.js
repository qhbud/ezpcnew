require('dotenv').config();
const { MongoClient } = require('mongodb');

async function clearAllCpuPerformance() {
    const uri = process.env.MONGODB_URI;
    const client = new MongoClient(uri);

    try {
        await client.connect();
        console.log('✅ Connected to MongoDB');

        const db = client.db(process.env.DB_NAME || 'pcbuilder');

        // Find all collections that start with 'cpus'
        const collections = await db.listCollections().toArray();
        const cpuCollections = collections
            .filter(col => col.name === 'cpus' || col.name.startsWith('cpus_'))
            .map(col => col.name);

        console.log(`\n📂 Found ${cpuCollections.length} CPU collections:`);
        cpuCollections.forEach(name => console.log(`   - ${name}`));

        let totalCleared = 0;
        let totalModified = 0;

        for (const collectionName of cpuCollections) {
            console.log(`\n🔄 Processing ${collectionName}...`);

            const collection = db.collection(collectionName);

            // Count CPUs with ANY performance data before clearing
            const beforeCount = await collection.countDocuments({
                $or: [
                    { singleCorePerformance: { $exists: true } },
                    { multiThreadPerformance: { $exists: true } },
                    { singleThreadScore: { $exists: true } },
                    { multiThreadScore: { $exists: true } },
                    { performance: { $exists: true } },
                    { hasBenchmark: { $exists: true } }
                ]
            });

            if (beforeCount > 0) {
                console.log(`   Found ${beforeCount} CPUs with performance data`);

                // Clear ALL performance-related fields
                const result = await collection.updateMany(
                    {},
                    {
                        $unset: {
                            singleCorePerformance: "",
                            multiThreadPerformance: "",
                            singleThreadScore: "",
                            multiThreadScore: "",
                            performance: "",
                            hasBenchmark: ""
                        }
                    }
                );

                console.log(`   ✅ Modified: ${result.modifiedCount} documents`);
                totalCleared += beforeCount;
                totalModified += result.modifiedCount;
            } else {
                console.log(`   ℹ️  No performance data found`);
            }
        }

        console.log(`\n\n📊 SUMMARY:`);
        console.log(`   Total CPUs with performance data: ${totalCleared}`);
        console.log(`   Total documents modified: ${totalModified}`);

        // Verify the data has been cleared
        let remainingTotal = 0;
        for (const collectionName of cpuCollections) {
            const collection = db.collection(collectionName);
            const afterCount = await collection.countDocuments({
                $or: [
                    { singleCorePerformance: { $exists: true } },
                    { multiThreadPerformance: { $exists: true } },
                    { singleThreadScore: { $exists: true } },
                    { multiThreadScore: { $exists: true } },
                    { performance: { $exists: true } },
                    { hasBenchmark: { $exists: true } }
                ]
            });
            remainingTotal += afterCount;
        }

        console.log(`\n📊 CPUs with performance data after clearing: ${remainingTotal}`);

        if (remainingTotal === 0) {
            console.log('🎉 All CPU performance data has been successfully cleared across all collections!');
        } else {
            console.log(`⚠️  Warning: ${remainingTotal} CPUs still have performance data`);
        }

    } catch (error) {
        console.error('❌ Error clearing CPU performance data:', error);
        throw error;
    } finally {
        await client.close();
        console.log('\n🔌 Disconnected from MongoDB');
    }
}

clearAllCpuPerformance()
    .then(() => {
        console.log('\n✨ Operation completed successfully');
        process.exit(0);
    })
    .catch(error => {
        console.error('\n💥 Operation failed:', error);
        process.exit(1);
    });
