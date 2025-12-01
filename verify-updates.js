require('dotenv').config();
const mongoose = require('mongoose');

const motherboardSchema = new mongoose.Schema({}, { strict: false, collection: 'motherboards' });
const Motherboard = mongoose.model('Motherboard', motherboardSchema);

async function verifyUpdates() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB\n');

        const urls = [
            'https://www.amazon.com/dp/B0BH95RF4R?tag=qhezpc-20',
            'https://www.amazon.com/dp/B0BDS873GF?tag=qhezpc-20',
            'https://www.amazon.com/dp/B0DXCVD18H?tag=qhezpc-20',
            'https://www.amazon.com/dp/B0CNR8Y29S?tag=qhezpc-20'
        ];

        console.log('Checking updated motherboards:\n');

        for (const url of urls) {
            const mb = await Motherboard.findOne({ sourceUrl: url }).lean();
            if (mb) {
                console.log(`${mb.name}`);
                console.log(`  memoryType field: "${mb.memoryType}"`);
                console.log(`  memoryType type: ${typeof mb.memoryType}`);
                console.log(`  socket: "${mb.socket}"`);
                console.log('');
            }
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await mongoose.connection.close();
    }
}

verifyUpdates();
