const { MongoClient } = require('mongodb');

function extractCapacityFromUrl(url) {
    // Extract capacity from URL like "2TB", "1TB", "500GB", etc.
    const match = url.match(/(\d+(?:\.\d+)?)(TB|GB)/i);
    if (match) {
        let capacity = parseFloat(match[1]);
        const unit = match[2].toUpperCase();
        if (unit === 'TB') {
            capacity = capacity * 1000;
        }
        return capacity;
    }
    return null;
}

function extractProductNameFromUrl(url) {
    // Extract product name from Amazon URL
    // e.g., "WD_BLACK-SN7100-Internal-Gaming-Solid" from the URL
    const match = url.match(/\/([^\/]+)\/dp\//);
    if (match) {
        return match[1].replace(/-/g, ' ');
    }
    return null;
}

async function fixIncompleteStorage() {
    console.log('🔄 Fixing incomplete storage items...\n');

    const client = await MongoClient.connect('mongodb://localhost:27017');
    const db = client.db('pcbuilder');
    const collection = db.collection('storages');

    try {
        // Find items with incomplete names (just manufacturer name)
        const items = await collection.find({
            $or: [
                { name: /^WD[_\s]?BLACK$/i },
                { name: /^Samsung$/i },
                { name: /^Crucial$/i },
                { name: /^Kingston$/i }
            ]
        }).toArray();

        console.log(`Found ${items.length} items with incomplete names\n`);

        let updatedCount = 0;

        for (const item of items) {
            const updates = {};

            // Extract better name from URL if available
            if (item.url) {
                const productName = extractProductNameFromUrl(item.url);
                if (productName && productName !== item.name) {
                    updates.name = productName;
                }

                // Extract capacity from URL
                const capacity = extractCapacityFromUrl(item.url);
                if (capacity && (!item.capacity || item.capacity === 0)) {
                    updates.capacity = capacity;
                }
            }

            // Determine type based on URL or existing storageType
            if (item.url) {
                const urlLower = item.url.toLowerCase();

                if (urlLower.includes('nvme') || urlLower.includes('m.2') || urlLower.includes('pcie')) {
                    updates.type = 'M.2 SSD';
                    if (!item.formFactor || !updates.formFactor) {
                        updates.formFactor = 'M.2';
                    }
                } else if (urlLower.includes('sata') || urlLower.includes('2.5')) {
                    updates.type = 'SATA SSD';
                    if (!item.formFactor) {
                        updates.formFactor = '2.5"';
                    }
                } else if (urlLower.includes('hdd')) {
                    updates.type = 'HDD';
                    if (!item.formFactor) {
                        updates.formFactor = '3.5"';
                    }
                } else if (item.storageType) {
                    // Use existing storageType
                    if (item.storageType === 'Other SSD' || item.storageType === 'M.2 SSD') {
                        updates.type = 'M.2 SSD';
                    } else {
                        updates.type = item.storageType;
                    }
                }
            }

            // Update if we have changes
            if (Object.keys(updates).length > 0) {
                await collection.updateOne(
                    { _id: item._id },
                    { $set: updates }
                );
                updatedCount++;

                console.log(`✓ Updated: ${item.name}`);
                if (updates.name) console.log(`  → New name: ${updates.name}`);
                if (updates.capacity) console.log(`  → Capacity: ${updates.capacity} GB`);
                if (updates.type) console.log(`  → Type: ${updates.type}`);
                console.log('');
            }
        }

        console.log(`\n✅ Successfully updated ${updatedCount} items\n`);

        // Check remaining issues
        const stillMissingType = await collection.countDocuments({
            $or: [
                { type: null },
                { type: '' },
                { type: '-' },
                { type: { $exists: false } }
            ]
        });

        const stillMissingCapacity = await collection.countDocuments({
            $or: [
                { capacity: null },
                { capacity: 0 },
                { capacity: { $exists: false } }
            ]
        });

        console.log('📊 Remaining issues:');
        console.log(`   Items missing type: ${stillMissingType}`);
        console.log(`   Items missing capacity: ${stillMissingCapacity}`);

    } catch (error) {
        console.error('❌ Error:', error);
        throw error;
    } finally {
        await client.close();
    }
}

// Run the fix
if (require.main === module) {
    fixIncompleteStorage()
        .then(() => {
            console.log('\n🎉 Fix completed!');
            process.exit(0);
        })
        .catch(error => {
            console.error('\n💥 Fix failed:', error);
            process.exit(1);
        });
}

module.exports = { fixIncompleteStorage };
