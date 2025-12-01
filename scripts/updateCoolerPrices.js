const { PriceUpdater } = require('./priceUpdater');

/**
 * Update CPU Cooler Prices Runner
 * Runs RiverSearch price updater on CPU coolers
 */

async function updateCoolerPrices() {
  const updater = new PriceUpdater();

  try {
    console.log('🚀 Starting RiverSearch Price Update for CPU Coolers\n');
    console.log('=' .repeat(60));

    await updater.connect();
    await updater.initializeBrowser();

    // Get all coolers from the database
    const collection = updater.db.collection('coolers');
    const coolers = await collection.find({
      sourceUrl: { $exists: true, $ne: null }
    }).toArray();

    console.log(`\n📦 Found ${coolers.length} CPU coolers with source URLs\n`);

    if (coolers.length === 0) {
      console.log('⚠️ No coolers with source URLs found');
      return;
    }

    const results = [];
    let successCount = 0;
    let failCount = 0;
    let priceChangedCount = 0;

    for (let i = 0; i < coolers.length; i++) {
      const cooler = coolers[i];

      console.log(`\n${'='.repeat(60)}`);
      console.log(`🔄 Processing ${i + 1}/${coolers.length}: ${cooler.name}`);
      console.log('='.repeat(60));

      try {
        const result = await updater.updateItemPrice(
          'coolers',
          cooler._id.toString(),
          cooler.sourceUrl
        );

        if (result) {
          results.push(result);
          successCount++;

          if (result.priceChanged) {
            priceChangedCount++;
          }

          console.log(`✅ Successfully updated ${cooler.name}`);
          if (result.newPrice) {
            console.log(`💰 Current Price: $${result.newPrice}`);
          } else {
            console.log(`⚠️ Product appears to be unavailable`);
          }
        }

        // Add delay between requests to avoid rate limiting
        if (i < coolers.length - 1) {
          console.log('⏳ Waiting 10 seconds before next product...');
          await new Promise(resolve => setTimeout(resolve, 10000));
        }

      } catch (error) {
        console.error(`❌ Failed to update ${cooler.name}:`, error.message);
        failCount++;
        results.push({
          itemId: cooler._id.toString(),
          itemName: cooler.name,
          error: error.message
        });
      }
    }

    // Print summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 UPDATE SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total coolers processed: ${coolers.length}`);
    console.log(`✅ Successful updates: ${successCount}`);
    console.log(`❌ Failed updates: ${failCount}`);
    console.log(`💰 Price changes detected: ${priceChangedCount}`);
    console.log('='.repeat(60));

    // Print detailed results
    console.log('\n📋 DETAILED RESULTS:\n');

    const priceChanges = results.filter(r => r.priceChanged && !r.error);
    const unchanged = results.filter(r => !r.priceChanged && !r.error);
    const errors = results.filter(r => r.error);

    if (priceChanges.length > 0) {
      console.log('\n💰 PRICE CHANGES:');
      priceChanges.forEach(r => {
        if (r.newPrice === null) {
          console.log(`  • ${r.itemName}: $${r.oldPrice} → UNAVAILABLE`);
        } else if (r.oldPrice === null) {
          console.log(`  • ${r.itemName}: UNAVAILABLE → $${r.newPrice}`);
        } else {
          const change = r.newPrice - r.oldPrice;
          const changeSymbol = change > 0 ? '📈' : '📉';
          console.log(`  ${changeSymbol} ${r.itemName}: $${r.oldPrice} → $${r.newPrice} (${change > 0 ? '+' : ''}$${change.toFixed(2)})`);
        }
      });
    }

    if (unchanged.length > 0) {
      console.log('\n✅ UNCHANGED PRICES:');
      unchanged.forEach(r => {
        if (r.newPrice === null) {
          console.log(`  • ${r.itemName}: Still unavailable`);
        } else {
          console.log(`  • ${r.itemName}: $${r.newPrice}`);
        }
      });
    }

    if (errors.length > 0) {
      console.log('\n❌ ERRORS:');
      errors.forEach(r => {
        console.log(`  • ${r.itemName}: ${r.error}`);
      });
    }

  } catch (error) {
    console.error('❌ Update process failed:', error);
    throw error;
  } finally {
    await updater.closeBrowser();
  }
}

// Run the update
if (require.main === module) {
  updateCoolerPrices()
    .then(() => {
      console.log('\n✅ Cooler price update completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Cooler price update failed:', error);
      process.exit(1);
    });
}

module.exports = { updateCoolerPrices };
