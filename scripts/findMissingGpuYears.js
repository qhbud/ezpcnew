require('dotenv').config();
const { MongoClient } = require('mongodb');

async function findMissingGpuYears() {
    const uri = process.env.MONGODB_URI;
    const client = new MongoClient(uri);

    try {
        await client.connect();
        console.log('✅ Connected to MongoDB\n');

        const db = client.db(process.env.DB_NAME || 'pcbuilder');

        // Find all GPU collections
        const collections = await db.listCollections().toArray();
        const gpuCollections = collections
            .filter(col => col.name === 'gpus' || col.name.startsWith('gpus_'))
            .map(col => col.name);

        console.log('GPUs missing release year:\n');

        for (const collectionName of gpuCollections) {
            const collection = db.collection(collectionName);

            // Find GPUs without releaseYear
            const missingYear = await collection.find({
                $or: [
                    { releaseYear: { $exists: false } },
                    { releaseYear: null }
                ]
            }).toArray();

            if (missingYear.length > 0) {
                console.log(`\n${collectionName}:`);
                missingYear.forEach(gpu => {
                    console.log(`  - ${gpu.name || gpu.title}`);
                });
            }
        }

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await client.close();
    }
}

findMissingGpuYears();
