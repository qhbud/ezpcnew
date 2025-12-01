const { connectToDatabase, getDatabase } = require('../config/database');

async function checkAllBenchmarks() {
    try {
        await connectToDatabase();
        const db = getDatabase();

        // Get all CPU collections
        const collections = await db.listCollections().toArray();
        const cpuCollectionNames = collections
            .filter(col => col.name === 'cpus' || col.name.startsWith('cpus_'))
            .map(col => col.name);

        const cpuNames = [
            'Intel Core Ultra 9 285K',
            'Intel Core i9-13900KF',
            'Intel Core i9-13900K',
            'Intel Core Ultra 7 265K',
            'Intel Core Ultra 5 245K',
            'Intel Core i7-13700KF',
            'Intel Core i7-13700K',
            'AMD Ryzen 9 7950X',
            'Intel Core i9-12900K'
        ];

        console.log('Checking benchmark data across all collections:\n');

        for (const cpuName of cpuNames) {
            let found = null;
            let foundInCollection = null;

            // Search across ALL collections
            for (const collectionName of cpuCollectionNames) {
                const collection = db.collection(collectionName);
                found = await collection.findOne({
                    $or: [
                        { name: cpuName },
                        { title: cpuName + ' Desktop Processor' }
                    ]
                });
                if (found) {
                    foundInCollection = collectionName;
                    break;
                }
            }

            if (found) {
                console.log(`${cpuName} (in ${foundInCollection}):`);
                console.log(`  Single-Core: ${found.singleCorePerformance}`);
                console.log(`  Multi-Thread: ${found.multiThreadPerformance}`);
                console.log(`  Updated: ${found.updatedAt}`);
                console.log('');
            } else {
                console.log(`${cpuName}: NOT FOUND`);
                console.log('');
            }
        }

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

checkAllBenchmarks();
