const { MongoClient } = require('mongodb');

const uri = 'mongodb://localhost:27017';
const client = new MongoClient(uri);

async function checkGpuNames() {
  try {
    await client.connect();
    const db = client.db('pcbuilder');
    const collection = db.collection('gpus');

    const gpus = await collection.find({}).limit(20).toArray();

    console.log('\nSample GPU names in database:\n');
    gpus.forEach((gpu, index) => {
      console.log(`${index + 1}. ${gpu.name || gpu.title}`);
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

checkGpuNames();
