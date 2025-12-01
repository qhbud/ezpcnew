const { MongoClient } = require('mongodb');

const uri = 'mongodb://localhost:27017';
const client = new MongoClient(uri);

async function listCoolerNames() {
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB\n');

    const db = client.db('pcbuilder');
    const collection = db.collection('coolers');

    const coolers = await collection.find({}).toArray();

    console.log(`CPU Cooler Names (${coolers.length} total):\n`);
    console.log('='.repeat(100));

    coolers.forEach((cooler, i) => {
      const name = cooler.name || cooler.title || 'Unnamed';
      console.log(`${i + 1}. ${name}`);
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    await client.close();
    console.log('\n✅ Database connection closed');
  }
}

listCoolerNames()
  .then(() => {
    console.log('✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
