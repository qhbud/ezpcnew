const { MongoClient } = require('mongodb');

const uri = 'mongodb://localhost:27017';
const client = new MongoClient(uri);

async function fixTr5CoolerUrls() {
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB\n');

    const db = client.db('pcbuilder');
    const collection = db.collection('coolers');

    const updates = [
      {
        name: 'SilverStone XE360-TR5 Liquid CPU Cooler',
        sourceUrl: 'https://www.amazon.com/SilverStone-Technology-XE360-TR5-Liquid-SST-XE360-TR5/dp/B0D7KYN5PP/'
      },
      {
        name: 'Noctua NH-D9 TR5-SP6',
        sourceUrl: 'https://www.amazon.com/Noctua-NH-D15-Specialised-Convexity-Version/dp/B0D5B5B821/'
      }
    ];

    console.log('📝 Fixing TR5 cooler URLs...\n');

    for (const update of updates) {
      const result = await collection.updateOne(
        { name: update.name },
        {
          $set: {
            sourceUrl: update.sourceUrl,
            updatedAt: new Date()
          },
          $unset: {
            amazonUrl: ""  // Remove the old field
          }
        }
      );

      if (result.modifiedCount > 0) {
        console.log(`✅ Updated: ${update.name}`);
        console.log(`   sourceUrl: ${update.sourceUrl}\n`);
      } else {
        console.log(`⚠️  No changes for: ${update.name}\n`);
      }
    }

    console.log('✅ URLs fixed!');

  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    await client.close();
    console.log('\n✅ Database connection closed');
  }
}

fixTr5CoolerUrls()
  .then(() => {
    console.log('✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
