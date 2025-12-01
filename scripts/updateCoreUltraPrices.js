const { connectToDatabase, getDatabase } = require('../config/database');
const { RiverSearchPriceDetector } = require('./riverSearchPriceDetection');
const colors = require('colors');

async function updateCoreUltraPrices() {
    console.log('🚀 Starting Intel Core Ultra CPU price update...\n'.cyan.bold);

    const priceDetector = new RiverSearchPriceDetector();

    try {
        await connectToDatabase();
        const db = getDatabase();
        await priceDetector.initialize();

        const collection = db.collection('cpus');

        const coreUltraCPUs = [
            'Intel Core Ultra 9 285K',
            'Intel Core Ultra 7 265K',
            'Intel Core Ultra 5 245K'
        ];

        let successCount = 0;
        let failCount = 0;

        for (const cpuName of coreUltraCPUs) {
            console.log('='.repeat(60).gray);
            console.log(`🔄 Updating: ${cpuName}`.cyan.bold);
            console.log('='.repeat(60).gray);

            const cpu = await collection.findOne({ name: cpuName });

            if (!cpu) {
                console.log(`   ⚠️  CPU not found in database`.yellow);
                failCount++;
                continue;
            }

            if (!cpu.sourceUrl) {
                console.log(`   ⚠️  No source URL found`.yellow);
                failCount++;
                continue;
            }

            try {
                console.log(`   🌐 URL: ${cpu.sourceUrl}`.gray);
                const priceData = await priceDetector.detectPrice(cpu.sourceUrl);

                if (!priceData.success) {
                    console.log(`   ❌ Failed to detect price`.red);
                    failCount++;
                    continue;
                }

                const updateData = {
                    updatedAt: new Date(),
                    lastPriceCheck: new Date(),
                    priceDetectionMethod: priceData.detectionMethod,
                    isAvailable: priceData.isAvailable
                };

                if (priceData.imageUrl) {
                    updateData.imageUrl = priceData.imageUrl;
                }

                if (!priceData.isAvailable) {
                    updateData.currentPrice = null;
                    updateData.price = null;
                    console.log(`   ⚠️  Product currently unavailable`.yellow);
                } else {
                    const oldPrice = cpu.currentPrice || cpu.price;
                    const newPrice = priceData.currentPrice;

                    updateData.currentPrice = newPrice;
                    updateData.price = newPrice;

                    if (priceData.isOnSale) {
                        updateData.isOnSale = true;
                        updateData.basePrice = priceData.basePrice;
                        updateData.salePrice = priceData.salePrice;
                    } else {
                        updateData.isOnSale = false;
                        updateData.basePrice = newPrice;
                        updateData.salePrice = null;
                    }

                    // Show price update
                    if (oldPrice && oldPrice !== newPrice) {
                        const diff = newPrice - oldPrice;
                        const symbol = diff > 0 ? '📈' : '📉';
                        console.log(`   ${symbol} Price changed: $${oldPrice.toFixed(2)} → $${newPrice.toFixed(2)}`.yellow);
                    } else {
                        console.log(`   💰 Current price: $${newPrice.toFixed(2)}`.green);
                    }

                    if (priceData.isOnSale) {
                        const discount = Math.round(((priceData.basePrice - priceData.salePrice) / priceData.basePrice) * 100);
                        console.log(`   🏷️  ON SALE! ${discount}% OFF (was $${priceData.basePrice.toFixed(2)})`.green.bold);
                    }
                }

                // Update database
                await collection.updateOne(
                    { _id: cpu._id },
                    { $set: updateData }
                );

                console.log(`   ✅ Successfully updated ${cpuName}`.green);
                successCount++;

                // Add delay to avoid rate limiting
                if (successCount < coreUltraCPUs.length) {
                    console.log(`   ⏳ Waiting 10 seconds before next CPU...`.gray);
                    await new Promise(resolve => setTimeout(resolve, 10000));
                }

            } catch (error) {
                console.log(`   ❌ Error updating ${cpuName}: ${error.message}`.red);
                failCount++;
            }
        }

        console.log('\n' + '='.repeat(60).gray);
        console.log('📊 UPDATE SUMMARY'.cyan.bold);
        console.log('='.repeat(60).gray);
        console.log(`Total CPUs: ${coreUltraCPUs.length}`);
        console.log(`✅ Successful: ${successCount}`.green);
        console.log(`❌ Failed: ${failCount}`.red);
        console.log('='.repeat(60).gray);

        process.exit(0);
    } catch (error) {
        console.error('❌ Fatal error:'.red, error);
        process.exit(1);
    } finally {
        if (priceDetector && priceDetector.browser) {
            await priceDetector.cleanup();
        }
    }
}

if (require.main === module) {
    updateCoreUltraPrices();
}

module.exports = { updateCoreUltraPrices };
