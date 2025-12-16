const { connectToDatabase, getDatabase } = require('../config/database');

async function verifyCpuChipsets() {
  try {
    console.log('🔌 Connecting to database...');
    await connectToDatabase();
    const db = getDatabase();

    // Get all collections that start with 'cpus_'
    const collections = await db.listCollections().toArray();
    const cpuCollections = collections
      .map(col => col.name)
      .filter(name => name.startsWith('cpus_'));

    console.log(`\n📊 Found ${cpuCollections.length} CPU collections\n`);

    let totalCPUs = 0;
    let cpusWithChipsets = 0;
    let cpusWithoutChipsets = 0;

    for (const collectionName of cpuCollections) {
      const collection = db.collection(collectionName);
      const cpus = await collection.find({}).toArray();

      if (cpus.length === 0) continue;

      console.log(`\n${'='.repeat(80)}`);
      console.log(`📁 Collection: ${collectionName} (${cpus.length} CPUs)`);
      console.log('='.repeat(80));

      for (const cpu of cpus) {
        totalCPUs++;
        const name = cpu.title || cpu.name || 'Unknown';
        const socket = cpu.socket || 'Unknown';
        const chipsets = cpu.supportedChipsets || cpu.compatibility?.motherboards || [];

        if (chipsets.length > 0) {
          cpusWithChipsets++;
          console.log(`\n✅ ${name}`);
          console.log(`   Socket: ${socket}`);
          console.log(`   Compatible Chipsets (supportedChipsets): ${chipsets.join(', ')}`);

          // Verify both fields match
          const compatChipsets = cpu.compatibility?.motherboards || [];
          if (compatChipsets.length > 0 && JSON.stringify(chipsets) !== JSON.stringify(compatChipsets)) {
            console.log(`   ⚠️  Mismatch: compatibility.motherboards = ${compatChipsets.join(', ')}`);
          }
        } else {
          cpusWithoutChipsets++;
          console.log(`\n❌ ${name}`);
          console.log(`   Socket: ${socket}`);
          console.log(`   Compatible Chipsets: NONE`);
        }
      }
    }

    console.log('\n' + '='.repeat(80));
    console.log('📈 VERIFICATION SUMMARY:');
    console.log('='.repeat(80));
    console.log(`Total CPUs: ${totalCPUs}`);
    console.log(`CPUs with chipsets: ${cpusWithChipsets} (${(cpusWithChipsets/totalCPUs*100).toFixed(1)}%)`);
    console.log(`CPUs without chipsets: ${cpusWithoutChipsets} (${(cpusWithoutChipsets/totalCPUs*100).toFixed(1)}%)`);
    console.log('='.repeat(80));

    if (cpusWithChipsets === totalCPUs) {
      console.log('\n🎉 SUCCESS: All CPUs have chipsets configured!');
    } else {
      console.log('\n⚠️  WARNING: Some CPUs are missing chipsets!');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    console.log('\n🚪 Script finished');
  }
}

// Run the script
if (require.main === module) {
  verifyCpuChipsets()
    .then(() => {
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Script failed:', error);
      process.exit(1);
    });
}

module.exports = { verifyCpuChipsets };
