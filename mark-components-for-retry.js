const { MongoClient } = require('mongodb');
const colors = require('colors');

const uri = 'mongodb://localhost:27017';
const client = new MongoClient(uri);

async function markComponentsForRetry() {
    try {
        await client.connect();
        console.log('✅ Connected to MongoDB\n'.green);

        const db = client.db('pcbuilder');

        // Get all collections
        const allCollections = await db.listCollections().toArray();
        const collectionNames = allCollections.map(col => col.name);

        // Get all CPU collections
        const cpuCollections = collectionNames.filter(name =>
            name === 'cpus' || name.startsWith('cpus_')
        );

        // Get all GPU collections
        const gpuCollections = collectionNames.filter(name =>
            name === 'gpus' || name.startsWith('gpus_')
        );

        // Get other component collections
        const otherCollections = ['motherboards', 'rams', 'psus', 'coolers', 'storages']
            .filter(name => collectionNames.includes(name));

        // Combine all collections
        const componentCollections = [...cpuCollections, ...gpuCollections, ...otherCollections];

        console.log(`Found ${componentCollections.length} component collections to process`.cyan);
        console.log(`   CPU collections: ${cpuCollections.length}`.gray);
        console.log(`   GPU collections: ${gpuCollections.length}`.gray);
        console.log(`   Other collections: ${otherCollections.length}\n`.gray);

        let totalMarked = 0;
        let collectionStats = {};

        for (const collectionName of componentCollections) {
            const collection = db.collection(collectionName);

            // Find components with 2 or fewer price history entries
            // Also include components with no priceHistory field
            const query = {
                $or: [
                    { priceHistory: { $exists: false } },
                    { priceHistory: { $size: 0 } },
                    { priceHistory: { $size: 1 } },
                    { priceHistory: { $size: 2 } }
                ]
            };

            const componentsToMark = await collection.find(query).toArray();

            console.log(`📦 ${collectionName.toUpperCase()}`.cyan.bold);
            console.log(`   Found ${componentsToMark.length} components with ≤2 price snapshots`.yellow);

            if (componentsToMark.length > 0) {
                // Mark all these components for retry
                const result = await collection.updateMany(
                    query,
                    {
                        $set: {
                            updateFailed: true,
                            lastUpdateError: 'Insufficient price history - marked for priority update',
                            lastUpdateAttempt: new Date()
                        }
                    }
                );

                console.log(`   ✅ Marked ${result.modifiedCount} components for retry\n`.green);
                totalMarked += result.modifiedCount;
                collectionStats[collectionName] = result.modifiedCount;
            } else {
                console.log(`   ✓ No components need marking\n`.gray);
                collectionStats[collectionName] = 0;
            }
        }

        // Final summary
        console.log('═'.repeat(70).green);
        console.log('📊 SUMMARY'.green.bold);
        console.log('═'.repeat(70).green);
        console.log(`Total collections processed: ${componentCollections.length}`.white);
        console.log(`Total components marked for retry: ${totalMarked}`.green.bold);
        console.log('═'.repeat(70).green + '\n');

        // Detailed breakdown
        console.log('📋 DETAILED BREAKDOWN:'.cyan.bold);
        console.log('─'.repeat(70).cyan);

        // CPU Collections
        if (cpuCollections.length > 0) {
            console.log('\n💻 CPU COLLECTIONS:'.white.bold);
            cpuCollections.forEach(name => {
                const count = collectionStats[name] || 0;
                console.log(`   ${name.padEnd(30)} ${count} marked`.gray);
            });
        }

        // GPU Collections
        if (gpuCollections.length > 0) {
            console.log('\n🎮 GPU COLLECTIONS:'.white.bold);
            gpuCollections.forEach(name => {
                const count = collectionStats[name] || 0;
                console.log(`   ${name.padEnd(30)} ${count} marked`.gray);
            });
        }

        // Other Collections
        if (otherCollections.length > 0) {
            console.log('\n🔧 OTHER COMPONENTS:'.white.bold);
            otherCollections.forEach(name => {
                const count = collectionStats[name] || 0;
                console.log(`   ${name.padEnd(30)} ${count} marked`.gray);
            });
        }

        console.log('\n' + '═'.repeat(70).green);
        console.log('✅ All components marked successfully!'.green.bold);
        console.log('   Run the price updater to retry these components first.'.cyan);
        console.log('═'.repeat(70).green + '\n');

    } catch (error) {
        console.error('❌ Error:'.red, error);
    } finally {
        await client.close();
        console.log('Disconnected from MongoDB\n'.gray);
    }
}

markComponentsForRetry();
