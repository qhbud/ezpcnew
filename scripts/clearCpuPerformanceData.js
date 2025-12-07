require('dotenv').config();
const { MongoClient } = require('mongodb');

async function clearCpuPerformanceData() {
    const uri = process.env.MONGODB_URI;
    const client = new MongoClient(uri);

    try {
        await client.connect();
        console.log('✅ Connected to MongoDB');

        const db = client.db(process.env.DB_NAME || 'pcbuilder');
        const cpuCollection = db.collection('cpus');

        // Count CPUs with performance data before clearing
        const beforeCount = await cpuCollection.countDocuments({
            $or: [
                { singleCorePerformance: { $exists: true } },
                { multiThreadPerformance: { $exists: true } }
            ]
        });

        console.log(`📊 Found ${beforeCount} CPUs with performance data`);

        // Clear the performance data fields
        const result = await cpuCollection.updateMany(
            {},
            {
                $unset: {
                    singleCorePerformance: "",
                    multiThreadPerformance: ""
                }
            }
        );

        console.log(`\n✅ Successfully cleared performance data:`);
        console.log(`   - Matched: ${result.matchedCount} documents`);
        console.log(`   - Modified: ${result.modifiedCount} documents`);

        // Verify the data has been cleared
        const afterCount = await cpuCollection.countDocuments({
            $or: [
                { singleCorePerformance: { $exists: true } },
                { multiThreadPerformance: { $exists: true } }
            ]
        });

        console.log(`\n📊 CPUs with performance data after clearing: ${afterCount}`);

        if (afterCount === 0) {
            console.log('🎉 All CPU performance data has been successfully cleared!');
        }

    } catch (error) {
        console.error('❌ Error clearing CPU performance data:', error);
        throw error;
    } finally {
        await client.close();
        console.log('\n🔌 Disconnected from MongoDB');
    }
}

clearCpuPerformanceData()
    .then(() => {
        console.log('\n✨ Operation completed successfully');
        process.exit(0);
    })
    .catch(error => {
        console.error('\n💥 Operation failed:', error);
        process.exit(1);
    });
