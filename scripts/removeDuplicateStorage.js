const { MongoClient } = require('mongodb');
const Logger = require('./utils/logger');

async function removeDuplicateStorage() {
    const client = await MongoClient.connect('mongodb://localhost:27017');
    const db = client.db('pcbuilder');
    const collection = db.collection('storages');

    try {
        Logger.info('🔍 Finding duplicate storage entries...\n');

        // Find duplicates by URL
        const duplicates = await collection.aggregate([
            {
                $group: {
                    _id: '$url',
                    count: { $sum: 1 },
                    ids: { $push: '$_id' },
                    names: { $push: '$name' }
                }
            },
            {
                $match: { count: { $gt: 1 } }
            },
            {
                $sort: { count: -1 }
            }
        ]).toArray();

        Logger.info(`Found ${duplicates.length} URLs with duplicates`);

        let totalDuplicatesRemoved = 0;

        for (const dup of duplicates) {
            // Keep the first one, remove the rest
            const idsToRemove = dup.ids.slice(1);

            Logger.info(`\n📋 URL has ${dup.count} duplicates:`);
            Logger.info(`   Name: ${dup.names[0].substring(0, 60)}...`);
            Logger.info(`   Removing ${idsToRemove.length} duplicate(s)`);

            const result = await collection.deleteMany({
                _id: { $in: idsToRemove }
            });

            totalDuplicatesRemoved += result.deletedCount;
        }

        Logger.success(`\n✅ Removed ${totalDuplicatesRemoved} duplicate storage entries`);

        // Get final count
        const finalCount = await collection.countDocuments();
        Logger.success(`📦 Final storage count: ${finalCount}`);

        // Show breakdown by type
        const m2Count = await collection.countDocuments({ storageType: 'M.2 SSD' });
        const otherSSDCount = await collection.countDocuments({ storageType: 'Other SSD' });
        const hddCount = await collection.countDocuments({ storageType: 'HDD' });

        Logger.info('\n📊 Storage breakdown:');
        Logger.info(`   M.2 SSDs: ${m2Count}`);
        Logger.info(`   Other SSDs: ${otherSSDCount}`);
        Logger.info(`   HDDs: ${hddCount}`);

    } catch (error) {
        Logger.error('Error removing duplicates:', error);
        throw error;
    } finally {
        await client.close();
    }
}

// Run the deduplication if this script is executed directly
if (require.main === module) {
    removeDuplicateStorage()
        .then(() => {
            Logger.success('\n🎉 Duplicate removal completed successfully!');
            process.exit(0);
        })
        .catch(error => {
            Logger.error('\n💥 Duplicate removal failed:', error);
            process.exit(1);
        });
}

module.exports = { removeDuplicateStorage };
