const { connectToDatabase, getDatabase } = require('../config/database');

async function listRTX4070Links() {
  console.log('🔗 RTX 4070 CARD LINKS FOR PRICE VERIFICATION\n');

  try {
    await connectToDatabase();
    const db = getDatabase();

    // Get all RTX 4070 collections
    const rtx4070Collections = [
      'gpus_rtx_4070',
      'gpus_rtx_4070_super'
    ];

    let cardNumber = 1;

    for (const collectionName of rtx4070Collections) {
      console.log(`📋 ${collectionName.toUpperCase()}:`);
      console.log('=' .repeat(60));

      // Get all GPUs with Amazon URLs
      const gpus = await db.collection(collectionName).find({
        sourceUrl: { $exists: true, $ne: null, $regex: /amazon\.com/i }
      }).toArray();

      for (const gpu of gpus) {
        const productId = gpu.sourceUrl.match(/\/dp\/([A-Z0-9]{10})/)?.[1] || 'Unknown';

        console.log(`${cardNumber}. ${gpu.name.substring(0, 60)}...`);
        console.log(`   Product ID: ${productId}`);
        console.log(`   Stored Price: $${gpu.currentPrice}`);
        console.log(`   Amazon Link: ${gpu.sourceUrl}`);
        console.log('');

        cardNumber++;
      }
    }

    console.log('🔍 You can verify these prices by visiting the Amazon links above.');
    console.log('💡 Note: Prices may have changed since last update.');

  } catch (error) {
    console.error('❌ Failed to list links:', error);
  }

  process.exit(0);
}

listRTX4070Links().catch(console.error);