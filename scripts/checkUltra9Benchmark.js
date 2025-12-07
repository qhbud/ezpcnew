require('dotenv').config();
const { MongoClient } = require('mongodb');

async function checkCpuBenchmark() {
    const uri = process.env.MONGODB_URI;
    const client = new MongoClient(uri);

    try {
        await client.connect();
        console.log('✅ Connected to MongoDB\n');

        const db = client.db(process.env.DB_NAME || 'pcbuilder');

        // Find all collections
        const collections = await db.listCollections().toArray();
        const cpuCollections = collections
            .filter(col => col.name === 'cpus' || col.name.startsWith('cpus_'))
            .map(col => col.name);

        // Search for Intel Core Ultra 9 285K across all collections
        for (const collectionName of cpuCollections) {
            const collection = db.collection(collectionName);
            const cpu = await collection.findOne({ name: /Ultra 9 285K/i });

            if (cpu) {
                console.log(`Found in ${collectionName}:`);
                console.log(`Name: ${cpu.name}`);
                console.log(`singleThreadScore: ${cpu.singleThreadScore}`);
                console.log(`multiThreadScore: ${cpu.multiThreadScore}`);
                console.log(`singleCorePerformance: ${cpu.singleCorePerformance}`);
                console.log(`multiThreadPerformance: ${cpu.multiThreadPerformance}`);
                console.log(`performance: ${cpu.performance}`);
                console.log(`hasBenchmark: ${cpu.hasBenchmark}`);
                console.log('');
            }
        }

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await client.close();
    }
}

checkCpuBenchmark();
