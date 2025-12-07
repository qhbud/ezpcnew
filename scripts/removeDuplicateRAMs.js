require('dotenv').config();
const { MongoClient } = require('mongodb');

async function removeDuplicateRAMs() {
    const uri = process.env.MONGODB_URI;
    const client = new MongoClient(uri);

    try {
        await client.connect();
        console.log('✅ Connected to MongoDB\n');

        const db = client.db(process.env.DB_NAME || 'pcbuilder');
        const ramCollection = db.collection('rams');

        // Get all RAM modules
        const allRams = await ramCollection.find({}).toArray();
        console.log(`📊 Total RAM modules in database: ${allRams.length}`);

        // Group by uniqueId to find duplicates
        const ramsByUniqueId = {};
        const duplicatesToDelete = [];

        for (const ram of allRams) {
            const uniqueId = ram.uniqueId;

            if (!uniqueId) {
                console.log(`⚠️  RAM without uniqueId: ${ram.name || ram.title}`);
                continue;
            }

            if (!ramsByUniqueId[uniqueId]) {
                ramsByUniqueId[uniqueId] = [];
            }
            ramsByUniqueId[uniqueId].push(ram);
        }

        // Find duplicates and keep the one with the most data
        for (const [uniqueId, rams] of Object.entries(ramsByUniqueId)) {
            if (rams.length > 1) {
                console.log(`\n🔍 Found ${rams.length} duplicates for: ${rams[0].name || rams[0].title}`);

                // Sort by: 1) has price, 2) has image, 3) most recent update
                rams.sort((a, b) => {
                    // Prioritize items with valid prices
                    const aHasPrice = (a.price || a.currentPrice || a.basePrice) ? 1 : 0;
                    const bHasPrice = (b.price || b.currentPrice || b.basePrice) ? 1 : 0;
                    if (aHasPrice !== bHasPrice) return bHasPrice - aHasPrice;

                    // Then prioritize items with images
                    const aHasImage = a.imageUrl ? 1 : 0;
                    const bHasImage = b.imageUrl ? 1 : 0;
                    if (aHasImage !== bHasImage) return bHasImage - aHasImage;

                    // Finally, prioritize most recently updated
                    const aDate = new Date(a.updatedAt || a.createdAt || 0);
                    const bDate = new Date(b.updatedAt || b.createdAt || 0);
                    return bDate - aDate;
                });

                // Keep the first one (best), delete the rest
                const toKeep = rams[0];
                const toDelete = rams.slice(1);

                console.log(`   ✅ Keeping: ${toKeep._id} (Price: ${toKeep.price || toKeep.currentPrice || toKeep.basePrice || 'N/A'}, Image: ${toKeep.imageUrl ? 'Yes' : 'No'})`);

                for (const dup of toDelete) {
                    console.log(`   ❌ Deleting: ${dup._id} (Price: ${dup.price || dup.currentPrice || dup.basePrice || 'N/A'}, Image: ${dup.imageUrl ? 'Yes' : 'No'})`);
                    duplicatesToDelete.push(dup._id);
                }
            }
        }

        console.log(`\n📊 SUMMARY:`);
        console.log(`   Total RAM modules: ${allRams.length}`);
        console.log(`   Unique RAM modules: ${Object.keys(ramsByUniqueId).length}`);
        console.log(`   Duplicates to delete: ${duplicatesToDelete.length}`);

        if (duplicatesToDelete.length > 0) {
            console.log('\n🗑️  Deleting duplicates...');
            const result = await ramCollection.deleteMany({
                _id: { $in: duplicatesToDelete }
            });
            console.log(`✅ Deleted ${result.deletedCount} duplicate RAM modules`);
        } else {
            console.log('\n✨ No duplicates found!');
        }

        // Verify final count
        const finalCount = await ramCollection.countDocuments();
        console.log(`\n📊 Final RAM count: ${finalCount}`);

    } catch (error) {
        console.error('❌ Error:', error);
        throw error;
    } finally {
        await client.close();
        console.log('\n🔌 Disconnected from MongoDB');
    }
}

removeDuplicateRAMs()
    .then(() => {
        console.log('\n✨ Duplicate removal completed successfully');
        process.exit(0);
    })
    .catch(error => {
        console.error('\n💥 Operation failed:', error);
        process.exit(1);
    });
