const { MongoClient } = require('mongodb');

const uri = 'mongodb://localhost:27017';
const client = new MongoClient(uri);

async function checkTr5Coolers() {
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB\n');

    const db = client.db('pcbuilder');
    const collection = db.collection('coolers');

    const coolers = await collection.find({
      name: { $in: ['SilverStone XE360-TR5 Liquid CPU Cooler', 'Noctua NH-D9 TR5-SP6'] }
    }).toArray();

    console.log('TR5 Coolers Data:\n');
    coolers.forEach(cooler => {
      console.log('Name:', cooler.name);
      console.log('Title:', cooler.title);
      console.log('Amazon URL:', cooler.amazonUrl);
      console.log('Image URL:', cooler.imageUrl);
      console.log('Price:', cooler.currentPrice);
      console.log('---\n');
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.close();
  }
}

checkTr5Coolers();
