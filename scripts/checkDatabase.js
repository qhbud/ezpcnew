const { MongoClient } = require('mongodb');
require('dotenv').config();

const uri = process.env.MONGODB_URI;

async function checkDatabase() {
    const client = new MongoClient(uri);

    try {
        await client.connect();
        console.log('Connected to MongoDB');
        console.log('URI:', uri.replace(/\/\/.*:.*@/, '//***:***@')); // Hide credentials

        const db = client.db('pcpartpicker');

        // Check collections
        const collections = await db.listCollections().toArray();
        console.log('\nAvailable collections:');
        collections.forEach(col => console.log(`  - ${col.name}`));

        // Count documents in each collection
        console.log('\nDocument counts:');
        for (const col of collections) {
            const count = await db.collection(col.name).countDocuments();
            console.log(`  - ${col.name}: ${count} documents`);
        }

        // Show a few cases
        console.log('\n=== Sample Cases (first 5) ===');
        const sampleCases = await db.collection('cases').find().limit(5).toArray();
        sampleCases.forEach(item => console.log(`  - ${item.name} | ${item.brand} | $${item.price}`));

        // Show a few storage items with large capacity
        console.log('\n=== Large Storage Items (>= 18TB) ===');
        const largeStorage = await db.collection('storage').find({
            type: 'HDD'
        }).sort({ price: -1 }).limit(10).toArray();
        largeStorage.forEach(item => console.log(`  - ${item.name} | ${item.capacity} | $${item.price}`));

        // Show WD storage items
        console.log('\n=== WD Storage Items (first 10, sorted by price desc) ===');
        const wdStorage = await db.collection('storage').find({
            brand: /WD/i
        }).sort({ price: -1 }).limit(10).toArray();
        wdStorage.forEach(item => console.log(`  - ${item.name} | ${item.capacity} | $${item.price}`));

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await client.close();
        console.log('\n\nDatabase connection closed');
    }
}

checkDatabase();
