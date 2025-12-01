const { PriceUpdater } = require('./priceUpdater');
const Logger = require('./utils/logger');
const { MongoClient } = require('mongodb');

async function debugStorageUpdate() {
    const client = await MongoClient.connect('mongodb://localhost:27017');
    const db = client.db('pcbuilder');

    // Get just 5 storage items for testing
    const testItems = await db.collection('storages')
        .find({ url: { $exists: true, $ne: null } })
        .limit(5)
        .toArray();

    console.log(`\n${'='.repeat(80)}`);
    console.log(`DEBUG TEST: Processing ${testItems.length} storage items`);
    console.log(`${'='.repeat(80)}\n`);

    const updater = new PriceUpdater();

    try {
        await updater.connect();
        await updater.initializeBrowser();

        for (let i = 0; i < testItems.length; i++) {
            const item = testItems[i];
            console.log(`\n[${ i + 1}/${testItems.length}] Processing: ${item.name}`);
            console.log(`URL: ${item.url}`);
            console.log(`Timestamp: ${new Date().toISOString()}`);

            try {
                // Add pre-check for browser state
                if (!updater.riverSearch || !updater.riverSearch.page) {
                    console.error('❌ Browser page not available!');
                    continue;
                }

                // Check if page is navigating
                const isClosed = updater.riverSearch.page.isClosed();
                console.log(`Browser page closed: ${isClosed}`);

                if (isClosed) {
                    console.error('❌ Browser page is closed! Reinitializing...');
                    await updater.closeBrowser();
                    await updater.initializeBrowser();
                }

                const startTime = Date.now();

                // Try to update the price
                const result = await updater.updateItemPrice('storages', item._id.toString(), item.url);

                const duration = ((Date.now() - startTime) / 1000).toFixed(2);
                console.log(`✅ Completed in ${duration}s`);

                if (result) {
                    if (result.priceChanged) {
                        console.log(`💰 Price changed: ${result.oldPrice} → ${result.newPrice}`);
                    } else {
                        console.log(`✅ Price unchanged: ${result.newPrice || 'N/A'}`);
                    }
                }

                // Wait between items
                const waitTime = 10;
                console.log(`⏳ Waiting ${waitTime} seconds before next item...`);
                await new Promise(resolve => setTimeout(resolve, waitTime * 1000));

            } catch (error) {
                console.error(`❌ Error processing ${item.name}:`);
                console.error(`   Error message: ${error.message}`);
                console.error(`   Error stack: ${error.stack}`);

                // Check browser state after error
                try {
                    const isClosed = updater.riverSearch.page.isClosed();
                    console.log(`   Browser page closed after error: ${isClosed}`);
                } catch (e) {
                    console.error(`   Cannot check browser state: ${e.message}`);
                }

                // Try to recover
                console.log('   Attempting to recover browser...');
                try {
                    await updater.closeBrowser();
                    await updater.initializeBrowser();
                    console.log('   ✅ Browser reinitialized');
                } catch (recoveryError) {
                    console.error(`   ❌ Recovery failed: ${recoveryError.message}`);
                }
            }
        }

        console.log(`\n${'='.repeat(80)}`);
        console.log('DEBUG TEST COMPLETED');
        console.log(`${'='.repeat(80)}\n`);

    } catch (error) {
        console.error('❌ Fatal error:', error);
    } finally {
        await updater.closeBrowser();
        await client.close();
    }
}

// Run if called directly
if (require.main === module) {
    debugStorageUpdate()
        .then(() => {
            console.log('✅ Debug test completed!');
            process.exit(0);
        })
        .catch((error) => {
            console.error('💥 Debug test failed:', error);
            process.exit(1);
        });
}

module.exports = { debugStorageUpdate };
