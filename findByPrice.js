const { connectToDatabase, getDatabase } = require('./config/database');

async function findByPrice() {
    await connectToDatabase();
    const db = getDatabase();

    console.log('=== Searching for drives by price ===\n');

    // Search for the drives by their exact prices
    const drive1 = await db.collection('storage').find({
        $or: [
            { currentPrice: 41.99 },
            { price: 41.99 }
        ]
    }).toArray();

    const drive2 = await db.collection('storage').find({
        $or: [
            { currentPrice: 40.00 },
            { price: 40.00 }, { currentPrice: 40 },
            { price: 40 }
        ]
    }).toArray();

    const drive3 = await db.collection('storage').find({
        $or: [
            { currentPrice: 169.00 },
            { price: 169.00 },
            { currentPrice: 169 },
            { price: 169 }
        ]
    }).toArray();

    const drive4 = await db.collection('storage').find({
        $or: [
            { currentPrice: 38.98 },
            { price: 38.98 }
        ]
    }).toArray();

    console.log(`Drives at $41.99 (1TB Gaming SSHD): ${drive1.length} found`);
    drive1.forEach(d => console.log(`  - ${d.name || d.title}\n    Type: ${d.type}\n    Capacity: ${d.capacity}\n    ID: ${d._id}\n`));

    console.log(`Drives at $40.00 (500GB Gaming SSHD): ${drive2.length} found`);
    drive2.forEach(d => console.log(`  - ${d.name || d.title}\n    Type: ${d.type}\n    Capacity: ${d.capacity}\n    ID: ${d._id}\n`));

    console.log(`Drives at $169.00 (2TB SSHD): ${drive3.length} found`);
    drive3.forEach(d => console.log(`  - ${d.name || d.title}\n    Type: ${d.type}\n    Capacity: ${d.capacity}\n    ID: ${d._id}\n`));

    console.log(`Drives at $38.98 (Pipeline HD): ${drive4.length} found`);
    drive4.forEach(d => console.log(`  - ${d.name || d.title}\n    Type: ${d.type}\n    Capacity: ${d.capacity}\n    ID: ${d._id}\n`));

    // Also show all Seagate drives
    console.log('\n=== All Seagate drives ===\n');
    const seagates = await db.collection('storage').find({
        $or: [
            { name: { $regex: 'seagate', $options: 'i' } },
            { title: { $regex: 'seagate', $options: 'i' } },
            { manufacturer: { $regex: 'seagate', $options: 'i' } }
        ]
    }).limit(20).toArray();

    console.log(`Found ${seagates.length} Seagate drives (showing first 20):`);
    seagates.forEach(d => console.log(`  - ${d.name || d.title}\n    Type: ${d.type}\n    Price: ${d.currentPrice || d.price}\n    Capacity: ${d.capacity}\n`));

    process.exit(0);
}

findByPrice().catch(err => {
    console.error('Error finding drives:', err);
    process.exit(1);
});
