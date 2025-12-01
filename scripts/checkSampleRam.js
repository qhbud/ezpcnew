const { MongoClient } = require('mongodb');

const uri = 'mongodb://localhost:27017';
const client = new MongoClient(uri);

async function checkSampleRam() {
  try {
    await client.connect();

    const db = client.db('pcbuilder');

    // Get a RAM with valid price and price history
    const ramWithHistory = await db.collection('rams').findOne({
      currentPrice: { $gt: 0 },
      isAvailable: true,
      priceHistory: { $exists: true, $not: { $size: 0 } }
    });

    console.log('\n✅ SAMPLE RAM WITH PRICE HISTORY:');
    console.log('='.repeat(60));
    if (ramWithHistory) {
      console.log('Name:', ramWithHistory.name || ramWithHistory.title);
      console.log('Current Price:', ramWithHistory.currentPrice);
      console.log('Base Price:', ramWithHistory.basePrice);
      console.log('Sale Price:', ramWithHistory.salePrice);
      console.log('Is Available:', ramWithHistory.isAvailable);
      console.log('Price History Entries:', ramWithHistory.priceHistory?.length || 0);

      if (ramWithHistory.priceHistory && ramWithHistory.priceHistory.length > 0) {
        console.log('\nPrice History Data:');
        ramWithHistory.priceHistory.slice(0, 3).forEach((entry, i) => {
          console.log(`  [${i}] Date: ${entry.date}, Price: ${entry.price || entry.currentPrice}, Available: ${entry.isAvailable}`);
        });
      }
    } else {
      console.log('No RAM found with price history');
    }

    // Get a RAM with valid price but NO price history
    const ramWithoutHistory = await db.collection('rams').findOne({
      currentPrice: { $gt: 0 },
      isAvailable: true,
      $or: [
        { priceHistory: { $exists: false } },
        { priceHistory: { $size: 0 } }
      ]
    });

    console.log('\n\n📊 SAMPLE RAM WITHOUT PRICE HISTORY (but with current price):');
    console.log('='.repeat(60));
    if (ramWithoutHistory) {
      console.log('Name:', ramWithoutHistory.name || ramWithoutHistory.title);
      console.log('Current Price:', ramWithoutHistory.currentPrice);
      console.log('Base Price:', ramWithoutHistory.basePrice);
      console.log('Sale Price:', ramWithoutHistory.salePrice);
      console.log('Is Available:', ramWithoutHistory.isAvailable);
      console.log('Has Price History:', !!ramWithoutHistory.priceHistory);
      console.log('Price History Length:', ramWithoutHistory.priceHistory?.length || 0);
    } else {
      console.log('No RAM found without price history');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.close();
  }
}

checkSampleRam().catch(console.error);
