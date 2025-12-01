const { MongoClient } = require('mongodb');

const uri = 'mongodb://localhost:27017';
const client = new MongoClient(uri);

async function checkOtherCoolers() {
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB\n');

    const db = client.db('pcbuilder');
    const collection = db.collection('coolers');

    // Get a few existing coolers to see their field names
    const coolers = await collection.find({}).limit(3).toArray();

    console.log('Sample Cooler Data:\n');
    coolers.forEach(cooler => {
      console.log('Name:', cooler.name);
      console.log('All fields:', Object.keys(cooler));
      console.log('URL fields:', {
        amazonUrl: cooler.amazonUrl,
        url: cooler.url,
        link: cooler.link,
        productUrl: cooler.productUrl
      });
      console.log('---\n');
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.close();
  }
}

checkOtherCoolers();
