require('dotenv').config();
const { MongoClient } = require('mongodb');

async function verifyCpuData() {
    const uri = process.env.MONGODB_URI;
    const client = new MongoClient(uri);

    try {
        await client.connect();
        console.log('✅ Connected to MongoDB');

        const db = client.db(process.env.DB_NAME || 'pcbuilder');
        const cpuCollection = db.collection('cpus');

        // Get a few sample CPUs to see what data they have
        const sampleCpus = await cpuCollection.find({}).limit(5).toArray();

        console.log('\n📊 Sample CPU data:\n');
        sampleCpus.forEach((cpu, index) => {
            console.log(`\nCPU ${index + 1}: ${cpu.name}`);
            console.log(`  singleCorePerformance: ${cpu.singleCorePerformance || 'NOT SET'}`);
            console.log(`  multiThreadPerformance: ${cpu.multiThreadPerformance || 'NOT SET'}`);
            console.log(`  All fields:`, Object.keys(cpu));
        });

        // Count all CPUs
        const totalCpus = await cpuCollection.countDocuments({});
        console.log(`\n\n📈 Total CPUs: ${totalCpus}`);

        // Count CPUs with performance data
        const withPerformance = await cpuCollection.countDocuments({
            $or: [
                { singleCorePerformance: { $exists: true } },
                { multiThreadPerformance: { $exists: true } }
            ]
        });
        console.log(`📊 CPUs with performance data: ${withPerformance}`);

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await client.close();
    }
}

verifyCpuData();
