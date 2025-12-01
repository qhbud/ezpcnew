const { MongoClient } = require('mongodb');

const uri = 'mongodb://localhost:27017';
const client = new MongoClient(uri);

async function listIntelCpus() {
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB\n');

    const db = client.db('pcbuilder');

    // Check i5 collection
    console.log('📋 CPUs in cpus_intel_core_i5:');
    console.log('='.repeat(60));
    const i5Collection = db.collection('cpus_intel_core_i5');
    const i5Cpus = await i5Collection.find({}).toArray();
    i5Cpus.forEach((cpu, i) => {
      const displayName = cpu.name || cpu.title || 'Unnamed';
      console.log(`${i + 1}. ${displayName}`);
    });

    // Check i7 collection
    console.log('\n📋 CPUs in cpus_intel_core_i7:');
    console.log('='.repeat(60));
    const i7Collection = db.collection('cpus_intel_core_i7');
    const i7Cpus = await i7Collection.find({}).toArray();
    i7Cpus.forEach((cpu, i) => {
      const displayName = cpu.name || cpu.title || 'Unnamed';
      console.log(`${i + 1}. ${displayName}`);
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    await client.close();
    console.log('\n✅ Database connection closed');
  }
}

listIntelCpus()
  .then(() => {
    console.log('✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
