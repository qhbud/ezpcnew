const { connectToDatabase, getDatabase } = require('../config/database');
const { PriceUpdater } = require('./priceUpdater');

async function testImprovedLogicOnProblemCards() {
  console.log('🎯 TESTING IMPROVED LOGIC ON PROBLEM CARDS\n');

  try {
    await connectToDatabase();
    const db = getDatabase();

    const problemCards = [
      {
        name: 'GIGABYTE AORUS RX 6900 XT Master (should be unavailable)',
        url: 'https://amazon.com/GIGABYTE-MAX-Covered-GV-R69XTAORUS-M-16GD-REV2-0/dp/B09QHW1BZV',
        productId: 'B09QHW1BZV',
        collection: 'gpus_rx_6900_xt',
        issue: 'Should be unavailable but shows $2819'
      },
      {
        name: 'EVGA RTX 3080 XC3 Black (sale detection issue)',
        url: 'https://amazon.com/GeForce-Gaming-10G-P5-3881-KL-Cooling-Renewed/dp/B09PQFX3LM',
        productId: 'B09PQFX3LM',
        collection: 'gpus_rtx_3080',
        issue: 'Should detect sale -40% $449.99 → $749.00'
      },
      {
        name: 'MSI RTX 5060 Shadow 2X (price detection issue)',
        url: 'https://amazon.com/RTX-5060-8G-2X-Performance/dp/B0F4LP8VH5',
        productId: 'B0F4LP8VH5',
        collection: 'gpus_rtx_5060',
        issue: 'Should be unavailable/no price listed'
      },
      {
        name: 'MSI RTX 5060 Gaming Trio (sale detection issue)',
        url: 'https://amazon.com/Gaming-Graphics-128-bit-Extreme-Performance/dp/B0F4M8S2C4',
        productId: 'B0F4M8S2C4',
        collection: 'gpus_rtx_5060',
        issue: 'Should detect sale -22% $329.00 → $419.99'
      }
    ];

    const updater = new PriceUpdater();
    await updater.connect();
    await updater.initializeBrowser();

    let successCount = 0;
    let totalTests = problemCards.length;

    for (const card of problemCards) {
      console.log(`\\n🔬 TESTING: ${card.name}`);
      console.log(`🆔 Product ID: ${card.productId}`);
      console.log(`🔧 Expected: ${card.issue}`);
      console.log(`🌐 URL: ${card.url.substring(0, 80)}...`);
      console.log('=' .repeat(80));

      try {
        const result = await updater.scrapeAmazonTargeted(card.url);

        console.log(`\\n📊 TEST RESULT:`);
        console.log(`🎯 Success: ${result.success ? '✅' : '❌'}`);
        console.log(`💰 Current Price: ${result.currentPrice !== null ? '$' + result.currentPrice : 'NULL'}`);
        console.log(`📈 Base Price: ${result.basePrice !== null ? '$' + result.basePrice : 'NULL'}`);
        console.log(`🏷️ Sale Price: ${result.salePrice !== null ? '$' + result.salePrice : 'NULL'}`);
        console.log(`🛍️ Is On Sale: ${result.isOnSale ? '✅ YES' : '❌ NO'}`);
        console.log(`📍 Is Available: ${result.isAvailable !== false ? '✅ YES' : '❌ NO'}`);
        console.log(`🔍 Detection Method: ${result.detectionMethod}`);
        console.log(`📊 Price Source: ${result.priceSource || 'N/A'}`);

        if (!result.isAvailable) {
          console.log(`⚠️ Unavailability Reason: ${result.unavailabilityReason}`);
        }

        if (result.debugInfo && result.debugInfo.length > 0) {
          console.log(`🐛 Debug: ${result.debugInfo[0]}`);
        }

        // Test validation
        let testPassed = false;
        let testMessage = '';

        if (card.issue.includes('Should be unavailable')) {
          if (!result.isAvailable && result.currentPrice === null) {
            testPassed = true;
            testMessage = '✅ CORRECT: Product correctly identified as unavailable';
            successCount++;
          } else {
            testMessage = '❌ FAILED: Product should be unavailable but shows as available';
          }
        } else if (card.issue.includes('Should detect sale')) {
          if (result.success && result.isOnSale && result.basePrice > result.currentPrice) {
            testPassed = true;
            testMessage = `✅ CORRECT: Sale detected - Was $${result.basePrice} → Now $${result.currentPrice}`;
            successCount++;
          } else {
            testMessage = '❌ FAILED: Sale not detected or incorrect pricing';
          }
        }

        console.log(`\\n🎯 TEST VALIDATION: ${testMessage}`);

        // Also check if we should update the database
        if (result.success) {
          const cardInDb = await db.collection(card.collection).findOne({
            sourceUrl: { $regex: card.productId }
          });

          if (cardInDb) {
            console.log(`\\n📝 DATABASE COMPARISON:`);
            console.log(`   Stored: $${cardInDb.currentPrice} (Base: $${cardInDb.basePrice}, Sale: ${cardInDb.salePrice || 'None'})`);
            console.log(`   Detected: $${result.currentPrice} (Base: $${result.basePrice}, Sale: ${result.salePrice || 'None'})`);

            const needsUpdate = (
              cardInDb.currentPrice !== result.currentPrice ||
              cardInDb.isOnSale !== result.isOnSale ||
              cardInDb.isAvailable !== (result.isAvailable !== false)
            );

            console.log(`   Update Needed: ${needsUpdate ? '✅ YES' : '❌ NO'}`);
          }
        }

      } catch (error) {
        console.log(`💥 ERROR: ${error.message}`);
      }

      // Small delay between requests
      await new Promise(resolve => setTimeout(resolve, 3000));
    }

    await updater.closeBrowser();

    console.log('\\n\\n🎯 TEST SUMMARY');
    console.log('=' .repeat(50));
    console.log(`📊 Total Tests: ${totalTests}`);
    console.log(`✅ Successful Tests: ${successCount}`);
    console.log(`❌ Failed Tests: ${totalTests - successCount}`);
    console.log(`📈 Success Rate: ${((successCount / totalTests) * 100).toFixed(1)}%`);

    if (successCount === totalTests) {
      console.log('\\n🎉 ALL TESTS PASSED! Improved logic is working correctly.');
    } else {
      console.log('\\n⚠️ Some tests failed - may need further refinement.');
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
  }

  process.exit(0);
}

testImprovedLogicOnProblemCards().catch(console.error);