const { connectToDatabase, getDatabase } = require('./config/database');

async function verifyPipelineHD() {
    await connectToDatabase();
    const db = getDatabase();

    console.log('=== Checking Pipeline HD drive ===\n');

    // Find the Pipeline HD drive
    const pipelineDrive = await db.collection('storages').findOne({
        name: { $regex: 'Pipeline.*HD.*ST2000VM003', $options: 'i' }
    });

    if (pipelineDrive) {
        console.log('Found drive:');
        console.log(`  Name: ${pipelineDrive.name}`);
        console.log(`  Current Type: ${pipelineDrive.type}`);
        console.log(`  Price: $${pipelineDrive.currentPrice || pipelineDrive.price}`);
        console.log(`  Capacity: ${pipelineDrive.capacity}`);

        // Update to HDD if not already
        if (pipelineDrive.type !== 'HDD') {
            const result = await db.collection('storages').updateOne(
                { _id: pipelineDrive._id },
                { $set: { type: 'HDD' } }
            );
            console.log(`\nUpdated type from "${pipelineDrive.type}" to "HDD" (modified: ${result.modifiedCount})`);
        } else {
            console.log('\nType is already correctly set to "HDD"');
        }
    } else {
        console.log('Pipeline HD drive not found!');
    }

    // Verify the final state
    const verifyDrive = await db.collection('storages').findOne({
        name: { $regex: 'Pipeline.*HD.*ST2000VM003', $options: 'i' }
    });

    console.log('\n=== Final state ===');
    console.log(`  Name: ${verifyDrive.name}`);
    console.log(`  Type: ${verifyDrive.type}`);
    console.log(`  Price: $${verifyDrive.currentPrice || verifyDrive.price}`);

    process.exit(0);
}

verifyPipelineHD().catch(err => {
    console.error('Error:', err);
    process.exit(1);
});
