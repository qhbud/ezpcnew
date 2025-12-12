const { connectToDatabase } = require('../config/database');

async function listBeQuietItems() {
  try {
    const db = await connectToDatabase();
    const collection = db.collection('cpucoolers');

    // Get all be quiet! items
    const items = await collection.find({
      manufacturer: /be quiet/i
    }).toArray();

    console.log(`Found ${items.length} be quiet! items in CPU coolers:\n`);
    items.forEach((item, index) => {
      console.log(`${index + 1}. ${item.name}`);
      console.log(`   Manufacturer: ${item.manufacturer}`);
      console.log(`   Price: $${item.price}`);
      console.log(`   ID: ${item._id}\n`);
    });

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

listBeQuietItems();
