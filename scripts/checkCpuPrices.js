const { connectToDatabase, getDatabase } = require('../config/database');

async function checkCpuPrices() {
  await connectToDatabase();
  const db = getDatabase();

  const collections = ['cpus', 'cpus_amd_ryzen_9', 'cpus_intel_core_i5', 'cpus_intel_core_i7'];

  console.log('\nChecking CPU prices across all collections:\n');

  for (const col of collections) {
    const cpu1 = await db.collection(col).findOne({ title: 'AMD Ryzen 9 7950X3D Desktop Processor' });
    const cpu2 = await db.collection(col).findOne({ title: 'Intel Core i5-13400F Desktop Processor' });
    const cpu3 = await db.collection(col).findOne({ title: 'Intel Core i7-13700K Desktop Processor' });

    if (cpu1) {
      console.log(`${col} - 7950X3D: price=${cpu1.currentPrice}, available=${cpu1.isAvailable}`);
    }
    if (cpu2) {
      console.log(`${col} - i5-13400F: price=${cpu2.currentPrice}, available=${cpu2.isAvailable}`);
    }
    if (cpu3) {
      console.log(`${col} - i7-13700K: price=${cpu3.currentPrice}, available=${cpu3.isAvailable}, basePrice=${cpu3.basePrice}`);
    }
  }

  process.exit(0);
}

checkCpuPrices();
