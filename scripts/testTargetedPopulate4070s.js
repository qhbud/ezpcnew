const { connectToDatabase, getDatabase } = require('../config/database');
const { AmazonScraperTargeted } = require('./scrapers/amazonScraperTargeted');

async function testTargetedPopulate4070s() {
  console.log('🎯 TESTING TARGETED POPULATE METHOD ON ALL RTX 4070 CARDS\n');

  try {
    await connectToDatabase();
    const db = getDatabase();

    // Get all RTX 4070 collections
    const rtx4070Collections = [
      'gpus_rtx_4070',
      'gpus_rtx_4070_super'
    ];

    const scraper = new AmazonScraperTargeted();
    let totalTested = 0;
    let successful = 0;
    let failed = 0;

    for (const collectionName of rtx4070Collections) {
      console.log(`\n📋 Testing ${collectionName.toUpperCase()}:`);
      console.log('=' .repeat(60));

      // Get all GPUs with Amazon URLs
      const gpus = await db.collection(collectionName).find({
        sourceUrl: { $exists: true, $ne: null, $regex: /amazon\.com/i }
      }).toArray();

      console.log(`Found ${gpus.length} Amazon GPUs in ${collectionName}`);

      for (const gpu of gpus) {
        totalTested++;
        console.log(`\n🔬 Testing GPU ${totalTested}:`);
        console.log(`   Name: ${gpu.name.substring(0, 60)}...`);
        console.log(`   Current Price: $${gpu.currentPrice}`);
        console.log(`   URL: ${gpu.sourceUrl.substring(0, 80)}...`);

        try {
          const result = await scraper.scrapeTargeted(gpu.sourceUrl);

          if (result.success) {
            successful++;
            const priceDiff = Math.abs(result.currentPrice - gpu.currentPrice);
            const status = priceDiff < 0.01 ? '✅ SAME' : priceDiff <= 5 ? '⚠️ CLOSE' : '❌ DIFFERENT';

            console.log(`   🎯 TARGETED SUCCESS:`);
            console.log(`      Detected Price: $${result.currentPrice}`);
            console.log(`      Detection Method: ${result.detectionMethod}`);
            console.log(`      Price Source: ${result.priceSource}`);
            console.log(`      Stored vs Detected: ${status} (diff: $${priceDiff.toFixed(2)})`);

            if (result.debugInfo && result.debugInfo.length > 0) {
              console.log(`      Debug: ${result.debugInfo[0]}`);
            }
          } else {
            failed++;
            console.log(`   ❌ TARGETED FAILED:`);
            console.log(`      Error: ${result.error || 'No price detected'}`);
            if (result.debugInfo && result.debugInfo.length > 0) {
              console.log(`      Debug: ${result.debugInfo.join(', ')}`);
            }
          }

        } catch (error) {
          failed++;
          console.log(`   💥 EXCEPTION: ${error.message}`);
        }

        // Small delay between requests
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    await scraper.close();

    // Summary
    console.log('\n\n🎯 TARGETED POPULATE TEST SUMMARY');
    console.log('=' .repeat(50));
    console.log(`📊 Total GPUs Tested: ${totalTested}`);
    console.log(`✅ Successful Detections: ${successful}`);
    console.log(`❌ Failed Detections: ${failed}`);
    console.log(`📈 Success Rate: ${((successful / totalTested) * 100).toFixed(1)}%`);

    if (successful > 0) {
      console.log('\n🎉 Targeted Populate method shows promising results!');
      console.log('💡 Consider implementing this as an alternative to Perfect method');
    } else {
      console.log('\n⚠️ Targeted Populate needs refinement');
      console.log('🔧 Review the targeted selectors and strategies');
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
  }

  process.exit(0);
}

// Expected test results for known cards
const expectedResults = {
  'MSI Gaming GeForce RTX 4070 12GB GDRR6X': 477.22,
  'ASUS Dual GeForce RTX™ 4070 EVO OC Edition': 469.99,
  'GIGABYTE GeForce RTX 4070 Super WINDFORCE OC 12G': 845.98,
  'MSI Gaming RTX 4070 Super 12G Ventus 2X OC': 499.00
};

testTargetedPopulate4070s().catch(console.error);