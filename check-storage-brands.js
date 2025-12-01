const { MongoClient } = require('mongodb');
const colors = require('colors');

const uri = 'mongodb://localhost:27017';
const client = new MongoClient(uri);

async function checkStorageBrands() {
    try {
        await client.connect();
        console.log('✅ Connected to MongoDB\n'.green);

        const db = client.db('pcbuilder');
        const storages = db.collection('storages');

        // Get all storage devices
        const allStorages = await storages.find({}).toArray();

        console.log(`Found ${allStorages.length} total storage devices\n`.cyan);

        // Check for Toshiba in name or title
        const toshibaByName = allStorages.filter(s => {
            const name = (s.name || s.title || '').toLowerCase();
            return name.includes('toshiba');
        });

        console.log(`Found ${toshibaByName.length} with "toshiba" in name/title\n`.yellow);

        if (toshibaByName.length > 0) {
            console.log('Toshiba devices found:'.cyan.bold);
            console.log('═'.repeat(70).cyan);

            let needsMarking = [];

            toshibaByName.forEach(hdd => {
                const priceHistoryLength = hdd.priceHistory ? hdd.priceHistory.length : 0;
                const name = hdd.name || hdd.title || 'Unknown';
                const brand = hdd.brand || 'no brand field';

                console.log(`\n${name}`.cyan);
                console.log(`   Brand field: ${brand}`.gray);
                console.log(`   Price History Snapshots: ${priceHistoryLength}`.yellow);
                console.log(`   Current Price: $${hdd.price || hdd.currentPrice || '0.00'}`.gray);

                if (priceHistoryLength <= 1) {
                    console.log(`   ⚠️  NEEDS MARKING (≤1 snapshot)`.red);
                    needsMarking.push(hdd._id);
                } else {
                    console.log(`   ✓ OK (${priceHistoryLength} snapshots)`.green);
                }
            });

            console.log('\n' + '═'.repeat(70).yellow);
            console.log(`Components needing marking: ${needsMarking.length}`.yellow.bold);
            console.log('═'.repeat(70).yellow + '\n');

            if (needsMarking.length > 0) {
                console.log('Marking components for retry...\n'.cyan);

                const result = await storages.updateMany(
                    { _id: { $in: needsMarking } },
                    {
                        $set: {
                            updateFailed: true,
                            lastUpdateError: 'Insufficient price history - marked for priority update',
                            lastUpdateAttempt: new Date()
                        }
                    }
                );

                console.log(`✅ Marked ${result.modifiedCount} components for retry\n`.green.bold);
            } else {
                console.log('✓ All Toshiba components have sufficient price history\n'.green);
            }
        } else {
            // Show sample of what brands exist
            console.log('No Toshiba found. Sample of existing brands:'.yellow);
            const brands = [...new Set(allStorages.slice(0, 20).map(s => s.brand || 'undefined'))];
            brands.forEach(b => console.log(`   - ${b}`.gray));
        }

    } catch (error) {
        console.error('❌ Error:'.red, error);
    } finally {
        await client.close();
        console.log('Disconnected from MongoDB\n'.gray);
    }
}

checkStorageBrands();
