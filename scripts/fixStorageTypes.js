const { MongoClient } = require('mongodb');

async function fixStorageTypes() {
    console.log('🔄 Starting storage type update...\n');

    const client = await MongoClient.connect('mongodb://localhost:27017');
    const db = client.db('pcbuilder');
    const collection = db.collection('storages');

    try {
        // Get all storage documents
        const allStorage = await collection.find({}).toArray();
        console.log(`Found ${allStorage.length} storage devices to update\n`);

        let updatedCount = 0;

        for (const item of allStorage) {
            const name = (item.name || '').toLowerCase();
            const formFactor = (item.formFactor || '').toLowerCase();
            const interfaceType = (item.interface || '').toLowerCase();
            let newType = item.type; // default to existing type

            // Determine the proper storage type based on form factor and interface
            if (formFactor.includes('m.2') || name.includes('m.2') || name.includes('nvme')) {
                newType = 'M.2 SSD';
            } else if (formFactor.includes('2.5') || interfaceType.includes('sata') || name.includes('sata') || name.includes('2.5"')) {
                newType = 'SATA SSD';
            } else if (formFactor.includes('3.5') || name.includes('hdd') || name.includes('hard drive')) {
                newType = 'HDD';
            } else if (item.type === 'SSD' || name.includes('ssd')) {
                // Generic SSD - try to determine based on other factors
                if (item.readSpeed && item.readSpeed > 2000) {
                    // High speed usually means M.2 NVMe
                    newType = 'M.2 SSD';
                } else {
                    // Lower speed probably SATA
                    newType = 'SATA SSD';
                }
            }

            // Only update if the type changed
            if (newType !== item.type) {
                await collection.updateOne(
                    { _id: item._id },
                    { $set: { type: newType } }
                );
                updatedCount++;
                console.log(`✓ Updated: ${item.name.substring(0, 50)} -> ${newType}`);
            }
        }

        console.log(`\n✅ Successfully updated ${updatedCount} storage devices\n`);

        // Show final breakdown
        const m2Count = await collection.countDocuments({ type: 'M.2 SSD' });
        const sataSSDCount = await collection.countDocuments({ type: 'SATA SSD' });
        const hddCount = await collection.countDocuments({ type: 'HDD' });
        const otherCount = await collection.countDocuments({
            type: { $nin: ['M.2 SSD', 'SATA SSD', 'HDD'] }
        });

        console.log('📊 Storage type breakdown:');
        console.log(`   M.2 SSDs:   ${m2Count}`);
        console.log(`   SATA SSDs:  ${sataSSDCount}`);
        console.log(`   HDDs:       ${hddCount}`);
        console.log(`   Other:      ${otherCount}`);

    } catch (error) {
        console.error('❌ Error updating storage types:', error);
        throw error;
    } finally {
        await client.close();
    }
}

// Run the update
if (require.main === module) {
    fixStorageTypes()
        .then(() => {
            console.log('\n🎉 Storage type update completed successfully!');
            process.exit(0);
        })
        .catch(error => {
            console.error('\n💥 Storage type update failed:', error);
            process.exit(1);
        });
}

module.exports = { fixStorageTypes };
