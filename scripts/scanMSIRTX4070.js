const { connectToDatabase, getDatabase } = require('../config/database');
const { PriceUpdater } = require('./priceUpdater');

async function scanMSIRTX4070() {
  await connectToDatabase();
  const db = getDatabase();

  console.log('🔍 Scanning MSI Gaming GeForce RTX 4070 12GB GDRR6X...');

  // Find the specific GPU
  const gpu = await db.collection('gpus_rtx_4070').findOne({
    name: { $regex: 'MSI Gaming GeForce RTX 4070 12GB GDRR6X.*Extreme Clock.*2520 MHz', $options: 'i' }
  });

  if (!gpu) {
    console.log('❌ GPU not found in database');
    process.exit(1);
  }

  console.log(`📋 Found GPU: ${gpu.name}`);
  console.log(`🌐 URL: ${gpu.sourceUrl}`);
  console.log(`💰 Current stored price: $${gpu.currentPrice}`);
  console.log(`📅 Last updated: ${gpu.updatedAt || 'Never'}`);
  console.log('');

  // Scan with Perfect method
  const updater = new PriceUpdater();

  try {
    await updater.connect();
    await updater.initializeBrowser();

    console.log('🎯 Scanning with Perfect detection method...');

    const result = await updater.scrapeAmazonPerfect(gpu.sourceUrl);

    if (result.success) {
      console.log(`🎯 PERFECT DETECTION RESULT:`);
      console.log(`   Detected Price: $${result.currentPrice}`);
      console.log(`   Base Price: $${result.basePrice}`);
      console.log(`   Sale Price: $${result.salePrice || 'N/A'}`);
      console.log(`   On Sale: ${result.isOnSale ? 'Yes' : 'No'}`);
      console.log(`   Detection Source: ${result.priceSource}`);
      console.log(`   Detection Method: ${result.detectionMethod}`);

      const diff = Math.abs(result.currentPrice - gpu.currentPrice);
      if (diff > 0.5) {
        console.log(`\n📊 PRICE CHANGE DETECTED:`);
        console.log(`   Stored: $${gpu.currentPrice}`);
        console.log(`   Current: $${result.currentPrice}`);
        console.log(`   Difference: $${diff.toFixed(2)}`);

        console.log(`\n🔄 Would you like to update the database with this new price?`);
        console.log(`   Expected price: $477.22`);
        console.log(`   Current detection: $${result.currentPrice}`);
        const expectedDiff = Math.abs(result.currentPrice - 477.22);
        console.log(`   Difference from expected: $${expectedDiff.toFixed(2)}`);

      } else {
        console.log(`\n✅ Price unchanged: $${result.currentPrice}`);
      }
    } else {
      console.log(`❌ Failed to detect price: ${result.error || 'Unknown error'}`);
    }

  } catch (error) {
    console.error(`❌ Scanning failed: ${error.message}`);
  } finally {
    await updater.closeBrowser();
    process.exit(0);
  }
}

scanMSIRTX4070().catch(console.error);