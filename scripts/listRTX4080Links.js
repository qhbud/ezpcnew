const { connectToDatabase, getDatabase } = require('../config/database');

async function listRTX4080Links() {
  console.log('🔗 RTX 4080 CARD LINKS FOR PRICE VERIFICATION\n');

  try {
    await connectToDatabase();
    const db = getDatabase();

    // Get all RTX 4080 collections
    const rtx4080Collections = [
      'gpus_rtx_4080',
      'gpus_rtx_4080_super'
    ];

    let cardNumber = 1;

    for (const collectionName of rtx4080Collections) {
      console.log(`📋 ${collectionName.toUpperCase()}:`);
      console.log('=' .repeat(60));

      // Get all GPUs with Amazon URLs
      const gpus = await db.collection(collectionName).find({
        sourceUrl: { $exists: true, $ne: null, $regex: /amazon\.com/i }
      }).toArray();

      for (const gpu of gpus) {
        const productId = gpu.sourceUrl.match(/\/dp\/([A-Z0-9]{10})/)?.[1] || 'Unknown';

        // Calculate the detected vs stored difference (from our test results)
        let detectedPrice, status;

        // Map based on our test results
        switch (productId) {
          case 'B0CLTJHJ32': // GIGABYTE RTX 4080 WINDFORCE
            detectedPrice = 1368.48;
            status = '⚠️ PRICE INCREASED';
            break;
          case 'B0BMZ9TGH1': // NVIDIA RTX 4080 16GB
            detectedPrice = 1799.99;
            status = '✅ SAME';
            break;
          case 'B0C1Q67X3S': // Nvidia RTX 4080 (Renewed)
            detectedPrice = 1099.99;
            status = '✅ SAME';
            break;
          case 'B0BKGWJRFF': // PNY RTX 4080 Verto
            detectedPrice = 899.99;
            status = '✅ SAME';
            break;
          case 'B0BLT4ZM56': // GIGABYTE RTX 4080 Eagle OC
            detectedPrice = 1199.00;
            status = '✅ SAME';
            break;
          case 'B0CVNM2LBK': // NVIDIA RTX 4080 Super
            detectedPrice = 1779.99;
            status = '✅ SAME';
            break;
          case 'B0D36QHQBX': // PNY RTX 4080 Super XLR8
            detectedPrice = 689.00;
            status = '✅ SAME';
            break;
          default:
            detectedPrice = 'Unknown';
            status = '❓ NOT TESTED';
        }

        const priceDiff = typeof detectedPrice === 'number' ?
          Math.abs(detectedPrice - gpu.currentPrice).toFixed(2) : 'N/A';

        console.log(`${cardNumber}. ${gpu.name.substring(0, 50)}...`);
        console.log(`   Product ID: ${productId}`);
        console.log(`   Stored Price: $${gpu.currentPrice}`);
        console.log(`   Detected Price: $${detectedPrice}`);
        console.log(`   Status: ${status}${priceDiff !== 'N/A' && priceDiff > 0 ? ` (diff: $${priceDiff})` : ''}`);
        console.log(`   Amazon Link: ${gpu.sourceUrl}`);
        console.log('');

        cardNumber++;
      }
    }

    console.log('🔍 You can verify these prices by visiting the Amazon links above.');
    console.log('💡 Note: Price increases may indicate market changes or seller adjustments.');

  } catch (error) {
    console.error('❌ Failed to list links:', error);
  }

  process.exit(0);
}

listRTX4080Links().catch(console.error);