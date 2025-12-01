require('dotenv').config();
const mongoose = require('mongoose');

const motherboardSchema = new mongoose.Schema({}, { strict: false, collection: 'motherboards' });
const Motherboard = mongoose.model('Motherboard', motherboardSchema);

async function checkMotherboardData() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB\n');

        // Get a sample of motherboards
        const motherboards = await Motherboard.find({}).limit(10).lean();

        console.log('Sample motherboard data structure:\n');
        motherboards.forEach((mb, i) => {
            console.log(`\n━━━ Motherboard ${i + 1}: ${mb.name || 'Unknown'} ━━━`);
            console.log('Available fields:', Object.keys(mb).filter(k => k !== '_id' && k !== '__v').join(', '));
            console.log('\nField values:');
            Object.entries(mb).forEach(([key, value]) => {
                if (key !== '_id' && key !== '__v') {
                    console.log(`  ${key}: ${value}`);
                }
            });
        });

        // Check all unique field names across all motherboards
        const allMotherboards = await Motherboard.find({}).lean();
        const allFields = new Set();
        allMotherboards.forEach(mb => {
            Object.keys(mb).forEach(key => {
                if (key !== '_id' && key !== '__v') {
                    allFields.add(key);
                }
            });
        });

        console.log('\n\n═══════════════════════════════════════════════════════════');
        console.log('ALL UNIQUE FIELDS IN MOTHERBOARDS COLLECTION:');
        console.log('═══════════════════════════════════════════════════════════');
        console.log(Array.from(allFields).sort().join(', '));

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await mongoose.connection.close();
    }
}

checkMotherboardData();
