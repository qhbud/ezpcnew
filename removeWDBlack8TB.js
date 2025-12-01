const { connectToDatabase, getDatabase } = require('./config/database');

async function removeWDBlack8TB() {
    await connectToDatabase();
    const db = getDatabase();

    console.log('=== Finding WD Black 8TB Game Drive ===\n');

    // Find the specific drive
    const drive = await db.collection('storages').findOne({
        $or: [
            { name: { $regex: 'WD_BLACK.*8TB.*Game Drive.*WDBA3P0080HBK', $options: 'i' } },
            { title: { $regex: 'WD_BLACK.*8TB.*Game Drive.*WDBA3P0080HBK', $options: 'i' } },
            { name: { $regex: 'WDBA3P0080HBK', $options: 'i' } },
            { title: { $regex: 'WDBA3P0080HBK', $options: 'i' } }
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
        console.log('WD Black 8TB Game Drive not found!');

        // Try broader search
        console.log('\nSearching for any WD Black 8TB drives...');
        const wdBlack8TB = await db.collection('storages').find({
            $and: [
                {
                    $or: [
                        { name: { $regex: 'wd.*black', $options: 'i' } },
                        { title: { $regex: 'wd.*black', $options: 'i' } },
                        { brand: { $regex: 'wd.*black', $options: 'i' } }
                    ]
                },
                {
                    $or: [
                        { capacity: 8000 },
                        { capacity: '8TB' },
                        { name: { $regex: '8tb', $options: 'i' } },
                        { title: { $regex: '8tb', $options: 'i' } }
                    ]
                }
            ]
        }).toArray();

        console.log(`\nFound ${wdBlack8TB.length} WD Black 8TB drives:`);
        wdBlack8TB.forEach(d => console.log(`  - ${d.name || d.title}\n    Price: $${d.currentPrice || d.price}\n    ID: ${d._id}`));
    }

    process.exit(0);
}

removeWDBlack8TB().catch(err => {
    console.error('Error:', err);
    process.exit(1);
});
