const { MongoClient } = require('mongodb');

const uri = 'mongodb://localhost:27017';
const client = new MongoClient(uri);

async function checkPriceHistoryLength() {
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB\n');

    const db = client.db('pcbuilder');

    const collections = ['cpus', 'motherboards', 'gpus', 'rams'];

    for (const collectionName of collections) {
      const collection = db.collection(collectionName);

      console.log(`\n${'='.repeat(60)}`);
      console.log(`📊 ${collectionName.toUpperCase()}`);
      console.log('='.repeat(60));

      // Get all items with priceHistory
      const items = await collection.find({
        priceHistory: { $exists: true }
      }).toArray();

      if (items.length === 0) {
        console.log('⚠️ No items with priceHistory found');
        continue;
      }

      // Count items by priceHistory length
      const lengthCounts = {};
      items.forEach(item => {
        const length = item.priceHistory?.length || 0;
        lengthCounts[length] = (lengthCounts[length] || 0) + 1;
      });

      console.log(`Total items with priceHistory: ${items.length}`);
      console.log('\nPrice history length distribution:');

      Object.keys(lengthCounts)
        .sort((a, b) => parseInt(a) - parseInt(b))
        .forEach(length => {
          console.log(`  ${length} data points: ${lengthCounts[length]} items`);
        });

      // Show a sample item
      const sampleItem = items.find(item => item.priceHistory && item.priceHistory.length > 0);
      if (sampleItem) {
        console.log(`\n📋 Sample item: ${sampleItem.name || sampleItem.title}`);
        console.log(`   Price history length: ${sampleItem.priceHistory.length}`);
        if (sampleItem.priceHistory.length > 0) {
          console.log(`   First entry: ${sampleItem.priceHistory[0].date} - $${sampleItem.priceHistory[0].price}`);
          console.log(`   Last entry: ${sampleItem.priceHistory[sampleItem.priceHistory.length - 1].date} - $${sampleItem.priceHistory[sampleItem.priceHistory.length - 1].price}`);
        }
      }
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    await client.close();
    console.log('\n\n✅ Database connection closed');
  }
}

checkPriceHistoryLength()
  .then(() => {
    console.log('✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
