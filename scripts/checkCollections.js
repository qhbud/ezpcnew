const { MongoClient } = require('mongodb');
require('dotenv').config();

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/pcbuilder';

async function checkCollections() {
    const client = new MongoClient(uri);
    await client.connect();
    const db = client.db('pcbuilder');

    const collections = await db.listCollections().toArray();

    console.log('\n📦 All collections in database:\n');

    for (const coll of collections) {
        const count = await db.collection(coll.name).countDocuments();
        console.log(`   ${coll.name}: ${count} items`);
    }

    await client.close();
}

checkCollections();
