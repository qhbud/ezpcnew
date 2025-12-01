const { MongoClient } = require('mongodb');
require('dotenv').config();

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/pcbuilder';

async function checkNames() {
    const client = new MongoClient(uri);
    await client.connect();
    const db = client.db('pcbuilder');

    const gpus = await db.collection('gpus_rtx_4090').find({}).toArray();

    console.log('\nRTX 4090 GPUs in database:\n');
    gpus.forEach((g, i) => {
        const name = g.name || g.title || 'Unknown';
        console.log(`  ${i+1}. ${name}`);
    });

    await client.close();
}

checkNames().catch(console.error);
