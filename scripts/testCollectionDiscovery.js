const { connectToDatabase, getDatabase } = require('../config/database');

async function testCollectionDiscovery() {
    try {
        await connectToDatabase();
        const db = getDatabase();

        // Same logic as updateAllComponentPrices.js
        const allCollections = await db.listCollections().toArray();
        const collectionNames = allCollections.map(col => col.name);

        // Get all CPU collections
        const cpuCollections = collectionNames.filter(name =>
            name === 'cpus' || name.startsWith('cpus_')
        );

        // Get all GPU collections
        const gpuCollections = collectionNames.filter(name =>
            name === 'gpus' || name.startsWith('gpus_')
        );

        // Get other component collections
        const otherCollections = ['motherboards', 'rams', 'psus', 'coolers', 'storages']
            .filter(name => collectionNames.includes(name));

        // Combine all
        const COMPONENT_COLLECTIONS = [...cpuCollections, ...gpuCollections, ...otherCollections];

        console.log('\n📊 COLLECTION DISCOVERY TEST\n');
        console.log(`✅ Found ${COMPONENT_COLLECTIONS.length} collections to update\n`);

        console.log(`CPU Collections (${cpuCollections.length}):`);
        cpuCollections.forEach(name => console.log(`  - ${name}`));

        console.log(`\nGPU Collections (${gpuCollections.length}):`);
        gpuCollections.forEach(name => console.log(`  - ${name}`));

        console.log(`\nOther Collections (${otherCollections.length}):`);
        otherCollections.forEach(name => console.log(`  - ${name}`));

        // Count total components
        console.log('\n📈 COMPONENT COUNTS:\n');
        let totalComponents = 0;
        let totalWithUrls = 0;

        for (const collectionName of COMPONENT_COLLECTIONS) {
            const collection = db.collection(collectionName);
            const count = await collection.countDocuments({
                $or: [
                    { sourceUrl: { $exists: true, $ne: null, $ne: '' } },
                    { url: { $exists: true, $ne: null, $ne: '' } }
                ]
            });

            if (count > 0) {
                console.log(`  ${collectionName.padEnd(30)} - ${count} components with URLs`);
                totalComponents += count;
            }
        }

        console.log(`\n  ${'TOTAL'.padEnd(30)} - ${totalComponents} components to update\n`);

        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

testCollectionDiscovery();
