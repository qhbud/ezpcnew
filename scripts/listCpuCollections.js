const { connectToDatabase, getDatabase } = require('../config/database');

async function listCpuCollections() {
    try {
        await connectToDatabase();
        const db = getDatabase();

        // Get all collections
        const allCollections = await db.listCollections().toArray();
        const collectionNames = allCollections.map(col => col.name);

        // Find all CPU collections
        const cpuCollections = collectionNames.filter(name =>
            name === 'cpus' || name.startsWith('cpus_')
        );

        console.log('\n📊 CPU COLLECTIONS FOUND:\n');
        console.log(`Total CPU collections: ${cpuCollections.length}\n`);

        let totalComponents = 0;
        let totalWithUrls = 0;

        for (const collectionName of cpuCollections) {
            const collection = db.collection(collectionName);

            const total = await collection.countDocuments();
            const withUrls = await collection.countDocuments({
                sourceUrl: { $exists: true, $ne: null, $ne: '' }
            });

            console.log(`📦 ${collectionName}`);
            console.log(`   Total components: ${total}`);
            console.log(`   With source URLs: ${withUrls}\n`);

            totalComponents += total;
            totalWithUrls += withUrls;
        }

        console.log('═'.repeat(60));
        console.log(`TOTALS:`);
        console.log(`   Total CPU collections: ${cpuCollections.length}`);
        console.log(`   Total CPUs: ${totalComponents}`);
        console.log(`   CPUs with URLs: ${totalWithUrls}`);
        console.log('═'.repeat(60) + '\n');

        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

listCpuCollections();
