const { connectToDatabase, getDatabase } = require('./config/database');

async function find2tbSSHD() {
    await connectToDatabase();
    const db = getDatabase();

    console.log('=== Searching for 2TB SSHD ===\n');

    // Search for 2TB drives with "sshd" in name
    const drives = await db.collection('storages').find({
        $and: [
            {
                $or: [
                    { name: { $regex: '2tb', $options: 'i' } },
                    { title: { $regex: '2tb', $options: 'i' } },
                    { capacity: { $in: [2000, '2TB', '2000GB'] } }
                ]
            },
            {
                $or: [
                    { name: { $regex: '5400', $options: 'i' } },
                    { title: { $regex: '5400', $options: 'i' } },
                    { name: { $regex: 'sshd', $options: 'i' } },
                    { title: { $regex: 'sshd', $options: 'i' } }
                ]
            }
        ]
    }).toArray();

    console.log(`Found ${drives.length} drives matching 2TB SSHD criteria:`);
    drives.forEach(d => console.log(`  - ${d.name || d.title}\n    Type: ${d.type}\n    Price: $${d.currentPrice || d.price}\n    Capacity: ${d.capacity}\n    ID: ${d._id}\n`));

    // Also search by price
    const byPrice = await db.collection('storages').find({
        $or: [
            { currentPrice: 169 },
            { price: 169 },
            { currentPrice: 169.00 },
            { price: 169.00 }
        ]
    }).toArray();

    console.log(`\nDrives at $169:`);
    byPrice.forEach(d => console.log(`  - ${d.name || d.title}\n    Type: ${d.type}\n    Capacity: ${d.capacity}\n    ID: ${d._id}\n`));

    // Update any 2TB SSHD drives
    if (drives.length > 0) {
        for (const drive of drives) {
            if (drive.type !== 'SSHD') {
                const result = await db.collection('storages').updateOne(
                    { _id: drive._id },
                    { $set: { type: 'SSHD' } }
                );
                console.log(`Updated ${drive.name || drive.title} to SSHD (modified: ${result.modifiedCount})`);
            }
        }
    }

    process.exit(0);
}

find2tbSSHD().catch(err => {
    console.error('Error:', err);
    process.exit(1);
});
