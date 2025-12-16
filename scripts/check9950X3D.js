const { connectToDatabase, getDatabase } = require('../config/database');

async function checkCPU() {
  try {
    console.log('🔌 Connecting to database...');
    await connectToDatabase();
    const db = getDatabase();

    // Search for the specific CPU
    const collection = db.collection('cpus_amd_ryzen_9');
    const cpu = await collection.findOne({
      $or: [
        { title: /9950X3D/i },
        { name: /9950X3D/i }
      ]
    });

    if (cpu) {
      console.log('\n📦 Full CPU Document:');
      console.log(JSON.stringify(cpu, null, 2));
    } else {
      console.log('\n❌ CPU not found');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    console.log('\n🚪 Script finished');
  }
}

checkCPU().then(() => process.exit(0));
