const { connectToDatabase } = require('../config/database');

async function analyzePriceHistory() {
    console.log('📊 Analyzing GPU price history...');

    try {
        const db = await connectToDatabase();

        // Get a sample collection to demonstrate price history analysis
        const collection = db.collection('gpus_rtx_4070_super');
        const gpus = await collection.find({}).toArray();

        console.log(`\n🔍 Analyzing ${gpus.length} RTX 4070 Super GPUs:\n`);

        for (const gpu of gpus) {
            console.log(`📱 ${gpu.name.substring(0, 60)}...`);
            console.log(`   Current Price: $${gpu.currentPrice}`);

            if (gpu.priceHistory && gpu.priceHistory.length > 0) {
                console.log(`   Price History (${gpu.priceHistory.length} entries):`);

                // Sort by date (oldest first)
                const sortedHistory = gpu.priceHistory.sort((a, b) => new Date(a.date) - new Date(b.date));

                sortedHistory.forEach((entry, index) => {
                    const date = new Date(entry.date).toLocaleDateString();
                    const isOnSale = entry.isOnSale ? ' (ON SALE!)' : '';
                    console.log(`     ${index + 1}. ${date}: $${entry.currentPrice}${isOnSale}`);
                });

                // Calculate price trends
                if (sortedHistory.length > 1) {
                    const firstPrice = sortedHistory[0].currentPrice;
                    const lastPrice = sortedHistory[sortedHistory.length - 1].currentPrice;
                    const priceChange = lastPrice - firstPrice;
                    const percentChange = ((priceChange / firstPrice) * 100).toFixed(2);

                    const trend = priceChange > 0 ? '📈 UP' : priceChange < 0 ? '📉 DOWN' : '➡️ STABLE';
                    console.log(`   Price Trend: ${trend} ($${priceChange.toFixed(2)}, ${percentChange}%)`);
                }
            } else {
                console.log(`   ❌ No price history available`);
            }
            console.log('');
        }

        // Overall statistics
        const allGpusWithHistory = gpus.filter(gpu => gpu.priceHistory && gpu.priceHistory.length > 0);
        const totalPriceEntries = allGpusWithHistory.reduce((sum, gpu) => sum + gpu.priceHistory.length, 0);

        console.log('📈 Overall Statistics:');
        console.log(`   GPUs with price history: ${allGpusWithHistory.length}/${gpus.length}`);
        console.log(`   Total price data points: ${totalPriceEntries}`);
        console.log(`   Average price entries per GPU: ${(totalPriceEntries / allGpusWithHistory.length).toFixed(1)}`);

    } catch (error) {
        console.error('❌ Error analyzing price history:', error);
        throw error;
    }
}

// Run the script if called directly
if (require.main === module) {
    analyzePriceHistory()
        .then(() => {
            console.log('\\n✨ Analysis completed successfully!');
            process.exit(0);
        })
        .catch((error) => {
            console.error('\\n💥 Analysis failed:', error);
            process.exit(1);
        });
}

module.exports = { analyzePriceHistory };