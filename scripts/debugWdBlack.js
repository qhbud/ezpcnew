const { MongoClient } = require('mongodb');

async function debugWdBlack() {
    const client = await MongoClient.connect('mongodb://localhost:27017');
    const db = client.db('pcbuilder');

    try {
        // Find WD_BLACK items with missing data
        const items = await db.collection('storages').find({
            $and: [
                {
                    $or: [
                        { manufacturer: /WD.*BLACK/i },
                        { brand: /WD.*BLACK/i },
                        { name: /WD.*BLACK/i }
                    ]
                },
                {
                    $or: [
                        { type: null },
                        { type: '' },
                        { type: '-' },
                        { type: { $exists: false } },
                        { capacity: null },
                        { capacity: 0 },
                        { capacity: { $exists: false } }
                    ]
                }
            ]
        }).limit(2).toArray();

        console.log(`Found ${items.length} items with missing data\n`);

        items.forEach((item, i) => {
            console.log(`\n=== Item ${i + 1} ===`);
            console.log(JSON.stringify(item, null, 2));
        });

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await client.close();
    }
}

debugWdBlack();
