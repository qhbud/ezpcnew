const { MongoClient } = require('mongodb');

async function listMissingCapacity() {
    const client = await MongoClient.connect('mongodb://localhost:27017');
    const db = client.db('pcbuilder');

    try {
        const items = await db.collection('storages').find({
            $or: [
                { capacity: null },
                { capacity: 0 },
                { capacity: { $exists: false } }
            ]
        }).limit(20).toArray();

        console.log(`Items missing capacity: ${items.length}\n`);

        items.forEach((item, i) => {
            console.log(`--- ${i + 1} ---`);
            console.log('Name:', item.name);
            console.log('Type:', item.type || item.storageType || 'N/A');
            if (item.url) {
                console.log('URL:', item.url.substring(0, 100) + '...');
            }
            console.log('');
        });

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await client.close();
    }
}

listMissingCapacity();
