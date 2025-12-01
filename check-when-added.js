require('dotenv').config();
const mongoose = require('mongoose');

const motherboardSchema = new mongoose.Schema({}, { strict: false, collection: 'motherboards' });
const Motherboard = mongoose.model('Motherboard', motherboardSchema);

async function checkWhenAdded() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB\n');

        const taichi = await Motherboard.findOne({
            name: { $regex: 'ASRock.*Z890.*Taichi', $options: 'i' }
        }).lean();

        console.log('═══════════════════════════════════════════════════════════════════════════');
        console.log('ASRock Z890 Taichi - Creation Details');
        console.log('═══════════════════════════════════════════════════════════════════════════\n');
        console.log(`Created At: ${taichi.createdAt || 'NOT SET'}`);
        console.log(`Scraped At: ${taichi.scrapedAt || 'NOT SET'}`);
        console.log(`Updated At: ${taichi.updatedAt || 'NOT SET'}`);
        console.log(`Last Price Check: ${taichi.lastPriceCheck || 'NEVER'}`);
        console.log('');

        console.log('Price History:');
        if (taichi.priceHistory && taichi.priceHistory.length > 0) {
            taichi.priceHistory.forEach((entry, i) => {
                console.log(`  ${i + 1}. ${new Date(entry.date).toLocaleString()} - $${entry.price}`);
            });
        } else {
            console.log('  No price history');
        }
        console.log('');

        // Check our add script to see if it created price history
        console.log('Let me check our creation script...\n');

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await mongoose.connection.close();
        console.log('✅ Database connection closed');
    }
}

checkWhenAdded();
