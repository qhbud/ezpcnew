const { PriceUpdater } = require('./priceUpdater');

async function testSingleGigabyteCard() {
  console.log('🔍 TESTING SINGLE GIGABYTE CARD WITH ACTUAL SCRAPER\n');

  const cardUrl = 'https://amazon.com/GIGABYTE-MAX-Covered-GV-R69XTAORUS-M-16GD-REV2-0/dp/B09QHW1BZV';

  try {
    const updater = new PriceUpdater();
    await updater.connect();
    await updater.initializeBrowser();

    console.log('🎯 Testing with our actual scrapeAmazonTargeted method...');

    const result = await updater.scrapeAmazonTargeted(cardUrl);

    console.log('\n📊 SCRAPER RESULT:');
    console.log('=' .repeat(50));
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
      console.log(`\n🐛 DEBUG INFO:`);
      result.debugInfo.forEach((info, i) => {
        console.log(`   ${i + 1}. ${info}`);
      });
    }

    console.log(`\n🎯 EXPECTED: Product should be UNAVAILABLE with NULL price`);
    console.log(`🎯 ACTUAL: Product is ${result.isAvailable !== false ? 'AVAILABLE' : 'UNAVAILABLE'} with ${result.currentPrice !== null ? '$' + result.currentPrice : 'NULL'} price`);

    const testPassed = !result.isAvailable && result.currentPrice === null;
    console.log(`\n✅ TEST ${testPassed ? 'PASSED' : 'FAILED'}: ${testPassed ? 'Correctly identified as unavailable' : 'Should be unavailable but detected as available'}`);

    await updater.closeBrowser();

  } catch (error) {
    console.error('❌ Test failed:', error);
  }

  process.exit(0);
}

testSingleGigabyteCard().catch(console.error);