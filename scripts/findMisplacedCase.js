const { connectToDatabase } = require('../config/database');

async function findMisplacedCase() {
  try {
    const db = await connectToDatabase();
    const collection = db.collection('cpucoolers');

    // Search for any be quiet! items that might be cases
    const items = await collection.find({
      $or: [
        { name: /Dark Base/i },
        { name: /be quiet.*case/i },
        { name: /BGW51/i },
        { manufacturer: /be quiet/i, name: /901/i }
      ]
    }).toArray();

    console.log(`Found ${items.length} potential matches:`);
    items.forEach(item => {
      console.log('\n---');
      console.log('Name:', item.name);
      console.log('Manufacturer:', item.manufacturer);
      console.log('Price:', item.price);
      console.log('ID:', item._id);
    });

    if (items.length > 0) {
      console.log('\n\nDeleting these items...');
      const result = await collection.deleteMany({
        _id: { $in: items.map(i => i._id) }
      });
      console.log(`✅ Deleted ${result.deletedCount} item(s)`);
    }

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

findMisplacedCase();
