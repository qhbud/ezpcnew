const { connectToDatabase, getDatabase } = require('./config/database');

async function updateSSHDs() {
    await connectToDatabase();
    const db = getDatabase();

    console.log('Updating SSHDs to correct type...\n');

    // Update the Seagate 1TB Gaming SSHD
    const result1 = await db.collection('storage').updateOne(
        { name: { $regex: 'ST1000LM014', $options: 'i' } },
        { $set: { type: 'SSHD' } }
    );
    console.log(`Updated Seagate 1TB Gaming SSHD (ST1000LM014): ${result1.modifiedCount} document(s) modified`);

    // Update the Seagate 500GB Gaming SSHD
    const result2 = await db.collection('storage').updateOne(
        { name: { $regex: 'ST500LM000', $options: 'i' } },
        { $set: { type: 'SSHD' } }
    );
    console.log(`Updated Seagate 500GB Gaming SSHD (ST500LM000): ${result2.modifiedCount} document(s) modified`);

    // Update the 2TB 5400rpm SSHD
    const result3 = await db.collection('storage').updateOne(
        { name: { $regex: '2tb.*5400rpm.*128mb.*sshd', $options: 'i' } },
        { $set: { type: 'SSHD' } }
    );
    console.log(`Updated 2TB 5400rpm SSHD: ${result3.modifiedCount} document(s) modified`);

    // Also update any other drives that have "SSHD" in their name/title but wrong type
    const result4 = await db.collection('storage').updateMany(
        {
            $or: [
                { name: { $regex: 'sshd', $options: 'i' } },
                { title: { $regex: 'sshd', $options: 'i' } }
            ],
            type: { $ne: 'SSHD' }
        },
        { $set: { type: 'SSHD' } }
    );
    console.log(`\nUpdated ${result4.modifiedCount} additional SSHD drive(s) with incorrect type`);

    // Verify the updates
    console.log('\n=== Verifying SSHD drives ===');
    const sshdDrives = await db.collection('storage').find({
        type: 'SSHD'
    }).toArray();

    console.log(`\nFound ${sshdDrives.length} SSHD drives in database:`);
    sshdDrives.forEach(drive => {
        console.log(`  - ${drive.name || drive.title} (${drive.capacity || 'Unknown capacity'})`);
    });

    process.exit(0);
}

updateSSHDs().catch(err => {
    console.error('Error updating SSHDs:', err);
    process.exit(1);
});
