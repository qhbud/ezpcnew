const { connectToDatabase, getDatabase } = require('./config/database');

async function removeWDBlackSN850X() {
    await connectToDatabase();
    const db = getDatabase();

    console.log('=== Finding WD_BLACK SN850X Wireless Controller ===\n');

    // Find the specific drive
    const drive = await db.collection('storages').findOne({
        $and: [
            {
                $or: [
                    { name: { $regex: 'WD_BLACK.*SN850X.*Wireless', $options: 'i' } },
                    { title: { $regex: 'WD_BLACK.*SN850X.*Wireless', $options: 'i' } }
                ]
            },
            {
                $or: [
                    { currentPrice: 223 },
                    { price: 223 },
                    { currentPrice: 223.00 },
                    { price: 223.00 }
                ]
            }
        ]
    });

    if (drive) {
        console.log('Found drive:');
        console.log(`  Name: ${drive.name || drive.title}`);
        console.log(`  Brand: ${drive.brand || drive.manufacturer}`);
        console.log(`  Type: ${drive.type}`);
        console.log(`  Capacity: ${drive.capacity}`);
        console.log(`  Price: $${drive.currentPrice || drive.price}`);
        console.log(`  ID: ${drive._id}\n`);

        // Delete the drive
        const result = await db.collection('storages').deleteOne({ _id: drive._id });
        console.log(`Deleted: ${result.deletedCount} document(s)`);
    } else {
        console.log('WD_BLACK SN850X Wireless Controller not found with exact criteria!');

        // Try broader search
        console.log('\nSearching for any WD_BLACK SN850X with "Wireless" in the name...');
        const drives = await db.collection('storages').find({
            $or: [
                { name: { $regex: 'SN850X.*Wireless', $options: 'i' } },
                { title: { $regex: 'SN850X.*Wireless', $options: 'i' } }
            ]
        }).toArray();

        console.log(`\nFound ${drives.length} drives:`);
        drives.forEach(d => console.log(`  - ${d.name || d.title}\n    Price: $${d.currentPrice || d.price}\n    ID: ${d._id}`));

        if (drives.length > 0) {
            console.log('\nDeleting all found drives with "Wireless" in name...');
            for (const drive of drives) {
                const result = await db.collection('storages').deleteOne({ _id: drive._id });
                console.log(`  Deleted: ${drive.name || drive.title} (${result.deletedCount} document)`);
            }
        }
    }

    process.exit(0);
}

removeWDBlackSN850X().catch(err => {
    console.error('Error:', err);
    process.exit(1);
});
