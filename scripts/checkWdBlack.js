const { MongoClient } = require('mongodb');

async function checkWdBlack() {
    const client = await MongoClient.connect('mongodb://localhost:27017');
    const db = client.db('pcbuilder');

    try {
        const items = await db.collection('storages').find({
            $or: [
                { manufacturer: /WD.*BLACK/i },
                { brand: /WD.*BLACK/i },
                { name: /WD.*BLACK/i }
            ]
        }).limit(5).toArray();

        console.log(`Found ${items.length} WD_BLACK items\n`);

        items.forEach((item, i) => {
            console.log(`--- Item ${i + 1} ---`);
            console.log('Name:', item.name);
            console.log('Type:', item.type);
            console.log('Capacity:', item.capacity);
            console.log('Form Factor:', item.formFactor);
            console.log('Interface:', item.interface);
            console.log('Price:', item.price || item.salePrice || item.currentPrice || item.basePrice);
            console.log('');
        });

        // Count total with missing data
        const totalWdBlack = await db.collection('storages').countDocuments({
            $or: [
                { manufacturer: /WD.*BLACK/i },
                { brand: /WD.*BLACK/i },
                { name: /WD.*BLACK/i }
            ]
        });

        const missingType = await db.collection('storages').countDocuments({
            $and: [
                {
                    $or: [
                        { manufacturer: /WD.*BLACK/i },
                        { brand: /WD.*BLACK/i },
                        { name: /WD.*BLACK/i }
                    ]
                },
                {
                    $or: [{ type: null }, { type: '' }, { type: '-' }, { type: { $exists: false } }]
                }
            ]
        });

        const missingCapacity = await db.collection('storages').countDocuments({
            $and: [
                {
                    $or: [
                        { manufacturer: /WD.*BLACK/i },
                        { brand: /WD.*BLACK/i },
                        { name: /WD.*BLACK/i }
                    ]
                },
                {
                    $or: [{ capacity: null }, { capacity: 0 }, { capacity: { $exists: false } }]
                }
            ]
        });

        console.log('Summary:');
        console.log(`Total WD_BLACK items: ${totalWdBlack}`);
        console.log(`Missing type: ${missingType}`);
        console.log(`Missing capacity: ${missingCapacity}`);

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await client.close();
    }
}

checkWdBlack();
