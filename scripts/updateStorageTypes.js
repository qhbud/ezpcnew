const { MongoClient } = require('mongodb');
const Logger = require('./utils/logger');

async function updateStorageTypes() {
    const client = await MongoClient.connect('mongodb://localhost:27017');
    const db = client.db('pcbuilder');
    const collection = db.collection('storages');

    try {
        Logger.info('🔄 Updating storage types from "Other SSD" to "SATA SSD"...\n');

        // Find all items with "Other SSD" type
        const otherSSDItems = await collection.find({
            storageType: 'Other SSD'
        }).toArray();

        Logger.info(`Found ${otherSSDItems.length} items with "Other SSD" type`);

        let updatedCount = 0;

        for (const item of otherSSDItems) {
            const name = (item.name || '').toLowerCase();
            const interfaceType = item.interfaceType || '';

            // Check if it's a SATA SSD
            const isSATA = interfaceType.includes('sata') ||
                          name.includes('sata') ||
                          name.includes('2.5"') ||
                          name.includes('2.5 inch');

            if (isSATA) {
                await collection.updateOne(
                    { _id: item._id },
                    { $set: { storageType: 'SATA SSD' } }
                );
                updatedCount++;
            }
        }

        Logger.success(`\n✅ Updated ${updatedCount} storage items from "Other SSD" to "SATA SSD"`);

        // Show final breakdown
        const m2Count = await collection.countDocuments({ storageType: 'M.2 SSD' });
        const sataSSDCount = await collection.countDocuments({ storageType: 'SATA SSD' });
        const otherSSDCount = await collection.countDocuments({ storageType: 'Other SSD' });
        const hddCount = await collection.countDocuments({ storageType: 'HDD' });

        Logger.info('\n📊 Storage type breakdown:');
        Logger.info(`   M.2 SSDs: ${m2Count}`);
        Logger.info(`   SATA SSDs: ${sataSSDCount}`);
        Logger.info(`   Other SSDs: ${otherSSDCount}`);
        Logger.info(`   HDDs: ${hddCount}`);

    } catch (error) {
        Logger.error('Error updating storage types:', error);
        throw error;
    } finally {
        await client.close();
    }
}

// Run the update if this script is executed directly
if (require.main === module) {
    updateStorageTypes()
        .then(() => {
            Logger.success('\n🎉 Storage type update completed successfully!');
            process.exit(0);
        })
        .catch(error => {
            Logger.error('\n💥 Storage type update failed:', error);
            process.exit(1);
        });
}

module.exports = { updateStorageTypes };
