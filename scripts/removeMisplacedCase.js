const { connectToDatabase } = require('../config/database');

async function removeMisplacedCase() {
  try {
    const db = await connectToDatabase();
    const collection = db.collection('cpucoolers');

    // Find and delete the PC case that's incorrectly in the CPU cooler collection
    const result = await collection.deleteOne({
      name: /Dark Base Pro 901 White/i
    });

    if (result.deletedCount > 0) {
      console.log('✅ Successfully removed the misplaced PC case from CPU coolers');
      console.log(`   Deleted: be quiet! Dark Base Pro 901 White`);
    } else {
      console.log('❌ PC case not found in CPU coolers collection');
    }

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

removeMisplacedCase();
