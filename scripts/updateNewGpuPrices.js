const { PriceUpdater } = require('./priceUpdater');
const { RiverSearchPriceDetector } = require('./riverSearchPriceDetection');
const { connectToDatabase, getDatabase } = require('../config/database');
const { ObjectId } = require('mongodb');
require('dotenv').config();

/**
 * Targeted price+image updater for newly added GPUs (those with null prices)
 */
async function updateNewGpus() {
    let db, riverSearch;

    try {
        // Connect to DB
        await connectToDatabase();
        db = getDatabase();
        console.log('Connected to MongoDB\n');

        // Find all GPU products with null/missing prices
        const allCollections = await db.listCollections().toArray();
        const gpuCollections = allCollections
            .filter(col => col.name.startsWith('gpus_'))
            .map(col => col.name);

        let itemsToUpdate = [];
        for (const colName of gpuCollections) {
            const col = db.collection(colName);
            const items = await col.find({
                sourceUrl: { $exists: true, $ne: null, $ne: '' },
                $or: [
                    { price: null },
                    { price: { $exists: false } },
                    { currentPrice: null },
                    { currentPrice: { $exists: false } }
                ]
            }).toArray();

            items.forEach(item => {
                item._collectionName = colName;
            });
            itemsToUpdate = itemsToUpdate.concat(items);
        }

        console.log(`Found ${itemsToUpdate.length} GPUs needing price/image updates\n`);

        if (itemsToUpdate.length === 0) {
            console.log('All GPUs already have prices!');
            return;
        }

        // Initialize RiverSearch
        riverSearch = new RiverSearchPriceDetector();
        await riverSearch.initialize();
        console.log('RiverSearch initialized\n');

        let successCount = 0;
        let failCount = 0;

        for (let i = 0; i < itemsToUpdate.length; i++) {
            const item = itemsToUpdate[i];
            const progress = `[${i + 1}/${itemsToUpdate.length}]`;
            const shortName = (item.name || 'Unknown').substring(0, 70);

            console.log(`${progress} ${shortName}`);
            console.log(`  Collection: ${item._collectionName}`);
            console.log(`  URL: ${item.sourceUrl.substring(0, 80)}`);

            try {
                const priceData = await riverSearch.detectPrice(item.sourceUrl);

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

                    // Update image if we got one and it's better than what we have
                    if (priceData.imageUrl && priceData.imageUrl.startsWith('http')) {
                        updateFields.imageUrl = priceData.imageUrl;
                        console.log(`  Image: ${priceData.imageUrl.substring(0, 80)}`);
                    }

                    // Add price history entry
                    const historyEntry = {
                        price: priceData.currentPrice,
                        date: now,
                        source: item.sourceUrl,
                        detectionMethod: priceData.detectionMethod || 'RiverSearch',
                        isAvailable: true
                    };

                    const col = db.collection(item._collectionName);
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
                    console.log(`  FAILED: Could not detect price`);
                    if (priceData && priceData.unavailabilityReason) {
                        console.log(`  Reason: ${priceData.unavailabilityReason}`);
                    }

                    // Mark as failed but don't overwrite anything useful
                    const col = db.collection(item._collectionName);
                    await col.updateOne(
                        { _id: item._id },
                        {
                            $set: {
                                lastPriceCheck: new Date(),
                                updateFailed: true,
                                lastUpdateError: priceData?.unavailabilityReason || 'Price detection failed'
                            }
                        }
                    );

                    // Still try to save image if we got one
                    if (priceData && priceData.imageUrl && priceData.imageUrl.startsWith('http')) {
                        await col.updateOne(
                            { _id: item._id },
                            { $set: { imageUrl: priceData.imageUrl } }
                        );
                        console.log(`  Image saved: ${priceData.imageUrl.substring(0, 80)}`);
                    }

                    failCount++;
                }

            } catch (error) {
                console.log(`  ERROR: ${error.message}`);
                failCount++;
            }

            // Wait between requests
            if (i < itemsToUpdate.length - 1) {
                const wait = 8000;
                console.log(`  Waiting ${wait / 1000}s...\n`);
                await new Promise(resolve => setTimeout(resolve, wait));
            }
        }

        console.log(`\n${'='.repeat(50)}`);
        console.log(`RESULTS`);
        console.log(`${'='.repeat(50)}`);
        console.log(`Success: ${successCount}/${itemsToUpdate.length}`);
        console.log(`Failed:  ${failCount}/${itemsToUpdate.length}`);

    } catch (error) {
        console.error('Fatal error:', error);
    } finally {
        if (riverSearch) {
            await riverSearch.close();
        }
        process.exit(0);
    }
}

updateNewGpus();
