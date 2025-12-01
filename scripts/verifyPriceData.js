const { connectToDatabase } = require('../config/database');

async function verifyPriceData() {
    console.log('🔍 Verifying price data integrity across GPU collections...');

    try {
        const db = await connectToDatabase();

        // Sample a few different GPU collections
        const collectionsToCheck = ['gpus_rtx_3080', 'gpus_rx_7900_xtx', 'gpus_rtx_5090', 'gpus_arc_a770'];

        for (const collection of collectionsToCheck) {
            console.log(`\\n📊 ${collection.toUpperCase().replace('GPUS_', '')} Analysis:`);

            const gpus = await db.collection(collection).find({}).limit(2).toArray();

            if (gpus.length === 0) {
                console.log('   ❌ No GPUs found in this collection');
                continue;
            }

            gpus.forEach((gpu, index) => {
                console.log(`\\n  ${index + 1}. ${gpu.name.substring(0, 55)}...`);
                console.log(`     💰 Current: $${gpu.currentPrice} | Base: $${gpu.basePrice} | Sale: ${gpu.salePrice || 'N/A'}`);
                console.log(`     🏪 Source: ${gpu.source} | On Sale: ${gpu.isOnSale ? 'Yes' : 'No'}`);

                if (gpu.priceHistory && gpu.priceHistory.length > 0) {
                    console.log(`     📈 Price History: ${gpu.priceHistory.length} entries`);

                    gpu.priceHistory.forEach((entry, historyIndex) => {
                        const date = new Date(entry.date).toLocaleDateString();
                        const saleInfo = entry.isOnSale ? ' (ON SALE)' : '';
                        console.log(`       ${historyIndex + 1}. ${date}: $${entry.currentPrice} (Base: $${entry.basePrice})${saleInfo}`);

                        // Verify data integrity
                        if (entry.currentPrice !== (entry.isOnSale && entry.salePrice ? entry.salePrice : entry.basePrice)) {
                            console.log(`         ⚠️  Data mismatch detected!`);
                        }
                    });

                    // Verify current price matches latest history entry
                    const latestEntry = gpu.priceHistory[gpu.priceHistory.length - 1];
                    if (gpu.currentPrice !== latestEntry.currentPrice) {
                        console.log(`       ⚠️  Warning: Current price ($${gpu.currentPrice}) doesn't match latest history entry ($${latestEntry.currentPrice})`);
                    } else {
                        console.log(`       ✅ Current price matches latest history entry`);
                    }

                } else {
                    console.log(`     ❌ No price history available`);
                }
            });
        }

        // Overall verification
        console.log('\\n🔎 Overall Data Integrity Check:');

        let totalCollections = 0;
        let collectionsWithHistory = 0;
        let totalGpus = 0;
        let gpusWithHistory = 0;
        let totalHistoryEntries = 0;

        const allCollections = await db.listCollections().toArray();
        const gpuCollections = allCollections.filter(col => col.name.startsWith('gpus_'));

        for (const collection of gpuCollections) {
            totalCollections++;
            const gpus = await db.collection(collection.name).find({}).toArray();
            totalGpus += gpus.length;

            const gpusWithHistoryInCollection = gpus.filter(gpu => gpu.priceHistory && gpu.priceHistory.length > 0);
            if (gpusWithHistoryInCollection.length > 0) {
                collectionsWithHistory++;
                gpusWithHistory += gpusWithHistoryInCollection.length;
                totalHistoryEntries += gpusWithHistoryInCollection.reduce((sum, gpu) => sum + gpu.priceHistory.length, 0);
            }
        }

        console.log(`   📊 Collections: ${collectionsWithHistory}/${totalCollections} have price history`);
        console.log(`   🎯 GPUs: ${gpusWithHistory}/${totalGpus} have price history (${((gpusWithHistory/totalGpus)*100).toFixed(1)}%)`);
        console.log(`   📈 Total price entries: ${totalHistoryEntries}`);
        console.log(`   📅 Average entries per GPU: ${(totalHistoryEntries/gpusWithHistory).toFixed(1)}`);

        if (gpusWithHistory === totalGpus) {
            console.log('   ✅ SUCCESS: All GPUs have price history data!');
        } else {
            console.log(`   ⚠️  ${totalGpus - gpusWithHistory} GPUs are missing price history`);
        }

    } catch (error) {
        console.error('❌ Error verifying price data:', error);
        throw error;
    }
}

// Run the script if called directly
if (require.main === module) {
    verifyPriceData()
        .then(() => {
            console.log('\\n✨ Price data verification completed!');
            process.exit(0);
        })
        .catch((error) => {
            console.error('\\n💥 Verification failed:', error);
            process.exit(1);
        });
}

module.exports = { verifyPriceData };