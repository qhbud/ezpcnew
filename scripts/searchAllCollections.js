const { connectToDatabase } = require('../config/database');

async function searchAllCollections() {
  try {
    const db = await connectToDatabase();

    // List all collections
    const collections = await db.listCollections().toArray();
    console.log('Available collections:', collections.map(c => c.name).join(', '));
    console.log('\n');

    // Search in each collection for the Dark Base item
    for (const collInfo of collections) {
      const collName = collInfo.name;
      const collection = db.collection(collName);

      const items = await collection.find({
        $or: [
          { name: /Dark Base Pro 901/i },
          { name: /BGW51/i }
        ]
      }).toArray();

      if (items.length > 0) {
        console.log(`\n🔍 Found in collection: ${collName}`);
        items.forEach(item => {
          console.log('\nItem details:');
          console.log('  Name:', item.name);
          console.log('  Manufacturer:', item.manufacturer);
          console.log('  Price:', item.price);
          console.log('  ID:', item._id);
        });

        // Delete the items
        console.log('\n🗑️  Deleting...');
        const result = await collection.deleteMany({
          _id: { $in: items.map(i => i._id) }
        });
        console.log(`✅ Deleted ${result.deletedCount} item(s) from ${collName}`);
      }
    }

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

searchAllCollections();
