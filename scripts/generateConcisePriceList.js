const { connectToDatabase } = require('../config/database');

async function generateConcisePriceList() {
    console.log('📊 Generating concise GPU price list with dates...');

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
                // Extract GPU model name (simplified)
                let modelName = gpu.name;

                // Simplify the name to extract key model info
                if (modelName.includes('RTX')) {
                    const match = modelName.match(/RTX\\s+(\\d+(?:\\s*Ti|\\s*Super)?)/i);
                    if (match) {
                        modelName = `RTX ${match[1].replace(/\\s+/g, ' ')}`;
                    }
                } else if (modelName.includes('RX')) {
                    const match = modelName.match(/RX\\s+(\\d+(?:\\s*XT|\\s*XTX|\\s*GRE)?)/i);
                    if (match) {
                        modelName = `RX ${match[1].replace(/\\s+/g, ' ')}`;
                    }
                } else if (modelName.includes('Arc')) {
                    const match = modelName.match(/Arc\\s+(A\\d+)/i);
                    if (match) {
                        modelName = `Arc ${match[1]}`;
                    }
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

                // Create entry
                const entry = `${modelName}: ${priceEntries.join(', ')}`;
                priceList.push(entry);
            }
        }

        // Sort by GPU model for better organization
        priceList.sort();

        console.log('📋 GPU PRICE LIST WITH DATES:');
        console.log('='.repeat(60));
        priceList.forEach(entry => console.log(entry));
        console.log('='.repeat(60));
        console.log(`📊 Total entries: ${priceList.length}`);

        return priceList;

    } catch (error) {
        console.error('❌ Error generating concise price list:', error);
        throw error;
    }
}

// Run the script if called directly
if (require.main === module) {
    generateConcisePriceList()
        .then((priceList) => {
            console.log('\\n✨ Concise price list generation completed!');
            process.exit(0);
        })
        .catch((error) => {
            console.error('\\n💥 Price list generation failed:', error);
            process.exit(1);
        });
}

module.exports = { generateConcisePriceList };