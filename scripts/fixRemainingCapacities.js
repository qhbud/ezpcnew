const { MongoClient } = require('mongodb');

// Mapping of known ASINs to capacities (can be expanded)
const asinCapacityMap = {
    'B0DN7CYYSD': 1000,  // WD_BLACK SN7100 1TB
    'B0DN6ZQ3PD': 2000,  // WD_BLACK SN7100 2TB
    'B09QV692XY': 1000,  // WD_BLACK SN770 1TB
    'B0B7CMZ3QH': 2000,  // WD_BLACK SN850X 2TB
    'B0B7CKVCCV': 1000,  // WD_BLACK SN850X 1TB
    'B0B7CQ2CHH': 4000,  // WD_BLACK SN850X 4TB
    'B0F3BD1W6R': 1000,  // WD_BLACK SN8100 1TB
    'B0F3BMBQ75': 2000,  // WD_BLACK SN8100 2TB
    'B0CHJXZMSG': 512,   // WD_BLACK SN7100 512GB
    'B0CHJXHVZM': 1000,  // WD_BLACK SN7100 1TB
    'B0CN17F7XC': 2000,  // WD_BLACK SN7100 2TB
    'B0DQYGPHZG': 1000,  // WD_BLACK SN850X 1TB
    'B09K7DRMSC': 2000,  // Kingston KC3000 2TB
    'B0DSVJJFS6': 1000,  // Samsung 870 QVO 1TB
    'B01LXDQX35': 250,   // WD Blue 250GB
    'B0BJZLF2FW': 2000,  // KingSpec 2TB
    'B0BKKSPM9R': 1000,  // KingSpec 1TB
    'B07VNTFHD5': 5000,  // WD_Black Drive 5TB
    'B07VNTFK87': 4000,  // WD_Black Drive 4TB
};

async function fixRemainingCapacities() {
    console.log('🔄 Fixing remaining capacities using ASIN mapping...\n');

    const client = await MongoClient.connect('mongodb://localhost:27017');
    const db = client.db('pcbuilder');
    const collection = db.collection('storages');

    try {
        // Find items still missing capacity
        const items = await collection.find({
            $or: [
                { capacity: null },
                { capacity: 0 },
                { capacity: { $exists: false } }
            ],
            url: { $exists: true, $ne: null }
        }).toArray();

        console.log(`Found ${items.length} items missing capacity\n`);

        let updatedCount = 0;
        let skippedCount = 0;

        for (const item of items) {
            // Extract ASIN from URL
            const asinMatch = item.url.match(/\/dp\/([A-Z0-9]{10})/);

            if (asinMatch) {
                const asin = asinMatch[1];

                if (asinCapacityMap[asin]) {
                    const capacity = asinCapacityMap[asin];

                    await collection.updateOne(
                        { _id: item._id },
                        { $set: { capacity } }
                    );

                    console.log(`✓ ASIN ${asin}: ${item.name.substring(0, 50)}`);
                    console.log(`  Capacity: ${capacity} GB`);
                    console.log('');
                    updatedCount++;
                } else {
                    console.log(`⚠ Unknown ASIN ${asin}: ${item.name.substring(0, 50)}`);
                    skippedCount++;
                }
            }
        }

        console.log(`\n✅ Updated ${updatedCount} items`);
        console.log(`⚠  Skipped ${skippedCount} items (unknown ASIN)\n`);

        // Fix the Samsung one that got wrong capacity (31000 GB should be 1000 GB)
        const wrongCapacity = await collection.findOne({ capacity: 31000 });
        if (wrongCapacity) {
            await collection.updateOne(
                { _id: wrongCapacity._id },
                { $set: { capacity: 1000 } }
            );
            console.log('✓ Fixed Samsung 870 QVO capacity: 31000 → 1000 GB\n');
        }

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

// Run the fix
if (require.main === module) {
    fixRemainingCapacities()
        .then(() => {
            console.log('\n🎉 Fix completed!');
            process.exit(0);
        })
        .catch(error => {
            console.error('\n💥 Fix failed:', error);
            process.exit(1);
        });
}

module.exports = { fixRemainingCapacities };
