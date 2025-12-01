const { MongoClient } = require('mongodb');

async function checkStorageIssues() {
    const client = await MongoClient.connect('mongodb://localhost:27017');
    const db = client.db('pcbuilder');

    // Get total count
    const totalCount = await db.collection('storages').countDocuments({});
    console.log(`\nTotal storage devices: ${totalCount}`);

    // Check for "corsair" only names
    const corsairOnly = await db.collection('storages').find({
        name: { $regex: /^corsair$/i }
    }).toArray();
    console.log(`\nDevices named just "corsair": ${corsairOnly.length}`);
    if (corsairOnly.length > 0) {
        console.log('Sample:');
        corsairOnly.slice(0, 5).forEach(s => {
            console.log(`  - "${s.name}" (${s.url})`);
        });
    }

    // Check for short manufacturer names as full names
    const shortNames = await db.collection('storages').find({
        name: { $in: ['corsair', 'samsung', 'kingston', 'crucial', 'wd', 'seagate', 'western digital'] }
    }).toArray();
    console.log(`\nDevices with just manufacturer names: ${shortNames.length}`);
    if (shortNames.length > 0) {
        console.log('Sample:');
        shortNames.slice(0, 5).forEach(s => {
            console.log(`  - ${s.name} (${s.url})`);
        });
    }

    // Check for duplicates by URL
    const urls = await db.collection('storages').aggregate([
        { $group: { _id: '$url', count: { $sum: 1 } } },
        { $match: { count: { $gt: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 }
    ]).toArray();
    console.log(`\nDuplicate URLs found: ${urls.length}`);
    if (urls.length > 0) {
        console.log('Top duplicates:');
        urls.forEach(u => {
            console.log(`  - ${u._id} (${u.count} times)`);
        });
    }

    // Check for wrong storage type classifications
    const wrongType = await db.collection('storages').find({
        $or: [
            { storageType: 'HDD', name: { $regex: /ssd|nvme|solid state/i } },
            { storageType: 'HDD', formFactor: 'm2_2280' }
        ]
    }).toArray();
    console.log(`\nSSDs incorrectly classified as HDD: ${wrongType.length}`);
    if (wrongType.length > 0) {
        console.log('Sample:');
        wrongType.slice(0, 5).forEach(s => {
            console.log(`  - ${s.name} (type: ${s.storageType}, formFactor: ${s.formFactor})`);
        });
    }

    // Check for null manufacturers
    const nullManufacturers = await db.collection('storages').countDocuments({
        manufacturer: null
    });
    console.log(`\nDevices with null manufacturer: ${nullManufacturers}`);

    await client.close();
}

checkStorageIssues().catch(console.error);
