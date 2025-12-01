const { PriceUpdater } = require('./priceUpdater');

/**
 * Update All Prices Runner
 * Runs RiverSearch price updater on all major component types:
 * - GPUs
 * - CPUs
 * - Motherboards
 * - RAM
 */

async function updateAllPrices() {
  const updater = new PriceUpdater();

  const allResults = {
    gpus: [],
    cpus: [],
    motherboards: [],
    rams: []
  };

  try {
    console.log('🚀 Starting RiverSearch Price Update for All Components\n');
    console.log('=' .repeat(60));

    await updater.connect();
    await updater.initializeBrowser();

    // Get all GPU collections (they're stored as gpus_rtx_4090, gpus_rx_7800_xt, etc.)
    const allCollections = await updater.db.listCollections().toArray();
    const gpuCollections = allCollections
      .filter(col => col.name.startsWith('gpus_'))
      .map(col => col.name);

    console.log(`\n📦 Found ${gpuCollections.length} GPU collections`);

    const componentTypes = [
      { type: 'gpus', collections: gpuCollections },
      { type: 'cpus', collections: ['cpus'] },
      { type: 'motherboards', collections: ['motherboards'] },
      { type: 'rams', collections: ['rams'] }
    ];

    for (const { type, collections } of componentTypes) {
      console.log(`\n${'='.repeat(60)}`);
      console.log(`🔄 Updating ${type.toUpperCase()}`);
      console.log('='.repeat(60));

      try {
        // Collect all items from all collections for this type
        let allItems = [];
        for (const collectionName of collections) {
          const collection = updater.db.collection(collectionName);
          const items = await collection.find({
            sourceUrl: { $exists: true, $ne: null, $ne: '' }
          }).toArray();

          // Add collection name to each item for later reference
          items.forEach(item => item._collectionName = collectionName);
          allItems = allItems.concat(items);
        }

        const items = allItems;

        console.log(`📊 Found ${items.length} ${type} with source URLs\n`);

        if (items.length === 0) {
          console.log(`⚠️ No ${type} with source URLs found, skipping...\n`);
          continue;
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
              allResults[type].push(result);
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
            allResults[type].push({
              itemId: item._id.toString(),
              itemName: item.name || item.title,
              error: error.message
            });
          }
        }

        // Summary for this component type
        console.log(`\n${'='.repeat(60)}`);
        console.log(`📊 ${type.toUpperCase()} UPDATE SUMMARY`);
        console.log('='.repeat(60));
        console.log(`✅ Successful updates: ${successCount}`);
        console.log(`💰 Prices changed: ${priceChangedCount}`);
        console.log(`⚠️ Now unavailable: ${unavailableCount}`);
        console.log(`❌ Failed updates: ${failureCount}`);
        console.log(`📦 Total processed: ${items.length}`);

      } catch (error) {
        console.error(`❌ Error updating ${type}:`, error.message);
      }
    }

    // Final summary across all component types
    console.log(`\n\n${'='.repeat(60)}`);
    console.log('🎯 FINAL SUMMARY - ALL COMPONENTS');
    console.log('='.repeat(60));

    let totalProcessed = 0;
    let totalSuccessful = 0;
    let totalPriceChanges = 0;
    let totalErrors = 0;

    for (const [type, results] of Object.entries(allResults)) {
      const successful = results.filter(r => !r.error).length;
      const errors = results.filter(r => r.error).length;
      const priceChanges = results.filter(r => r.priceChanged).length;

      totalProcessed += results.length;
      totalSuccessful += successful;
      totalPriceChanges += priceChanges;
      totalErrors += errors;

      console.log(`\n${type.toUpperCase()}:`);
      console.log(`  Total: ${results.length}`);
      console.log(`  Successful: ${successful}`);
      console.log(`  Price changes: ${priceChanges}`);
      console.log(`  Errors: ${errors}`);
    }

    console.log(`\n${'─'.repeat(60)}`);
    console.log(`TOTAL ACROSS ALL TYPES:`);
    console.log(`  Total processed: ${totalProcessed}`);
    console.log(`  Successful: ${totalSuccessful}`);
    console.log(`  Price changes: ${totalPriceChanges}`);
    console.log(`  Errors: ${totalErrors}`);
    console.log('='.repeat(60));

    // Detailed results for items with price changes
    console.log('\n\n💰 PRICE CHANGES DETAIL:');
    console.log('='.repeat(60));

    for (const [type, results] of Object.entries(allResults)) {
      const changedPrices = results.filter(r => r.priceChanged && !r.error);

      if (changedPrices.length > 0) {
        console.log(`\n${type.toUpperCase()}:`);
        changedPrices.forEach(result => {
          const oldPrice = result.oldPrice !== null ? `$${result.oldPrice}` : 'NULL';
          const newPrice = result.newPrice !== null ? `$${result.newPrice}` : 'NULL';
          console.log(`  ${result.itemName}: ${oldPrice} → ${newPrice}`);
        });
      }
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
    console.log('RiverSearch Price Updater for All Components');
    console.log('');
    console.log('Usage: node updateAllPrices.js [options]');
    console.log('');
    console.log('This script will update prices for:');
    console.log('  - GPUs');
    console.log('  - CPUs');
    console.log('  - Motherboards');
    console.log('  - RAM');
    console.log('');
    console.log('The script uses RiverSearch advanced price detection for Amazon URLs');
    console.log('and includes retry logic, sale detection, and availability tracking.');
    console.log('');
    console.log('Note: This may take a while depending on the number of items.');
    console.log('      There is a 10-second delay between each item to avoid rate limiting.');
    return;
  }

  try {
    const results = await updateAllPrices();
    console.log('\n✅ All price updates completed successfully!');
  } catch (error) {
    console.error('\n❌ Price update failed:', error);
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

module.exports = { updateAllPrices };
