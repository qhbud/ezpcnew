const { RiverSearchPriceDetector } = require('./riverSearchPriceDetection');
const { connectToDatabase, getDatabase } = require('../config/database');
require('dotenv').config();

/**
 * Fix the 5 GPUs that failed price detection by swapping to alternative Amazon links
 */
const replacements = [
    {
        collection: 'gpus_rtx_5090',
        oldUrl: 'https://www.amazon.com/dp/B0DS2X13PH?tag=qhezpc-20',
        newUrl: 'https://www.amazon.com/dp/B0DT7GBNWQ?tag=qhezpc-20',
        newName: 'GIGABYTE GeForce RTX 5090 Gaming OC 32G Graphics Card, WINDFORCE Cooling System, 32GB 512-bit GDDR7, GV-N5090GAMING OC-32GD Video Card'
    },
    {
        collection: 'gpus_rtx_4090',
        oldUrl: 'https://www.amazon.com/dp/B0BG94PS2F?tag=qhezpc-20',
        newUrl: 'https://www.amazon.com/dp/B0BGP8FGNZ?tag=qhezpc-20',
        newName: 'GIGABYTE GeForce RTX 4090 Gaming OC 24G Graphics Card, 3X WINDFORCE Fans, 24GB 384-bit GDDR6X, GV-N4090GAMING OC-24GD Video Card'
    },
    {
        collection: 'gpus_rx_6650_xt',
        oldUrl: 'https://www.amazon.com/dp/B09VYHB8XG?tag=qhezpc-20',
        newUrl: 'https://www.amazon.com/dp/B09ZVP9XYC?tag=qhezpc-20',
        newName: 'PowerColor Fighter AMD Radeon RX 6650 XT Graphics Card with 8GB GDDR6 Memory'
    },
    {
        collection: 'gpus_rx_6400',
        oldUrl: 'https://www.amazon.com/dp/B09WF47XF4?tag=qhezpc-20',
        newUrl: 'https://www.amazon.com/dp/B09Y7358KJ?tag=qhezpc-20',
        newName: 'XFX Speedster SWFT105 Radeon RX 6400 Gaming Graphics Card with 4GB GDDR6, AMD RDNA 2 RX-64XL4SFG2'
    },
    {
        // Pre-existing RTX 3050 that also had no price
        collection: 'gpus_rtx_3050',
        oldUrl: 'https://www.amazon.com/dp/B0DQK4XSC7?tag=qhezpc-20',
        newUrl: 'https://www.amazon.com/dp/B0DQK4XSC7?tag=qhezpc-20',
        // Keep same URL, just retry - or use null to skip URL change
        skipUrlChange: true
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

            // Find the item
            const item = await col.findOne({ sourceUrl: r.oldUrl });
            if (!item) {
                console.log(`${progress} SKIP: No item found in ${r.collection} with URL ${r.oldUrl}`);
                continue;
            }

            const url = r.skipUrlChange ? r.oldUrl : r.newUrl;
            console.log(`${progress} ${r.newName || item.name}`);
            console.log(`  Collection: ${r.collection}`);
            console.log(`  URL: ${url.substring(0, 80)}`);

            // Update the URL and name first if changing
            if (!r.skipUrlChange) {
                await col.updateOne(
                    { _id: item._id },
                    { $set: { sourceUrl: r.newUrl, name: r.newName } }
                );
            }

            try {
                const priceData = await riverSearch.detectPrice(url);

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

                    const historyEntry = {
                        price: priceData.currentPrice,
                        date: now,
                        source: url,
                        detectionMethod: priceData.detectionMethod || 'RiverSearch',
                        isAvailable: true
                    };

                    await col.updateOne(
                        { _id: item._id },
                        {
                            $set: updateFields,
                            $push: { priceHistory: historyEntry }
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
                console.log(`  Waiting 8s...\n`);
                await new Promise(resolve => setTimeout(resolve, 8000));
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
