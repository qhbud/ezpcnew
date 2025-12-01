const { MongoClient } = require('mongodb');
const colors = require('colors');

const uri = 'mongodb://localhost:27017';
const client = new MongoClient(uri);

async function checkToshibaSnapshots() {
    try {
        await client.connect();
        console.log('✅ Connected to MongoDB\n'.green);

        const db = client.db('pcbuilder');
        const storages = db.collection('storages');

        // Find all Toshiba hard drives
        const toshibaHDDs = await storages.find({
            brand: { $regex: /toshiba/i }
        }).toArray();

        console.log(`Found ${toshibaHDDs.length} Toshiba storage devices\n`.cyan);

        let needsMarking = [];

        toshibaHDDs.forEach(hdd => {
            const priceHistoryLength = hdd.priceHistory ? hdd.priceHistory.length : 0;
            const name = hdd.name || hdd.title || 'Unknown';

            console.log(`${name}`.cyan);
            console.log(`   Price History Snapshots: ${priceHistoryLength}`.yellow);
            console.log(`   Current Price: $${hdd.price || hdd.currentPrice || '0.00'}`.gray);

            if (priceHistoryLength <= 1) {
                console.log(`   ⚠️  NEEDS MARKING (≤1 snapshot)\n`.red);
                needsMarking.push(hdd._id);
            } else {
                console.log(`   ✓ OK\n`.green);
            }
        });

        console.log('═'.repeat(70).yellow);
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

    } catch (error) {
        console.error('❌ Error:'.red, error);
    } finally {
        await client.close();
        console.log('Disconnected from MongoDB\n'.gray);
    }
}

checkToshibaSnapshots();
