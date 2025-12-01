const { connectToDatabase, getDatabase } = require('../config/database');
const colors = require('colors');

// Multi-thread performance metrics (normalized scores)
const multiThreadScores = {
  'AMD Ryzen 5 5600 Desktop Processor': 32.3,
  'AMD Ryzen 5 5600X Desktop Processor': 32.5,
  'AMD Ryzen 5 7600 Desktop Processor': 40.61,
  'AMD Ryzen 7 5700X Desktop Processor': 39.77,
  'AMD Ryzen 7 5800X Desktop Processor': 43,
  'AMD Ryzen 7 7700X Desktop Processor': 56.15,
  'AMD Ryzen 7 7800X3D Desktop Processor': 52.3,
  'AMD Ryzen 9 5900X Desktop Processor': 58.02,
  'AMD Ryzen 9 5950X Desktop Processor': 67.3,
  'AMD Ryzen 9 7900X Desktop Processor': 79.51,
  'AMD Ryzen 9 7950X Desktop Processor': 100,
  'AMD Threadripper 7980X Desktop Processor': 200,
  'Intel Core i3-13100F Desktop Processor': 24.8,
  'Intel Core i5-12600K Desktop Processor': 45.69,
  'Intel Core i5-13600K Desktop Processor': 60.91,
  'Intel Core i7-12700K Desktop Processor': 59.62,
  'Intel Core i7-13700K Desktop Processor': 79.05,
  'Intel Core i7-13700KF Desktop Processor': 79.05,
  'Intel Core i9-12900K Desktop Processor': 69.85,
  'Intel Core i9-13900F Desktop Processor': 83.3,
  'Intel Core i9-13900K Desktop Processor': 98.62,
  'Intel Core i9-13900KF Desktop Processor': 98.62
};

async function updateMultiThreadPerformance() {
  try {
    console.log('\n📊 Updating Multi-Thread Performance Metrics\n'.cyan.bold);

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

        const multiThreadScore = multiThreadScores[cpu.title];

        if (multiThreadScore !== undefined) {
          // Check if score needs updating
          if (cpu.multiThreadPerformance === multiThreadScore) {
            console.log(`   ✓ Multi-thread performance already set to ${multiThreadScore}`.gray);
            continue;
          }

          await db.collection(collectionName).updateOne(
            { _id: cpu._id },
            {
              $set: {
                multiThreadPerformance: multiThreadScore,
                updatedAt: new Date()
              }
            }
          );

          console.log(`   ✅ Updated multi-thread performance: ${multiThreadScore}`.green);
          totalUpdated++;
        } else {
          console.log(`   ⚠️  No multi-thread performance metric found`.yellow);
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

    console.log('\n✅ Multi-thread performance metrics update complete!\n'.green.bold);

    process.exit(0);

  } catch (error) {
    console.error('❌ Error:'.red, error);
    process.exit(1);
  }
}

updateMultiThreadPerformance();
