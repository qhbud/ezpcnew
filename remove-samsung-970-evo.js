const { MongoClient } = require('mongodb');

const uri = 'mongodb://localhost:27017';
const client = new MongoClient(uri);

async function removeSamsungSSD() {
    try {
        await client.connect();
        console.log('Connected to MongoDB');

        const db = client.db('pcparts');
        const storagesCollection = db.collection('storages');

        // Find and remove the Samsung 970 EVO Plus 2TB
        const result = await storagesCollection.deleteOne({
            name: { $regex: /Samsung 970 EVO Plus 2TB/i }
        });

        console.log('Delete result:', result);

        if (result.deletedCount > 0) {
            console.log('Successfully removed Samsung 970 EVO Plus 2TB');
        } else {
            console.log('Samsung 970 EVO Plus 2TB not found');

            // Try finding with title field
            const titleResult = await storagesCollection.deleteOne({
                title: { $regex: /Samsung 970 EVO Plus 2TB/i }
            });

            console.log('Delete by title result:', titleResult);

            if (titleResult.deletedCount > 0) {
                console.log('Successfully removed Samsung 970 EVO Plus 2TB using title field');
            }
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await client.close();
        console.log('Disconnected from MongoDB');
    }
}

removeSamsungSSD();
