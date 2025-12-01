const { PriceUpdater } = require('./priceUpdater');

async function testNewProblemCards() {
  console.log('🔍 TESTING NEW PROBLEM CARDS - PRICE DETECTION ISSUES\n');

  const problemCards = [
    {
      name: 'ASUS Dual RTX 4070 EVO OC (should be $799.97)',
      url: 'https://amazon.com/ASUS-GeForce-Graphics-Compatible-Technology/dp/B0D1N5L5DJ',
      productId: 'B0D1N5L5DJ',
      expectedPrice: 799.97,
      issue: 'Shows N/A but should cost $799.97'
    },
    {
      name: 'ASRock Arc A770 Phantom Gaming (should be $279.99 with -36% discount)',
      url: 'https://amazon.com/ASRock-Graphics-Phantom-DisplayPort-Technology/dp/B0BHQXCL72',
      productId: 'B0BHQXCL72',
      expectedPrice: 279.99,
      expectedBasePrice: 439.99,
      issue: 'Shows N/A but should cost $279.99 (was $439.99)'
    },
    {
      name: 'GIGABYTE RTX 4070 Super WINDFORCE OC (should be $845.98 base)',
      url: 'https://amazon.com/GIGABYTE-Graphics-WINDFORCE-GV-N407SWF3OC-12GD-Video/dp/B0CS19T86T',
      productId: 'B0CS19T86T',
      expectedPrice: 845.98,
      issue: 'Incorrectly shows $845.98 as sale price, should be base price'
    },
    {
      name: 'MSI RTX 4070 Super 12G Ventus (should be $499.00 base)',
      url: 'https://amazon.com/MSI-Gaming-RTX-4070-Super/dp/B0CS1JBQZK',
      productId: 'B0CS1JBQZK',
      expectedPrice: 499.00,
      issue: 'Incorrectly shows $499.00 as sale price, should be base price'
    },
    {
      name: 'Sparkle Arc A770 Titan OC (should be $369.85 base)',
      url: 'https://amazon.com/Sparkle-Graphics-ThermalSync-Cooling-SA770T-16GOC/dp/B0C57GRNBH',
      productId: 'B0C57GRNBH',
      expectedPrice: 369.85,
      issue: 'Incorrectly shows $369.85 as sale price, should be base price'
    },
    {
      name: 'ASRock Arc A770 Challenger SE (should be $424.05 base)',
      url: 'https://amazon.com/ASRock-Challenger-Graphics-2150MHz-Backplate/dp/B0BN8ZFW22',
      productId: 'B0BN8ZFW22',
      expectedPrice: 424.05,
      issue: 'Incorrectly shows $424.05 as sale price, should be base price'
    }
  ];

  try {
    const updater = new PriceUpdater();
    await updater.connect();
    await updater.initializeBrowser();

    let successCount = 0;
    let totalTests = problemCards.length;

    for (const card of problemCards) {
      console.log(`\n🔬 TESTING: ${card.name}`);
      console.log(`🆔 Product ID: ${card.productId}`);
      console.log(`🔧 Expected: $${card.expectedPrice}${card.expectedBasePrice ? ` (was $${card.expectedBasePrice})` : ''}`);
      console.log(`⚠️ Issue: ${card.issue}`);
      console.log(`🌐 URL: ${card.url.substring(0, 80)}...`);
      console.log('=' .repeat(80));

      try {
        const result = await updater.scrapeAmazonTargeted(card.url);

        console.log(`\n📊 CURRENT RESULT:`);
        console.log(`🎯 Success: ${result.success ? '✅' : '❌'}`);
        console.log(`💰 Current Price: ${result.currentPrice !== null ? '$' + result.currentPrice : 'NULL/N/A'}`);
        console.log(`📈 Base Price: ${result.basePrice !== null ? '$' + result.basePrice : 'NULL'}`);
        console.log(`🏷️ Sale Price: ${result.salePrice !== null ? '$' + result.salePrice : 'NULL'}`);
        console.log(`🛍️ Is On Sale: ${result.isOnSale ? '✅ YES' : '❌ NO'}`);
        console.log(`📍 Is Available: ${result.isAvailable !== false ? '✅ YES' : '❌ NO'}`)
        console.log(`🔍 Detection Method: ${result.detectionMethod}`);
        console.log(`📊 Price Source: ${result.priceSource || 'N/A'}`);

        if (!result.isAvailable) {
          console.log(`⚠️ Unavailability Reason: ${result.unavailabilityReason}`);
        }

        if (result.debugInfo && result.debugInfo.length > 0) {
          console.log(`\n🐛 DEBUG INFO:`);
          result.debugInfo.forEach((info, i) => {
            console.log(`   ${i + 1}. ${info}`);
          });
        }

        // Test validation
        let testPassed = false;
        let testMessage = '';

        if (card.issue.includes('Shows N/A')) {
          if (result.success && result.isAvailable && Math.abs(result.currentPrice - card.expectedPrice) < 1) {
            testPassed = true;
            testMessage = `✅ CORRECT: Product available with expected price $${result.currentPrice}`;
            successCount++;
          } else {
            testMessage = `❌ FAILED: Should be available at $${card.expectedPrice}, got ${result.isAvailable ? '$' + result.currentPrice : 'N/A'}`;
          }
        } else if (card.issue.includes('should be base price')) {
          if (result.success && result.isAvailable &&
              Math.abs(result.currentPrice - card.expectedPrice) < 1 &&
              !result.isOnSale) {
            testPassed = true;
            testMessage = `✅ CORRECT: Product has correct base price $${result.currentPrice}, not on sale`;
            successCount++;
          } else {
            testMessage = `❌ FAILED: Should be base price $${card.expectedPrice}, got ${result.isOnSale ? 'sale' : 'base'} price $${result.currentPrice}`;
          }
        }

        console.log(`\n🎯 TEST VALIDATION: ${testMessage}`);

      } catch (error) {
        console.log(`💥 ERROR: ${error.message}`);
      }

      // Small delay between requests
      await new Promise(resolve => setTimeout(resolve, 3000));
    }

    await updater.closeBrowser();

    console.log('\n\n🎯 TEST SUMMARY');
    console.log('=' .repeat(50));
    console.log(`📊 Total Tests: ${totalTests}`);
    console.log(`✅ Successful Tests: ${successCount}`);
    console.log(`❌ Failed Tests: ${totalTests - successCount}`);
    console.log(`📈 Success Rate: ${((successCount / totalTests) * 100).toFixed(1)}%`);

    if (successCount === totalTests) {
      console.log('\n🎉 ALL TESTS PASSED! Price detection logic is working correctly.');
    } else {
      console.log('\n⚠️ Some tests failed - need to improve price detection logic.');
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
  }

  process.exit(0);
}

testNewProblemCards().catch(console.error);