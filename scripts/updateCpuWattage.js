const { MongoClient } = require('mongodb');

const uri = 'mongodb://localhost:27017';
const client = new MongoClient(uri);

const cpuWattageData = [
  // AMD Ryzen 5
  { model: 'Ryzen 5 4600G', wattage: 88 },
  { model: 'Ryzen 5 5600', wattage: 90 },
  { model: 'Ryzen 5 5600X', wattage: 105 },
  { model: 'Ryzen 5 7600', wattage: 120 },

  // AMD Ryzen 7
  { model: 'Ryzen 7 5700X', wattage: 105 },
  { model: 'Ryzen 7 5800X', wattage: 142 },
  { model: 'Ryzen 7 7700X', wattage: 142 },
  { model: 'Ryzen 7 7800X3D', wattage: 120 },

  // AMD Ryzen 9
  { model: 'Ryzen 9 5900X', wattage: 142 },
  { model: 'Ryzen 9 5950X', wattage: 142 },
  { model: 'Ryzen 9 7900X', wattage: 200 },
  { model: 'Ryzen 9 7950X', wattage: 230 },
  { model: 'Ryzen 9 7950X3D', wattage: 162 },

  // AMD Threadripper
  { model: 'Threadripper 7980X', wattage: 350 },

  // Intel Core i3
  { model: 'Core i3-13100F', wattage: 89 },

  // Intel Core i5
  { model: 'Core i5-12400F', wattage: 117 },
  { model: 'Core i5-12600K', wattage: 150 },
  { model: 'Core i5-13600K', wattage: 181 },

  // Intel Core i7
  { model: 'Core i7-12700K', wattage: 190 },
  { model: 'Core i7-13700K', wattage: 253 },
  { model: 'Core i7-13700KF', wattage: 253 },
  { model: 'Core i7-13700F', wattage: 219 },

  // Intel Core i9
  { model: 'Core i9-12900K', wattage: 241 },
  { model: 'Core i9-13900F', wattage: 219 },
  { model: 'Core i9-13900K', wattage: 253 },
  { model: 'Core i9-13900KF', wattage: 253 }
];

const CPU_COLLECTIONS = [
  'cpus',
  'cpus_amd_ryzen_5',
  'cpus_amd_ryzen_7',
  'cpus_amd_ryzen_9',
  'cpus_amd_threadripper',
  'cpus_intel_core_i3',
  'cpus_intel_core_i5',
  'cpus_intel_core_i7',
  'cpus_intel_core_i9'
];

async function updateCpuWattage() {
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB\n');

    const db = client.db('pcbuilder');

    let totalUpdated = 0;
    let notFoundCount = 0;
    const notFoundModels = [];

    console.log('📝 Updating CPU wattage information...\n');

    for (const cpuData of cpuWattageData) {
      let updated = false;

      // Try to update in all CPU collections
      for (const collectionName of CPU_COLLECTIONS) {
        try {
          const collection = db.collection(collectionName);

          // Try to find and update CPUs that contain this model name
          const result = await collection.updateMany(
            {
              $or: [
                { name: { $regex: cpuData.model, $options: 'i' } },
                { title: { $regex: cpuData.model, $options: 'i' } }
              ]
            },
            {
              $set: {
                wattage: cpuData.wattage,
                updatedAt: new Date()
              }
            }
          );

          if (result.modifiedCount > 0) {
            console.log(`✅ ${cpuData.model}: Updated ${result.modifiedCount} CPU(s) in ${collectionName} with ${cpuData.wattage}W`);
            totalUpdated += result.modifiedCount;
            updated = true;
          }
        } catch (error) {
          // Collection might not exist, continue
        }
      }

      if (!updated) {
        console.log(`⚠️  ${cpuData.model}: No CPUs found to update`);
        notFoundCount++;
        notFoundModels.push(cpuData.model);
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('📊 UPDATE SUMMARY');
    console.log('='.repeat(60));
    console.log(`✅ Total CPUs updated: ${totalUpdated}`);
    console.log(`⚠️  Models not found: ${notFoundCount}`);

    if (notFoundModels.length > 0) {
      console.log('\n⚠️  Models not found in database:');
      notFoundModels.forEach(model => console.log(`   - ${model}`));
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

updateCpuWattage()
  .then(() => {
    console.log('✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
