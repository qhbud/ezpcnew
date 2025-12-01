const { connectToDatabase, getDatabase } = require('./config/database');

async function fixDriveTypes() {
    await connectToDatabase();
    const db = getDatabase();

    console.log('=== Checking collection names ===\n');

    // List all collections
    const collections = await db.listCollections().toArray();
    console.log('Available collections:', collections.map(c => c.name).join(', '));

    // Try both "storage" and "storages"
    const storageCount = await db.collection('storage').countDocuments();
    const storagesCount = await db.collection('storages').countDocuments();

    console.log(`\nDocuments in 'storage': ${storageCount}`);
    console.log(`Documents in 'storages': ${storagesCount}`);

    const collectionName = storagesCount > 0 ? 'storages' : 'storage';
    console.log(`\nUsing collection: ${collectionName}\n`);

    // Now fix the SSHD drives
    console.log('=== Fixing SSHD drives ===\n');

    // Update any drives with "SSHD" in the name but labeled as SATA SSD
    const sshdUpdate = await db.collection(collectionName).updateMany(
        {
            $or: [
                { name: { $regex: 'sshd', $options: 'i' } },
                { title: { $regex: 'sshd', $options: 'i' } }
            ],
            type: 'SATA SSD'
        },
        { $set: { type: 'SSHD' } }
    );
    console.log(`Updated ${sshdUpdate.modifiedCount} SSHD drives from 'SATA SSD' to 'SSHD'`);

    // Fix the Pipeline HD (should be HDD, not SATA SSD)
    const pipelineUpdate = await db.collection(collectionName).updateMany(
        {
            $or: [
                { name: { $regex: 'pipeline.*hd', $options: 'i' } },
                { title: { $regex: 'pipeline.*hd', $options: 'i' } }
            ],
            type: 'SATA SSD'
        },
        { $set: { type: 'HDD' } }
    );
    console.log(`Updated ${pipelineUpdate.modifiedCount} Pipeline HD drives from 'SATA SSD' to 'HDD'`);

    // Verify the changes
    console.log('\n=== Verification ===\n');

    const sshdDrives = await db.collection(collectionName).find({
        type: 'SSHD'
    }).toArray();
    console.log(`Found ${sshdDrives.length} SSHD drives:`);
    sshdDrives.forEach(d => console.log(`  - ${d.name || d.title} ($${d.currentPrice || d.price})`));

    const pipelineDrives = await db.collection(collectionName).find({
        $or: [
            { name: { $regex: 'pipeline', $options: 'i' } },
            { title: { $regex: 'pipeline', $options: 'i' } }
        ]
    }).toArray();
    console.log(`\nPipeline drives:`);
    pipelineDrives.forEach(d => console.log(`  - ${d.name || d.title}\n    Type: ${d.type}\n    Price: $${d.currentPrice || d.price}`));

    process.exit(0);
}

fixDriveTypes().catch(err => {
    console.error('Error fixing drive types:', err);
    process.exit(1);
});
