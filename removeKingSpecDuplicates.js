const { connectToDatabase, getDatabase } = require('./config/database');

async function removeKingSpecDuplicates() {
    await connectToDatabase();
    const db = getDatabase();

    console.log('=== Finding KingSpec duplicate drives ===\n');

    // Find all KingSpec drives
    const allKingSpec = await db.collection('storages').find({
        $or: [
            { name: { $regex: 'kingspec', $options: 'i' } },
            { title: { $regex: 'kingspec', $options: 'i' } },
            { manufacturer: { $regex: 'kingspec', $options: 'i' } },
            { brand: { $regex: 'kingspec', $options: 'i' } }
        ]
    }).toArray();

    console.log(`Found ${allKingSpec.length} KingSpec drives:`);
    allKingSpec.forEach(d => console.log(`  - ${d.name || d.title}\n    Capacity: ${d.capacity}\n    Price: $${d.currentPrice || d.price}\n    ID: ${d._id}\n`));

    // Find the two specific drives to delete
    const drivesToDelete = allKingSpec.filter(d => {
        const price = d.currentPrice || d.price;
        return price === 41.97 || price === 65.97;
    });

    if (drivesToDelete.length > 0) {
        console.log(`\nRemoving ${drivesToDelete.length} duplicate KingSpec drives:`);

        for (const drive of drivesToDelete) {
            console.log(`  Deleting: ${drive.name || drive.title} ($${drive.currentPrice || drive.price})`);
            const result = await db.collection('storages').deleteOne({ _id: drive._id });
            console.log(`    Deleted: ${result.deletedCount} document(s)\n`);
        }
    } else {
        console.log('\nNo drives found at $41.97 or $65.97 to delete');
    }

    // Verify deletion
    console.log('=== Verification ===\n');
    const remainingKingSpec = await db.collection('storages').find({
        $or: [
            { name: { $regex: 'kingspec', $options: 'i' } },
            { title: { $regex: 'kingspec', $options: 'i' } },
            { manufacturer: { $regex: 'kingspec', $options: 'i' } },
            { brand: { $regex: 'kingspec', $options: 'i' } }
        ]
    }).toArray();

    console.log(`Remaining KingSpec drives: ${remainingKingSpec.length}`);
    remainingKingSpec.forEach(d => console.log(`  - ${d.name || d.title}\n    Capacity: ${d.capacity}\n    Price: $${d.currentPrice || d.price}`));

    process.exit(0);
}

removeKingSpecDuplicates().catch(err => {
    console.error('Error:', err);
    process.exit(1);
});
