const { MongoClient } = require('mongodb');

function extractCapacity(text) {
    if (!text) return null;

    const patterns = [
        // Standard patterns: "1TB", "500GB", "2.5TB"
        /(\d+(?:\.\d+)?)\s*(TB|GB)/i,
        // Model number patterns: "1T", "2T", "512G", "1024G"
        /(\d+)\s*T(?![a-z])/i,  // "1T" but not "TB"
        /(\d{3,4})\s*G(?![a-z])/i,  // "512G" or "1024G" but not "GB"
    ];

    for (const pattern of patterns) {
        const match = text.match(pattern);
        if (match) {
            let capacity = parseFloat(match[1]);
            let unit = match[2];

            // Handle model number patterns
            if (!unit) {
                // If matched "1T" pattern
                if (text.match(/(\d+)\s*T(?![a-z])/i)) {
                    capacity = capacity * 1000; // Convert TB to GB
                }
                // If matched "512G" or "1024G" pattern - already in GB
                // No conversion needed
            } else {
                unit = unit.toUpperCase();
                if (unit === 'TB') {
                    capacity = capacity * 1000;
                }
            }

            return capacity;
        }
    }

    return null;
}

async function parseCapacityFromNames() {
    console.log('🔄 Parsing capacity from product names...\n');

    const client = await MongoClient.connect('mongodb://localhost:27017');
    const db = client.db('pcbuilder');
    const collection = db.collection('storages');

    try {
        // Find items missing capacity
        const items = await collection.find({
            $or: [
                { capacity: null },
                { capacity: 0 },
                { capacity: { $exists: false } }
            ]
        }).toArray();

        console.log(`Found ${items.length} items missing capacity\n`);

        let updatedCount = 0;

        for (const item of items) {
            // Try to extract capacity from name
            let capacity = extractCapacity(item.name);

            // If not found in name, try URL
            if (!capacity && item.url) {
                capacity = extractCapacity(item.url);
            }

            if (capacity) {
                await collection.updateOne(
                    { _id: item._id },
                    { $set: { capacity } }
                );

                console.log(`✓ ${item.name.substring(0, 60)}`);
                console.log(`  Capacity: ${capacity} GB`);
                console.log('');
                updatedCount++;
            } else {
                console.log(`✗ Could not extract: ${item.name.substring(0, 60)}`);
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

// Run the parsing
if (require.main === module) {
    parseCapacityFromNames()
        .then(() => {
            console.log('\n🎉 Parsing completed!');
            process.exit(0);
        })
        .catch(error => {
            console.error('\n💥 Parsing failed:', error);
            process.exit(1);
        });
}

module.exports = { parseCapacityFromNames };
