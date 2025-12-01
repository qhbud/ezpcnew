const { connectToDatabase, getDatabase } = require('../config/database');
const { AmazonScraperTargeted } = require('./scrapers/amazonScraperTargeted');

async function testTargetedPopulate4080s() {
  console.log('🎯 TESTING TARGETED POPULATE METHOD ON ALL RTX 4080 CARDS\n');

  try {
    await connectToDatabase();
    const db = getDatabase();

    // Get all RTX 4080 collections
    const rtx4080Collections = [
      'gpus_rtx_4080',
      'gpus_rtx_4080_super'
    ];

    const scraper = new AmazonScraperTargeted();
    let totalTested = 0;
    let successful = 0;
    let failed = 0;

    for (const collectionName of rtx4080Collections) {
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
            const priceDiff = result.currentPrice !== null ? Math.abs(result.currentPrice - gpu.currentPrice) : gpu.currentPrice;

            if (result.currentPrice === null) {
              console.log(`   🎯 TARGETED SUCCESS (UNAVAILABLE):`);
              console.log(`      Detected Price: NULL`);
              console.log(`      Detection Method: ${result.detectionMethod}`);
              console.log(`      Unavailability Reason: ${result.unavailabilityReason}`);
              console.log(`      Stored vs Detected: ❌ DIFFERENT (was $${gpu.currentPrice}, now NULL)`);
            } else {
              const status = priceDiff < 0.01 ? '✅ SAME' : priceDiff <= 5 ? '⚠️ CLOSE' : '❌ DIFFERENT';
              console.log(`   🎯 TARGETED SUCCESS (AVAILABLE):`);
              console.log(`      Detected Price: $${result.currentPrice}`);
              console.log(`      Detection Method: ${result.detectionMethod}`);
              console.log(`      Price Source: ${result.priceSource}`);
              console.log(`      Stored vs Detected: ${status} (diff: $${priceDiff.toFixed(2)})`);
            }

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
    console.log('\n\n🎯 TARGETED POPULATE RTX 4080 TEST SUMMARY');
    console.log('=' .repeat(50));
    console.log(`📊 Total GPUs Tested: ${totalTested}`);
    console.log(`✅ Successful Detections: ${successful}`);
    console.log(`❌ Failed Detections: ${failed}`);
    console.log(`📈 Success Rate: ${((successful / totalTested) * 100).toFixed(1)}%`);

    if (successful > 0) {
      console.log('\n🎉 Targeted Populate method working on RTX 4080s!');
      console.log('💡 Review any unavailable items to confirm they should be null');
    } else {
      console.log('\n⚠️ No successful detections - may need specific 4080 adjustments');
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
  }

  process.exit(0);
}

testTargetedPopulate4080s().catch(console.error);