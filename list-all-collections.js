require('dotenv').config();
const mongoose = require('mongoose');

async function listAllCollections() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB\n');

        const db = mongoose.connection.db;

        console.log('═══════════════════════════════════════════════════════════════════════════');
        console.log('ALL COLLECTIONS IN DATABASE');
        console.log('═══════════════════════════════════════════════════════════════════════════\n');

        const collections = await db.listCollections().toArray();

        console.log(`Total collections: ${collections.length}\n`);

        for (const collection of collections) {
            const count = await db.collection(collection.name).countDocuments();
            const icon = count > 0 ? '✅' : '❌';
            console.log(`${icon} ${collection.name.padEnd(30)} - ${count.toString().padStart(6)} documents`);
        }

        // Specifically check for GPU collections
        console.log('\n═══════════════════════════════════════════════════════════════════════════');
        console.log('GPU COLLECTIONS (collections starting with "gpus")');
        console.log('═══════════════════════════════════════════════════════════════════════════\n');

        const gpuCollections = await db.listCollections({ name: /^gpus/ }).toArray();

        if (gpuCollections.length > 0) {
            console.log(`Found ${gpuCollections.length} GPU collection(s):\n`);
            for (const collection of gpuCollections) {
                const count = await db.collection(collection.name).countDocuments();
                console.log(`  ✅ ${collection.name} - ${count} GPUs`);

                if (count > 0) {
                    // Get a sample
                    const sample = await db.collection(collection.name).findOne({});
                    console.log(`      Sample: ${sample.name?.substring(0, 60)}...`);
                    console.log(`      Price: $${sample.price || sample.currentPrice}`);
                }
                console.log('');
            }
        } else {
            console.log('❌ No GPU collections found (collections starting with "gpus")\n');
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error(error);
    } finally {
        await mongoose.connection.close();
        console.log('✅ Database connection closed');
    }
}

listAllCollections();
