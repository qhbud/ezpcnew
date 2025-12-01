const { MongoClient } = require('mongodb');

const uri = 'mongodb://localhost:27017';
const client = new MongoClient(uri);

async function removeSASHDDs() {
    try {
        await client.connect();
        console.log('Connected to MongoDB');

        const db = client.db('pcbuilder');
        const storagesCollection = db.collection('storages');

        // Find all SAS HDDs
        console.log('Searching for SAS HDDs...\n');
        const sasHDDs = await storagesCollection.find({
            type: 'SAS HDD'
        }).toArray();

        console.log(`Found ${sasHDDs.length} SAS HDDs:\n`);
        sasHDDs.forEach((item, index) => {
            console.log(`${index + 1}. ${item.name}`);
            console.log(`   Type: ${item.type}`);
            console.log(`   Price: $${item.price}`);
            console.log('');
        });

        if (sasHDDs.length > 0) {
            console.log('\nRemoving all SAS HDDs from database...\n');

            const result = await storagesCollection.deleteMany({
                type: 'SAS HDD'
            });

            console.log(`Successfully removed ${result.deletedCount} SAS HDD(s) from the database`);
        } else {
            console.log('No SAS HDDs found.');
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await client.close();
        console.log('\nDisconnected from MongoDB');
    }
}

removeSASHDDs();
