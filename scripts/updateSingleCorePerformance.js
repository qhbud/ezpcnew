const { connectToDatabase, getDatabase } = require('../config/database');
const colors = require('colors');

// Single-core performance metrics
const singleCoreScores = {
  'AMD Ryzen 5 5600 Desktop Processor': 63.6,
  'AMD Ryzen 5 5600X Desktop Processor': 67.3,
  'AMD Ryzen 5 7600 Desktop Processor': 78.5,
  'AMD Ryzen 7 5700X Desktop Processor': 67.8,
  'AMD Ryzen 7 5800X Desktop Processor': 70,
  'AMD Ryzen 7 7700X Desktop Processor': 85.8,
  'AMD Ryzen 7 7800X3D Desktop Processor': 74.1,
  'AMD Ryzen 9 5900X Desktop Processor': 71.5,
  'AMD Ryzen 9 5950X Desktop Processor': 72.3,
  'AMD Ryzen 9 7900X Desktop Processor': 86.8,
  'AMD Ryzen 9 7950X Desktop Processor': 87.9,
  'AMD Threadripper 7980X Desktop Processor': 86.9,
  'Intel Core i3-13100F Desktop Processor': 75.9,
  'Intel Core i5-12600K Desktop Processor': 83.1,
  'Intel Core i5-13600K Desktop Processor': 86.7,
  'Intel Core i7-12700K Desktop Processor': 84.4,
  'Intel Core i7-13700K Desktop Processor': 90.8,
  'Intel Core i7-13700KF Desktop Processor': 90.8,
  'Intel Core i9-12900K Desktop Processor': 87.5,
  'Intel Core i9-13900F Desktop Processor': 83.3,
  'Intel Core i9-13900K Desktop Processor': 98,
  'Intel Core i9-13900KF Desktop Processor': 98
};

async function updateSingleCorePerformance() {
  try {
    console.log('\n📊 Updating Single-Core Performance Metrics\n'.cyan.bold);

    await connectToDatabase();
    const db = getDatabase();

    const collections = await db.listCollections().toArray();
    const cpuCollections = collections
      .filter(col => col.name.startsWith('cpus'))
      .map(col => col.name);

    console.log(`📋 Found ${cpuCollections.length} CPU collections`.cyan);

    let totalProcessed = 0;
    let totalUpdated = 0;
    let totalNotFound = 0;

    for (const collectionName of cpuCollections) {
      console.log(`\n${'='.repeat(60)}`.cyan);
      console.log(`📦 Collection: ${collectionName}`.cyan.bold);
      console.log(`${'='.repeat(60)}`.cyan);

      const cpus = await db.collection(collectionName).find({}).toArray();

      for (const cpu of cpus) {
        totalProcessed++;
        console.log(`\n   ${cpu.title}`.white);

        const singleCoreScore = singleCoreScores[cpu.title];

        if (singleCoreScore !== undefined) {
          // Check if score needs updating
          if (cpu.singleCorePerformance === singleCoreScore) {
            console.log(`   ✓ Single-core performance already set to ${singleCoreScore}`.gray);
            continue;
          }

          await db.collection(collectionName).updateOne(
            { _id: cpu._id },
            {
              $set: {
                singleCorePerformance: singleCoreScore,
                updatedAt: new Date()
              }
            }
          );

          console.log(`   ✅ Updated single-core performance: ${singleCoreScore}`.green);
          totalUpdated++;
        } else {
          console.log(`   ⚠️  No single-core performance metric found`.yellow);
          totalNotFound++;
        }
      }
    }

    console.log('\n' + '='.repeat(60).cyan);
    console.log('📊 SUMMARY'.cyan.bold);
    console.log('='.repeat(60).cyan);
    console.log(`✅ Total Processed: ${totalProcessed}`.green);
    console.log(`💾 Metrics Updated: ${totalUpdated}`.green);
    console.log(`⚠️  No Metric Found: ${totalNotFound}`.yellow);
    console.log('='.repeat(60).cyan);

    console.log('\n✅ Single-core performance metrics update complete!\n'.green.bold);

    process.exit(0);

  } catch (error) {
    console.error('❌ Error:'.red, error);
    process.exit(1);
  }
}

updateSingleCorePerformance();
