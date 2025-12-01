const { connectToDatabase, getDatabase } = require('../config/database');

async function findAllCPUs() {
    try {
        await connectToDatabase();
        const db = getDatabase();

        // Get all collections
        const collections = await db.listCollections().toArray();
        const cpuCollections = collections.filter(c => c.name.startsWith('cpus') || c.name === 'cpus');

        console.log('\n=== All CPU Collections ===\n');
        console.log('Found collections:', cpuCollections.map(c => c.name));

        for (const coll of cpuCollections) {
            const count = await db.collection(coll.name).countDocuments();
            console.log(`\n${coll.name}: ${count} documents`);
            
            // Look for 5700X
            const cpu5700X = await db.collection(coll.name).findOne({
                $or: [
                    { name: { $regex: '5700X', $options: 'i' } },
                    { title: { $regex: '5700X', $options: 'i' } }
                ]
            });
            
            if (cpu5700X) {
                console.log('  Found 5700X in', coll.name);
                console.log('  Name:', cpu5700X.name || cpu5700X.title);
                console.log('  supportedChipsets:', cpu5700X.supportedChipsets);
            }
        }

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

findAllCPUs();
