const { connectToDatabase, getDatabase } = require('../config/database');

async function checkUpdates() {
  await connectToDatabase();
  const db = getDatabase();

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const collections = ['addons', 'cases', 'cpus', 'gpus', 'motherboards', 'rams', 'psus', 'coolers', 'storages'];

  console.log('Collections updated today (12/9/2025):');
  console.log('='.repeat(50));

  for (const colName of collections) {
    try {
      const collection = db.collection(colName);
      const count = await collection.countDocuments({
        lastPriceCheck: { $gte: today }
      });
      const total = await collection.countDocuments();
      console.log(`${colName.padEnd(15)}: ${count}/${total} updated today`);
    } catch (error) {
      console.log(`${colName.padEnd(15)}: Error - ${error.message}`);
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log('Storage update timeline:');
  console.log('='.repeat(50));

  const storageCol = db.collection('storages');
  const firstStorage = await storageCol.find({ lastPriceCheck: { $gte: today } }).sort({ lastPriceCheck: 1 }).limit(1).toArray();
  const lastStorage = await storageCol.find({ lastPriceCheck: { $gte: today } }).sort({ lastPriceCheck: -1 }).limit(1).toArray();

  if (firstStorage.length > 0) {
    console.log('First storage updated:', firstStorage[0].lastPriceCheck);
    console.log('Last storage updated:', lastStorage[0].lastPriceCheck);
  }

  console.log('\n' + '='.repeat(50));
  console.log('Checking specific RAM:');
  console.log('='.repeat(50));

  const ramCollection = db.collection('rams');
  const specificRAM = await ramCollection.findOne({
    name: { $regex: /32GB DDR4 3200 MHz.*Single 32GB Stick/i }
  });

  if (specificRAM) {
    console.log('Name:', specificRAM.name);
    console.log('Last Price Check:', specificRAM.lastPriceCheck);
    console.log('Updated At:', specificRAM.updatedAt);
    console.log('Current Price:', specificRAM.currentPrice || specificRAM.price);
    console.log('Price History Length:', (specificRAM.priceHistory || []).length);
  }

  process.exit(0);
}

checkUpdates().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
