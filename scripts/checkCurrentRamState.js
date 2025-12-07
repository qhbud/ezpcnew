const { connectToDatabase, getDatabase } = require('../config/database');

async function checkCurrentRamState() {
  try {
    await connectToDatabase();
    const db = getDatabase();
    const collection = db.collection('rams');

    const count = await collection.countDocuments();
    console.log(`Current RAM count: ${count}`);

    if (count > 0) {
      const samples = await collection.find({}).limit(5).toArray();
      console.log('\nSample entries:');
      samples.forEach(ram => {
        console.log(`- ${ram.title || ram.name}`);
      });
    }

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkCurrentRamState();
