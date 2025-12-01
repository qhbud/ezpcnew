const { MongoClient } = require('mongodb');
require('dotenv').config();

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/pcbuilder';

async function checkFields() {
    const client = new MongoClient(uri);
    await client.connect();
    const db = client.db('pcbuilder');

    const gpus = await db.collection('gpus_rtx_4090').find({}).toArray();

    console.log('\nRTX 4090 GPU fields:\n');
    gpus.forEach((g, i) => {
        console.log(`GPU #${i+1}:`);
        console.log(`  name field: ${g.name || 'NOT SET'}`);
        console.log(`  title field: ${g.title || 'NOT SET'}`);
        console.log('');
    });

    await client.close();
}

checkFields().catch(console.error);
