const { MongoClient } = require('mongodb');

async function checkNullManufacturers() {
    const client = await MongoClient.connect('mongodb://localhost:27017');
    const db = client.db('pcbuilder');

    const samples = await db.collection('storages').find({
        manufacturer: null
    }).limit(15).toArray();

    console.log('\nSample items with null manufacturer:\n');
    samples.forEach((s, i) => {
        console.log(`${i + 1}. ${s.name.substring(0, 80)}`);
    });

    await client.close();
}

checkNullManufacturers();
