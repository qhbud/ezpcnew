const { connectToDatabase } = require('../config/database');

async function fixArcA770Price() {
    try {
        const db = await connectToDatabase();

        // Find the specific Sparkle Arc A770 Luna White Edition
        const gpu = await db.collection('gpus_arc_a770').findOne({
            name: { $regex: /Sparkle.*ROC Luna.*White/i }
        });

        if (gpu) {
            console.log('🔍 Found GPU:', gpu.name.substring(0, 60) + '...');
            console.log('❌ Current incorrect price:', gpu.currentPrice);
            console.log('✅ Updating to correct price: $299.99');

            // Update the GPU with correct pricing
            const correctPrice = 299.99;
            const today = new Date();

            // Add new price history entry with correct price
            const newPriceEntry = {
                date: today,
                basePrice: correctPrice,
                salePrice: null,
                currentPrice: correctPrice,
                isOnSale: false,
                source: gpu.source || 'amazon'
            };

            // Update the document
            await db.collection('gpus_arc_a770').updateOne(
                { _id: gpu._id },
                {
                    $set: {
                        currentPrice: correctPrice,
                        basePrice: correctPrice,
                        salePrice: null,
                        isOnSale: false,
                        lastPriceUpdate: today
                    },
                    $push: {
                        priceHistory: newPriceEntry
                    }
                }
            );

            console.log('✅ Price updated successfully!');
            console.log('📅 Added new price entry for:', today.toLocaleDateString());

            // Verify the update
            const updatedGpu = await db.collection('gpus_arc_a770').findOne({ _id: gpu._id });
            console.log('\\n🔍 Verification:');
            console.log('New Current Price:', updatedGpu.currentPrice);
            console.log('Total Price History Entries:', updatedGpu.priceHistory.length);

            console.log('\\nUpdated Price History:');
            updatedGpu.priceHistory.forEach((entry, i) => {
                const date = new Date(entry.date).toLocaleDateString();
                console.log(`  ${i+1}. ${date}: $${entry.currentPrice}`);
            });

        } else {
            console.log('❌ GPU not found');
        }

    } catch (error) {
        console.error('❌ Error fixing price:', error);
    }
}

fixArcA770Price().then(() => process.exit(0));