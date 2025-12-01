const { connectToDatabase, getDatabase } = require('../config/database');

async function countPsus() {
    try {
        await connectToDatabase();
        const db = getDatabase();

        const total = await db.collection('psus').countDocuments();
        const withUrls = await db.collection('psus').countDocuments({
            sourceUrl: { $exists: true, $ne: null, $ne: '' }
        });

        console.log('\n📊 PSUs IN DATABASE:\n');
        console.log(`Total PSUs: ${total}`);
        console.log(`PSUs with URLs: ${withUrls}`);

        if (total > 0 && withUrls === 0) {
            console.log('\n⚠️  PSUs exist but none have source URLs!');
            console.log('Checking a sample PSU...\n');

            const sample = await db.collection('psus').findOne();
            console.log('Sample PSU:');
            console.log('  Name:', sample.name || sample.title);
            console.log('  Has sourceUrl?', !!sample.sourceUrl);
            console.log('  sourceUrl value:', sample.sourceUrl);
        }

        console.log();
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

countPsus();
