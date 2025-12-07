require('dotenv').config();
const { MongoClient, ObjectId } = require('mongodb');

async function checkSaveCounts() {
    const uri = process.env.MONGODB_URI;
    const client = new MongoClient(uri);

    try {
        await client.connect();
        console.log('Connected to MongoDB\n');

        const db = client.db(process.env.DB_NAME || 'pcbuilder');

        // Check save counts across all collections
        const collections = ['cpus', 'motherboards', 'rams', 'psus', 'coolers', 'cases', 'storages'];

        console.log('='.repeat(60));
        console.log('SAVE COUNT SUMMARY');
        console.log('='.repeat(60) + '\n');

        for (const collectionName of collections) {
            const collection = db.collection(collectionName);

            // Get all items with save counts
            const itemsWithSaves = await collection.find({ saveCount: { $gt: 0 } }).toArray();
            const totalSaves = itemsWithSaves.reduce((sum, item) => sum + (item.saveCount || 0), 0);

            console.log(`${collectionName.toUpperCase()}:`);
            console.log(`  Items with saves: ${itemsWithSaves.length}`);
            console.log(`  Total save count: ${totalSaves}`);

            if (itemsWithSaves.length > 0) {
                console.log('  Top saved items:');
                itemsWithSaves
                    .sort((a, b) => (b.saveCount || 0) - (a.saveCount || 0))
                    .slice(0, 3)
                    .forEach(item => {
                        const name = item.title || item.name || item.model || 'Unknown';
                        console.log(`    - ${name.substring(0, 50)}: ${item.saveCount} saves`);
                    });
            }
            console.log('');
        }

        // Check GPU collections
        const allCollections = await db.listCollections().toArray();
        const gpuCollections = allCollections.filter(c => c.name.startsWith('gpus_'));

        let totalGpuSaves = 0;
        let gpusWithSaves = 0;

        for (const coll of gpuCollections) {
            const collection = db.collection(coll.name);
            const itemsWithSaves = await collection.find({ saveCount: { $gt: 0 } }).toArray();
            gpusWithSaves += itemsWithSaves.length;
            totalGpuSaves += itemsWithSaves.reduce((sum, item) => sum + (item.saveCount || 0), 0);
        }

        console.log('GPUs (all collections):');
        console.log(`  Items with saves: ${gpusWithSaves}`);
        console.log(`  Total save count: ${totalGpuSaves}\n`);

        // Check CPU variant collections
        const cpuCollections = allCollections.filter(c => c.name.startsWith('cpus_'));

        let totalCpuVariantSaves = 0;
        let cpusWithSaves = 0;

        for (const coll of cpuCollections) {
            const collection = db.collection(coll.name);
            const itemsWithSaves = await collection.find({ saveCount: { $gt: 0 } }).toArray();
            cpusWithSaves += itemsWithSaves.length;
            totalCpuVariantSaves += itemsWithSaves.reduce((sum, item) => sum + (item.saveCount || 0), 0);
        }

        if (cpusWithSaves > 0) {
            console.log('CPUs (variant collections):');
            console.log(`  Items with saves: ${cpusWithSaves}`);
            console.log(`  Total save count: ${totalCpuVariantSaves}\n`);
        }

        console.log('='.repeat(60));

    } catch (error) {
        console.error('Error:', error);
        throw error;
    } finally {
        await client.close();
    }
}

checkSaveCounts()
    .then(() => process.exit(0))
    .catch(error => {
        console.error('Operation failed:', error);
        process.exit(1);
    });
