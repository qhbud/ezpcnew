const { connectToDatabase } = require('../config/database');

async function checkArcA770Price() {
    try {
        const db = await connectToDatabase();

        // Find the specific Sparkle Arc A770 Luna White Edition
        const gpu = await db.collection('gpus_arc_a770').findOne({
            name: { $regex: /Sparkle.*ROC Luna.*White/i }
        });

        if (gpu) {
            console.log('🔍 Found GPU:');
            console.log('Name:', gpu.name);
            console.log('Current Price:', gpu.currentPrice);
            console.log('Base Price:', gpu.basePrice);
            console.log('Sale Price:', gpu.salePrice);
            console.log('On Sale:', gpu.isOnSale);
            console.log('Source:', gpu.source);
            console.log('Last Updated:', gpu.lastUpdated);
            console.log('\\nPrice History:');

            if (gpu.priceHistory && gpu.priceHistory.length > 0) {
                gpu.priceHistory.forEach((entry, i) => {
                    const date = new Date(entry.date).toLocaleDateString();
                    const saleInfo = entry.isOnSale ? ' (ON SALE)' : '';
                    console.log(`  ${i+1}. ${date}: $${entry.currentPrice} (Base: $${entry.basePrice})${saleInfo}`);
                });
            } else {
                console.log('  No price history found');
            }

            return gpu;
        } else {
            console.log('❌ GPU not found');

            // Let's see all Arc A770 cards to find the right one
            console.log('\\n📋 All Arc A770 cards:');
            const allGpus = await db.collection('gpus_arc_a770').find({}).toArray();
            allGpus.forEach((gpu, i) => {
                console.log(`  ${i+1}. ${gpu.name.substring(0, 80)}... - $${gpu.currentPrice}`);
            });

            return null;
        }
    } catch (error) {
        console.error('❌ Error:', error);
    }
}

checkArcA770Price().then(() => process.exit(0));