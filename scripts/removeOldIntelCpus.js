const { connectToDatabase, getDatabase } = require('../config/database');

async function removeOldIntelCpus() {
    try {
        await connectToDatabase();
        const db = getDatabase();

        console.log('🗑️  Removing old Intel CPUs from database...\n');

        // Get all CPU collections
        const collections = await db.listCollections().toArray();
        const cpuCollections = collections.filter(c => c.name.toLowerCase().includes('cpu'));

        let totalRemoved = 0;

        for (const collection of cpuCollections) {
            const cpusCollection = db.collection(collection.name);

            // Remove Intel Core i9-9900K
            const i9900kResult = await cpusCollection.deleteMany({
                $or: [
                    { name: { $regex: 'i9-9900K', $options: 'i' } },
                    { title: { $regex: 'i9-9900K', $options: 'i' } }
                ]
            });

            if (i9900kResult.deletedCount > 0) {
                console.log(`✅ Removed ${i9900kResult.deletedCount} Intel Core i9-9900K from ${collection.name}`);
                totalRemoved += i9900kResult.deletedCount;
            }

            // Remove Intel Core i9-11900
            const i11900Result = await cpusCollection.deleteMany({
                $or: [
                    { name: { $regex: 'i9-11900', $options: 'i' } },
                    { title: { $regex: 'i9-11900', $options: 'i' } }
                ]
            });

            if (i11900Result.deletedCount > 0) {
                console.log(`✅ Removed ${i11900Result.deletedCount} Intel Core i9-11900 from ${collection.name}`);
                totalRemoved += i11900Result.deletedCount;
            }
        }

        console.log(`\n📊 Total CPUs removed: ${totalRemoved}`);

        // Get final count
        let finalCount = 0;
        for (const collection of cpuCollections) {
            const count = await db.collection(collection.name).countDocuments();
            finalCount += count;
        }

        console.log(`📦 CPUs remaining in database: ${finalCount}`);

        console.log('\n✅ Removal complete!');

    } catch (error) {
        console.error('❌ Error removing CPUs:', error);
        throw error;
    } finally {
        process.exit(0);
    }
}

removeOldIntelCpus();
