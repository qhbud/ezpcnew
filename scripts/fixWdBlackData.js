const { MongoClient } = require('mongodb');

async function fixWdBlackData() {
    console.log('🔄 Fixing WD_BLACK storage data...\n');

    const client = await MongoClient.connect('mongodb://localhost:27017');
    const db = client.db('pcbuilder');
    const collection = db.collection('storages');

    try {
        // Find all WD_BLACK items with missing type or capacity
        const items = await collection.find({
            $and: [
                {
                    $or: [
                        { manufacturer: /WD.*BLACK/i },
                        { brand: /WD.*BLACK/i },
                        { name: /WD.*BLACK/i }
                    ]
                },
                {
                    $or: [
                        { type: null },
                        { type: '' },
                        { type: '-' },
                        { type: { $exists: false } },
                        { capacity: null },
                        { capacity: 0 },
                        { capacity: { $exists: false } }
                    ]
                }
            ]
        }).toArray();

        console.log(`Found ${items.length} WD_BLACK items with missing data\n`);

        let updatedCount = 0;

        for (const item of items) {
            const name = item.name || '';
            const updates = {};

            // Extract capacity from name if missing
            if (!item.capacity || item.capacity === 0) {
                // Try to find capacity in the name (e.g., "1TB", "500GB", "2TB")
                const capacityMatch = name.match(/(\d+(?:\.\d+)?)\s*(TB|GB)/i);
                if (capacityMatch) {
                    let capacity = parseFloat(capacityMatch[1]);
                    const unit = capacityMatch[2].toUpperCase();

                    // Convert to GB
                    if (unit === 'TB') {
                        capacity = capacity * 1000;
                    }

                    updates.capacity = capacity;
                }
            }

            // Determine type from name if missing
            if (!item.type || item.type === '' || item.type === '-') {
                const nameLower = name.toLowerCase();

                if (nameLower.includes('nvme') || nameLower.includes('m.2') || nameLower.includes('pcie')) {
                    updates.type = 'M.2 SSD';
                } else if (nameLower.includes('sata') || nameLower.includes('2.5')) {
                    updates.type = 'SATA SSD';
                } else if (nameLower.includes('hdd') || nameLower.includes('hard drive')) {
                    updates.type = 'HDD';
                } else {
                    // Check form factor if available
                    const formFactor = (item.formFactor || '').toLowerCase();
                    if (formFactor.includes('m.2') || formFactor.includes('m2')) {
                        updates.type = 'M.2 SSD';
                    } else if (formFactor.includes('2.5')) {
                        updates.type = 'SATA SSD';
                    } else if (formFactor.includes('3.5')) {
                        updates.type = 'HDD';
                    }
                }
            }

            // Set form factor if missing
            if (!item.formFactor || item.formFactor === '') {
                const nameLower = name.toLowerCase();
                if (nameLower.includes('m.2 2280') || nameLower.includes('m.2') && nameLower.includes('2280')) {
                    updates.formFactor = 'M.2 2280';
                } else if (nameLower.includes('m.2 2242')) {
                    updates.formFactor = 'M.2 2242';
                } else if (nameLower.includes('m.2')) {
                    updates.formFactor = 'M.2';
                } else if (nameLower.includes('2.5')) {
                    updates.formFactor = '2.5"';
                } else if (nameLower.includes('3.5')) {
                    updates.formFactor = '3.5"';
                }
            }

            // Update if we have any changes
            if (Object.keys(updates).length > 0) {
                await collection.updateOne(
                    { _id: item._id },
                    { $set: updates }
                );
                updatedCount++;
                console.log(`✓ Updated: ${name.substring(0, 60)}`);
                console.log(`  Type: ${updates.type || 'unchanged'}, Capacity: ${updates.capacity || 'unchanged'} GB`);
            }
        }

        console.log(`\n✅ Successfully updated ${updatedCount} WD_BLACK items\n`);

        // Show final stats
        const totalWdBlack = await collection.countDocuments({
            $or: [
                { manufacturer: /WD.*BLACK/i },
                { brand: /WD.*BLACK/i },
                { name: /WD.*BLACK/i }
            ]
        });

        const missingType = await collection.countDocuments({
            $and: [
                {
                    $or: [
                        { manufacturer: /WD.*BLACK/i },
                        { brand: /WD.*BLACK/i },
                        { name: /WD.*BLACK/i }
                    ]
                },
                {
                    $or: [{ type: null }, { type: '' }, { type: '-' }, { type: { $exists: false } }]
                }
            ]
        });

        const missingCapacity = await collection.countDocuments({
            $and: [
                {
                    $or: [
                        { manufacturer: /WD.*BLACK/i },
                        { brand: /WD.*BLACK/i },
                        { name: /WD.*BLACK/i }
                    ]
                },
                {
                    $or: [{ capacity: null }, { capacity: 0 }, { capacity: { $exists: false } }]
                }
            ]
        });

        console.log('📊 WD_BLACK storage statistics:');
        console.log(`   Total items: ${totalWdBlack}`);
        console.log(`   Missing type: ${missingType}`);
        console.log(`   Missing capacity: ${missingCapacity}`);

    } catch (error) {
        console.error('❌ Error fixing WD_BLACK data:', error);
        throw error;
    } finally {
        await client.close();
    }
}

// Run the fix
if (require.main === module) {
    fixWdBlackData()
        .then(() => {
            console.log('\n🎉 WD_BLACK data fix completed!');
            process.exit(0);
        })
        .catch(error => {
            console.error('\n💥 WD_BLACK data fix failed:', error);
            process.exit(1);
        });
}

module.exports = { fixWdBlackData };
