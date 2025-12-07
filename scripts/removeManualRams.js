require('dotenv').config();
const { MongoClient } = require('mongodb');

async function removeManualRams() {
    const uri = process.env.MONGODB_URI;
    const client = new MongoClient(uri);

    try {
        await client.connect();
        console.log('✅ Connected to MongoDB\n');

        const db = client.db(process.env.DB_NAME || 'pcbuilder');
        const ramCollection = db.collection('rams');

        // Delete all RAM modules that were manually added (detectionMethod: 'Manual')
        const result = await ramCollection.deleteMany({ detectionMethod: 'Manual' });

        console.log(`✅ Deleted ${result.deletedCount} manually added RAM modules`);

    } catch (error) {
        console.error('❌ Error:', error);
        throw error;
    } finally {
        await client.close();
        console.log('\n🔌 Disconnected from MongoDB');
    }
}

removeManualRams()
    .then(() => {
        console.log('\n✨ Manual RAM modules removed successfully');
        process.exit(0);
    })
    .catch(error => {
        console.error('\n💥 Operation failed:', error);
        process.exit(1);
    });
