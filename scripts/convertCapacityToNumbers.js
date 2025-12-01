const { MongoClient } = require('mongodb');

function convertCapacityToGB(capacityStr) {
    if (typeof capacityStr === 'number') {
        return capacityStr; // Already a number
    }

    if (!capacityStr || typeof capacityStr !== 'string') {
        return null;
    }

    // Match patterns like "1TB", "500GB", "1024GB", "2.5TB"
    const match = capacityStr.match(/(\d+(?:\.\d+)?)\s*(TB|GB)/i);

    if (match) {
        let capacity = parseFloat(match[1]);
        const unit = match[2].toUpperCase();

        if (unit === 'TB') {
            capacity = capacity * 1000; // Convert TB to GB
        }

        return capacity;
    }

    return null;
}

async function convertCapacityToNumbers() {
    console.log('🔄 Converting capacity strings to numbers...\n');

    const client = await MongoClient.connect('mongodb://localhost:27017');
    const db = client.db('pcbuilder');
    const collection = db.collection('storages');

    try {
        // Find all items where capacity is a string
        const items = await collection.find({
            capacity: { $type: 'string' }
        }).toArray();

        console.log(`Found ${items.length} items with string capacity values\n`);

        let updatedCount = 0;
        let failedCount = 0;

        for (const item of items) {
            const numericCapacity = convertCapacityToGB(item.capacity);

            if (numericCapacity !== null) {
                await collection.updateOne(
                    { _id: item._id },
                    { $set: { capacity: numericCapacity } }
                );

                console.log(`✓ ${item.name.substring(0, 50)}`);
                console.log(`  ${item.capacity} → ${numericCapacity} GB`);
                console.log('');
                updatedCount++;
            } else {
                console.log(`✗ Could not convert: ${item.name.substring(0, 50)}`);
                console.log(`  Value: ${item.capacity}`);
                console.log('');
                failedCount++;
            }
        }

        console.log(`\n✅ Successfully converted ${updatedCount} items`);
        if (failedCount > 0) {
            console.log(`⚠  Failed to convert ${failedCount} items\n`);
        }

        // Verify - check if any string capacities remain
        const remaining = await collection.countDocuments({
            capacity: { $type: 'string' }
        });

        console.log(`📊 Remaining string capacities: ${remaining}`);

    } catch (error) {
        console.error('❌ Error:', error);
        throw error;
    } finally {
        await client.close();
    }
}

// Run the conversion
if (require.main === module) {
    convertCapacityToNumbers()
        .then(() => {
            console.log('\n🎉 Conversion completed!');
            process.exit(0);
        })
        .catch(error => {
            console.error('\n💥 Conversion failed:', error);
            process.exit(1);
        });
}

module.exports = { convertCapacityToNumbers };
