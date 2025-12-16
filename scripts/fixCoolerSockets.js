const { connectToDatabase, getDatabase } = require('../config/database');

async function fixCoolerSockets() {
    try {
        await connectToDatabase();
        const db = getDatabase();
        const coolersCollection = db.collection('coolers');

        console.log('🔧 Fixing cooler socket compatibility...\n');

        // Fix Thermalright AXP-90 X53
        const thermalrightResult = await coolersCollection.updateMany(
            {
                $or: [
                    { name: { $regex: 'Thermalright AXP-90 X53', $options: 'i' } },
                    { title: { $regex: 'Thermalright AXP-90 X53', $options: 'i' } }
                ]
            },
            {
                $set: {
                    manufacturer: 'Thermalright',
                    socketCompatibility: ['AM4', 'LGA1150', 'LGA1151', 'LGA1155', 'LGA1851', 'LGA1200'],
                    'specifications.socketCompatibility': ['AM4', 'LGA1150', 'LGA1151', 'LGA1155', 'LGA1851', 'LGA1200'],
                    updatedAt: new Date()
                }
            }
        );
        console.log(`✅ Updated Thermalright AXP-90 X53: ${thermalrightResult.modifiedCount} document(s)`);
        console.log('   Sockets: AM4, LGA1150, LGA1151, LGA1155, LGA1851, LGA1200');

        // Fix SilverStone XE360-TR5 (should ONLY be TR5 and SP6)
        const silverstoneResult = await coolersCollection.updateMany(
            {
                $or: [
                    { name: { $regex: 'XE360-TR5', $options: 'i' } },
                    { title: { $regex: 'XE360-TR5', $options: 'i' } }
                ]
            },
            {
                $set: {
                    manufacturer: 'SilverStone',
                    socketCompatibility: ['TR5', 'SP6'],
                    'specifications.socketCompatibility': ['TR5', 'SP6'],
                    updatedAt: new Date()
                }
            }
        );
        console.log(`✅ Updated SilverStone XE360-TR5: ${silverstoneResult.modifiedCount} document(s)`);
        console.log('   Sockets: TR5, SP6 (Threadripper only)');

        // Fix Cooler Master MasterLiquid ML240R RGB
        const coolerMasterResult = await coolersCollection.updateMany(
            {
                $or: [
                    { name: { $regex: 'MasterLiquid ML240R', $options: 'i' } },
                    { title: { $regex: 'MasterLiquid ML240R', $options: 'i' } }
                ]
            },
            {
                $set: {
                    manufacturer: 'Cooler Master',
                    socketCompatibility: ['AM4', 'AM5', 'LGA1851', 'LGA1700'],
                    'specifications.socketCompatibility': ['AM4', 'AM5', 'LGA1851', 'LGA1700'],
                    updatedAt: new Date()
                }
            }
        );
        console.log(`✅ Updated Cooler Master MasterLiquid ML240R: ${coolerMasterResult.modifiedCount} document(s)`);
        console.log('   Sockets: AM4, AM5, LGA1851, LGA1700');

        // Fix NZXT Kraken M22 manufacturer
        const nzxtResult = await coolersCollection.updateMany(
            {
                $or: [
                    { name: { $regex: 'NZXT Kraken M22', $options: 'i' } },
                    { title: { $regex: 'NZXT Kraken M22', $options: 'i' } }
                ]
            },
            {
                $set: {
                    manufacturer: 'NZXT',
                    updatedAt: new Date()
                }
            }
        );
        console.log(`✅ Updated NZXT Kraken M22 manufacturer: ${nzxtResult.modifiedCount} document(s)`);

        console.log('\n✅ Socket compatibility fixes complete!');

    } catch (error) {
        console.error('❌ Error fixing cooler sockets:', error);
        throw error;
    } finally {
        process.exit(0);
    }
}

fixCoolerSockets();
