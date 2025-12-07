require('dotenv').config();
const { MongoClient } = require('mongodb');

async function checkAllCpuFields() {
    const uri = process.env.MONGODB_URI;
    const client = new MongoClient(uri);

    try {
        await client.connect();
        console.log('✅ Connected to MongoDB');

        const db = client.db(process.env.DB_NAME || 'pcbuilder');
        const cpuCollection = db.collection('cpus');

        // Find CPUs with any performance-related fields
        const cpuWithPerformance = await cpuCollection.findOne({
            $or: [
                { singleThreadScore: { $exists: true } },
                { multiThreadScore: { $exists: true } },
                { singleCorePerformance: { $exists: true } },
                { multiThreadPerformance: { $exists: true } },
                { performanceScore: { $exists: true } }
            ]
        });

        if (cpuWithPerformance) {
            console.log('\n📊 Found CPU with performance data:');
            console.log('Name:', cpuWithPerformance.name);
            console.log('singleThreadScore:', cpuWithPerformance.singleThreadScore);
            console.log('multiThreadScore:', cpuWithPerformance.multiThreadScore);
            console.log('singleCorePerformance:', cpuWithPerformance.singleCorePerformance);
            console.log('multiThreadPerformance:', cpuWithPerformance.multiThreadPerformance);
            console.log('performanceScore:', cpuWithPerformance.performanceScore);
        } else {
            console.log('\n✅ No CPUs found with any performance-related fields');
        }

        // Get one specific CPU
        const ryzen5600x = await cpuCollection.findOne({ name: /5600X/i });
        if (ryzen5600x) {
            console.log('\n📊 AMD Ryzen 5 5600X data:');
            console.log(JSON.stringify(ryzen5600x, null, 2));
        }

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await client.close();
    }
}

checkAllCpuFields();
