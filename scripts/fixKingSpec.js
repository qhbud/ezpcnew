const { MongoClient } = require('mongodb');

async function fixKingSpec() {
    console.log('🔄 Fixing KingSpec storage items...\n');

    const client = await MongoClient.connect('mongodb://localhost:27017');
    const db = client.db('pcbuilder');
    const collection = db.collection('storages');

    try {
        // Find KingSpec items with missing or wrong type
        const items = await collection.find({
            $or: [
                { name: /^KingSpec$/i },
                { manufacturer: /^KingSpec$/i }
            ]
        }).toArray();

        console.log(`Found ${items.length} KingSpec items\n`);

        let updatedCount = 0;

        for (const item of items) {
            const updates = {};

            // Set type to SATA SSD if missing or wrong
            if (!item.type || item.type === '-' || item.type === 'Other SSD') {
                updates.type = 'SATA SSD';
            }

            // Set manufacturer to KingSpec if it's Unknown
            if (!item.manufacturer || item.manufacturer === 'Unknown') {
                updates.manufacturer = 'KingSpec';
            }

            // Update brand if needed
            if (!item.brand) {
                updates.brand = 'KingSpec';
            }

            // If we have changes, update the document
            if (Object.keys(updates).length > 0) {
                await collection.updateOne(
                    { _id: item._id },
                    { $set: updates }
                );

                console.log(`✓ Updated: ${item.name}`);
                console.log(`  Manufacturer: ${updates.manufacturer || item.manufacturer}`);
                console.log(`  Type: ${updates.type || item.type}`);
                console.log(`  Capacity: ${item.capacity} GB`);
                console.log('');
                updatedCount++;
            }
        }

        console.log(`\n✅ Successfully updated ${updatedCount} KingSpec items\n`);

        // Show final stats
        const totalKingSpec = await collection.countDocuments({
            $or: [
                { name: /KingSpec/i },
                { manufacturer: /KingSpec/i }
            ]
        });

        const kingSpecWithType = await collection.countDocuments({
            $and: [
                {
                    $or: [
                        { name: /KingSpec/i },
                        { manufacturer: /KingSpec/i }
                    ]
                },
                { type: { $exists: true, $ne: null, $ne: '', $ne: '-' } }
            ]
        });

        console.log('📊 KingSpec statistics:');
        console.log(`   Total KingSpec items: ${totalKingSpec}`);
        console.log(`   Items with type: ${kingSpecWithType}`);

    } catch (error) {
        console.error('❌ Error:', error);
        throw error;
    } finally {
        await client.close();
    }
}

// Run the fix
if (require.main === module) {
    fixKingSpec()
        .then(() => {
            console.log('\n🎉 Fix completed!');
            process.exit(0);
        })
        .catch(error => {
            console.error('\n💥 Fix failed:', error);
            process.exit(1);
        });
}

module.exports = { fixKingSpec };
