const { connectToDatabase, getDatabase } = require('../config/database');

async function countCoolers() {
    try {
        await connectToDatabase();
        const db = getDatabase();

        const total = await db.collection('coolers').countDocuments();
        const withUrls = await db.collection('coolers').countDocuments({
            sourceUrl: { $exists: true, $ne: null, $ne: '' }
        });

        console.log('\n📊 COOLERS IN DATABASE:\n');
        console.log(`Total coolers: ${total}`);
        console.log(`Coolers with URLs: ${withUrls}\n`);

        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

countCoolers();
