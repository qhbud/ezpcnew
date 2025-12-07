require('dotenv').config();
const { MongoClient } = require('mongodb');

async function removeSpecificRam() {
    const uri = process.env.MONGODB_URI;
    const client = new MongoClient(uri);

    try {
        await client.connect();
        console.log('Connected to MongoDB\n');

        const db = client.db(process.env.DB_NAME || 'pcbuilder');
        const ramCollection = db.collection('rams');

        // Search for the specific RAM - using partial match for the Synology replacement
        const ramToDelete = await ramCollection.findOne({
            $or: [
                { title: /Synology D4RD-2666-32G/i },
                { name: /Synology D4RD-2666-32G/i }
            ]
        });

        if (ramToDelete) {
            console.log('Found RAM module:');
            console.log(`Title: ${ramToDelete.title || ramToDelete.name}`);
            console.log(`ID: ${ramToDelete._id}`);
            console.log(`Price: $${ramToDelete.price || ramToDelete.currentPrice || ramToDelete.basePrice || 'N/A'}`);

            const result = await ramCollection.deleteOne({ _id: ramToDelete._id });
            console.log(`\nDeleted: ${result.deletedCount} RAM module`);

            const finalCount = await ramCollection.countDocuments();
            console.log(`Final RAM count: ${finalCount}`);
        } else {
            console.log('RAM module not found');
        }

    } catch (error) {
        console.error('Error:', error);
        throw error;
    } finally {
        await client.close();
    }
}

removeSpecificRam()
    .then(() => process.exit(0))
    .catch(error => {
        console.error('Operation failed:', error);
        process.exit(1);
    });
