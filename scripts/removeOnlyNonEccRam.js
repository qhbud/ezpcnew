const { connectToDatabase, getDatabase } = require('../config/database');

async function removeOnlyNonEccRam() {
  try {
    await connectToDatabase();
    const db = getDatabase();
    const collection = db.collection('rams');

    // First, let's see what we have
    console.log('Checking RAM collection...');
    const allRams = await collection.find({}).toArray();
    console.log(`Total RAM modules: ${allRams.length}`);

    // Find only RAM that explicitly says "Non-ECC" or "Non ECC"
    const nonEccRams = allRams.filter(ram => {
      const title = (ram.title || ram.name || '').toLowerCase();
      return title.includes('non-ecc') || title.includes('non ecc');
    });

    console.log(`\nRAM modules with "Non-ECC" in title: ${nonEccRams.length}`);

    if (nonEccRams.length > 0) {
      console.log('\nExamples of RAM to be removed:');
      nonEccRams.slice(0, 10).forEach(ram => {
        console.log(`- ${ram.title || ram.name}`);
      });

      // Check if --confirm flag is present
      if (process.argv.includes('--confirm')) {
        // Delete only RAM that has "non-ecc" or "non ecc" in the title
        const result = await collection.deleteMany({
          $or: [
            { title: /non[-\s]?ecc/i },
            { name: /non[-\s]?ecc/i }
          ]
        });

        console.log(`\n✅ Deleted ${result.deletedCount} RAM modules with "Non-ECC" in title`);

        // Verify remaining count
        const remainingCount = await collection.countDocuments();
        console.log(`Remaining RAM modules: ${remainingCount}`);
      } else {
        console.log(`\n⚠️  About to delete ${nonEccRams.length} RAM modules that say "Non-ECC"...`);
        console.log('\nTo proceed, run this script with --confirm flag');
      }
    } else {
      console.log('\n✅ No RAM modules with "Non-ECC" found in the database.');
    }

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

removeOnlyNonEccRam();
