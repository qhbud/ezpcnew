const { MongoClient } = require('mongodb');
require('dotenv').config();

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/pcbuilder';

async function removeGpusWithoutPrices() {
    const client = new MongoClient(uri);

    try {
        await client.connect();
        console.log('Connected to MongoDB\n');

        const db = client.db('pcbuilder');

        // Get all GPU collections
        const gpuCollections = await db.listCollections({ name: /^gpus_/ }).toArray();
        const collections = ['gpus', ...gpuCollections.map(c => c.name)];

        let totalRemoved = 0;

        console.log('=== Removing GPUs Without Prices ===\n');

        for (const collectionName of collections) {
            try {
                const collection = db.collection(collectionName);

                // Find GPUs without valid prices
                const gpusWithoutPrice = await collection.find({
                    $and: [
                        {
                            $or: [
                                { currentPrice: { $exists: false } },
                                { currentPrice: null },
                                { currentPrice: 0 },
                                { currentPrice: '' }
                            ]
                        },
                        {
                            $or: [
                                { price: { $exists: false } },
                                { price: null },
                                { price: 0 },
                                { price: '' }
                            ]
                        }
                    ]
                }).toArray();

                if (gpusWithoutPrice.length > 0) {
                    console.log(`\n${collectionName}:`);

                    for (const gpu of gpusWithoutPrice) {
                        const name = gpu.name || gpu.title || 'Unnamed';
                        console.log(`  Removing: ${name}`);
                    }

                    // Remove them
                    const result = await collection.deleteMany({
                        $and: [
                            {
                                $or: [
                                    { currentPrice: { $exists: false } },
                                    { currentPrice: null },
                                    { currentPrice: 0 },
                                    { currentPrice: '' }
                                ]
                            },
                            {
                                $or: [
                                    { price: { $exists: false } },
                                    { price: null },
                                    { price: 0 },
                                    { price: '' }
                                ]
                            }
                        ]
                    });

                    console.log(`  ✓ Removed ${result.deletedCount} GPUs`);
                    totalRemoved += result.deletedCount;
                }

            } catch (err) {
                console.error(`Error processing ${collectionName}: ${err.message}`);
            }
        }

        console.log(`\n\n=== SUMMARY ===`);
        console.log(`Total GPUs removed: ${totalRemoved}`);
        console.log(`\nAll GPUs in database now have valid prices!`);

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await client.close();
        console.log('\nDisconnected from MongoDB');
    }
}

removeGpusWithoutPrices();
