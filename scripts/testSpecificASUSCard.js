const { connectToDatabase, getDatabase } = require('../config/database');
const { AmazonScraperTargeted } = require('./scrapers/amazonScraperTargeted');

async function testSpecificASUSCard() {
  console.log('🔍 TESTING UPDATED LOGIC ON PROBLEMATIC ASUS CARD\n');

  try {
    await connectToDatabase();
    const db = getDatabase();

    // Find the specific problematic ASUS card
    const gpu = await db.collection('gpus_rtx_4070').findOne({
      name: { $regex: 'ASUS Dual GeForce RTX™ 4070 EVO OC Edition', $options: 'i' },
      sourceUrl: { $regex: 'B0CQ', $options: 'i' } // The problematic URL with B0CQ
    });

    if (!gpu) {
      console.log('❌ Could not find the problematic ASUS card');
      process.exit(1);
    }

    console.log('📋 Found problematic GPU:');
    console.log(`   Name: ${gpu.name}`);
    console.log(`   Current Stored Price: $${gpu.currentPrice}`);
    console.log(`   URL: ${gpu.sourceUrl}`);
    console.log('');

    const scraper = new AmazonScraperTargeted();

    console.log('🎯 Testing with UPDATED Targeted Logic...');
    const result = await scraper.scrapeTargeted(gpu.sourceUrl);

    console.log('\n📊 UPDATED LOGIC RESULTS:');
    console.log('=' .repeat(50));

    if (result.success) {
      console.log(`✅ DETECTION SUCCESS:`);
      console.log(`   Detected Price: $${result.currentPrice}`);
      console.log(`   Detection Method: ${result.detectionMethod}`);
      console.log(`   Price Source: ${result.priceSource}`);
      console.log(`   Base Price: $${result.basePrice}`);

      // Compare with stored price
      const diff = Math.abs(result.currentPrice - gpu.currentPrice);
      const status = diff < 0.01 ? '✅ SAME' : diff <= 5 ? '⚠️ CLOSE' : '❌ DIFFERENT';
      console.log(`   Stored vs New: ${status} (diff: $${diff.toFixed(2)})`);

      // Show debug info
      if (result.debugInfo && result.debugInfo.length > 0) {
        console.log('\n🔍 Debug Information:');
        result.debugInfo.forEach((info, i) => {
          console.log(`   ${i + 1}. ${info}`);
        });
      }

      // Expected behavior check
      if (result.currentPrice === 589.41) {
        console.log('\n⚠️ WARNING: Still detecting $589.41 - this might be the correct current price');
        console.log('   The $469.99 price might be from a carousel or outdated');
      } else if (result.currentPrice === 469.99) {
        console.log('\n✅ SUCCESS: Now detecting $469.99 - carousel price avoided!');
      } else {
        console.log(`\n🤔 UNEXPECTED: Detected $${result.currentPrice} - investigate further`);
      }

    } else {
      console.log(`❌ DETECTION FAILED:`);
      console.log(`   Error: ${result.error || 'Unknown error'}`);
      if (result.debugInfo) {
        console.log('   Debug:', result.debugInfo.join(', '));
      }
    }

    await scraper.close();

  } catch (error) {
    console.error('❌ Test failed:', error);
  }

  process.exit(0);
}

testSpecificASUSCard().catch(console.error);