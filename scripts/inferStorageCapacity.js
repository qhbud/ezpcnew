const { MongoClient } = require('mongodb');

async function inferStorageCapacity() {
    console.log('🔄 Inferring storage capacity from similar products...\n');

    const client = await MongoClient.connect('mongodb://localhost:27017');
    const db = client.db('pcbuilder');
    const collection = db.collection('storages');

    try {
        // Find items missing capacity
        const itemsMissingCapacity = await collection.find({
            $or: [
                { capacity: null },
                { capacity: 0 },
                { capacity: { $exists: false } }
            ],
            url: { $exists: true, $ne: null }
        }).toArray();

        console.log(`Found ${itemsMissingCapacity.length} items missing capacity\n`);

        let updatedCount = 0;

        for (const item of itemsMissingCapacity) {
            const updates = {};

            // Extract ASIN from URL (Amazon product ID)
            const asinMatch = item.url.match(/\/dp\/([A-Z0-9]{10})/);

            if (asinMatch) {
                const asin = asinMatch[1];

                // Look for other items with the same ASIN that have capacity
                const similarItem = await collection.findOne({
                    url: { $regex: asin },
                    capacity: { $exists: true, $gt: 0 }
                });

                if (similarItem) {
                    updates.capacity = similarItem.capacity;

                    if (similarItem.name && similarItem.name !== item.name && !item.name.includes('TB') && !item.name.includes('GB')) {
                        updates.name = similarItem.name;
                    }

                    console.log(`✓ Found match for ASIN ${asin}`);
                    console.log(`  Current: ${item.name}`);
                    if (updates.name) console.log(`  Update name: ${updates.name}`);
                    console.log(`  Capacity: ${updates.capacity} GB`);
                    console.log('');
                }
            }

            // If still no capacity, try to extract from name
            if (!updates.capacity) {
                const capacityMatch = item.name.match(/(\d+(?:\.\d+)?)\s*(TB|GB)/i);
                if (capacityMatch) {
                    let capacity = parseFloat(capacityMatch[1]);
                    const unit = capacityMatch[2].toUpperCase();
                    if (unit === 'TB') {
                        capacity = capacity * 1000;
                    }
                    updates.capacity = capacity;
                    console.log(`✓ Extracted from name: ${item.name}`);
                    console.log(`  Capacity: ${capacity} GB`);
                    console.log('');
                }
            }

            // Update if we have changes
            if (Object.keys(updates).length > 0) {
                await collection.updateOne(
                    { _id: item._id },
                    { $set: updates }
                );
                updatedCount++;
            }
        }

        console.log(`\n✅ Successfully updated ${updatedCount} items\n`);

        // Final stats
        const stillMissingCapacity = await collection.countDocuments({
            $or: [
                { capacity: null },
                { capacity: 0 },
                { capacity: { $exists: false } }
            ]
        });

        const stillMissingType = await collection.countDocuments({
            $or: [
                { type: null },
                { type: '' },
                { type: '-' },
                { type: { $exists: false } }
            ]
        });

        console.log('📊 Final statistics:');
        console.log(`   Items missing capacity: ${stillMissingCapacity}`);
        console.log(`   Items missing type: ${stillMissingType}`);

    } catch (error) {
        console.error('❌ Error:', error);
        throw error;
    } finally {
        await client.close();
    }
}

// Run the inference
if (require.main === module) {
    inferStorageCapacity()
        .then(() => {
            console.log('\n🎉 Inference completed!');
            process.exit(0);
        })
        .catch(error => {
            console.error('\n💥 Inference failed:', error);
            process.exit(1);
        });
}

module.exports = { inferStorageCapacity };
