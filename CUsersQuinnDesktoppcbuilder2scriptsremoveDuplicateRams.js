const { connectToDatabase, getDatabase } = require('../config/database');

async function removeDuplicateRams() {
  try {
    await connectToDatabase();
    const db = getDatabase();
    const collection = db.collection('rams');

    console.log('Finding duplicate RAM entries...');
    
    // Get all RAM modules
    const allRams = await collection.find({}).toArray();
    console.log(`Total RAM modules: ${allRams.length}`);

    // Group by title to find duplicates
    const ramsByTitle = new Map();
    const duplicates = [];

    allRams.forEach(ram => {
      const title = ram.title || ram.name || '';
      if (ramsByTitle.has(title)) {
        // This is a duplicate
        duplicates.push(ram._id);
      } else {
        // First occurrence, keep it
        ramsByTitle.set(title, ram._id);
      }
    });

    console.log(`Found ${duplicates.length} duplicate RAM entries`);
    
    if (duplicates.length > 0) {
      console.log(`Unique RAM modules: ${ramsByTitle.size}`);
      
      // Check if --confirm flag is present
      if (process.argv.includes('--confirm')) {
        const result = await collection.deleteMany({
          _id: { $in: duplicates }
        });

        console.log(`\n✅ Deleted ${result.deletedCount} duplicate RAM entries`);
        
        // Verify remaining count
        const remainingCount = await collection.countDocuments();
        console.log(`Remaining RAM modules: ${remainingCount}`);
      } else {
        console.log('\nRun with --confirm to proceed with deletion.');
      }
    } else {
      console.log('\n✅ No duplicates found!');
    }

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

removeDuplicateRams();
