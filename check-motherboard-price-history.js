require('dotenv').config();
const mongoose = require('mongoose');

const motherboardSchema = new mongoose.Schema({}, { strict: false, collection: 'motherboards' });
const Motherboard = mongoose.model('Motherboard', motherboardSchema);

async function checkMotherboardPriceHistory() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB\n');

        // Find the ASRock Z890 Taichi
        const motherboard = await Motherboard.findOne({
            name: { $regex: 'ASRock.*Z890.*Taichi', $options: 'i' }
        }).lean();

        if (motherboard) {
            console.log('═══════════════════════════════════════════════════════════════════════════');
            console.log('MOTHERBOARD DETAILS');
            console.log('═══════════════════════════════════════════════════════════════════════════\n');
            console.log(`Name: ${motherboard.name}`);
            console.log(`Price: $${motherboard.price || motherboard.currentPrice}`);
            console.log(`Base Price: $${motherboard.basePrice || 'N/A'}`);
            console.log(`Sale Price: $${motherboard.salePrice || 'N/A'}`);
            console.log(`Last Price Check: ${motherboard.lastPriceCheck || 'Never'}`);
            console.log(`URL: ${motherboard.sourceUrl}`);
            console.log('');

            console.log('═══════════════════════════════════════════════════════════════════════════');
            console.log('PRICE HISTORY');
            console.log('═══════════════════════════════════════════════════════════════════════════\n');

            if (motherboard.priceHistory && motherboard.priceHistory.length > 0) {
                console.log(`Total entries: ${motherboard.priceHistory.length}\n`);

                // Show all entries
                motherboard.priceHistory.forEach((entry, i) => {
                    const date = new Date(entry.date);
                    console.log(`${i + 1}. ${date.toLocaleString()}`);
                    console.log(`   Price: $${entry.price}`);
                    console.log(`   Source: ${entry.source || 'N/A'}`);
                    console.log('');
                });
            } else {
                console.log('❌ No price history found!\n');
            }

            // Check all LGA1851 motherboards
            console.log('═══════════════════════════════════════════════════════════════════════════');
            console.log('ALL LGA1851 MOTHERBOARDS - PRICE HISTORY COUNT');
            console.log('═══════════════════════════════════════════════════════════════════════════\n');

            const lga1851Boards = await Motherboard.find({ socket: 'LGA1851' }).lean();

            lga1851Boards.forEach((mb, i) => {
                const historyCount = mb.priceHistory ? mb.priceHistory.length : 0;
                const icon = historyCount > 1 ? '✅' : '⚠️';
                console.log(`${icon} ${mb.name?.substring(0, 60)}...`);
                console.log(`   Price History Entries: ${historyCount}`);
                console.log(`   Last Price Check: ${mb.lastPriceCheck || 'Never'}`);
                console.log('');
            });

        } else {
            console.log('❌ ASRock Z890 Taichi not found\n');
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error(error);
    } finally {
        await mongoose.connection.close();
        console.log('✅ Database connection closed');
    }
}

checkMotherboardPriceHistory();
