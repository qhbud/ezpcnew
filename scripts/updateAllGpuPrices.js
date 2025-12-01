const { PriceUpdater } = require('./priceUpdater');

// List of all GPU collections based on server logs
const GPU_COLLECTIONS = [
  'gpus_rtx_4070_super',
  'gpus_arc_a770',
  'gpus_rtx_4070',
  'gpus_rtx_3080',
  'gpus_rx_6600_xt',
  'gpus_rx_6500_xt',
  'gpus_rx_6900_xt',
  'gpus_rtx_3070_ti',
  'gpus_rtx_5060',
  'gpus_rtx_3080_ti',
  'gpus_rtx_5070',
  'gpus_rtx_4080_super',
  'gpus_rx_6700_xt',
  'gpus_rtx_3090_ti',
  'gpus_rx_7900_gre',
  'gpus_rx_6800',
  'gpus_rtx_3050',
  'gpus_rtx_4090',
  'gpus_rx_7900_xtx',
  'gpus_rtx_4060_ti',
  'gpus_rtx_5060_ti',
  'gpus_rx_7700_xt',
  'gpus_rx_6800_xt',
  'gpus_rx_6750_xt',
  'gpus_rx_7600',
  'gpus_rtx_3070',
  'gpus_rtx_4070_ti',
  'gpus_rx_7600_xt',
  'gpus_rtx_5080',
  'gpus_arc_a750',
  'gpus_rtx_5090',
  'gpus_rx_7800_xt',
  'gpus_rx_6600',
  'gpus_rtx_4060',
  'gpus_rtx_4080',
  'gpus_rtx_4070_ti_super',
  'gpus_arc_a380',
  'gpus_rx_6400',
  'gpus_rtx_3060_ti',
  'gpus_rtx_5070_ti',
  'gpus_rtx_3090',
  'gpus_rx_7900_xt',
  'gpus_rtx_3060',
  'gpus_arc_a580',
  'gpus_rx_6950_xt'
];

async function updateAllGpuPrices() {
  const updater = new PriceUpdater();

  try {
    await updater.connect();
    await updater.initializeBrowser();

    console.log(`\n🎮 Starting price updates for ${GPU_COLLECTIONS.length} GPU collections...\n`);

    let totalProcessed = 0;
    let totalChanged = 0;
    let totalErrors = 0;

    for (const collection of GPU_COLLECTIONS) {
      console.log(`\n${'='.repeat(60)}`);
      console.log(`📦 Processing collection: ${collection}`);
      console.log(`${'='.repeat(60)}\n`);

      try {
        // Update all items with sourceURLs in this collection
        const results = await updater.updateMultipleItems(
          collection,
          { sourceUrl: { $exists: true, $ne: null } },
          0 // 0 means no limit
        );

        const changed = results.filter(r => r.priceChanged && !r.error).length;
        const errors = results.filter(r => r.error).length;

        totalProcessed += results.length;
        totalChanged += changed;
        totalErrors += errors;

        console.log(`\n✅ Collection ${collection} complete:`);
        console.log(`   - Processed: ${results.length}`);
        console.log(`   - Changed: ${changed}`);
        console.log(`   - Errors: ${errors}`);

      } catch (error) {
        console.error(`❌ Failed to process collection ${collection}:`, error.message);
        totalErrors++;
      }
    }

    console.log(`\n${'='.repeat(60)}`);
    console.log(`📊 FINAL SUMMARY`);
    console.log(`${'='.repeat(60)}`);
    console.log(`Total Collections: ${GPU_COLLECTIONS.length}`);
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
