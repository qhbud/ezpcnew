const { connectToDatabase, getDatabase } = require('../config/database');
const { RiverSearchPriceDetector } = require('./riverSearchPriceDetection');
const colors = require('colors');

class StoragePriceUpdaterWithRestart {
    constructor() {
        this.db = null;
        this.priceDetector = null;
    }

    async connect() {
        await connectToDatabase();
        this.db = getDatabase();
        console.log('✅ Connected to database'.green);
    }

    async initialize() {
        this.priceDetector = new RiverSearchPriceDetector();
        await this.priceDetector.initialize();
    }

    async close() {
        if (this.priceDetector) {
            await this.priceDetector.close();
            console.log('🚪 Browser closed'.cyan);
        }
    }

    // Update price for a single storage device
    async updateStoragePrice(storage, collectionName) {
        try {
            // Storage items use 'url' field instead of 'sourceUrl'
            const url = storage.url || storage.sourceUrl;

            if (!url || !url.includes('amazon.com')) {
                console.log(`   ⏭️  Skipping ${storage.name || storage.title} (no valid Amazon URL)`.gray);
                return { updated: false, reason: 'No valid URL' };
            }

            console.log(`   🔍 Updating: ${storage.name || storage.title}`.cyan);

            // Use RiverSearch price detection
            const priceData = await this.priceDetector.detectPrice(url);

            if (!priceData.success) {
                console.log(`   ❌ Failed to detect price for ${storage.name || storage.title}`.red);
                if (priceData.debugInfo && priceData.debugInfo.length > 0) {
                    console.log(`      Debug: ${priceData.debugInfo[priceData.debugInfo.length - 1]}`.gray);
                }
                return { updated: false, reason: 'Price detection failed' };
            }

            // Prepare update data
            const updateData = {
                updatedAt: new Date(),
                lastPriceCheck: new Date(),
                priceDetectionMethod: priceData.detectionMethod
            };

            // Update image if available
            if (priceData.imageUrl) {
                updateData.imageUrl = priceData.imageUrl;
                updateData.image = priceData.imageUrl; // Some storage items use 'image' field
            }

            // Handle unavailable products
            if (!priceData.isAvailable) {
                updateData.isAvailable = false;
                updateData.unavailabilityReason = priceData.unavailabilityReason;
                updateData.currentPrice = null;
                updateData.price = null;

                console.log(`   ⚠️  ${storage.name || storage.title} is currently unavailable`.yellow);
                console.log(`      Reason: ${priceData.unavailabilityReason}`.gray);

                // Update database
                await this.db.collection(collectionName).updateOne(
                    { _id: storage._id },
                    { $set: updateData }
                );

                return { updated: true, unavailable: true };
            }

            // Update available product with new price
            updateData.isAvailable = true;
            updateData.unavailabilityReason = null;

            const oldPrice = storage.currentPrice || storage.price;
            const newPrice = priceData.currentPrice;

            updateData.currentPrice = newPrice;
            updateData.price = newPrice;

            // Handle sale detection
            if (priceData.isOnSale) {
                updateData.isOnSale = true;
                updateData.basePrice = priceData.basePrice;
                updateData.salePrice = priceData.salePrice;
            } else {
                updateData.isOnSale = false;
                updateData.basePrice = newPrice;
                updateData.salePrice = null;
            }

            // Prepare price history entry
            const priceHistoryEntry = {
                date: new Date(),
                price: newPrice,
                isOnSale: priceData.isOnSale || false,
                basePrice: priceData.basePrice || newPrice,
                salePrice: priceData.salePrice || null,
                isAvailable: true,
                detectionMethod: priceData.detectionMethod
            };

            // Update database
            await this.db.collection(collectionName).updateOne(
                { _id: storage._id },
                {
                    $set: updateData,
                    $push: {
                        priceHistory: {
                            $each: [priceHistoryEntry],
                            $slice: -90 // Keep last 90 days
                        }
                    }
                }
            );

            // Log price change
            if (oldPrice && Math.abs(oldPrice - newPrice) > 0.01) {
                const change = newPrice - oldPrice;
                const percentChange = ((change / oldPrice) * 100).toFixed(1);
                const arrow = change > 0 ? '📈' : '📉';
                const color = change > 0 ? 'red' : 'green';

                console.log(`   ${arrow} Price changed: $${oldPrice} → $${newPrice} (${percentChange > 0 ? '+' : ''}${percentChange}%)`[color]);
            } else {
                console.log(`   ✅ Price updated: $${newPrice}`.green);
            }

            if (priceData.isOnSale) {
                const discount = Math.round(((priceData.basePrice - priceData.salePrice) / priceData.basePrice) * 100);
                console.log(`   🏷️  ON SALE: ${discount}% off (was $${priceData.basePrice})`.yellow.bold);
            }

            return { updated: true, priceChanged: oldPrice && Math.abs(oldPrice - newPrice) > 0.01 };

        } catch (error) {
            console.log(`   ❌ Error updating ${storage.name || storage.title}: ${error.message}`.red);
            return { updated: false, reason: error.message };
        }
    }

