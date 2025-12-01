const { connectToDatabase } = require('../config/database');

async function addPriceHistoryToGPUs() {
    console.log('🚀 Starting price history update for GPUs...');

    try {
        const db = await connectToDatabase();

        // Get all GPU collections
        const collections = await db.listCollections().toArray();
        const gpuCollections = collections
            .filter(col => col.name.startsWith('gpus_'))
            .map(col => col.name);

        console.log(`📊 Found ${gpuCollections.length} GPU collections:`, gpuCollections);

        let totalUpdated = 0;
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Set to start of day for consistency

        for (const collectionName of gpuCollections) {
            console.log(`\n🔄 Processing collection: ${collectionName}`);

            const collection = db.collection(collectionName);
            const gpus = await collection.find({}).toArray();

            console.log(`   Found ${gpus.length} GPUs in ${collectionName}`);

            for (const gpu of gpus) {
                // Initialize priceHistory array if it doesn't exist
                if (!gpu.priceHistory) {
                    gpu.priceHistory = [];
                }

                // Check if we already have a price entry for today
                const todayEntry = gpu.priceHistory.find(entry => {
                    const entryDate = new Date(entry.date);
                    entryDate.setHours(0, 0, 0, 0);
                    return entryDate.getTime() === today.getTime();
                });

                if (!todayEntry) {
                    // Add today's price to history
                    const priceEntry = {
                        date: new Date(),
                        basePrice: gpu.basePrice || 0,
                        salePrice: gpu.salePrice || null,
                        currentPrice: gpu.currentPrice || gpu.basePrice || 0,
                        isOnSale: gpu.isOnSale || false,
                        source: gpu.source || 'unknown'
                    };

                    // Update the document
                    await collection.updateOne(
                        { _id: gpu._id },
                        {
                            $push: { priceHistory: priceEntry },
                            $set: { lastPriceUpdate: new Date() }
                        }
                    );

                    totalUpdated++;

                    // Log progress every 10 updates
                    if (totalUpdated % 10 === 0) {
                        console.log(`   ✅ Updated ${totalUpdated} GPUs so far...`);
                    }
                } else {
                    console.log(`   ⏭️  Skipping ${gpu.name.substring(0, 50)}... (already has today's price)`);
                }
            }

            console.log(`   ✅ Completed ${collectionName}: processed ${gpus.length} GPUs`);
        }

        console.log(`\n🎉 Price history update completed!`);
        console.log(`📈 Total GPUs updated with today's price: ${totalUpdated}`);
        console.log(`📅 Date: ${today.toISOString().split('T')[0]}`);

    } catch (error) {
        console.error('❌ Error updating price history:', error);
        throw error;
    }
}

// Run the script if called directly
if (require.main === module) {
    addPriceHistoryToGPUs()
        .then(() => {
            console.log('\\n✨ Script completed successfully!');
            process.exit(0);
        })
        .catch((error) => {
            console.error('\\n💥 Script failed:', error);
            process.exit(1);
        });
}

module.exports = { addPriceHistoryToGPUs };