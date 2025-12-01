const { connectToDatabase, getDatabase } = require('./config/database');

async function fixMoreSSDs() {
    await connectToDatabase();
    const db = getDatabase();

    console.log('=== Fixing additional SSD labeling issues ===\n');

    // Find all the drives that need updating
    const drivesToFix = [
        { pattern: 'samsung.*870.*evo', name: 'Samsung 870 EVO' },
        { pattern: 'vansuny', name: 'Vansuny drives' },
        { pattern: 'water panther', name: 'Water Panther' },
        { pattern: 'wd.*blue', name: 'WD Blue' }
    ];

    let totalUpdated = 0;

    for (const drivePattern of drivesToFix) {
        console.log(`\n--- Processing: ${drivePattern.name} ---`);

        // Find drives matching this pattern that aren't already SATA SSD
        const drives = await db.collection('storages').find({
            $or: [
                { name: { $regex: drivePattern.pattern, $options: 'i' } },
                { title: { $regex: drivePattern.pattern, $options: 'i' } }
            ],
            type: { $ne: 'SATA SSD' }
        }).toArray();

        console.log(`Found ${drives.length} ${drivePattern.name} drive(s) not labeled as SATA SSD:`);
        drives.forEach(d => console.log(`  - ${d.name || d.title}\n    Current Type: ${d.type}\n    Capacity: ${d.capacity}\n    Price: $${d.currentPrice || d.price}`));

        if (drives.length > 0) {
            // Update them to SATA SSD
            const result = await db.collection('storages').updateMany(
                {
                    $or: [
                        { name: { $regex: drivePattern.pattern, $options: 'i' } },
                        { title: { $regex: drivePattern.pattern, $options: 'i' } }
                    ],
                    type: { $ne: 'SATA SSD' }
                },
                { $set: { type: 'SATA SSD' } }
            );

            console.log(`  → Updated ${result.modifiedCount} drive(s) to SATA SSD`);
            totalUpdated += result.modifiedCount;
        }
    }

    // Verify the changes
    console.log('\n\n=== Verification ===\n');

    for (const drivePattern of drivesToFix) {
        const verifiedDrives = await db.collection('storages').find({
            $or: [
                { name: { $regex: drivePattern.pattern, $options: 'i' } },
                { title: { $regex: drivePattern.pattern, $options: 'i' } }
            ]
        }).toArray();

        if (verifiedDrives.length > 0) {
            console.log(`\n${drivePattern.name} drives (${verifiedDrives.length} total):`);
            verifiedDrives.forEach(d => console.log(`  - ${d.name || d.title}\n    Type: ${d.type}\n    Price: $${d.currentPrice || d.price}`));
        }
    }

    console.log(`\n\nTotal drives updated: ${totalUpdated}`);

    process.exit(0);
}

fixMoreSSDs().catch(err => {
    console.error('Error:', err);
    process.exit(1);
});
