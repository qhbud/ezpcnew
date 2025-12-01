const { connectToDatabase, getDatabase } = require('../config/database');

async function updateCoreUltraCorrectUrls() {
    console.log('🚀 Updating Intel Core Ultra CPU Amazon URLs with correct links...\n');

    try {
        await connectToDatabase();
        const db = getDatabase();
        const collection = db.collection('cpus');

        const cpuUpdates = [
            {
                name: 'Intel Core Ultra 9 285K',
                sourceUrl: 'https://www.amazon.com/Intel-Core-Ultra-Processor-285K/dp/B0DFKC99VL'
            },
            {
                name: 'Intel Core Ultra 7 265K',
                sourceUrl: 'https://www.amazon.com/Intel-Core-Ultra-Processor-265K/dp/B0DFK2MH2D'
            },
            {
                name: 'Intel Core Ultra 5 245K',
                sourceUrl: 'https://www.amazon.com/Intel%C2%AE-CoreTM-Desktop-Processor-P-cores/dp/B0DT7CW7VR'
            }
        ];

        for (const cpu of cpuUpdates) {
            const result = await collection.updateOne(
                { name: cpu.name },
                {
                    $set: {
                        sourceUrl: cpu.sourceUrl,
                        updatedAt: new Date()
                    }
                }
            );

            if (result.matchedCount > 0) {
                console.log(`✅ Updated ${cpu.name}`);
                console.log(`   URL: ${cpu.sourceUrl}\n`);
            } else {
                console.log(`⚠️  ${cpu.name} not found in database\n`);
            }
        }

        console.log('✅ Amazon URL update completed!');
        console.log('📝 CPUs are now ready for price updates with correct URLs');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error updating Amazon URLs:', error);
        process.exit(1);
    }
}

if (require.main === module) {
    updateCoreUltraCorrectUrls();
}

module.exports = { updateCoreUltraCorrectUrls };
