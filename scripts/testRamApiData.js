const { MongoClient } = require('mongodb');

const uri = 'mongodb://localhost:27017';
const client = new MongoClient(uri);

async function testRamData() {
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');

    const db = client.db('pcbuilder');
    const collection = db.collection('rams');

    // Get one RAM with price history
    const ram = await collection.findOne({
      priceHistory: { $exists: true, $not: { $size: 0 } }
    });

    console.log('\n📊 SAMPLE RAM WITH PRICE HISTORY:');
    console.log('='.repeat(60));

    if (ram) {
      console.log('\nName:', ram.name || ram.title);
      console.log('Current Price:', ram.currentPrice);
      console.log('Has priceHistory field:', !!ram.priceHistory);
      console.log('Price History Length:', ram.priceHistory?.length || 0);

      if (ram.priceHistory && ram.priceHistory.length > 0) {
        console.log('\nFirst 3 price history entries:');
        ram.priceHistory.slice(0, 3).forEach((entry, i) => {
          console.log(`  [${i}] Date: ${entry.date}, Price: ${entry.price}, Available: ${entry.isAvailable}`);
        });
      }

      console.log('\n\n📋 ALL FIELDS IN THIS RAM DOCUMENT:');
      console.log('='.repeat(60));
      console.log(Object.keys(ram).join(', '));

      console.log('\n\n🔍 FULL RAM OBJECT (first 5 fields):');
      console.log('='.repeat(60));
      const firstFields = Object.keys(ram).slice(0, 5);
      firstFields.forEach(key => {
        const value = ram[key];
        const displayValue = typeof value === 'object' ? JSON.stringify(value).substring(0, 100) : value;
        console.log(`${key}: ${displayValue}`);
      });

      // Now test what the API would return
      console.log('\n\n🌐 SIMULATING API RESPONSE:');
      console.log('='.repeat(60));

      // Simulate what server.js does
      const ramModules = await collection.find({}).toArray();

      ramModules.forEach(ram => {
        ram.collection = 'rams';
        ram.category = 'rams';
      });

      // Find the same RAM in the array
      const sameRam = ramModules.find(r => r._id.toString() === ram._id.toString());

      if (sameRam) {
        console.log('Same RAM found in array returned by find({}).toArray()');
        console.log('Has priceHistory in array result:', !!sameRam.priceHistory);
        console.log('Price History Length:', sameRam.priceHistory?.length || 0);
        console.log('\nAll fields:', Object.keys(sameRam).join(', '));
      }

    } else {
      console.log('No RAM found with price history');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.close();
  }
}

testRamData().catch(console.error);
