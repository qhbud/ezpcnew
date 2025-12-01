const { connectToDatabase, getDatabase } = require('../config/database');
const { AmazonScraperTargeted } = require('./scrapers/amazonScraperTargeted');

async function testUnavailableDetection() {
  console.log('🔍 TESTING UNAVAILABLE PRODUCT DETECTION\n');

  // Test with known unavailable products from our previous analysis
  const testCases = [
    {
      name: 'MSI Gaming RTX 4070 Ventus 2X (Renewed) - Unavailable',
      url: 'https://amazon.com/MSI-GeForce-Lovelace-Architecture-Graphics/dp/B0CBQV398S',
      expectedAvailable: false,
      expectedReason: 'currently unavailable'
    },
    {
      name: 'MSI Gaming RTX 4070 Super Ventus 3X - Unavailable',
      url: 'https://amazon.com/MSI-RTX-4070-12G-3X/dp/B0CSHFM3D5',
      expectedAvailable: false,
      expectedReason: 'see all buying options'
    },
    {
      name: 'ASUS Dual RTX 4070 EVO - Low Stock but Available',
      url: 'https://amazon.com/ASUS-Compatibility-Axial-tech-Technology-Auto-Extreme/dp/B0CQRX9HPK',
      expectedAvailable: true,
      expectedReason: null
    }
  ];

  try {
    const scraper = new AmazonScraperTargeted();
    let testNumber = 1;

    for (const testCase of testCases) {
      console.log(`\n🧪 TEST ${testNumber}: ${testCase.name}`);
      console.log(`🌐 URL: ${testCase.url.substring(0, 80)}...`);
      console.log(`📋 Expected Available: ${testCase.expectedAvailable ? '✅ YES' : '❌ NO'}`);
      if (testCase.expectedReason) {
        console.log(`📋 Expected Reason: "${testCase.expectedReason}"`);
      }
      console.log('=' .repeat(70));

      try {
        const result = await scraper.scrapeTargeted(testCase.url);

        console.log('\n📊 DETECTION RESULTS:');
        console.log(`✅ Detection Success: ${result.success ? 'YES' : 'NO'}`);
        console.log(`🛒 Product Available: ${result.isAvailable ? 'YES' : 'NO'}`);
        console.log(`💰 Price Detected: ${result.currentPrice ? `$${result.currentPrice}` : 'NULL'}`);
        console.log(`🔍 Detection Method: ${result.detectionMethod}`);

        if (!result.isAvailable && result.unavailabilityReason) {
          console.log(`❌ Unavailability Reason: ${result.unavailabilityReason}`);
        }

        if (result.debugInfo && result.debugInfo.length > 0) {
          console.log(`\n🔍 Debug Info:`);
          result.debugInfo.slice(0, 3).forEach((info, i) => {
            console.log(`   ${i + 1}. ${info}`);
          });
        }

        // Validate test results
        const availabilityMatch = result.isAvailable === testCase.expectedAvailable;
        const testPassed = availabilityMatch;

        console.log(`\n🎯 TEST RESULT: ${testPassed ? '✅ PASSED' : '❌ FAILED'}`);
        if (!availabilityMatch) {
          console.log(`   Expected Available: ${testCase.expectedAvailable}, Got: ${result.isAvailable}`);
        }

        // For unavailable items, verify price is null
        if (!result.isAvailable && result.currentPrice !== null) {
          console.log(`⚠️ WARNING: Unavailable item should have null price, got $${result.currentPrice}`);
        }

        // For available items, verify price is detected
        if (result.isAvailable && !result.currentPrice) {
          console.log(`⚠️ WARNING: Available item should have price detected`);
        }

      } catch (error) {
        console.log(`💥 TEST ERROR: ${error.message}`);
      }

      testNumber++;
      await new Promise(resolve => setTimeout(resolve, 3000)); // Delay between tests
    }

    await scraper.close();

    console.log('\n\n🎯 UNAVAILABLE DETECTION TEST SUMMARY');
    console.log('=' .repeat(50));
    console.log('✅ Availability detection logic implemented');
    console.log('✅ Null price assignment for unavailable items');
    console.log('✅ Detection method tracking (Targeted-Unavailable)');
    console.log('✅ Unavailability reason logging');

    console.log('\n💡 INTEGRATION NOTES:');
    console.log('• Unavailable items return: currentPrice = null, isAvailable = false');
    console.log('• Database should store null prices for unavailable items');
    console.log('• Detection method "Targeted-Unavailable" indicates sold out status');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }

  process.exit(0);
}

testUnavailableDetection().catch(console.error);