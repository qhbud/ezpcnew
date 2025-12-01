const { MongoClient } = require('mongodb');

const uri = 'mongodb://localhost:27017';
const client = new MongoClient(uri);

async function checkRamPricing() {
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');

    const db = client.db('pcbuilder');
    const ramsCollection = db.collection('rams');

    const totalRams = await ramsCollection.countDocuments();

    // Count RAMs with price history
    const withPriceHistory = await ramsCollection.countDocuments({
      priceHistory: { $exists: true, $not: { $size: 0 } }
    });

    // Count RAMs with valid current price
    const withCurrentPrice = await ramsCollection.countDocuments({
      currentPrice: { $exists: true, $ne: null, $gt: 0 }
    });

    // Count RAMs that are available
    const availableRams = await ramsCollection.countDocuments({
      isAvailable: true
    });

    // Count RAMs that are unavailable
    const unavailableRams = await ramsCollection.countDocuments({
      isAvailable: false
    });

    // Count RAMs with source URLs
    const withSourceUrl = await ramsCollection.countDocuments({
      sourceUrl: { $exists: true, $ne: null, $ne: '' }
    });

    console.log('\n📊 RAM PRICING STATISTICS:');
    console.log('='.repeat(60));
    console.log(`Total RAMs: ${totalRams}`);
    console.log(`RAMs with source URLs: ${withSourceUrl}`);
    console.log(`RAMs with price history: ${withPriceHistory}`);
    console.log(`RAMs with valid current price: ${withCurrentPrice}`);
    console.log(`Available RAMs: ${availableRams}`);
    console.log(`Unavailable RAMs: ${unavailableRams}`);

    // Get some examples of RAMs without prices
    const noPriceRams = await ramsCollection.find({
      $or: [
        { currentPrice: { $exists: false } },
        { currentPrice: null },
        { currentPrice: { $lte: 0 } }
      ]
    }).limit(10).toArray();

    console.log('\n⚠️ SAMPLE RAMs WITHOUT VALID PRICES:');
    console.log('='.repeat(60));
    noPriceRams.forEach((ram, index) => {
      console.log(`\n${index + 1}. ${ram.name || ram.title}`);
      console.log(`   Current Price: ${ram.currentPrice}`);
      console.log(`   Base Price: ${ram.basePrice}`);
      console.log(`   Available: ${ram.isAvailable}`);
      console.log(`   Has Source URL: ${!!ram.sourceUrl}`);
      console.log(`   Price History Length: ${ram.priceHistory?.length || 0}`);
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.close();
  }
}

checkRamPricing().catch(console.error);
