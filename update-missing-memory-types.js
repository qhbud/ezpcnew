require('dotenv').config();
const mongoose = require('mongoose');

const motherboardSchema = new mongoose.Schema({}, { strict: false, collection: 'motherboards' });
const Motherboard = mongoose.model('Motherboard', motherboardSchema);

async function updateMissingMemoryTypes() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB\n');

        const updates = [
            {
                // 1. ASUS ROG MAXIMUS Z790 HERO
                url: 'https://www.amazon.com/dp/B0BH95RF4R?tag=qhezpc-20',
                updates: {
                    memoryType: 'DDR4',
                    socket: 'LGA1700'
                }
            },
            {
                // 2. MSI MAG B650 Tomahawk WiFi
                url: 'https://www.amazon.com/dp/B0BDS873GF?tag=qhezpc-20',
                updates: {
                    memoryType: 'DDR5'
                }
            },
            {
                // 3. MSI MAG B650 Tomahawk WiFi (Renewed)
                url: 'https://www.amazon.com/dp/B0DXCVD18H?tag=qhezpc-20',
                updates: {
                    memoryType: 'DDR5'
                }
            },
            {
                // 4. Gigabyte Ultra Durable X670 Gaming X AX V2
                url: 'https://www.amazon.com/dp/B0CNR8Y29S?tag=qhezpc-20',
                updates: {
                    memoryType: 'DDR5'
                }
            }
        ];

        console.log('═══════════════════════════════════════════════════════════════════════════');
        console.log('UPDATING MOTHERBOARD MEMORY TYPES');
        console.log('═══════════════════════════════════════════════════════════════════════════\n');

        let successCount = 0;
        let failCount = 0;

        for (const update of updates) {
            // First find the motherboard to get its current state
            const beforeUpdate = await Motherboard.findOne({ sourceUrl: update.url }).lean();

            if (beforeUpdate) {
                const oldMemType = beforeUpdate.memoryType || 'MISSING';
                const oldSocket = beforeUpdate.socket || 'MISSING';

                // Use updateOne to directly update the document
                const result = await Motherboard.updateOne(
                    { sourceUrl: update.url },
                    { $set: update.updates }
                );

                if (result.modifiedCount > 0) {
                    console.log(`✅ Updated: ${beforeUpdate.name}`);
                    if (update.updates.memoryType) {
                        console.log(`   Memory Type: ${oldMemType} → ${update.updates.memoryType}`);
                    }
                    if (update.updates.socket) {
                        console.log(`   Socket: ${oldSocket} → ${update.updates.socket}`);
                    }
                    console.log('');
                    successCount++;
                } else {
                    console.log(`⚠️ No changes needed for: ${beforeUpdate.name}`);
                    console.log('');
                    successCount++;
                }
            } else {
                console.log(`❌ Not found: ${update.url}`);
                console.log('');
                failCount++;
            }
        }

        console.log('═══════════════════════════════════════════════════════════════════════════');
        console.log('SUMMARY');
        console.log('═══════════════════════════════════════════════════════════════════════════');
        console.log(`Successfully updated: ${successCount}`);
        console.log(`Failed to find: ${failCount}`);
        console.log('');

        // Verify the updates
        console.log('═══════════════════════════════════════════════════════════════════════════');
        console.log('VERIFICATION - Checking for remaining missing memory types');
        console.log('═══════════════════════════════════════════════════════════════════════════\n');

        const allMotherboards = await Motherboard.find({}).lean();
        const stillMissing = allMotherboards.filter(mb => {
            const memType = mb.memoryType ? String(mb.memoryType).trim() : '';
            return !memType || memType === '' || memType.toLowerCase() === 'unknown';
        });

        if (stillMissing.length === 0) {
            console.log('🎉 All motherboards now have memory type data!');
        } else {
            console.log(`⚠️ Still missing memory type: ${stillMissing.length}`);
            stillMissing.forEach((mb, i) => {
                console.log(`${i + 1}. ${mb.name}`);
            });
        }
        console.log('');

    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error(error);
    } finally {
        await mongoose.connection.close();
        console.log('✅ Database connection closed');
    }
}

updateMissingMemoryTypes();
