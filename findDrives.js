const { connectToDatabase, getDatabase } = require('./config/database');

async function findDrives() {
    await connectToDatabase();
    const db = getDatabase();

    console.log('=== Searching for SSHD drives ===\n');

    // Search for the specific model numbers
    const st1000lm014 = await db.collection('storage').find({
        $or: [
            { name: { $regex: '1000LM014', $options: 'i' } },
            { title: { $regex: '1000LM014', $options: 'i' } },
            { name: { $regex: '1TB.*Gaming.*SSHD', $options: 'i' } },
            { title: { $regex: '1TB.*Gaming.*SSHD', $options: 'i' } }
        ]
    }).toArray();

    const st500lm000 = await db.collection('storage').find({
        $or: [
            { name: { $regex: '500LM000', $options: 'i' } },
            { title: { $regex: '500LM000', $options: 'i' } },
            { name: { $regex: '500GB.*Gaming.*SSHD', $options: 'i' } },
            { title: { $regex: '500GB.*Gaming.*SSHD', $options: 'i' } }
        ]
    }).toArray();

    const sshd2tb = await db.collection('storage').find({
        $or: [
            { name: { $regex: '2tb.*5400.*sshd', $options: 'i' } },
            { title: { $regex: '2tb.*5400.*sshd', $options: 'i' } }
        ]
    }).toArray();

    console.log(`Found ${st1000lm014.length} drives matching 1TB SSHD`);
    st1000lm014.forEach(d => console.log(`  - Name: ${d.name || d.title}\n    Type: ${d.type}\n    ID: ${d._id}\n`));

    console.log(`Found ${st500lm000.length} drives matching 500GB SSHD`);
    st500lm000.forEach(d => console.log(`  - Name: ${d.name || d.title}\n    Type: ${d.type}\n    ID: ${d._id}\n`));

    console.log(`Found ${sshd2tb.length} drives matching 2TB SSHD`);
    sshd2tb.forEach(d => console.log(`  - Name: ${d.name || d.title}\n    Type: ${d.type}\n    ID: ${d._id}\n`));

    console.log('\n=== Searching for Pipeline HD (should be HDD) ===\n');

    // Search for the Pipeline HD
    const st2000vm003 = await db.collection('storage').find({
        $or: [
            { name: { $regex: '2000VM003', $options: 'i' } },
            { title: { $regex: '2000VM003', $options: 'i' } },
            { name: { $regex: 'Pipeline.*HD', $options: 'i' } },
            { title: { $regex: 'Pipeline.*HD', $options: 'i' } }
        ]
    }).toArray();

    console.log(`Found ${st2000vm003.length} drives matching Pipeline HD`);
    st2000vm003.forEach(d => console.log(`  - Name: ${d.name || d.title}\n    Type: ${d.type}\n    Price: ${d.currentPrice || d.price}\n    ID: ${d._id}\n`));

    // Also search for any drives with "SSHD" in the name
    console.log('\n=== All drives with "SSHD" in name ===\n');
    const allSSHDs = await db.collection('storage').find({
        $or: [
            { name: { $regex: 'sshd', $options: 'i' } },
            { title: { $regex: 'sshd', $options: 'i' } }
        ]
    }).toArray();

    console.log(`Found ${allSSHDs.length} drives with "SSHD" in name:`);
    allSSHDs.forEach(d => console.log(`  - ${d.name || d.title}\n    Type: ${d.type}\n    Capacity: ${d.capacity}\n`));

    process.exit(0);
}

findDrives().catch(err => {
    console.error('Error finding drives:', err);
    process.exit(1);
});
