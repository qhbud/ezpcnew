const { MongoClient } = require('mongodb');

const uri = 'mongodb://localhost:27017';
const client = new MongoClient(uri);

async function listAllCpus() {
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB\n');

    const db = client.db('pcbuilder');
    const collection = db.collection('cpus');

    const cpus = await collection.find({}).toArray();

    console.log(`Found ${cpus.length} CPUs in database:\n`);

    cpus.forEach((cpu, i) => {
      const historyLength = cpu.priceHistory?.length || 0;
      console.log(`${i + 1}. ${cpu.name || cpu.title || 'Unnamed'} - Price: $${cpu.currentPrice} - History: ${historyLength} points`);
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    await client.close();
    console.log('\n✅ Database connection closed');
  }
}

listAllCpus()
  .then(() => {
    console.log('✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
