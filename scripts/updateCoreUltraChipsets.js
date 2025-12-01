const { connectToDatabase, getDatabase } = require('../config/database');

async function updateCoreUltraChipsets() {
    console.log('🚀 Updating Intel Core Ultra CPU chipsets...\n');

    try {
        await connectToDatabase();
        const db = getDatabase();
        const collection = db.collection('cpus');

        // Intel Core Ultra (Arrow Lake) supported chipsets for LGA1851
        const supportedChipsets = ['Z890', 'B860', 'H810'];

        const coreUltraCPUs = [
            'Intel Core Ultra 9 285K',
            'Intel Core Ultra 7 265K',
            'Intel Core Ultra 5 245K'
        ];

        for (const cpuName of coreUltraCPUs) {
            const result = await collection.updateOne(
                { name: cpuName },
                {
                    $set: {
                        supportedChipsets: supportedChipsets,
                        socket: 'LGA1851',
                        updatedAt: new Date()
                    }
                }
            );

            if (result.matchedCount > 0) {
                console.log(`✅ Updated ${cpuName}: Socket LGA1851, Chipsets: ${supportedChipsets.join(', ')}`);
            } else {
                console.log(`⚠️  ${cpuName} not found in database`);
            }
        }

        console.log('\n✅ Chipset update completed!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error updating chipsets:', error);
        process.exit(1);
    }
}

if (require.main === module) {
    updateCoreUltraChipsets();
}

module.exports = { updateCoreUltraChipsets };
