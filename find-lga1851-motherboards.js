require('dotenv').config();
const mongoose = require('mongoose');

const motherboardSchema = new mongoose.Schema({}, { strict: false, collection: 'motherboards' });
const Motherboard = mongoose.model('Motherboard', motherboardSchema);

async function findLGA1851Motherboards() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB\n');

        // Get all LGA1851 motherboards currently in database
        const existing = await Motherboard.find({ socket: 'LGA1851' }).lean();

        console.log('═══════════════════════════════════════════════════════════════════════════');
        console.log(`CURRENT LGA1851 MOTHERBOARDS IN DATABASE: ${existing.length}`);
        console.log('═══════════════════════════════════════════════════════════════════════════\n');

        existing.forEach((mb, i) => {
            console.log(`${i + 1}. ${mb.name}`);
            console.log(`   Form Factor: ${mb.formFactor}`);
            console.log(`   Chipset: ${mb.chipset}`);
            console.log(`   Price: $${mb.price || mb.currentPrice}`);
            console.log(`   URL: ${mb.sourceUrl}`);
            console.log('');
        });

        // Extract ASINs for comparison
        const existingASINs = existing.map(mb => {
            const match = mb.sourceUrl?.match(/\/dp\/([A-Z0-9]+)/);
            return match ? match[1] : null;
        }).filter(Boolean);

        console.log('Existing ASINs:', existingASINs.join(', '));
        console.log('');

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await mongoose.connection.close();
        console.log('✅ Database connection closed');
    }
}

findLGA1851Motherboards();
