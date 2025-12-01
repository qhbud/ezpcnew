const { connectToDatabase, getDatabase } = require('./config/database');

async function fixKingstonA400() {
    await connectToDatabase();
    const db = getDatabase();

    console.log('=== Fixing Kingston A400 SSD labeling ===\n');

    // Find Kingston A400 drives currently labeled as HDD
    const a400Drives = await db.collection('storages').find({
        $or: [
            { name: { $regex: 'kingston.*a400', $options: 'i' } },
            { title: { $regex: 'kingston.*a400', $options: 'i' } }
        ],
        type: 'HDD'
    }).toArray();

    console.log(`Found ${a400Drives.length} Kingston A400 drives labeled as HDD:`);
    a400Drives.forEach(d => console.log(`  - ${d.name || d.title}\n    Current Type: ${d.type}\n    Capacity: ${d.capacity}\n    Price: $${d.currentPrice || d.price}\n`));

    // Update them to SATA SSD
    if (a400Drives.length > 0) {
        const result = await db.collection('storages').updateMany(
            {
                $or: [
                    { name: { $regex: 'kingston.*a400', $options: 'i' } },
                    { title: { $regex: 'kingston.*a400', $options: 'i' } }
                ],
                type: 'HDD'
            },
            { $set: { type: 'SATA SSD' } }
        );

        console.log(`Updated ${result.modifiedCount} Kingston A400 drives from "HDD" to "SATA SSD"`);
    } else {
        console.log('No Kingston A400 drives found with HDD label');
    }

    // Verify the changes
    console.log('\n=== Verification ===\n');
    const verifiedDrives = await db.collection('storages').find({
        $or: [
            { name: { $regex: 'kingston.*a400', $options: 'i' } },
            { title: { $regex: 'kingston.*a400', $options: 'i' } }
        ]
    }).toArray();

    console.log(`Kingston A400 drives after update (${verifiedDrives.length} total):`);
    verifiedDrives.forEach(d => console.log(`  - ${d.name || d.title}\n    Type: ${d.type}\n    Capacity: ${d.capacity}\n    Price: $${d.currentPrice || d.price}`));

    process.exit(0);
}

fixKingstonA400().catch(err => {
    console.error('Error:', err);
    process.exit(1);
});
