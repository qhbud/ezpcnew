const { PriceUpdater } = require('./priceUpdater');

async function updateAllGpuPrices() {
  const updater = new PriceUpdater();

  try {
    await updater.connect();
    await updater.initializeBrowser();

    // All GPUs now live in the single `gpus` collection. Each doc carries a
    // `modelCollection` field (e.g. 'gpus_rtx_4090') with its original model group.
    const modelGroups = await updater.db.collection('gpus').distinct('modelCollection');

    console.log(`\n🎮 Starting price updates for ${modelGroups.length} GPU model groups...\n`);

    let totalProcessed = 0;
    let totalChanged = 0;
    let totalErrors = 0;

    for (const modelCollection of modelGroups) {
      console.log(`\n${'='.repeat(60)}`);
      console.log(`📦 Processing model group: ${modelCollection}`);
      console.log(`${'='.repeat(60)}\n`);

      try {
        // Update all items with sourceURLs in this model group, operating on the
        // single `gpus` collection filtered by the `modelCollection` field.
        const results = await updater.updateMultipleItems(
          'gpus',
          { modelCollection, sourceUrl: { $exists: true, $ne: null } },
          0 // 0 means no limit
        );

        const changed = results.filter(r => r.priceChanged && !r.error).length;
        const errors = results.filter(r => r.error).length;

        totalProcessed += results.length;
        totalChanged += changed;
        totalErrors += errors;

        console.log(`\n✅ Model group ${modelCollection} complete:`);
        console.log(`   - Processed: ${results.length}`);
        console.log(`   - Changed: ${changed}`);
        console.log(`   - Errors: ${errors}`);

      } catch (error) {
        console.error(`❌ Failed to process model group ${modelCollection}:`, error.message);
        totalErrors++;
      }
    }

    console.log(`\n${'='.repeat(60)}`);
    console.log(`📊 FINAL SUMMARY`);
    console.log(`${'='.repeat(60)}`);
    console.log(`Total Model Groups: ${modelGroups.length}`);
    console.log(`Total GPUs Processed: ${totalProcessed}`);
    console.log(`Total Prices Changed: ${totalChanged}`);
    console.log(`Total Errors: ${totalErrors}`);
    console.log(`${'='.repeat(60)}\n`);

  } catch (error) {
    console.error('❌ Price update failed:', error);
    throw error;
  } finally {
    await updater.closeBrowser();
  }
}

// Run the script
if (require.main === module) {
  updateAllGpuPrices()
    .then(() => {
      console.log('\n✅ All GPU price updates completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Price update failed:', error);
      process.exit(1);
    });
}

module.exports = { updateAllGpuPrices };
