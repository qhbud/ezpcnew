const { connectToDatabase, getDatabase } = require('../config/database');

async function updateCoreUltraAmazonUrls() {
    console.log('🚀 Updating Intel Core Ultra CPU Amazon URLs...\n');

    try {
        await connectToDatabase();
        const db = getDatabase();
        const collection = db.collection('cpus');

        const cpuUpdates = [
            {
                name: 'Intel Core Ultra 9 285K',
                sourceUrl: 'https://www.amazon.com/Intel-Ultra-285K-Desktop-Processor/dp/B0DJD4N4YB'
            },
            {
                name: 'Intel Core Ultra 7 265K',
                sourceUrl: 'https://www.amazon.com/Intel-Ultra-265K-Desktop-Processor/dp/B0DJD726QK'
            },
            {
                name: 'Intel Core Ultra 5 245K',
                sourceUrl: 'https://www.amazon.com/Intel-Ultra-245K-Desktop-Processor/dp/B0DJCZ8W7H'
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
                console.log(`✅ Updated ${cpu.name} with Amazon URL`);
            } else {
                console.log(`⚠️  ${cpu.name} not found in database`);
            }
        }

        console.log('\n✅ Amazon URL update completed!');
        console.log('📝 CPUs are now ready for price updates');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error updating Amazon URLs:', error);
        process.exit(1);
    }
}

if (require.main === module) {
    updateCoreUltraAmazonUrls();
}

module.exports = { updateCoreUltraAmazonUrls };
