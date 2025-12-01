require('dotenv').config();
const mongoose = require('mongoose');

const motherboardSchema = new mongoose.Schema({}, { strict: false, collection: 'motherboards' });
const Motherboard = mongoose.model('Motherboard', motherboardSchema);

async function verifySpecs() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB\n');

        const lga1851Boards = await Motherboard.find({ socket: 'LGA1851' }).lean();

        console.log('═══════════════════════════════════════════════════════════════════════════');
        console.log(`LGA1851 MOTHERBOARD SPECIFICATIONS (${lga1851Boards.length} total)`);
        console.log('═══════════════════════════════════════════════════════════════════════════\n');

        lga1851Boards.forEach((mb, i) => {
            console.log(`${i + 1}. ${mb.name?.substring(0, 60)}...`);
            console.log(`   Form Factor: ${mb.formFactor}`);
            console.log(`   RAM Slots: ${mb.memorySlots || 'N/A'}`);
            console.log(`   PCIe Slots: ${mb.pcieSlotCount || mb.pcieSlots || 'N/A'}`);
            console.log(`   M.2 Slots: ${mb.m2SlotCount || mb.m2Slots || 'N/A'}`);
            console.log(`   Price: $${mb.price || mb.currentPrice}`);
            if (mb.specifications?.powerStages) {
                console.log(`   Power Stages: ${mb.specifications.powerStages}`);
            }
            if (mb.networking) {
                console.log(`   WiFi: ${mb.networking.wifi || 'N/A'}`);
            }
            console.log('');
        });

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await mongoose.connection.close();
        console.log('✅ Database connection closed');
    }
}

verifySpecs();
