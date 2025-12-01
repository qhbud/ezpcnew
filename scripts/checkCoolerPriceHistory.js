const { MongoClient } = require('mongodb');

async function checkCoolerPriceHistory() {
    const client = await MongoClient.connect('mongodb://localhost:27017');
    const db = client.db('pcbuilder');

    try {
        // Search for the ID-COOLING Blitz X4 cooler
        const cooler = await db.collection('coolers').findOne({
            name: /ID-COOLING.*Blitz X4/i
        });

        if (!cooler) {
            console.log('❌ Cooler not found');
            return;
        }

        console.log('🔍 Found Cooler:');
        console.log(`Name: ${cooler.name}`);
        console.log(`Manufacturer: ${cooler.manufacturer}`);
        console.log(`Current Price: $${cooler.price || cooler.currentPrice || cooler.basePrice || 'N/A'}`);
        console.log(`Is Available: ${cooler.isAvailable !== false ? 'Yes' : 'No'}\n`);

        // Check if priceHistory exists
        if (cooler.priceHistory && Array.isArray(cooler.priceHistory)) {
            console.log(`📊 Price History (${cooler.priceHistory.length} records):\n`);

            // Sort by date
            const sortedHistory = cooler.priceHistory.sort((a, b) => {
                const dateA = new Date(a.date || a.timestamp);
                const dateB = new Date(b.date || b.timestamp);
                return dateA - dateB;
            });

            sortedHistory.forEach((entry, i) => {
                const date = new Date(entry.date || entry.timestamp);
                const dateStr = date.toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                });

                const price = entry.price || entry.salePrice || entry.currentPrice || entry.basePrice;
                const isOnSale = entry.isOnSale ? '(SALE)' : '';
                const available = entry.isAvailable !== false ? '✅' : '❌';

                console.log(`${i + 1}. ${dateStr} - $${price} ${isOnSale} ${available}`);
            });

            // Calculate price statistics
            const prices = sortedHistory
                .map(e => parseFloat(e.price || e.salePrice || e.currentPrice || e.basePrice))
                .filter(p => p > 0);

            if (prices.length > 0) {
                const minPrice = Math.min(...prices);
                const maxPrice = Math.max(...prices);
                const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;

                console.log('\n📈 Price Statistics:');
                console.log(`   Lowest: $${minPrice.toFixed(2)}`);
                console.log(`   Highest: $${maxPrice.toFixed(2)}`);
                console.log(`   Average: $${avgPrice.toFixed(2)}`);
                console.log(`   Current: $${cooler.price || cooler.currentPrice || cooler.basePrice || 'N/A'}`);
            }
        } else {
            console.log('ℹ️  No price history available for this cooler');
        }

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await client.close();
    }
}

checkCoolerPriceHistory();
