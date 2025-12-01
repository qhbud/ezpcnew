require('dotenv').config();
const mongoose = require('mongoose');

const motherboardSchema = new mongoose.Schema({}, { strict: false, collection: 'motherboards' });
const Motherboard = mongoose.model('Motherboard', motherboardSchema);

async function backfillPriceHistory() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB\n');

        // Get all LGA1851 motherboards with only 1 price history entry
        const motherboards = await Motherboard.find({
            socket: 'LGA1851',
            'priceHistory.1': { $exists: false } // Has array but 2nd element doesn't exist = only 1 entry
        });

        console.log(`Found ${motherboards.length} LGA1851 motherboards with only 1 price history entry\n`);

        for (const mb of motherboards) {
            // Add an initial entry dated to when it was created
            const initialEntry = {
                price: mb.price || mb.currentPrice || mb.basePrice,
                date: mb.createdAt || mb.scrapedAt || new Date(),
                source: mb.sourceUrl,
                detectionMethod: 'initial_scrape',
                isAvailable: true
            };

            // Prepend the initial entry (so it comes first chronologically)
            const updatedHistory = [initialEntry, ...mb.priceHistory];

            await Motherboard.updateOne(
                { _id: mb._id },
                { $set: { priceHistory: updatedHistory } }
            );

            console.log(`✅ ${mb.name?.substring(0, 60)}...`);
            console.log(`   Added initial entry: ${new Date(initialEntry.date).toLocaleString()}`);
            console.log(`   Price history entries: ${updatedHistory.length}\n`);
        }

        console.log(`\n🎉 Backfilled price history for ${motherboards.length} motherboards\n`);

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await mongoose.connection.close();
        console.log('✅ Database connection closed');
    }
}

backfillPriceHistory();
