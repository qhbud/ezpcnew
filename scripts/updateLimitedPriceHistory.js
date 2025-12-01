const { MongoClient } = require('mongodb');

async function updateLimitedPriceHistory() {
    console.log('🔄 Updating components with limited price history...\n');

    const client = await MongoClient.connect('mongodb://localhost:27017');
    const db = client.db('pcbuilder');

    try {
        const collections = ['cpus', 'motherboards', 'gpus', 'rams', 'storages', 'psus', 'cases', 'coolers'];

        let totalUpdated = 0;
        let totalProcessed = 0;

        for (const collectionName of collections) {
            console.log(`\n📦 Processing ${collectionName}...`);
            console.log('─'.repeat(80));

            const collection = db.collection(collectionName);

            // Find items with no priceHistory or only 1 snapshot
            const itemsToUpdate = await collection.find({
                $or: [
                    { priceHistory: { $exists: false } },
                    { priceHistory: null },
                    { priceHistory: [] },
                    { $and: [
                        { priceHistory: { $exists: true } },
                        { priceHistory: { $ne: null } },
                        { priceHistory: { $size: 1 } }
                    ]}
                ]
            }).toArray();

            if (itemsToUpdate.length === 0) {
                console.log(`✓ No items need updating`);
                continue;
            }

            console.log(`Found ${itemsToUpdate.length} items to update`);
            let updated = 0;

            for (const item of itemsToUpdate) {
                const updates = {};
                let needsUpdate = false;

                // Get current price information
                const currentPrice = item.price || item.currentPrice || item.basePrice || item.salePrice;

                // Initialize priceHistory if it doesn't exist
                if (!item.priceHistory || item.priceHistory.length === 0) {
                    // Create initial price history entry
                    if (currentPrice && currentPrice > 0) {
                        updates.priceHistory = [{
                            price: currentPrice,
                            date: item.scrapedAt || item.createdAt || new Date(),
                            source: item.sourceUrl || item.url || 'Initial scrape',
                            detectionMethod: item.priceDetectionMethod || 'initial',
                            isAvailable: item.isAvailable !== false,
                            basePrice: item.basePrice || currentPrice,
                            salePrice: item.salePrice || null,
                            isOnSale: item.isOnSale || false
                        }];
                        needsUpdate = true;
                    }
                } else if (item.priceHistory.length === 1) {
                    // Has one snapshot - add current as second snapshot if different
                    const lastSnapshot = item.priceHistory[0];
                    const lastPrice = lastSnapshot.price || lastSnapshot.basePrice;

                    if (currentPrice && currentPrice > 0 && currentPrice !== lastPrice) {
                        const newHistory = [...item.priceHistory];
                        newHistory.push({
                            price: currentPrice,
                            date: new Date(),
                            source: item.sourceUrl || item.url || 'Update',
                            detectionMethod: 'manual_update',
                            isAvailable: item.isAvailable !== false,
                            basePrice: item.basePrice || currentPrice,
                            salePrice: item.salePrice || null,
                            isOnSale: item.isOnSale || false
                        });
                        updates.priceHistory = newHistory;
                        needsUpdate = true;
                    }
                }

                // Set last price check date
                if (!item.lastPriceCheck) {
                    updates.lastPriceCheck = new Date();
                    needsUpdate = true;
                }

                // Ensure price field is set correctly
                if (!item.price && currentPrice) {
                    updates.price = currentPrice;
                    needsUpdate = true;
                }

                // Update availability if not set
                if (item.isAvailable === undefined || item.isAvailable === null) {
                    updates.isAvailable = currentPrice && currentPrice > 0;
                    needsUpdate = true;
                }

                if (needsUpdate) {
                    await collection.updateOne(
                        { _id: item._id },
                        { $set: updates }
                    );
                    updated++;

                    const name = item.name || item.title || 'Unknown';
                    console.log(`  ✓ Updated: ${name.substring(0, 70)}`);
                }
            }

            totalUpdated += updated;
            totalProcessed += itemsToUpdate.length;

            console.log(`Updated ${updated} of ${itemsToUpdate.length} items`);
        }

        console.log('\n\n' + '='.repeat(80));
        console.log('📊 UPDATE SUMMARY');
        console.log('='.repeat(80));
        console.log(`Total items processed: ${totalProcessed}`);
        console.log(`Total items updated: ${totalUpdated}`);
        console.log(`Success rate: ${totalProcessed > 0 ? ((totalUpdated / totalProcessed) * 100).toFixed(1) : 0}%`);

        // Show final statistics
        console.log('\n📈 Price History Statistics After Update:');
        for (const collectionName of collections) {
            const collection = db.collection(collectionName);
            const total = await collection.countDocuments();

            const withGoodHistory = await collection.countDocuments({
                $and: [
                    { priceHistory: { $exists: true } },
                    { priceHistory: { $ne: null } },
                    { $expr: { $gte: [{ $size: "$priceHistory" }, 2] } }
                ]
            });

            const percentage = total > 0 ? ((withGoodHistory / total) * 100).toFixed(1) : 0;
            console.log(`  ${collectionName}: ${withGoodHistory}/${total} (${percentage}%) have 2+ snapshots`);
        }

    } catch (error) {
        console.error('❌ Error:', error);
        throw error;
    } finally {
        await client.close();
    }
}

// Run the update
if (require.main === module) {
    updateLimitedPriceHistory()
        .then(() => {
            console.log('\n✅ Update completed!');
            process.exit(0);
        })
        .catch(error => {
            console.error('\n💥 Update failed:', error);
            process.exit(1);
        });
}

module.exports = { updateLimitedPriceHistory };
