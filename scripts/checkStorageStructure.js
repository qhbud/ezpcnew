const { connectToDatabase, getDatabase } = require('../config/database');

async function checkStorageStructure() {
    try {
        await connectToDatabase();
        const db = getDatabase();

        console.log('🔍 Checking storage collection structure...\n');

        const storage = await db.collection('storages').findOne({});

        if (storage) {
            console.log('Sample storage document:');
            console.log(JSON.stringify(storage, null, 2));
        } else {
            console.log('No storage documents found!');
        }

        const count = await db.collection('storages').countDocuments();
        console.log(`\nTotal storage documents: ${count}`);

        const withPrice = await db.collection('storages').countDocuments({
            currentPrice: { $gt: 0 }
        });
        console.log(`With currentPrice > 0: ${withPrice}`);

    } catch (error) {
        console.error('Error:', error);
    } finally {
        process.exit(0);
    }
}

checkStorageStructure();
