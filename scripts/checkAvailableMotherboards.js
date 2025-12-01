const { MongoClient } = require('mongodb');

async function checkAvailableMotherboards() {
    const client = await MongoClient.connect('mongodb://localhost:27017');
    const db = client.db('pcbuilder');

    try {
        const total = await db.collection('motherboards').countDocuments();

        const available = await db.collection('motherboards').countDocuments({
            isAvailable: { $ne: false }
        });

        const unavailable = await db.collection('motherboards').countDocuments({
            isAvailable: false
        });

        console.log('Motherboard Availability:');
        console.log(`  Total: ${total}`);
        console.log(`  Available: ${available}`);
        console.log(`  Unavailable: ${unavailable}`);

        // Show some sample motherboards
        const samples = await db.collection('motherboards').find({}).limit(10).toArray();
        console.log('\nSample motherboards:');
        samples.forEach((mb, i) => {
            console.log(`  ${i + 1}. ${mb.name || mb.title} - Available: ${mb.isAvailable !== false ? 'YES' : 'NO'}`);
        });

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await client.close();
    }
}

checkAvailableMotherboards();
