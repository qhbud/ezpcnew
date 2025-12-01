const { connectToDatabase, getDatabase } = require('./config/database');

async function fixSSHDMistake() {
    await connectToDatabase();
    const db = getDatabase();

    console.log('=== Fixing SSHD labeling mistake ===\n');

    // Revert all drives currently labeled as SSHD back to HDD,
    // EXCEPT those that explicitly have "SSHD" in their name
    const revertResult = await db.collection('storages').updateMany(
        {
            type: 'SSHD',
            $and: [
                { name: { $not: { $regex: 'sshd', $options: 'i' } } },
                { title: { $not: { $regex: 'sshd', $options: 'i' } } }
            ]
        },
        { $set: { type: 'HDD' } }
    );

    console.log(`Reverted ${revertResult.modifiedCount} incorrectly labeled drives back to HDD`);

    // Now make sure ONLY drives with "SSHD" explicitly in their name are labeled as SSHD
    const sshdResult = await db.collection('storages').updateMany(
        {
            $or: [
                { name: { $regex: 'sshd', $options: 'i' } },
                { title: { $regex: 'sshd', $options: 'i' } }
            ]
        },
        { $set: { type: 'SSHD' } }
    );

    console.log(`Ensured ${sshdResult.matchedCount} drives with "SSHD" in name are labeled correctly (${sshdResult.modifiedCount} modified)`);

    // Verify the final state
    console.log('\n=== Final SSHD drives ===\n');
    const sshdDrives = await db.collection('storages').find({
        type: 'SSHD'
    }).toArray();

    console.log(`Total SSHD drives in database: ${sshdDrives.length}`);
    sshdDrives.forEach(d => console.log(`  - ${d.name || d.title}\n    Price: $${d.currentPrice || d.price}`));

    process.exit(0);
}

fixSSHDMistake().catch(err => {
    console.error('Error:', err);
    process.exit(1);
});
