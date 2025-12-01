const { PriceUpdater } = require('./priceUpdater');
const Logger = require('./utils/logger');

async function updatePsuStoragePrices() {
    const collections = ['psus', 'storages'];
    const updater = new PriceUpdater();

    Logger.info('🔄 Starting price history update for PSUs and Storages...\n');
    Logger.info(`Collections to update: ${collections.join(', ')}\n`);

    const results = {};

    try {
        await updater.connect();
        await updater.initializeBrowser();

        for (const collection of collections) {
            Logger.info(`\n${'='.repeat(80)}`);
            Logger.info(`📦 Updating ${collection.toUpperCase()}`);
            Logger.info(`${'='.repeat(80)}\n`);

            try {
                // Use 'url' field instead of 'sourceUrl' for these collections
                const collectionResults = await updater.updateMultipleItems(
                    collection,
                    { url: { $exists: true, $ne: null } },
                    999999,
                    'url' // Specify the URL field name
                );

                results[collection] = {
                    total: collectionResults.length,
                    success: collectionResults.filter(r => !r.error).length,
                    errors: collectionResults.filter(r => r.error).length,
                    priceChanges: collectionResults.filter(r => r.priceChanged).length
                };

                Logger.success(`\n✅ ${collection} completed:`);
                Logger.info(`   Total processed: ${results[collection].total}`);
                Logger.info(`   Successful: ${results[collection].success}`);
                Logger.info(`   Errors: ${results[collection].errors}`);
                Logger.info(`   Price changes: ${results[collection].priceChanges}`);

            } catch (error) {
                Logger.error(`\n❌ Error updating ${collection}:`, error.message);
                results[collection] = {
                    total: 0,
                    success: 0,
                    errors: 1,
                    priceChanges: 0,
                    error: error.message
                };
            }
        }

        // Print final summary
        Logger.info(`\n${'='.repeat(80)}`);
        Logger.success('🎉 FINAL SUMMARY');
        Logger.info(`${'='.repeat(80)}\n`);

        for (const [collection, stats] of Object.entries(results)) {
            Logger.info(`${collection.toUpperCase()}:`);
            Logger.info(`  Total: ${stats.total} | Success: ${stats.success} | Errors: ${stats.errors} | Price Changes: ${stats.priceChanges}`);
            if (stats.error) {
                Logger.error(`  Error: ${stats.error}`);
            }
        }

        const totalProcessed = Object.values(results).reduce((sum, r) => sum + r.total, 0);
        const totalSuccess = Object.values(results).reduce((sum, r) => sum + r.success, 0);
        const totalErrors = Object.values(results).reduce((sum, r) => sum + r.errors, 0);
        const totalChanges = Object.values(results).reduce((sum, r) => sum + r.priceChanges, 0);

        Logger.info(`\n📊 OVERALL TOTALS:`);
        Logger.info(`   Total processed: ${totalProcessed}`);
        Logger.info(`   Successful updates: ${totalSuccess}`);
        Logger.info(`   Errors: ${totalErrors}`);
        Logger.info(`   Price changes detected: ${totalChanges}`);

    } catch (error) {
        Logger.error('❌ Fatal error during price history update:', error);
        throw error;
    } finally {
        await updater.closeBrowser();
    }

    return results;
}

// Run if called directly
if (require.main === module) {
    updatePsuStoragePrices()
        .then(() => {
            Logger.success('\n✅ All price history updates completed successfully!');
            process.exit(0);
        })
        .catch((error) => {
            Logger.error('\n💥 Price history update failed:', error);
            process.exit(1);
        });
}

module.exports = { updatePsuStoragePrices };
