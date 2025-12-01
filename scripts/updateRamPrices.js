const { PriceUpdater } = require('./priceUpdater');

/**
 * Update RAM Prices Runner
 * Runs RiverSearch price updater on RAM modules
 */

async function updateRamPrices() {
  const updater = new PriceUpdater();

  try {
    console.log('🚀 Starting RiverSearch Price Update for RAM\n');
    console.log('=' .repeat(60));

    await updater.connect();
    await updater.initializeBrowser();

    // Get all RAM modules from the database
    const collection = updater.db.collection('rams');
    const rams = await collection.find({
      sourceUrl: { $exists: true, $ne: null }
    }).toArray();

    console.log(`\n📦 Found ${rams.length} RAM modules with source URLs\n`);

    if (rams.length === 0) {
      console.log('⚠️ No RAM modules with source URLs found');
      return;
    }

    const results = [];
    let successCount = 0;
    let failCount = 0;
    let priceChangedCount = 0;

    for (let i = 0; i < rams.length; i++) {
      const ram = rams[i];

      console.log(`\n${'='.repeat(60)}`);
      console.log(`🔄 Processing ${i + 1}/${rams.length}: ${ram.name}`);
      console.log('='.repeat(60));

      try {
        const result = await updater.updateItemPrice(
          'rams',
          ram._id.toString(),
          ram.sourceUrl
        );

        if (result) {
          results.push(result);
          successCount++;

          if (result.priceChanged) {
            priceChangedCount++;
          }

          console.log(`✅ Successfully updated ${ram.name}`);
          if (result.newPrice) {
            console.log(`💰 Current Price: $${result.newPrice}`);
          } else {
            console.log(`⚠️ Product appears to be unavailable`);
          }
        }

        // Add delay between requests to avoid rate limiting
        if (i < rams.length - 1) {
          console.log('⏳ Waiting 10 seconds before next product...');
          await new Promise(resolve => setTimeout(resolve, 10000));
        }

      } catch (error) {
        console.error(`❌ Failed to update ${ram.name}:`, error.message);
        failCount++;
        results.push({
          itemId: ram._id.toString(),
          itemName: ram.name,
          error: error.message
        });
      }
    }

    // Print summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 UPDATE SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total RAM modules processed: ${rams.length}`);
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
      console.log('\n✅ UNCHANGED PRICES (first 10):');
      unchanged.slice(0, 10).forEach(r => {
        if (r.newPrice === null) {
          console.log(`  • ${r.itemName}: Still unavailable`);
        } else {
          console.log(`  • ${r.itemName}: $${r.newPrice}`);
        }
      });
      if (unchanged.length > 10) {
        console.log(`  ... and ${unchanged.length - 10} more`);
      }
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
  updateRamPrices()
    .then(() => {
      console.log('\n✅ RAM price update completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ RAM price update failed:', error);
      process.exit(1);
    });
}

module.exports = { updateRamPrices };
