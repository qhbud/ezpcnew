const { MongoClient } = require('mongodb');

const uri = 'mongodb://localhost:27017';
const client = new MongoClient(uri);

async function findAllSamsung() {
    try {
        await client.connect();
        console.log('Connected to MongoDB');

        const db = client.db('pcparts');

        // Get all collection names
        const collections = await db.listCollections().toArray();
        console.log('All collections:', collections.map(c => c.name));

        // Check storages collection
        const storagesCollection = db.collection('storages');
        const allStorages = await storagesCollection.find({}).limit(10).toArray();
        console.log('\nFirst 10 storage items:');
        allStorages.forEach(item => {
            console.log(`- ${item.name || item.title} | ${item.manufacturer} | ${item.price}`);
        });

        // Search for Samsung with price $199.99
        const samsung199 = await storagesCollection.find({
            $or: [
                { price: 199.99 },
                { price: '$199.99' },
                { price: '199.99' }
            ]
        }).toArray();

        console.log('\nItems with price $199.99:', JSON.stringify(samsung199, null, 2));

        // Search for Samsung manufacturer
        const samsungItems = await storagesCollection.find({
            manufacturer: { $regex: /samsung/i }
        }).toArray();

        console.log('\nAll Samsung items:', JSON.stringify(samsungItems, null, 2));

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await client.close();
        console.log('\nDisconnected from MongoDB');
    }
}

findAllSamsung();
