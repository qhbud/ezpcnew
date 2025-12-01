const { MongoClient } = require('mongodb');

const uri = 'mongodb://localhost:27017';
const client = new MongoClient(uri);

async function removeSamsung() {
    try {
        await client.connect();
        console.log('Connected to MongoDB');

        const db = client.db('pcbuilder'); // Correct database name
        const storagesCollection = db.collection('storages');

        // First, let's find Samsung items with price around $199.99
        console.log('\nSearching for Samsung items with price $199.99...');
        const samsungItems = await storagesCollection.find({
            manufacturer: { $regex: /samsung/i },
            price: { $gte: 199, $lte: 200 }
        }).toArray();

        console.log('Found items:', JSON.stringify(samsungItems, null, 2));

        // Also search by name containing 970 EVO
        console.log('\nSearching for 970 EVO items...');
        const evoItems = await storagesCollection.find({
            $or: [
                { name: { $regex: /970.*evo/i } },
                { title: { $regex: /970.*evo/i } }
            ]
        }).toArray();

        console.log('Found 970 EVO items:', JSON.stringify(evoItems, null, 2));

        // Delete Samsung 970 EVO Plus 2TB
        console.log('\nAttempting to delete...');
        const result = await storagesCollection.deleteMany({
            $or: [
                { name: { $regex: /970.*evo.*plus.*2tb/i } },
                { title: { $regex: /970.*evo.*plus.*2tb/i } }
            ]
        });

        console.log('Delete result:', result);

        if (result.deletedCount > 0) {
            console.log(`Successfully removed ${result.deletedCount} item(s)`);
        } else {
            console.log('No items deleted - trying broader search...');

            // Try deleting any Samsung with that exact price
            const broadResult = await storagesCollection.deleteOne({
                manufacturer: { $regex: /samsung/i },
                price: 199.99
            });

            console.log('Broad delete result:', broadResult);
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await client.close();
        console.log('\nDisconnected from MongoDB');
    }
}

removeSamsung();
