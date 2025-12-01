const { MongoClient } = require('mongodb');

const uri = 'mongodb://localhost:27017';
const client = new MongoClient(uri);

async function removeZeroPriceRams() {
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');

    const db = client.db('pcbuilder');
    const collection = db.collection('rams');

    // First, remove the specific A-Tech RAM
    console.log('\n🔍 Searching for A-Tech 128GB Kit...');
    const specificRam = await collection.findOne({
      name: { $regex: /A-Tech 128GB Kit.*QNAP TDS-h2489FU/i }
    });

    if (specificRam) {
      console.log(`Found: ${specificRam.name}`);
      console.log(`Price: ${specificRam.currentPrice}`);
      const result1 = await collection.deleteOne({ _id: specificRam._id });
      console.log(`✅ Deleted A-Tech RAM (${result1.deletedCount} document)`);
    } else {
      console.log('⚠️ A-Tech 128GB Kit not found');
    }

    // Remove all RAMs with price of 0 or null
    console.log('\n🔍 Finding all RAMs with price of 0 or null...');

    const zeroPriceRams = await collection.find({
      $or: [
        { currentPrice: 0 },
        { currentPrice: null },
        { currentPrice: '0' }
      ]
    }).toArray();

    console.log(`Found ${zeroPriceRams.length} RAMs with price of 0 or null`);

    if (zeroPriceRams.length > 0) {
      console.log('\n📋 List of RAMs to be deleted:');
      zeroPriceRams.forEach((ram, i) => {
        console.log(`  ${i + 1}. ${ram.name || ram.title} - Price: ${ram.currentPrice}`);
      });

      const result2 = await collection.deleteMany({
        $or: [
          { currentPrice: 0 },
          { currentPrice: null },
          { currentPrice: '0' }
        ]
      });

      console.log(`\n✅ Deleted ${result2.deletedCount} RAMs with zero/null prices`);
    } else {
      console.log('✅ No RAMs with zero/null prices found');
    }

    // Show final count
    const finalCount = await collection.countDocuments();
    console.log(`\n📊 Remaining RAMs in database: ${finalCount}`);

  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    await client.close();
    console.log('\n✅ Database connection closed');
  }
}

removeZeroPriceRams()
  .then(() => {
    console.log('\n✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });
