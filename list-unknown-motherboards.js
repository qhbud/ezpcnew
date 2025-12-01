require('dotenv').config();
const mongoose = require('mongoose');

const motherboardSchema = new mongoose.Schema({}, { strict: false, collection: 'motherboards' });
const Motherboard = mongoose.model('Motherboard', motherboardSchema);

async function listUnknownMotherboards() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB\n');

        // Get all motherboards
        const motherboards = await Motherboard.find({}).lean();

        const unknownChipset = [];
        const unknownMemory = [];

        motherboards.forEach(mb => {
            const chipset = mb.chipset ? String(mb.chipset).trim() : '';
            const memType = mb.memoryType ? String(mb.memoryType).trim() : '';
            const socket = mb.socket ? String(mb.socket).trim() : '';

            // Check for unknown chipset
            if (!chipset || chipset === '' || chipset.toLowerCase() === 'unknown') {
                unknownChipset.push({
                    name: mb.name,
                    socket: socket || 'Unknown',
                    chipset: chipset || 'MISSING',
                    memoryType: memType || 'Unknown',
                    formFactor: mb.formFactor || 'Unknown',
                    price: mb.price || mb.currentPrice || 'N/A',
                    url: mb.sourceUrl || mb.amazonUrl || 'N/A'
                });
            }

            // Check for unknown memory type
            if (!memType || memType === '' || memType.toLowerCase() === 'unknown') {
                unknownMemory.push({
                    name: mb.name,
                    socket: socket || 'Unknown',
                    chipset: chipset || 'Unknown',
                    memoryType: memType || 'MISSING',
                    formFactor: mb.formFactor || 'Unknown',
                    price: mb.price || mb.currentPrice || 'N/A',
                    url: mb.sourceUrl || mb.amazonUrl || 'N/A'
                });
            }
        });

        console.log('═══════════════════════════════════════════════════════════════════════════');
        console.log(`MOTHERBOARDS WITH UNKNOWN/MISSING CHIPSET: ${unknownChipset.length}`);
        console.log('═══════════════════════════════════════════════════════════════════════════\n');

        if (unknownChipset.length > 0) {
            unknownChipset.forEach((mb, i) => {
                console.log(`${i + 1}. ${mb.name}`);
                console.log(`   Socket: ${mb.socket}`);
                console.log(`   Chipset: ${mb.chipset}`);
                console.log(`   Memory: ${mb.memoryType}`);
                console.log(`   Form Factor: ${mb.formFactor}`);
                console.log(`   Price: $${mb.price}`);
                console.log(`   URL: ${mb.url}`);
                console.log('');
            });
        } else {
            console.log('✅ All motherboards have chipset data!\n');
        }

        console.log('═══════════════════════════════════════════════════════════════════════════');
        console.log(`MOTHERBOARDS WITH UNKNOWN/MISSING MEMORY TYPE: ${unknownMemory.length}`);
        console.log('═══════════════════════════════════════════════════════════════════════════\n');

        if (unknownMemory.length > 0) {
            unknownMemory.forEach((mb, i) => {
                console.log(`${i + 1}. ${mb.name}`);
                console.log(`   Socket: ${mb.socket}`);
                console.log(`   Chipset: ${mb.chipset}`);
                console.log(`   Memory: ${mb.memoryType}`);
                console.log(`   Form Factor: ${mb.formFactor}`);
                console.log(`   Price: $${mb.price}`);
                console.log(`   URL: ${mb.url}`);
                console.log('');
            });
        } else {
            console.log('✅ All motherboards have memory type data!\n');
        }

        console.log('═══════════════════════════════════════════════════════════════════════════');
        console.log('SUMMARY');
        console.log('═══════════════════════════════════════════════════════════════════════════');
        console.log(`Total motherboards: ${motherboards.length}`);
        console.log(`Missing chipset: ${unknownChipset.length} (${(unknownChipset.length/motherboards.length*100).toFixed(1)}%)`);
        console.log(`Missing memory type: ${unknownMemory.length} (${(unknownMemory.length/motherboards.length*100).toFixed(1)}%)`);
        console.log('');

    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error(error);
    } finally {
        await mongoose.connection.close();
        console.log('✅ Database connection closed');
    }
}

listUnknownMotherboards();
