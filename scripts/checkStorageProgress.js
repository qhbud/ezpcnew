const { MongoClient } = require('mongodb');

async function checkProgress() {
    const client = await MongoClient.connect('mongodb://localhost:27017');
    const db = client.db('pcbuilder');

    const withHistory = await db.collection('storages').countDocuments({
        priceHistory: { $exists: true, $ne: [] }
    });

    const total = 551;
    console.log('Storages with price history:', withHistory);
    console.log('Storages remaining:', total - withHistory);
    console.log(`Progress: ${Math.round((withHistory/total)*100)}%`);

    await client.close();
}

checkProgress().catch(console.error);
