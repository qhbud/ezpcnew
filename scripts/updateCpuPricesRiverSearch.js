const { connectToDatabase, getDatabase } = require('../config/database');
const { RiverSearchPriceDetector } = require('./riverSearchPriceDetection');
const colors = require('colors');

class CPUPriceUpdater {
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

    // Get all CPU collections
    // All CPUs now live in the single `cpus` collection (migrated from per-model
    // cpus_* subcollections; original group preserved in the `modelCollection` field).
    async getCPUCollections() {
        return ['cpus'];
    }

    // Update price for a single CPU
    async updateCPUPrice(cpu, collectionName) {
        try {
            const url = cpu.sourceUrl || cpu.url;

            if (!url || !url.includes('amazon.com')) {
                console.log(`   ⏭️  Skipping ${cpu.title} (no valid Amazon URL)`.gray);
                return { updated: false, reason: 'No valid URL' };
            }

            console.log(`   🔍 Updating: ${cpu.title}`.cyan);

            // Use RiverSearch price detection
            const priceData = await this.priceDetector.detectPrice(url);

            if (!priceData.success) {
                console.log(`   ❌ Failed to detect price for ${cpu.title}`.red);
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
            }

            // Handle unavailable products
            if (!priceData.isAvailable) {
                updateData.isAvailable = false;
                updateData.unavailabilityReason = priceData.unavailabilityReason;
                updateData.currentPrice = null;
                updateData.price = null;

                console.log(`   ⚠️  ${cpu.title} is currently unavailable`.yellow);
                console.log(`      Reason: ${priceData.unavailabilityReason}`.gray);

                // Update database
                await this.db.collection(collectionName).updateOne(
                    { _id: cpu._id },
                    { $set: updateData }
                );

                return { updated: true, unavailable: true };
            }

            // Update available product with new price
            updateData.isAvailable = true;
            updateData.unavailabilityReason = null;

            const oldPrice = cpu.currentPrice || cpu.price;
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
            // Note: $push will automatically create the array if it doesn't exist
            await this.db.collection(collectionName).updateOne(
                { _id: cpu._id },
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
            console.log(`   ❌ Error updating ${cpu.title}: ${error.message}`.red);
            return { updated: false, reason: error.message };
        }
    }

    // Update all CPUs in a collection
    async updateCPUCollection(collectionName) {
        console.log(`\n📦 Processing collection: ${collectionName}`.cyan.bold);

        const collection = this.db.collection(collectionName);
        const cpus = await collection.find({}).toArray();

        console.log(`   Found ${cpus.length} CPUs to update`.cyan);

        let updated = 0;
        let priceChanged = 0;
        let unavailable = 0;
        let failed = 0;

        for (let i = 0; i < cpus.length; i++) {
            const cpu = cpus[i];

            console.log(`\n   [${i + 1}/${cpus.length}]`.gray);

            const result = await this.updateCPUPrice(cpu, collectionName);

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

            // Add delay to avoid rate limiting (3-5 seconds random)
            if (i < cpus.length - 1) {
                const delay = Math.floor(Math.random() * 2000) + 3000;
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }

        console.log(`\n   Summary for ${collectionName}:`.cyan);
        console.log(`   ✅ Updated: ${updated}`.green);
        console.log(`   📊 Price changed: ${priceChanged}`.yellow);
        console.log(`   ⚠️  Unavailable: ${unavailable}`.yellow);
        console.log(`   ❌ Failed: ${failed}`.red);
        console.log(`   📊 Total: ${cpus.length}`.cyan);

        return { updated, priceChanged, unavailable, failed, total: cpus.length };
    }

    // Main update function
    async updateAllCPUs() {
        try {
            console.log('\n🌊 Starting CPU Price Update with RiverSearch\n'.cyan.bold);

            const collections = await this.getCPUCollections();
            console.log(`📋 Found ${collections.length} CPU collections:\n`.cyan);
            collections.forEach(col => console.log(`   • ${col}`.cyan));

            const overallStats = {
                updated: 0,
                priceChanged: 0,
                unavailable: 0,
                failed: 0,
                total: 0
            };

            for (const collectionName of collections) {
                const stats = await this.updateCPUCollection(collectionName);
                overallStats.updated += stats.updated;
                overallStats.priceChanged += stats.priceChanged;
                overallStats.unavailable += stats.unavailable;
                overallStats.failed += stats.failed;
                overallStats.total += stats.total;
            }

            console.log('\n' + '='.repeat(60).cyan);
            console.log('📊 OVERALL SUMMARY'.cyan.bold);
            console.log('='.repeat(60).cyan);
            console.log(`✅ Successfully updated: ${overallStats.updated} CPUs`.green);
            console.log(`📊 Prices changed: ${overallStats.priceChanged} CPUs`.yellow);
            console.log(`⚠️  Currently unavailable: ${overallStats.unavailable} CPUs`.yellow);
            console.log(`❌ Failed: ${overallStats.failed} CPUs`.red);
            console.log(`📊 Total CPUs processed: ${overallStats.total}`.cyan);
            console.log('='.repeat(60).cyan);

        } catch (error) {
            console.log(`\n❌ Update process failed: ${error.message}`.red);
            throw error;
        }
    }

    async close() {
        if (this.priceDetector) {
            await this.priceDetector.close();
            console.log('🚪 Browser closed'.cyan);
        }
    }
}

// Run the updater
async function main() {
    const updater = new CPUPriceUpdater();

    try {
        await updater.connect();
        await updater.initialize();
        await updater.updateAllCPUs();
    } catch (error) {
        console.error('Fatal error:'.red, error);
    } finally {
        await updater.close();
        process.exit(0);
    }
}

main();
