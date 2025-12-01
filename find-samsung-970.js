const { MongoClient } = require('mongodb');

const uri = 'mongodb://localhost:27017';
const client = new MongoClient(uri);

async function findSamsung970() {
    try {
        await client.connect();
        console.log('Connected to MongoDB');

        const db = client.db('pcparts');
        const storagesCollection = db.collection('storages');

        // Find Samsung 970
        const results = await storagesCollection.find({
            $or: [
                { name: { $regex: /970/i } },
                { title: { $regex: /970/i } }
            ]
        }).toArray();

        console.log('Found items:', JSON.stringify(results, null, 2));

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await client.close();
        console.log('Disconnected from MongoDB');
    }
}

findSamsung970();
