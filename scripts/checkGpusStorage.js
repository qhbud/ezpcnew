const { connectToDatabase, getDatabase } = require('../config/database');

async function checkGpusStorage() {
    try {
        await connectToDatabase();
        const db = getDatabase();

        const collections = ['gpus', 'storage'];

        for (const col of collections) {
            try {
                const total = await db.collection(col).countDocuments();
                const withSourceUrl = await db.collection(col).countDocuments({
                    sourceUrl: { $exists: true, $ne: null, $ne: '' }
                });
                const withUrl = await db.collection(col).countDocuments({
                    url: { $exists: true, $ne: null, $ne: '' }
                });

                console.log(`\n📦 ${col.toUpperCase()}:`);
                console.log(`  Total: ${total}`);
                console.log(`  With sourceUrl: ${withSourceUrl}`);
                console.log(`  With url: ${withUrl}`);

                if (total > 0) {
                    const sample = await db.collection(col).findOne();
                    console.log(`  Sample fields:`, Object.keys(sample).slice(0, 10).join(', '));
                }
            } catch (e) {
                console.log(`\n${col}: Collection does not exist`);
            }
        }

        console.log();
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

checkGpusStorage();
