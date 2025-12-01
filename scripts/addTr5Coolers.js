const { MongoClient } = require('mongodb');

const uri = 'mongodb://localhost:27017';
const client = new MongoClient(uri);

async function addTr5Coolers() {
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB\n');

    const db = client.db('pcbuilder');
    const collection = db.collection('coolers');

    const coolersToAdd = [
      {
        name: 'SilverStone XE360-TR5 Liquid CPU Cooler',
        title: 'SilverStone Technology XE360-TR5 360mm Liquid CPU Cooler',
        manufacturer: 'SilverStone',
        coolerType: 'AIO Liquid',
        amazonUrl: 'https://www.amazon.com/SilverStone-Technology-XE360-TR5-Liquid-SST-XE360-TR5/dp/B0D7KYN5PP/',
        compatibleSockets: ['TR5', 'sTRX4', 'SP6'],
        radiatorSize: '360mm',
        fanCount: 3,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: 'Noctua NH-D9 TR5-SP6',
        title: 'Noctua NH-D9 Specialised Tower CPU Cooler for AMD TR5 and SP6',
        manufacturer: 'Noctua',
        coolerType: 'Air Cooler',
        amazonUrl: 'https://www.amazon.com/Noctua-NH-D15-Specialised-Convexity-Version/dp/B0D5B5B821/',
        compatibleSockets: ['TR5', 'SP6'],
        fanCount: 2,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    console.log('📝 Adding TR5-compatible coolers...\n');

    for (const cooler of coolersToAdd) {
      // Check if cooler already exists
      const existing = await collection.findOne({
        $or: [
          { name: cooler.name },
          { title: cooler.title }
        ]
      });

      if (existing) {
        console.log(`   ⚠️  Already exists: ${cooler.name}`);
        console.log(`      Updating compatible sockets...`);

        await collection.updateOne(
          { _id: existing._id },
          {
            $set: {
              compatibleSockets: cooler.compatibleSockets,
              updatedAt: new Date()
            }
          }
        );
        console.log(`   ✅ Updated: ${cooler.name}\n`);
      } else {
        await collection.insertOne(cooler);
        console.log(`   ✅ Added: ${cooler.name}`);
        console.log(`      Type: ${cooler.coolerType}`);
        console.log(`      Sockets: ${cooler.compatibleSockets.join(', ')}\n`);
      }
    }

    // Display total count
    const totalCoolers = await collection.countDocuments();
    console.log(`\n✅ Total coolers in database: ${totalCoolers}`);

  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    await client.close();
    console.log('\n✅ Database connection closed');
  }
}

addTr5Coolers()
  .then(() => {
    console.log('✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
