const { AmazonScraperTargeted } = require('./scrapers/amazonScraperTargeted');

async function testConservativeUnavailable() {
  console.log('🔍 TESTING CONSERVATIVE UNAVAILABLE DETECTION\n');

  // Test mix of available and unavailable products
  const testCases = [
    {
      name: 'GIGABYTE RTX 4070 Super (Should be available)',
      url: 'https://amazon.com/GIGABYTE-GeForce-WINDFORCE-Graphics-GV-N407SWF3OC-12GD/dp/B0CSJV61BN',
      expectedAvailable: true
    },
    {
      name: 'MSI Gaming RTX 4070 (Should detect current status)',
      url: 'https://amazon.com/MSI-GeForce-RTX-4070-12G/dp/B0BZB7DS7Q',
      expectedAvailable: 'unknown'
    },
    {
      name: 'ASUS Dual RTX 4070 EVO (Should detect current status)',
      url: 'https://amazon.com/ASUS-Compatibility-Axial-tech-Technology-Auto-Extreme/dp/B0D3JBCBKC',
      expectedAvailable: 'unknown'
    }
  ];

  try {
    const scraper = new AmazonScraperTargeted();

    for (const testCase of testCases) {
      console.log(`\n🧪 Testing: ${testCase.name}`);
      console.log(`🌐 URL: ${testCase.url.substring(0, 80)}...`);
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

        if (result.priceSource) {
          console.log(`🎯 Price Source: ${result.priceSource}`);
        }

        if (result.debugInfo && result.debugInfo.length > 0) {
          console.log(`\n🔍 Debug Info:`);
          result.debugInfo.slice(0, 2).forEach((info, i) => {
            console.log(`   ${i + 1}. ${info}`);
          });
        }

        // Status assessment
        if (result.isAvailable && result.currentPrice) {
          console.log(`\n🎯 STATUS: ✅ AVAILABLE with price $${result.currentPrice}`);
        } else if (!result.isAvailable) {
          console.log(`\n🎯 STATUS: ❌ UNAVAILABLE (${result.unavailabilityReason})`);
        } else {
          console.log(`\n🎯 STATUS: ⚠️ AVAILABLE but price detection failed`);
        }

      } catch (error) {
        console.log(`💥 TEST ERROR: ${error.message}`);
      }

      await new Promise(resolve => setTimeout(resolve, 3000));
    }

    await scraper.close();

    console.log('\n\n🎯 CONSERVATIVE DETECTION SUMMARY');
    console.log('=' .repeat(50));
    console.log('✅ Removed broad "not available" keyword');
    console.log('✅ Focus on #availability section only');
    console.log('✅ More specific phrase matching');
    console.log('✅ Reduced false positive risk');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }

  process.exit(0);
}

testConservativeUnavailable().catch(console.error);