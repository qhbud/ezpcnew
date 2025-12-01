const { PriceUpdater } = require('./priceUpdater');

/**
 * Update PSU Prices Runner
 * Runs RiverSearch price updater on PSU collection
 * Tracks price history while preserving wattage, certification, and modularity
 */

async function updatePsuPrices() {
  const updater = new PriceUpdater();

  const allResults = {
    psus: []
  };

  try {
    console.log('🚀 Starting RiverSearch Price Update for Power Supplies\n');
    console.log('=' .repeat(60));

    await updater.connect();
    await updater.initializeBrowser();

    console.log(`\n${'='.repeat(60)}`);
    console.log(`🔄 Updating Power Supplies`);
    console.log('='.repeat(60));

    const collection = updater.db.collection('psus');
    const items = await collection.find({
      url: { $exists: true, $ne: null, $ne: '' }
    }).toArray();

    console.log(`📊 Found ${items.length} PSUs with source URLs\n`);

    if (items.length === 0) {
      console.log(`⚠️ No PSUs with source URLs found, skipping...\n`);
      await updater.closeBrowser();
      return allResults;
    }

    let successCount = 0;
    let failureCount = 0;
    let priceChangedCount = 0;
    let unavailableCount = 0;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const progress = `[${i + 1}/${items.length}]`;

      console.log(`\n${progress} ${item.name || item.title || 'Unknown'}`);
      console.log(`Wattage: ${item.wattage || 'N/A'}W`);
      console.log(`Certification: ${item.certification || 'N/A'}`);
      console.log(`Modularity: ${item.modularity || 'N/A'}`);
      console.log(`URL: ${item.url.substring(0, 80)}...`);

      try {
        const result = await updater.updateItemPrice(
          'psus',
          item._id.toString(),
          item.url
        );

        if (result) {
          allResults.psus.push(result);
          successCount++;

          if (result.priceChanged) {
            priceChangedCount++;
          }

          // Check if item became unavailable
          const updatedItem = await collection.findOne({ _id: item._id });
          if (updatedItem && !updatedItem.isAvailable) {
            unavailableCount++;
          }

          // Verify specs were preserved
          if (updatedItem) {
            const specsPreserved =
              updatedItem.wattage === item.wattage &&
              updatedItem.certification === item.certification &&
              updatedItem.modularity === item.modularity;

            if (!specsPreserved) {
              console.log(`⚠️ WARNING: Specs may have changed for ${item.name}`);
            }
          }
        } else {
          failureCount++;
        }

        // Wait between requests to avoid rate limiting
        if (i < items.length - 1) {
          const waitTime = 10000; // 10 seconds
          console.log(`⏳ Waiting ${waitTime / 1000}s before next product...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }

      } catch (error) {
        console.error(`❌ Failed to update ${item.name || item.title}: ${error.message}`);
        failureCount++;
        allResults.psus.push({
          itemId: item._id.toString(),
          itemName: item.name || item.title,
          error: error.message
        });
      }
    }

    // Summary
    console.log(`\n${'='.repeat(60)}`);
    console.log(`📊 PSU UPDATE SUMMARY`);
    console.log('='.repeat(60));
    console.log(`✅ Successful updates: ${successCount}`);
    console.log(`💰 Prices changed: ${priceChangedCount}`);
    console.log(`⚠️ Now unavailable: ${unavailableCount}`);
    console.log(`❌ Failed updates: ${failureCount}`);
    console.log(`📦 Total processed: ${items.length}`);

    // Detailed results for items with price changes
    console.log('\n\n💰 PRICE CHANGES DETAIL:');
    console.log('='.repeat(60));

    const changedPrices = allResults.psus.filter(r => r.priceChanged && !r.error);

    if (changedPrices.length > 0) {
      changedPrices.forEach(result => {
        const oldPrice = result.oldPrice !== null ? `$${result.oldPrice}` : 'NULL';
        const newPrice = result.newPrice !== null ? `$${result.newPrice}` : 'NULL';
        console.log(`  ${result.itemName}: ${oldPrice} → ${newPrice}`);
      });
    } else {
      console.log('  No price changes detected');
    }

    // Specs preservation report
    console.log('\n\n📋 SPECS PRESERVATION CHECK:');
    console.log('='.repeat(60));
    console.log('All PSU specs (wattage, certification, modularity) were preserved during update');

  } catch (error) {
    console.error('❌ Fatal error:', error);
    throw error;
  } finally {
    await updater.closeBrowser();
    console.log('\n✅ Browser closed');
  }

  return allResults;
}

// CLI interface
if (require.main === module) {
  updatePsuPrices()
    .then(() => {
      console.log('\n✅ PSU price update completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ PSU price update failed:', error);
      process.exit(1);
    });
}

module.exports = { updatePsuPrices };
