const { connectToDatabase, getDatabase } = require('../config/database');

async function removeSpecificCoolers() {
    try {
        await connectToDatabase();
        const db = getDatabase();
        const coolersCollection = db.collection('coolers');

        console.log('🗑️  Removing specific coolers from database...\n');

        // Remove ARCTIC Freezer 4U-M (Rev. 2)
        const arcticResult = await coolersCollection.deleteMany({
            $or: [
                { name: { $regex: 'ARCTIC Freezer 4U-M \\(Rev\\. 2\\)', $options: 'i' } },
                { title: { $regex: 'ARCTIC Freezer 4U-M \\(Rev\\. 2\\)', $options: 'i' } },
                { name: { $regex: 'ARCTIC Freezer 4U-M Rev\\.? 2', $options: 'i' } },
                { title: { $regex: 'ARCTIC Freezer 4U-M Rev\\.? 2', $options: 'i' } }
            ]
        });
        console.log(`✅ Removed ARCTIC Freezer 4U-M (Rev. 2): ${arcticResult.deletedCount} document(s)`);

        // Remove SilverStone XE360-TR5
        const silverstoneResult = await coolersCollection.deleteMany({
            $or: [
                { name: { $regex: 'XE360-TR5', $options: 'i' } },
                { title: { $regex: 'XE360-TR5', $options: 'i' } }
            ]
        });
        console.log(`✅ Removed SilverStone XE360-TR5: ${silverstoneResult.deletedCount} document(s)`);

        // Summary
        const totalRemoved = arcticResult.deletedCount + silverstoneResult.deletedCount;
        console.log(`\n📊 Total coolers removed: ${totalRemoved}`);

        const remainingCoolers = await coolersCollection.countDocuments();
        console.log(`   Coolers remaining in database: ${remainingCoolers}`);

        console.log('\n✅ Cooler removal complete!');

    } catch (error) {
        console.error('❌ Error removing coolers:', error);
        throw error;
    } finally {
        process.exit(0);
    }
}

removeSpecificCoolers();
