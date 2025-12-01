const { MongoClient } = require('mongodb');

const uri = 'mongodb://localhost:27017';
const client = new MongoClient(uri);

async function listCoolers() {
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB\n');

    const db = client.db('pcbuilder');
    const collection = db.collection('coolers');

    const coolers = await collection.find({}).toArray();

    console.log(`Found ${coolers.length} CPU Coolers in database:\n`);
    console.log('='.repeat(100));

    coolers.forEach((cooler, i) => {
      const name = cooler.name || cooler.title || 'Unnamed';
      const type = cooler.coolerType || cooler.type || 'Unknown Type';
      const price = cooler.currentPrice || cooler.price || 'N/A';
      const manufacturer = cooler.manufacturer || 'Unknown';

      console.log(`${i + 1}. ${name}`);
      console.log(`   Type: ${type}`);
      console.log(`   Manufacturer: ${manufacturer}`);
      console.log(`   Price: $${price}`);
      console.log('');
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    await client.close();
    console.log('✅ Database connection closed');
  }
}

listCoolers()
  .then(() => {
    console.log('✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
