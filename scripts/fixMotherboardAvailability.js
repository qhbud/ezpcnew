const { MongoClient } = require('mongodb');

async function fixMotherboardAvailability() {
    console.log('🔄 Fixing motherboard availability...\n');

    const client = await MongoClient.connect('mongodb://localhost:27017');
    const db = client.db('pcbuilder');
    const collection = db.collection('motherboards');

    try {
        // Check which motherboards are marked as unavailable
        const unavailable = await collection.find({ isAvailable: false }).toArray();

        console.log(`Found ${unavailable.length} unavailable motherboards\n`);

        // Show first few
        console.log('Sample unavailable motherboards:');
        unavailable.slice(0, 5).forEach((mb, i) => {
            console.log(`  ${i + 1}. ${mb.name || mb.title}`);
            console.log(`     Price: ${mb.price || mb.currentPrice || mb.basePrice || 'N/A'}`);
            console.log(`     isAvailable: ${mb.isAvailable}`);
            console.log('');
        });

        // Ask user what to do
        console.log('\n📋 Options:');
        console.log('  1. Set all motherboards to available (isAvailable: true)');
        console.log('  2. Set motherboards with valid prices to available');
        console.log('  3. Remove isAvailable field (defaults to available)');

        // For now, let's set all with valid prices to available
        const result = await collection.updateMany(
            {
                $and: [
                    { isAvailable: false },
                    {
                        $or: [
                            { price: { $exists: true, $gt: 0 } },
                            { currentPrice: { $exists: true, $gt: 0 } },
                            { basePrice: { $exists: true, $gt: 0 } }
                        ]
                    }
                ]
            },
            { $set: { isAvailable: true } }
        );

        console.log(`\n✅ Updated ${result.modifiedCount} motherboards to available`);

        // Show final stats
        const totalAvailable = await collection.countDocuments({
            isAvailable: { $ne: false }
        });

        const totalUnavailable = await collection.countDocuments({
            isAvailable: false
        });

        console.log('\n📊 Final availability:');
        console.log(`   Available: ${totalAvailable}`);
        console.log(`   Unavailable: ${totalUnavailable}`);

    } catch (error) {
        console.error('❌ Error:', error);
        throw error;
    } finally {
        await client.close();
    }
}

// Run the fix
if (require.main === module) {
    fixMotherboardAvailability()
        .then(() => {
            console.log('\n🎉 Fix completed!');
            process.exit(0);
        })
        .catch(error => {
            console.error('\n💥 Fix failed:', error);
            process.exit(1);
        });
}

module.exports = { fixMotherboardAvailability };
