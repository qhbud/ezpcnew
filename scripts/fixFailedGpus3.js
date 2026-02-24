const { RiverSearchPriceDetector } = require('./riverSearchPriceDetection');
const { connectToDatabase, getDatabase } = require('../config/database');
require('dotenv').config();

async function fix() {
    let db, riverSearch;
    try {
        await connectToDatabase();
        db = getDatabase();
        riverSearch = new RiverSearchPriceDetector();
        await riverSearch.initialize();

        const col = db.collection('gpus_rx_6650_xt');
        const item = await col.findOne({});

        // Try XFX RX 6650 XT
        const newUrl = 'https://www.amazon.com/dp/B09ZLRDMXX?tag=qhezpc-20';
        const newName = 'XFX Speedster SWFT210 Radeon RX 6650 XT CORE Gaming Graphics Card with 8GB GDDR6 HDMI 3xDP, AMD RDNA 2 RX-665X8DFDY';

        console.log(`Trying: ${newName}`);
        await col.updateOne({ _id: item._id }, { $set: { sourceUrl: newUrl, name: newName } });

        const priceData = await riverSearch.detectPrice(newUrl);

        if (priceData && priceData.success && priceData.currentPrice) {
            const now = new Date();
            await col.updateOne({ _id: item._id }, {
                $set: {
                    price: priceData.currentPrice,
                    currentPrice: priceData.currentPrice,
                    basePrice: priceData.basePrice || priceData.currentPrice,
                    isAvailable: true,
                    detectionMethod: 'RiverSearch',
                    lastPriceUpdate: now,
                    lastPriceCheck: now,
                    priceDetectionMethod: 'RiverSearch',
                    updatedAt: now,
                    updateFailed: false,
                    imageUrl: priceData.imageUrl || item.imageUrl
                },
                $push: { priceHistory: { price: priceData.currentPrice, date: now, source: newUrl, detectionMethod: 'RiverSearch', isAvailable: true } }
            });
            console.log(`SUCCESS: $${priceData.currentPrice}`);
            if (priceData.imageUrl) console.log(`Image: ${priceData.imageUrl}`);
        } else {
            console.log(`FAILED: ${priceData?.unavailabilityReason || 'No price'}`);

            // Try one more - the Generic AMD RX 6650 XT
            console.log('\nTrying backup: Generic AMD RX 6650 XT (B0D2LXJVPS)...');
            const backupUrl = 'https://www.amazon.com/dp/B0D2LXJVPS?tag=qhezpc-20';
            const backupName = 'AMD Radeon RX 6650 XT Graphics Card, 8GB GDDR6 Memory, 128-bit, 3X DP HDMI, 2048 CUDA, RDNA 2';

            await new Promise(r => setTimeout(r, 10000));
            await col.updateOne({ _id: item._id }, { $set: { sourceUrl: backupUrl, name: backupName } });

            const priceData2 = await riverSearch.detectPrice(backupUrl);
            if (priceData2 && priceData2.success && priceData2.currentPrice) {
                const now = new Date();
                await col.updateOne({ _id: item._id }, {
                    $set: {
                        price: priceData2.currentPrice,
                        currentPrice: priceData2.currentPrice,
                        basePrice: priceData2.basePrice || priceData2.currentPrice,
                        isAvailable: true,
                        detectionMethod: 'RiverSearch',
                        lastPriceUpdate: now,
                        lastPriceCheck: now,
                        priceDetectionMethod: 'RiverSearch',
                        updatedAt: now,
                        updateFailed: false,
                        imageUrl: priceData2.imageUrl || item.imageUrl
                    },
                    $push: { priceHistory: { price: priceData2.currentPrice, date: now, source: backupUrl, detectionMethod: 'RiverSearch', isAvailable: true } }
                });
                console.log(`SUCCESS: $${priceData2.currentPrice}`);
            } else {
                console.log(`ALSO FAILED: ${priceData2?.unavailabilityReason || 'No price'}`);
            }
        }
    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        if (riverSearch) await riverSearch.close();
        process.exit(0);
    }
}
fix();
