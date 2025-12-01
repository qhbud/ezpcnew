const { connectToDatabase, getDatabase } = require('../config/database');

async function checkMotherboardPriceHistory() {
    try {
        await connectToDatabase();
        const db = getDatabase();

        // Get a few motherboards to check their price history
        const motherboards = await db.collection('motherboards').find({}).limit(5).toArray();

        console.log('\n=== Motherboard Price History Check ===\n');

        motherboards.forEach((mb, index) => {
            console.log(`\n--- Motherboard ${index + 1}: ${mb.name || mb.title} ---`);
            console.log('Has priceHistory field:', !!mb.priceHistory);

            if (mb.priceHistory) {
                console.log('priceHistory is array:', Array.isArray(mb.priceHistory));
                console.log('priceHistory length:', mb.priceHistory.length);

                if (mb.priceHistory.length > 0) {
                    console.log('First entry:', JSON.stringify(mb.priceHistory[0], null, 2));
                    console.log('Last entry:', JSON.stringify(mb.priceHistory[mb.priceHistory.length - 1], null, 2));
                }
            }

            console.log('Current Price:', mb.currentPrice);
            console.log('Base Price:', mb.basePrice);
            console.log('Sale Price:', mb.salePrice);
            console.log('Is On Sale:', mb.isOnSale);
            console.log('\n' + '='.repeat(80));
        });

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

checkMotherboardPriceHistory();
