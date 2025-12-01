const { MongoClient } = require('mongodb');

const uri = 'mongodb://localhost:27017';
const client = new MongoClient(uri);

const gpuWattageData = {
  // NVIDIA RTX 50 Series
  'rtx_5090': 550,
  'rtx_5080': 350,
  'rtx_5070_ti': 260,
  'rtx_5070': 230,
  'rtx_5060_ti': 200,
  'rtx_5060': 160,

  // NVIDIA RTX 40 Series
  'rtx_4090': 450,
  'rtx_4080_super': 320,
  'rtx_4080': 320,
  'rtx_4070_ti_super': 285,
  'rtx_4070_super': 220,
  'rtx_4070': 200,
  'rtx_4070_ti': 200, // Using 4070 wattage as baseline
  'rtx_4060_ti': 165,
  'rtx_4060': 115,

  // NVIDIA RTX 30 Series
  'rtx_3090_ti': 450,
  'rtx_3090': 350,
  'rtx_3080_ti': 350,
  'rtx_3080': 320,
  'rtx_3070_ti': 290,
  'rtx_3070': 220,
  'rtx_3060_ti': 200,
  'rtx_3060': 170,
  'rtx_3050': 115,

  // AMD RX 7000 Series
  'rx_7900_xtx': 355,
  'rx_7900_xt': 315,
  'rx_7900_gre': 285,
  'rx_7800_xt': 263,
  'rx_7700_xt': 245,
  'rx_7600_xt': 190,
  'rx_7600': 165,

  // AMD RX 6000 Series
  'rx_6950_xt': 335,
  'rx_6900_xt': 300,
  'rx_6800_xt': 300,
  'rx_6800': 250,
  'rx_6750_xt': 250,
  'rx_6700_xt': 230,
  'rx_6600_xt': 160,
  'rx_6600': 132,
  'rx_6500_xt': 107,
  'rx_6400': 53,

  // Intel Arc
  'arc_a770': 225,
  'arc_a750': 225,
  'arc_a580': 185,
  'arc_a380': 75
};

async function updateGpuWattage() {
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB\n');

    const db = client.db('pcbuilder');

    let totalUpdated = 0;
    let collectionsProcessed = 0;
    let collectionsNotFound = 0;
    const notFoundCollections = [];

    console.log('📝 Updating GPU wattage information...\n');

    for (const [collectionSuffix, wattage] of Object.entries(gpuWattageData)) {
      const collectionName = `gpus_${collectionSuffix}`;

      try {
        const collection = db.collection(collectionName);
        const count = await collection.countDocuments();

        if (count === 0) {
          console.log(`⚠️  ${collectionName}: Collection is empty`);
          notFoundCollections.push(collectionName);
          collectionsNotFound++;
          continue;
        }

        const result = await collection.updateMany(
          {},
          {
            $set: {
              wattage: wattage,
              updatedAt: new Date()
            }
          }
        );

        if (result.modifiedCount > 0) {
          console.log(`✅ ${collectionName}: Updated ${result.modifiedCount} GPU(s) with ${wattage}W`);
          totalUpdated += result.modifiedCount;
          collectionsProcessed++;
        }
      } catch (error) {
        console.log(`⚠️  ${collectionName}: Collection not found or error occurred`);
        notFoundCollections.push(collectionName);
        collectionsNotFound++;
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('📊 UPDATE SUMMARY');
    console.log('='.repeat(60));
    console.log(`✅ Total GPUs updated: ${totalUpdated}`);
    console.log(`✅ Collections processed: ${collectionsProcessed}`);
    console.log(`⚠️  Collections not found/empty: ${collectionsNotFound}`);

    if (notFoundCollections.length > 0) {
      console.log('\n⚠️  Collections not found or empty:');
      notFoundCollections.forEach(name => console.log(`   - ${name}`));
    }

    console.log('\n✅ Wattage update completed!');

  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    await client.close();
    console.log('\n✅ Database connection closed');
  }
}

updateGpuWattage()
  .then(() => {
    console.log('✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
