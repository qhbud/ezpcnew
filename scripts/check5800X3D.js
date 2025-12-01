const { connectToDatabase, getDatabase } = require('../config/database');

async function check5800X3D() {
  await connectToDatabase();
  const db = getDatabase();

  const collections = await db.listCollections().toArray();
  const cpuCollections = collections
    .filter(col => col.name.startsWith('cpus'))
    .map(col => col.name);

  console.log('\nChecking AMD Ryzen 7 5800X3D across all collections:\n');

  for (const collectionName of cpuCollections) {
    const cpu = await db.collection(collectionName).findOne({
      title: 'AMD Ryzen 7 5800X3D Desktop Processor'
    });

    if (cpu) {
      console.log(`Collection: ${collectionName}`);
      console.log(`  Title: ${cpu.title}`);
      console.log(`  URL: ${cpu.sourceUrl || cpu.url}`);
      console.log(`  Current Price: $${cpu.currentPrice}`);
      console.log(`  Available: ${cpu.isAvailable}`);
      console.log(`  Updated At: ${cpu.updatedAt}`);
      console.log('');
    }
  }

  process.exit(0);
}

check5800X3D();
