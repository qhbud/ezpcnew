const { RiverSearchPriceDetector } = require('./riverSearchPriceDetection');
const { connectToDatabase, getDatabase } = require('../config/database');
require('dotenv').config();

/**
 * Round 2: Fix remaining GPUs with different Amazon ASINs
 */
const replacements = [
    {
        collection: 'gpus_rtx_5090',
        newUrl: 'https://www.amazon.com/dp/B0DT7JYTXQ?tag=qhezpc-20',
        newName: 'MSI Gaming RTX 5090 32G SUPRIM SOC Graphics Card (32GB GDDR7, 512-bit, Extreme Performance: 2580 MHz, DisplayPort x3 2.1a, HDMI 2.1b, NVIDIA Blackwell Architecture)'
    },
    {
        collection: 'gpus_rtx_4090',
        newUrl: 'https://www.amazon.com/dp/B0BHD9TS9Q?tag=qhezpc-20',
        newName: 'ASUS TUF Gaming NVIDIA GeForce RTX 4090 OC Edition Gaming Graphics Card (24GB GDDR6X, PCIe 4.0, HDMI 2.1a, DisplayPort 1.4a)'
    },
    {
        collection: 'gpus_rx_6650_xt',
        newUrl: 'https://www.amazon.com/dp/B09ZX5MKCM?tag=qhezpc-20',
        newName: 'Gigabyte Radeon RX 6650 XT Gaming OC 8G Graphics Card, WINDFORCE 3X Cooling System, 8GB 128-bit GDDR6, GV-R665XTGAMING OC-8GD Video Card'
    }
];

async function fix() {
    let db, riverSearch;

    try {
        await connectToDatabase();
        db = getDatabase();
        console.log('Connected to MongoDB\n');

        riverSearch = new RiverSearchPriceDetector();
        await riverSearch.initialize();
        console.log('RiverSearch initialized\n');

        let successCount = 0;
        let failCount = 0;

        for (let i = 0; i < replacements.length; i++) {
            const r = replacements[i];
            const col = db.collection(r.collection);
            const progress = `[${i + 1}/${replacements.length}]`;

            // Find the first item in the collection (our GPU)
            const item = await col.findOne({});
            if (!item) {
                console.log(`${progress} SKIP: No item in ${r.collection}`);
                continue;
            }

            console.log(`${progress} ${r.newName.substring(0, 70)}`);
            console.log(`  Old URL: ${item.sourceUrl?.substring(0, 60)}`);
            console.log(`  New URL: ${r.newUrl.substring(0, 60)}`);

            // Update URL and name
            await col.updateOne(
                { _id: item._id },
                { $set: { sourceUrl: r.newUrl, name: r.newName } }
            );

            try {
                const priceData = await riverSearch.detectPrice(r.newUrl);

                if (priceData && priceData.success && priceData.currentPrice) {
                    const now = new Date();
                    const updateFields = {
                        price: priceData.currentPrice,
                        currentPrice: priceData.currentPrice,
                        basePrice: priceData.basePrice || priceData.currentPrice,
                        salePrice: priceData.salePrice || null,
                        isOnSale: priceData.isOnSale || false,
                        isAvailable: true,
                        detectionMethod: priceData.detectionMethod || 'RiverSearch',
                        lastPriceUpdate: now,
                        lastPriceCheck: now,
                        priceDetectionMethod: priceData.detectionMethod || 'RiverSearch',
                        updatedAt: now,
                        updateFailed: false,
                        lastUpdateError: null
                    };

                    if (priceData.imageUrl && priceData.imageUrl.startsWith('http')) {
                        updateFields.imageUrl = priceData.imageUrl;
                        console.log(`  Image: ${priceData.imageUrl.substring(0, 80)}`);
                    }

                    await col.updateOne(
                        { _id: item._id },
                        {
                            $set: updateFields,
                            $push: {
                                priceHistory: {
                                    price: priceData.currentPrice,
                                    date: now,
                                    source: r.newUrl,
                                    detectionMethod: priceData.detectionMethod || 'RiverSearch',
                                    isAvailable: true
                                }
                            }
                        }
                    );

                    console.log(`  Price: $${priceData.currentPrice}`);
                    successCount++;
                } else {
                    console.log(`  FAILED: ${priceData?.unavailabilityReason || 'No price detected'}`);
                    failCount++;
                }
            } catch (error) {
                console.log(`  ERROR: ${error.message}`);
                failCount++;
            }

            if (i < replacements.length - 1) {
                console.log(`  Waiting 10s...\n`);
                await new Promise(resolve => setTimeout(resolve, 10000));
            }
        }

        console.log(`\n${'='.repeat(50)}`);
        console.log(`RESULTS: ${successCount} success, ${failCount} failed`);

    } catch (error) {
        console.error('Fatal error:', error);
    } finally {
        if (riverSearch) await riverSearch.close();
        process.exit(0);
    }
}

fix();
