const { MongoClient } = require('mongodb');

async function checkCapacityTypes() {
    const client = await MongoClient.connect('mongodb://localhost:27017');
    const db = client.db('pcbuilder');

    try {
        // Find storage items where capacity contains "TB" or "GB" as a string
        const items = await db.collection('storages').find({
            $or: [
                { capacity: /TB/i },
                { capacity: /GB/i }
            ]
        }).limit(10).toArray();

        console.log(`Found ${items.length} items with string capacity values\n`);

        items.forEach((item, i) => {
            console.log(`--- ${i + 1} ---`);
            console.log('Name:', item.name.substring(0, 60));
            console.log('Capacity:', item.capacity, '(Type:', typeof item.capacity + ')');
            console.log('');
        });

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await client.close();
    }
}

checkCapacityTypes();
