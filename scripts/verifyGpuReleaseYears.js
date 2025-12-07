require('dotenv').config();
const { MongoClient } = require('mongodb');

async function verifyGpuReleaseYears() {
    const uri = process.env.MONGODB_URI;
    const client = new MongoClient(uri);

    try {
        await client.connect();
        console.log('✅ Connected to MongoDB\n');

        const db = client.db(process.env.DB_NAME || 'pcbuilder');
        const gpuCollection = db.collection('gpus');

        // Check RTX 5090
        const rtx5090 = await gpuCollection.findOne({ name: /5090/i });
        console.log('RTX 5090 sample:');
        if (rtx5090) {
            console.log('  Name:', rtx5090.name);
            console.log('  Title:', rtx5090.title);
            console.log('  Release Year:', rtx5090.releaseYear);
        } else {
            console.log('  Not found in main gpus collection');
        }

        // Check all collections
        const collections = await db.listCollections().toArray();
        const gpuCollections = collections
            .filter(col => col.name === 'gpus' || col.name.startsWith('gpus_'))
            .map(col => col.name);

        console.log('\n📂 Checking all GPU collections for RTX 5090:');
        for (const collectionName of gpuCollections) {
            const collection = db.collection(collectionName);
            const gpu = await collection.findOne({
                $or: [
                    { name: /5090/i },
                    { title: /5090/i }
                ]
            });

            if (gpu) {
                console.log(`\nFound in ${collectionName}:`);
                console.log('  Name:', gpu.name || gpu.title);
                console.log('  Release Year:', gpu.releaseYear);
            }
        }

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await client.close();
    }
}

verifyGpuReleaseYears();
