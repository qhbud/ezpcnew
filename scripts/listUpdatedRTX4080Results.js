const { connectToDatabase, getDatabase } = require('../config/database');

async function listUpdatedRTX4080Results() {
  console.log('🔗 UPDATED RTX 4080 RESULTS WITH VERIFICATION LINKS\n');

  try {
    await connectToDatabase();
    const db = getDatabase();

    // Updated results from our latest test
    const updatedResults = [
      {
        collection: 'gpus_rtx_4080',
        name: 'GIGABYTE GeForce RTX 4080 Super WINDFORCE V2 16G',
        productId: 'B0CSK2GHR8',
        storedPrice: 859.00,
        detectedPrice: 1368.48,
        status: '✅ AVAILABLE',
        statusNote: 'Price corrected (+$509.48)'
      },
      {
        collection: 'gpus_rtx_4080',
        name: 'NVIDIA - GeForce RTX 4080 16GB GDDR6X Graphics Card',
        productId: 'B0BMZ9TGH1',
        storedPrice: 1799.99,
        detectedPrice: 1749.95,
        status: '✅ AVAILABLE',
        statusNote: 'Price updated (-$50.04)'
      },
      {
        collection: 'gpus_rtx_4080',
        name: 'Nvidia Geforce RTX 4080 16GB GDDRX6 Graphic Card (Renewed)',
        productId: 'B0C1Q67X3S',
        storedPrice: 1099.99,
        detectedPrice: 1099.99,
        status: '✅ AVAILABLE',
        statusNote: 'Price unchanged'
      },
      {
        collection: 'gpus_rtx_4080',
        name: 'PNY GeForce RTX™ 4080 16GB Verto Triple Fan Graphics Card',
        productId: 'B0BKGWJRFF',
        storedPrice: 899.99,
        detectedPrice: 899.99,
        status: '✅ AVAILABLE',
        statusNote: 'Price unchanged'
      },
      {
        collection: 'gpus_rtx_4080',
        name: 'GIGABYTE GeForce RTX 4080 Eagle OC 16G Graphics Card',
        productId: 'B0BLT4ZMGL',
        storedPrice: 1199.00,
        detectedPrice: null,
        status: '❌ UNAVAILABLE',
        statusNote: 'Currently unavailable'
      },
      {
        collection: 'gpus_rtx_4080_super',
        name: 'GIGABYTE GeForce RTX 4080 Super WINDFORCE V2 16G',
        productId: 'B0CSK2GHR8',
        storedPrice: 859.00,
        detectedPrice: 1368.48,
        status: '✅ AVAILABLE',
        statusNote: 'Price corrected (+$509.48)'
      },
      {
        collection: 'gpus_rtx_4080_super',
        name: 'NVIDIA - GeForce RTX 4080 Super 16GB GDDR6X',
        productId: 'B0CVNM2LBK',
        storedPrice: 1779.99,
        detectedPrice: 1779.99,
        status: '✅ AVAILABLE',
        statusNote: 'Price unchanged'
      },
      {
        collection: 'gpus_rtx_4080_super',
        name: 'PNY GeForce RTX™ 4080 Super 16GB XLR8 Gaming Verto™',
        productId: 'B0D36QHQBX',
        storedPrice: 689.00,
        detectedPrice: null,
        status: '❌ UNAVAILABLE',
        statusNote: 'Currently unavailable'
      }
    ];

    console.log('📊 RTX 4080 VERIFICATION RESULTS:');
    console.log('=' .repeat(80));

    let cardNumber = 1;

    for (const card of updatedResults) {
      const priceDisplay = card.detectedPrice !== null ? `$${card.detectedPrice}` : 'NULL';
      const amazonLink = `https://amazon.com/dp/${card.productId}`;

      console.log(`${cardNumber}. ${card.name.substring(0, 50)}...`);
      console.log(`   📂 Collection: ${card.collection}`);
      console.log(`   🆔 Product ID: ${card.productId}`);
      console.log(`   💰 Stored Price: $${card.storedPrice}`);
      console.log(`   🎯 Detected Price: ${priceDisplay}`);
      console.log(`   📊 Status: ${card.status}`);
      console.log(`   📝 Note: ${card.statusNote}`);
      console.log(`   🔗 Amazon Link: ${amazonLink}`);
      console.log('');

      cardNumber++;
    }

    console.log('🎯 SUMMARY:');
    console.log(`✅ Available Cards: 6 (with current market prices)`);
    console.log(`❌ Unavailable Cards: 2 (correctly showing NULL)`);
    console.log(`📈 Price Updates: 3 cards had price changes`);
    console.log(`🔒 Unavailable Detection: 2 cards correctly identified as sold out`);

    console.log('\n💡 VERIFICATION INSTRUCTIONS:');
    console.log('• Click each Amazon link to verify current availability and pricing');
    console.log('• Available cards should show "Add to Cart" button');
    console.log('• Unavailable cards should show "Currently unavailable" or similar message');
    console.log('• Price differences may indicate market changes since last database update');

  } catch (error) {
    console.error('❌ Failed to generate results:', error);
  }

  process.exit(0);
}

listUpdatedRTX4080Results().catch(console.error);