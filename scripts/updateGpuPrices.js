const { PriceUpdater } = require('./priceUpdater');

/**
 * Update GPU Prices Runner
 * Runs RiverSearch price updater on all GPU collections
 */

async function updateGpuPrices() {
  const updater = new PriceUpdater();

  const allResults = {
    gpus: []
  };

  try {
    console.log('🚀 Starting RiverSearch Price Update for GPUs\n');
    console.log('=' .repeat(60));

    await updater.connect();
    await updater.initializeBrowser();

    // All GPUs now live in the single `gpus` collection; each doc carries a
    // `modelCollection` field (e.g. 'gpus_rtx_4090') indicating its original model group.
    const modelGroups = await updater.db.collection('gpus').distinct('modelCollection');

    console.log(`\n📦 Found ${modelGroups.length} GPU model groups`);

    console.log(`\n${'='.repeat(60)}`);
    console.log(`🔄 Updating GPUs`);
    console.log('='.repeat(60));

    // Collect all GPU items in a single pass over the `gpus` collection
    const collection = updater.db.collection('gpus');
    const items = await collection.find({
      sourceUrl: { $exists: true, $ne: null, $ne: '' }
    }).toArray();

    // Operate on the single `gpus` collection for every item
    items.forEach(item => item._collectionName = 'gpus');

    console.log(`📊 Found ${items.length} GPUs with source URLs\n`);

    if (items.length === 0) {
      console.log(`⚠️ No GPUs with source URLs found, skipping...\n`);
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
      console.log(`Collection: ${item._collectionName}`);
      console.log(`URL: ${item.sourceUrl.substring(0, 80)}...`);

      try {
        const result = await updater.updateItemPrice(
          item._collectionName, // Use the actual collection name
          item._id.toString(),
          item.sourceUrl
        );

        if (result) {
          allResults.gpus.push(result);
          successCount++;

          if (result.priceChanged) {
            priceChangedCount++;
          }

          // Check if item became unavailable
          const itemCollection = updater.db.collection(item._collectionName);
          const updatedItem = await itemCollection.findOne({ _id: item._id });
          if (updatedItem && !updatedItem.isAvailable) {
            unavailableCount++;
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
        allResults.gpus.push({
          itemId: item._id.toString(),
          itemName: item.name || item.title,
          error: error.message
        });
      }
    }

    // Summary
    console.log(`\n${'='.repeat(60)}`);
    console.log(`📊 GPU UPDATE SUMMARY`);
    console.log('='.repeat(60));
    console.log(`✅ Successful updates: ${successCount}`);
    console.log(`💰 Prices changed: ${priceChangedCount}`);
    console.log(`⚠️ Now unavailable: ${unavailableCount}`);
    console.log(`❌ Failed updates: ${failureCount}`);
    console.log(`📦 Total processed: ${items.length}`);

    // Detailed results for items with price changes
    console.log('\n\n💰 PRICE CHANGES DETAIL:');
    console.log('='.repeat(60));

    const changedPrices = allResults.gpus.filter(r => r.priceChanged && !r.error);

    if (changedPrices.length > 0) {
      changedPrices.forEach(result => {
        const oldPrice = result.oldPrice !== null ? `$${result.oldPrice}` : 'NULL';
        const newPrice = result.newPrice !== null ? `$${result.newPrice}` : 'NULL';
        console.log(`  ${result.itemName}: ${oldPrice} → ${newPrice}`);
      });
    } else {
      console.log('  No price changes detected');
    }

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
async function main() {
  const args = process.argv.slice(2);

  if (args.includes('--help') || args.includes('-h')) {
    console.log('RiverSearch Price Updater for GPUs');
    console.log('');
    console.log('Usage: node updateGpuPrices.js [options]');
    console.log('');
    console.log('This script will update prices for all GPUs across all GPU collections.');
    console.log('');
    console.log('The script uses RiverSearch advanced price detection for Amazon URLs');
    console.log('and includes retry logic, sale detection, and availability tracking.');
    console.log('');
    console.log('Note: This may take a while depending on the number of items.');
    console.log('      There is a 10-second delay between each item to avoid rate limiting.');
    return;
  }

  try {
    const results = await updateGpuPrices();
    console.log('\n✅ GPU price updates completed successfully!');
  } catch (error) {
    console.error('\n❌ GPU price update failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main()
    .then(() => {
      console.log('\n✅ Script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Script failed:', error);
      process.exit(1);
    });
}

module.exports = { updateGpuPrices };
