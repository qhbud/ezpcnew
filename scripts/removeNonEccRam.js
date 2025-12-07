const { connectToDatabase, getDatabase } = require('../config/database');

async function removeNonEccRam() {
  try {
    await connectToDatabase();
    const db = getDatabase();
    const collection = db.collection('rams');

    // First, let's see what we have
    console.log('Checking RAM collection...');
    const allRams = await collection.find({}).toArray();
    console.log(`Total RAM modules: ${allRams.length}`);

    // Show a few examples to understand the data structure
    console.log('\nSample RAM entries:');
    allRams.slice(0, 5).forEach(ram => {
      console.log(`- ${ram.title || ram.name}`);
    });

    // Identify ECC RAM (RAM that contains ECC but NOT "non-ecc")
    const eccRams = allRams.filter(ram => {
      const title = (ram.title || ram.name || '').toLowerCase();
      // Must contain 'ecc' but NOT 'non-ecc' or 'non ecc'
      return title.includes('ecc') && !title.includes('non-ecc') && !title.includes('non ecc');
    });

    console.log(`\nECC RAM modules found: ${eccRams.length}`);

    if (eccRams.length > 0) {
      console.log('ECC RAM examples:');
      eccRams.slice(0, 5).forEach(ram => {
        console.log(`- ${ram.title || ram.name}`);
      });
    }

    // Non-ECC RAM (everything that doesn't have ECC, or has "non-ecc")
    const nonEccRams = allRams.filter(ram => {
      const title = (ram.title || ram.name || '').toLowerCase();
      // Either doesn't contain 'ecc', or contains 'non-ecc' or 'non ecc'
      return !title.includes('ecc') || title.includes('non-ecc') || title.includes('non ecc');
    });

    console.log(`\nNon-ECC RAM modules found: ${nonEccRams.length}`);

    if (nonEccRams.length > 0) {
      console.log('Non-ECC RAM examples:');
      nonEccRams.slice(0, 5).forEach(ram => {
        console.log(`- ${ram.title || ram.name}`);
      });

      // Ask for confirmation
      console.log(`\n⚠️  About to delete ${nonEccRams.length} non-ECC RAM modules...`);
      console.log('This will keep only ECC RAM in the database.');
      console.log('\nTo proceed, run this script with --confirm flag');

      // Check if --confirm flag is present
      if (process.argv.includes('--confirm')) {
        // Delete RAM that either doesn't have 'ecc' in the title, or has 'non-ecc'/'non ecc'
        const result = await collection.deleteMany({
          $or: [
            { title: { $not: /\becc\b/i } },
            { title: /non[-\s]?ecc/i },
            { name: { $not: /\becc\b/i } },
            { name: /non[-\s]?ecc/i }
          ]
        });

        console.log(`\n✅ Deleted ${result.deletedCount} non-ECC RAM modules`);

        // Verify remaining count
        const remainingCount = await collection.countDocuments();
        console.log(`Remaining RAM modules (should all be ECC): ${remainingCount}`);
      } else {
        console.log('\nRun with --confirm to proceed with deletion.');
      }
    } else {
      console.log('\n✅ No non-ECC RAM found. Database already contains only ECC RAM.');
    }

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

removeNonEccRam();
