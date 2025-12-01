const { connectToDatabase } = require('../config/database');

async function generateIndividualPriceList() {
    console.log('📊 Generating individual GPU card price list...');

    try {
        const db = await connectToDatabase();

        // Get all GPU collections
        const collections = await db.listCollections().toArray();
        const gpuCollections = collections
            .filter(col => col.name.startsWith('gpus_'))
            .map(col => col.name)
            .sort();

        console.log(`🔍 Processing ${gpuCollections.length} GPU collections...\n`);

        const priceList = [];

        for (const collectionName of gpuCollections) {
            const collection = db.collection(collectionName);
            const gpus = await collection.find({}).toArray();

            for (const gpu of gpus) {
                // Use the full GPU name (truncated to reasonable length for readability)
                let cardName = gpu.name;
                if (cardName.length > 80) {
                    cardName = cardName.substring(0, 77) + '...';
                }

                // Get price history (sorted by date)
                const priceHistory = gpu.priceHistory || [];
                priceHistory.sort((a, b) => new Date(a.date) - new Date(b.date));

                // Format prices with dates
                const priceEntries = priceHistory.map(entry => {
                    const date = new Date(entry.date);
                    const formattedDate = `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`;
                    return `$${entry.currentPrice}-${formattedDate}`;
                });

                // Create entry with full card name
                const entry = `${cardName}: ${priceEntries.join(', ')}`;
                priceList.push(entry);
            }
        }

        // Sort alphabetically by card name
        priceList.sort();

        console.log('📋 INDIVIDUAL GPU CARD PRICE LIST:');
        console.log('='.repeat(120));
        priceList.forEach(entry => console.log(entry));
        console.log('='.repeat(120));
        console.log(`📊 Total individual cards: ${priceList.length}`);

        return priceList;

    } catch (error) {
        console.error('❌ Error generating individual price list:', error);
        throw error;
    }
}

// Run the script if called directly
if (require.main === module) {
    generateIndividualPriceList()
        .then((priceList) => {
            console.log('\\n✨ Individual price list generation completed!');
            process.exit(0);
        })
        .catch((error) => {
            console.error('\\n💥 Price list generation failed:', error);
            process.exit(1);
        });
}

module.exports = { generateIndividualPriceList };