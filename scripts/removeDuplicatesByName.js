const { MongoClient } = require('mongodb');
const Logger = require('./utils/logger');

async function removeDuplicatesByName() {
    const client = await MongoClient.connect('mongodb://localhost:27017');
    const db = client.db('pcbuilder');
    const collection = db.collection('storages');

    try {
        Logger.info('🔍 Finding duplicate storage entries by name and price...\n');

        // Find duplicates by name and price (more accurate than just name)
        const duplicates = await collection.aggregate([
            {
                $group: {
                    _id: { name: '$name', price: '$price' },
                    count: { $sum: 1 },
                    ids: { $push: '$_id' },
                    urls: { $push: '$url' }
                }
            },
            {
                $match: { count: { $gt: 1 } }
            },
            {
                $sort: { count: -1 }
            }
        ]).toArray();

        Logger.info(`Found ${duplicates.length} name+price combinations with duplicates`);

        let totalDuplicatesRemoved = 0;

        for (const dup of duplicates) {
            // Keep the first one, remove the rest
            const idsToRemove = dup.ids.slice(1);

            Logger.info(`\n📋 Product has ${dup.count} duplicates:`);
            Logger.info(`   Name: ${dup._id.name.substring(0, 60)}...`);
            Logger.info(`   Price: $${dup._id.price}`);
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
    removeDuplicatesByName()
        .then(() => {
            Logger.success('\n🎉 Duplicate removal completed successfully!');
            process.exit(0);
        })
        .catch(error => {
            Logger.error('\n💥 Duplicate removal failed:', error);
            process.exit(1);
        });
}

module.exports = { removeDuplicatesByName };
