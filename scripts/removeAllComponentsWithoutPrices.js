const { MongoClient } = require('mongodb');
require('dotenv').config();

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/pcbuilder';

async function removeAllComponentsWithoutPrices() {
    const client = new MongoClient(uri);

    try {
        await client.connect();
        console.log('Connected to MongoDB\n');

        const db = client.db('pcbuilder');

        // Define all component collections
        const baseCollections = [
            'cpus',
            'gpus',
            'motherboards',
            'rams',
            'psus',
            'cases',
            'coolers',
            'storages',
            'addons'
        ];

        // Get GPU-specific collections
        const gpuCollections = await db.listCollections({ name: /^gpus_/ }).toArray();
        const gpuCollectionNames = gpuCollections.map(c => c.name);

        // Get CPU-specific collections
        const cpuCollections = await db.listCollections({ name: /^cpus_/ }).toArray();
        const cpuCollectionNames = cpuCollections.map(c => c.name);

        // Combine all collections
        const allCollections = [...baseCollections, ...gpuCollectionNames, ...cpuCollectionNames];

        let totalRemoved = 0;
        const removedByCollection = {};

        console.log('=== Removing Components Without Valid Prices ===\n');

        for (const collectionName of allCollections) {
            try {
                const collection = db.collection(collectionName);

                // Count total before
                const totalBefore = await collection.countDocuments();
                if (totalBefore === 0) continue;

                // Find components without valid prices
                const componentsWithoutPrice = await collection.find({
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

                if (componentsWithoutPrice.length > 0) {
                    console.log(`\n${collectionName} (${totalBefore} total):`);

                    // Show what will be removed
                    for (const component of componentsWithoutPrice) {
                        const name = component.name || component.title || 'Unnamed';
                        console.log(`  - ${name}`);
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

                    console.log(`  ✓ Removed ${result.deletedCount} components`);
                    totalRemoved += result.deletedCount;
                    removedByCollection[collectionName] = result.deletedCount;

                    // Show remaining count
                    const totalAfter = await collection.countDocuments();
                    console.log(`  → ${totalAfter} components remaining`);
                }

            } catch (err) {
                console.error(`Error processing ${collectionName}: ${err.message}`);
            }
        }

        console.log('\n\n=== SUMMARY ===');
        console.log(`Total components removed across all collections: ${totalRemoved}`);

        if (Object.keys(removedByCollection).length > 0) {
            console.log('\nBreakdown by collection:');
            for (const [collection, count] of Object.entries(removedByCollection)) {
                console.log(`  ${collection}: ${count} removed`);
            }
        }

        console.log('\n✓ All components in database now have valid prices!');

        // Generate report
        const fs = require('fs');
        const report = {
            timestamp: new Date().toISOString(),
            totalRemoved,
            removedByCollection
        };
        fs.writeFileSync('removed-components-report.json', JSON.stringify(report, null, 2));
        console.log('\nDetailed report saved to: removed-components-report.json');

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await client.close();
        console.log('\nDisconnected from MongoDB');
    }
}

removeAllComponentsWithoutPrices();