    // Main update function with browser restarts
    async updateAllStorageWithRestart() {
        try {
            console.log('\n🌊 Starting Storage Price Update with RiverSearch (Browser Restart Mode)\n'.cyan.bold);

            const BATCH_SIZE = 20; // Restart browser every 20 items
            let processedCount = 0;

            const collection = this.db.collection('storages');

            // Find all storage items with URLs
            const storageItems = await collection.find({
                $or: [
                    { url: { $exists: true, $ne: null, $ne: '' } },
                    { sourceUrl: { $exists: true, $ne: null, $ne: '' } }
                ]
            }).toArray();

            const totalCount = storageItems.length;
            console.log(`📊 Found ${totalCount} storage items to update\n`.cyan);

            const overallStats = {
                updated: 0,
                priceChanged: 0,
                unavailable: 0,
                failed: 0,
                total: totalCount
            };

            // Process in batches with browser restarts
            while (processedCount < totalCount) {
                const batchNum = Math.floor(processedCount / BATCH_SIZE) + 1;
                const batchEnd = Math.min(processedCount + BATCH_SIZE, totalCount);

                console.log('\n' + '='.repeat(60).cyan);
                console.log(`📦 BATCH ${batchNum}: Items ${processedCount + 1} to ${batchEnd}`.cyan.bold);
                console.log('='.repeat(60).cyan);

                // Initialize browser for this batch
                await this.initialize();

                let batchUpdated = 0;
                let batchPriceChanged = 0;
                let batchUnavailable = 0;
                let batchFailed = 0;

                // Process batch
                for (let i = processedCount; i < batchEnd; i++) {
                    const storage = storageItems[i];

                    console.log(`\n   [${i + 1}/${totalCount}]`.gray);

                    const result = await this.updateStoragePrice(storage, 'storages');

                    if (result.updated) {
                        batchUpdated++;
                        overallStats.updated++;
                        if (result.unavailable) {
                            batchUnavailable++;
                            overallStats.unavailable++;
                        } else if (result.priceChanged) {
                            batchPriceChanged++;
                            overallStats.priceChanged++;
                        }
                    } else {
                        batchFailed++;
                        overallStats.failed++;
                    }

                    // Add delay to avoid rate limiting (3-5 seconds random)
                    if (i < batchEnd - 1) {
                        const delay = Math.floor(Math.random() * 2000) + 3000;
                        await new Promise(resolve => setTimeout(resolve, delay));
                    }
                }

                processedCount = batchEnd;

                // Batch summary
                console.log(`\n   Batch ${batchNum} Summary:`.cyan);
                console.log(`   ✅ Updated: ${batchUpdated}`.green);
                console.log(`   📊 Price changed: ${batchPriceChanged}`.yellow);
                console.log(`   ⚠️  Unavailable: ${batchUnavailable}`.yellow);
                console.log(`   ❌ Failed: ${batchFailed}`.red);

                // Close browser after batch
                await this.close();

                // Wait between batches if not finished
                if (processedCount < totalCount) {
                    console.log('\n⏳ Waiting 5 seconds for cleanup...'.gray);
                    await new Promise(resolve => setTimeout(resolve, 5000));
                    console.log('⏳ Waiting 25 seconds before next batch...\n'.gray);
                    await new Promise(resolve => setTimeout(resolve, 25000));
                }
            }

            // Final summary
            console.log('\n' + '='.repeat(60).cyan);
            console.log('📊 FINAL SUMMARY'.cyan.bold);
            console.log('='.repeat(60).cyan);
            console.log(`✅ Successfully updated: ${overallStats.updated} storage items`.green);
            console.log(`📊 Prices changed: ${overallStats.priceChanged} items`.yellow);
            console.log(`⚠️  Currently unavailable: ${overallStats.unavailable} items`.yellow);
            console.log(`❌ Failed: ${overallStats.failed} items`.red);
            console.log(`📊 Total storage items processed: ${overallStats.total}`.cyan);
            console.log('='.repeat(60).cyan);

        } catch (error) {
            console.log(`\n❌ Update process failed: ${error.message}`.red);
            throw error;
        }
    }
}

// Run the updater
async function main() {
    const updater = new StoragePriceUpdaterWithRestart();

    try {
        await updater.connect();
        await updater.updateAllStorageWithRestart();
    } catch (error) {
        console.error('Fatal error:'.red, error);
    } finally {
        await updater.close();
        process.exit(0);
    }
}

// Run if called directly
if (require.main === module) {
    main();
}

module.exports = { StoragePriceUpdaterWithRestart };
