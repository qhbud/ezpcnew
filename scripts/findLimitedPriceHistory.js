const { MongoClient } = require('mongodb');

async function findLimitedPriceHistory() {
    console.log('🔍 Finding components with 0 or 1 price snapshots...\n');

    const client = await MongoClient.connect('mongodb://localhost:27017');
    const db = client.db('pcbuilder');

    try {
        const collections = ['cpus', 'motherboards', 'gpus', 'rams', 'storages', 'psus', 'cases', 'coolers'];

        let totalWithLimitedHistory = 0;
        let totalComponents = 0;

        for (const collectionName of collections) {
            console.log(`\n📦 Checking ${collectionName}...`);
            console.log('─'.repeat(80));

            const collection = db.collection(collectionName);
            const total = await collection.countDocuments();
            totalComponents += total;

            // Find items with no priceHistory field
            const noPriceHistory = await collection.find({
                $or: [
                    { priceHistory: { $exists: false } },
                    { priceHistory: null },
                    { priceHistory: [] }
                ]
            }).toArray();

            // Find items with exactly 1 price snapshot
            const onePriceSnapshot = await collection.find({
                $and: [
                    { priceHistory: { $exists: true } },
                    { priceHistory: { $ne: null } },
                    { priceHistory: { $size: 1 } }
                ]
            }).toArray();

            const limitedHistoryCount = noPriceHistory.length + onePriceSnapshot.length;
            totalWithLimitedHistory += limitedHistoryCount;

            console.log(`Total ${collectionName}: ${total}`);
            console.log(`  With 0 snapshots: ${noPriceHistory.length}`);
            console.log(`  With 1 snapshot: ${onePriceSnapshot.length}`);
            console.log(`  Limited history: ${limitedHistoryCount} (${((limitedHistoryCount / total) * 100).toFixed(1)}%)`);

            // Show some examples
            if (noPriceHistory.length > 0) {
                console.log(`\n  Examples with 0 snapshots:`);
                noPriceHistory.slice(0, 5).forEach((item, i) => {
                    const name = item.name || item.title || 'Unknown';
                    const price = item.price || item.currentPrice || item.basePrice || 'N/A';
                    console.log(`    ${i + 1}. ${name.substring(0, 70)} - $${price}`);
                });
            }

            if (onePriceSnapshot.length > 0) {
                console.log(`\n  Examples with 1 snapshot:`);
                onePriceSnapshot.slice(0, 5).forEach((item, i) => {
                    const name = item.name || item.title || 'Unknown';
                    const price = item.price || item.currentPrice || item.basePrice || 'N/A';
                    const historyPrice = item.priceHistory[0]?.price || 'N/A';
                    const historyDate = item.priceHistory[0]?.date ? new Date(item.priceHistory[0].date).toLocaleDateString() : 'N/A';
                    console.log(`    ${i + 1}. ${name.substring(0, 60)}`);
                    console.log(`       Current: $${price}, History: $${historyPrice} (${historyDate})`);
                });
            }
        }

        console.log('\n\n' + '='.repeat(80));
        console.log('📊 SUMMARY');
        console.log('='.repeat(80));
        console.log(`Total components checked: ${totalComponents}`);
        console.log(`Components with 0-1 snapshots: ${totalWithLimitedHistory}`);
        console.log(`Percentage: ${((totalWithLimitedHistory / totalComponents) * 100).toFixed(1)}%`);
        console.log(`Components with good history (2+): ${totalComponents - totalWithLimitedHistory}`);

    } catch (error) {
        console.error('❌ Error:', error);
        throw error;
    } finally {
        await client.close();
    }
}

// Run the check
if (require.main === module) {
    findLimitedPriceHistory()
        .then(() => {
            console.log('\n✅ Check completed!');
            process.exit(0);
        })
        .catch(error => {
            console.error('\n💥 Check failed:', error);
            process.exit(1);
        });
}

module.exports = { findLimitedPriceHistory };
