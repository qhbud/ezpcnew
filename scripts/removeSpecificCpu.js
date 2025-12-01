const { connectToDatabase, getDatabase } = require('../config/database');
const colors = require('colors');

async function removeSpecificCpu() {
  try {
    console.log('\n🗑️  Removing AMD Ryzen 5 4600G Desktop Processor\n'.cyan.bold);

    await connectToDatabase();
    const db = getDatabase();

    const collections = await db.listCollections().toArray();
    const cpuCollections = collections
      .filter(col => col.name.startsWith('cpus'))
      .map(col => col.name);

    console.log(`📋 Found ${cpuCollections.length} CPU collections`.cyan);

    let totalRemoved = 0;
    const cpuTitle = 'AMD Ryzen 5 4600G Desktop Processor';

    for (const collectionName of cpuCollections) {
      console.log(`\n${'='.repeat(60)}`.cyan);
      console.log(`📦 Collection: ${collectionName}`.cyan.bold);
      console.log(`${'='.repeat(60)}`.cyan);

      // Check if the CPU exists
      const cpu = await db.collection(collectionName).findOne({ title: cpuTitle });

      if (cpu) {
        console.log(`   Found: ${cpuTitle}`.white);

        // Delete the CPU
        const result = await db.collection(collectionName).deleteOne({ title: cpuTitle });

        if (result.deletedCount > 0) {
          console.log(`   ✅ Removed from ${collectionName}`.green);
          totalRemoved++;
        } else {
          console.log(`   ❌ Failed to remove from ${collectionName}`.red);
        }
      } else {
        console.log(`   ⚠️  Not found in ${collectionName}`.yellow);
      }
    }

    console.log('\n' + '='.repeat(60).cyan);
    console.log('📊 SUMMARY'.cyan.bold);
    console.log('='.repeat(60).cyan);
    console.log(`✅ Total Removed: ${totalRemoved}`.green);
    console.log('='.repeat(60).cyan);

    if (totalRemoved > 0) {
      console.log('\n✅ AMD Ryzen 5 4600G has been successfully removed!\n'.green.bold);
    } else {
      console.log('\n⚠️  AMD Ryzen 5 4600G was not found in any collection.\n'.yellow.bold);
    }

    process.exit(0);

  } catch (error) {
    console.error('❌ Error:'.red, error);
    process.exit(1);
  }
}

removeSpecificCpu();
