const { connectToDatabase, getDatabase } = require('../config/database');

async function listCollections() {
    try {
        await connectToDatabase();
        const db = getDatabase();

        // Get all collections
        const collections = await db.listCollections().toArray();
        const cpuCollections = collections.filter(col => col.name.includes('cpu'));

        console.log(`Found ${cpuCollections.length} CPU-related collections:\n`);

        for (const col of cpuCollections) {
            const collection = db.collection(col.name);
            const count = await collection.countDocuments();
            console.log(`${col.name}: ${count} documents`);
        }

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

listCollections();
