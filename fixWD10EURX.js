const { connectToDatabase, getDatabase } = require('./config/database');

async function fixWD10EURX() {
    await connectToDatabase();
    const db = getDatabase();

    console.log('=== Fixing WD10EURX drive type ===\n');

    // Find the WD10EURX drive
    const drive = await db.collection('storages').findOne({
        $or: [
            { name: { $regex: 'WD10EURX', $options: 'i' } },
            { title: { $regex: 'WD10EURX', $options: 'i' } }
        ]
    });

    if (drive) {
        console.log('Found drive:');
        console.log(`  Name: ${drive.name || drive.title}`);
        console.log(`  Brand: ${drive.brand || drive.manufacturer}`);
        console.log(`  Current Type: ${drive.type}`);
        console.log(`  Capacity: ${drive.capacity}`);
        console.log(`  Price: $${drive.currentPrice || drive.price}`);
        console.log(`  ID: ${drive._id}\n`);

        if (drive.type !== 'HDD') {
            // Update to HDD
            const result = await db.collection('storages').updateOne(
                { _id: drive._id },
                { $set: { type: 'HDD' } }
            );
            console.log(`Updated type from "${drive.type}" to "HDD" (modified: ${result.modifiedCount})`);
        } else {
            console.log('Type is already correctly set to "HDD"');
        }

        // Verify the change
        const verifyDrive = await db.collection('storages').findOne({ _id: drive._id });
        console.log('\n=== Verification ===');
        console.log(`  Name: ${verifyDrive.name || verifyDrive.title}`);
        console.log(`  Type: ${verifyDrive.type}`);
        console.log(`  Price: $${verifyDrive.currentPrice || verifyDrive.price}`);
    } else {
        console.log('WD10EURX drive not found!');
    }

    process.exit(0);
}

fixWD10EURX().catch(err => {
    console.error('Error:', err);
    process.exit(1);
});
