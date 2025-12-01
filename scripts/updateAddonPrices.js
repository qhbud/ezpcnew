const { connectToDatabase, getDatabase } = require('../config/database');
const { RiverSearchPriceDetector } = require('./riverSearchPriceDetection');
const colors = require('colors');

class AddonPriceUpdater {
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

    // Update price for a single addon
    async updateAddonPrice(addon) {
        try {
            const url = addon.sourceUrl;

            if (!url || !url.includes('amazon.com')) {
                console.log(`   ⏭️  Skipping ${addon.name || addon.title} (no valid Amazon URL)`.gray);
                return { updated: false, reason: 'No valid URL' };
            }

            console.log(`   🔍 Updating: ${addon.name || addon.title}`.cyan);

            // Use RiverSearch price detection
            const priceData = await this.priceDetector.detectPrice(url);

            if (!priceData.success) {
                console.log(`   ❌ Failed to detect price for ${addon.name || addon.title}`.red);
                if (priceData.debugInfo && priceData.debugInfo.length > 0) {
                    console.log(`      Debug: ${priceData.debugInfo[priceData.debugInfo.length - 1]}`.gray);
                }
                return { updated: false, reason: 'Price detection failed' };
            }

            // Prepare update data
            const updateData = {
                updatedAt: new Date(),
                lastPriceUpdate: new Date(),
                lastUpdateAttempt: new Date(),
                updateFailed: false,
                lastUpdateError: null
            };

            // Update image if available
            if (priceData.imageUrl) {
                updateData.imageUrl = priceData.imageUrl;
            }

            // Handle unavailable products
            if (!priceData.isAvailable) {
                updateData.isAvailable = false;
                updateData.currentPrice = null;
                updateData.price = null;

                console.log(`   ⚠️  ${addon.name || addon.title} is currently unavailable`.yellow);
                console.log(`      Reason: ${priceData.unavailabilityReason}`.gray);

                // Update database
                await this.db.collection('addons').updateOne(
                    { _id: addon._id },
                    { $set: updateData }
                );

                return { updated: true, unavailable: true };
            }

            // Update available product with new price
            updateData.isAvailable = true;

            const oldPrice = addon.currentPrice || addon.price;
            const newPrice = priceData.currentPrice;

            updateData.currentPrice = newPrice;
            updateData.price = newPrice;

            // Handle sale detection
            if (priceData.isOnSale) {
                updateData.isOnSale = true;
                updateData.basePrice = priceData.basePrice;
                updateData.salePrice = priceData.salePrice;
                updateData.discount = Math.round(((priceData.basePrice - priceData.salePrice) / priceData.basePrice) * 100);
            } else {
                updateData.isOnSale = false;
                updateData.basePrice = newPrice;
                updateData.salePrice = null;
                updateData.discount = 0;
            }

            // Prepare price history entry
            const priceHistoryEntry = {
                date: new Date(),
                price: newPrice,
                source: url
            };

            // Update database
            await this.db.collection('addons').updateOne(
                { _id: addon._id },
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
            console.log(`   ❌ Error updating ${addon.name || addon.title}: ${error.message}`.red);

            // Mark update as failed in database
            await this.db.collection('addons').updateOne(
                { _id: addon._id },
                {
                    $set: {
                        updateFailed: true,
                        lastUpdateError: error.message,
                        lastUpdateAttempt: new Date()
                    }
                }
            );

            return { updated: false, reason: error.message };
        }
    }

    // Update all addons in the collection
    async updateAddonsCollection() {
        console.log(`\n🎮 Processing addons collection`.cyan.bold);

        const collection = this.db.collection('addons');

        // Find all addons with sourceUrls
        const addons = await collection.find({
            sourceUrl: { $exists: true, $ne: null, $ne: '' }
        }).toArray();

        console.log(`   Found ${addons.length} addons to update`.cyan);

        let updated = 0;
        let priceChanged = 0;
        let unavailable = 0;
        let failed = 0;

        for (let i = 0; i < addons.length; i++) {
            const addon = addons[i];

            console.log(`\n   [${i + 1}/${addons.length}]`.gray);

            const result = await this.updateAddonPrice(addon);

            if (result.updated) {
                updated++;
                if (result.unavailable) {
                    unavailable++;
                } else if (result.priceChanged) {
                    priceChanged++;
                }
            } else {
                failed++;
            }

            // Add delay to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 2000));
        }

        // Print summary
        console.log('\n' + '='.repeat(60).cyan);
        console.log('📊 ADDON PRICE UPDATE SUMMARY'.cyan.bold);
        console.log('='.repeat(60).cyan);
        console.log(`✅ Successfully updated: ${updated}/${addons.length}`.green);
        console.log(`📈 Prices changed: ${priceChanged}`.yellow);
        console.log(`⚠️  Unavailable: ${unavailable}`.yellow);
        console.log(`❌ Failed: ${failed}`.red);
        console.log('='.repeat(60).cyan);
    }

    async run() {
        try {
            console.log('🚀 Starting Addon Price Update Script'.cyan.bold);
            console.log('='.repeat(60).cyan);

            await this.connect();
            await this.initialize();
            await this.updateAddonsCollection();

            console.log('\n✅ Addon price update completed!'.green.bold);
            process.exit(0);
        } catch (error) {
            console.error('💥 Fatal error:'.red.bold, error);
            process.exit(1);
        }
    }
}

// Run the updater if this script is executed directly
if (require.main === module) {
    const updater = new AddonPriceUpdater();
    updater.run();
}

module.exports = { AddonPriceUpdater };
