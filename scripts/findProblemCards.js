const { connectToDatabase, getDatabase } = require('../config/database');

async function findProblemCards() {
  try {
    await connectToDatabase();
    const db = getDatabase();

    const problemCards = [
      'GIGABYTE AORUS Radeon RX 6900 XT Master 16G',
      'EVGA GeForce RTX 3080 XC3 Black Gaming',
      'MSI Gaming RTX 5060 8G Shadow 2X OC',
      'MSI Gaming RTX 5060 8G Gaming Trio OC'
    ];

    console.log('🔍 FINDING PROBLEM CARDS:');
    console.log('='.repeat(60));

    for (const cardName of problemCards) {
      const collections = ['gpus_rx_6900_xt', 'gpus_rtx_3080', 'gpus_rtx_5060'];

      for (const collectionName of collections) {
        try {
          const cards = await db.collection(collectionName).find({
            name: { $regex: cardName.substring(0, 30), $options: 'i' }
          }).toArray();

          for (const card of cards) {
            console.log('\n📋 FOUND:');
            console.log('Name:', card.name.substring(0, 80) + '...');
            console.log('Collection:', collectionName);
            console.log('Current Price:', card.currentPrice);
            console.log('Base Price:', card.basePrice);
            console.log('Sale Price:', card.salePrice);
            console.log('Is On Sale:', card.isOnSale);
            console.log('Is Available:', card.isAvailable);
            console.log('URL:', card.sourceUrl);
            console.log('Product ID:', card.sourceUrl?.match(/\/dp\/([A-Z0-9]{10})/)?.[1] || 'Unknown');
          }
        } catch (e) {
          // Collection might not exist
        }
      }
    }

  } catch (error) {
    console.error('Error:', error);
  }
  process.exit(0);
}

findProblemCards();