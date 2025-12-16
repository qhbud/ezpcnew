const { connectToDatabase, getDatabase } = require('../config/database');

async function verifyCoolers() {
    try {
        await connectToDatabase();
        const db = getDatabase();
        const coolersCollection = db.collection('coolers');

        console.log('🔍 Verifying cooler socket compatibility...\n');

        // Check specific coolers
        const coolersToCheck = [
            'Thermalright AXP-90 X53',
            'NZXT Kraken M22',
            'Scythe Kotetsu Mark II',
            'SilverStone.*XE360-TR5',
            'Cooler Master MasterLiquid ML240R',
            'CORSAIR iCUE Link H170i RGB'
        ];

        for (const coolerPattern of coolersToCheck) {
            const cooler = await coolersCollection.findOne({
                $or: [
                    { name: { $regex: coolerPattern, $options: 'i' } },
                    { title: { $regex: coolerPattern, $options: 'i' } }
                ]
            });

            if (cooler) {
                console.log(`✅ ${cooler.manufacturer || 'Unknown'} - ${cooler.coolerType || 'Unknown'}`);
                console.log(`   Name: ${(cooler.name || cooler.title || '').substring(0, 60)}...`);
                console.log(`   Price: $${cooler.currentPrice || cooler.price}`);
                console.log(`   Sockets: ${(cooler.socketCompatibility || []).join(', ') || 'None defined'}`);
                console.log('');
            } else {
                console.log(`❌ Not found: ${coolerPattern}\n`);
            }
        }

        // Check all coolers with no socket compatibility
        const noSocketCoolers = await coolersCollection.find({
            $or: [
                { socketCompatibility: { $exists: false } },
                { socketCompatibility: [] },
                { socketCompatibility: null }
            ]
        }).toArray();

        console.log(`\n⚠️  Coolers without socket compatibility: ${noSocketCoolers.length}`);
        if (noSocketCoolers.length > 0) {
            noSocketCoolers.forEach(cooler => {
                console.log(`   - ${(cooler.name || cooler.title || 'Unknown').substring(0, 60)}...`);
            });
        }

        console.log('\n✅ Verification complete!');

    } catch (error) {
        console.error('❌ Error verifying coolers:', error);
        throw error;
    } finally {
        process.exit(0);
    }
}

verifyCoolers();
