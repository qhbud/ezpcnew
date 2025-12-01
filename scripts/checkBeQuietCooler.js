const { MongoClient } = require('mongodb');

async function checkCooler() {
    const client = await MongoClient.connect('mongodb://localhost:27017');
    const db = client.db('pcbuilder');

    try {
        const cooler = await db.collection('coolers').findOne({
            name: /be quiet.*Pure Rock 3 Black/i
        });

        if (!cooler) {
            console.log('❌ Cooler not found');
            return;
        }

        console.log('🔍 Found Cooler:');
        console.log('Name:', cooler.name);
        console.log('Current Price:', cooler.price || 'N/A');
        console.log('Is Available:', cooler.isAvailable);
        console.log('\nPrice History:');
        if (cooler.priceHistory && cooler.priceHistory.length > 0) {
            console.log('Total snapshots:', cooler.priceHistory.length);
            cooler.priceHistory.forEach((entry, i) => {
                console.log(`  ${i + 1}. Price: $${entry.price}, Date: ${new Date(entry.date).toLocaleString()}, Method: ${entry.detectionMethod || 'N/A'}`);
            });
        } else {
            console.log('No price history');
        }
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await client.close();
    }
}

checkCooler();
