const { MongoClient } = require('mongodb');

async function checkDuplicateNames() {
    const client = await MongoClient.connect('mongodb://localhost:27017');
    const db = client.db('pcbuilder');
    const collection = db.collection('storages');

    // Find duplicates by name and price
    const duplicates = await collection.aggregate([
        {
            $group: {
                _id: { name: '$name', price: '$price' },
                count: { $sum: 1 },
                ids: { $push: '$_id' },
                urls: { $push: '$url' }
            }
        },
        {
            $match: { count: { $gt: 1 } }
        },
        {
            $sort: { count: -1 }
        },
        {
            $limit: 20
        }
    ]).toArray();

    console.log(`\nFound ${duplicates.length} name+price combinations with duplicates:\n`);

    let totalDuplicates = 0;
    duplicates.forEach((dup, i) => {
        console.log(`${i + 1}. "${dup._id.name.substring(0, 70)}..."`);
        console.log(`   Price: $${dup._id.price}`);
        console.log(`   Count: ${dup.count} duplicates`);
        console.log(`   URLs are ${dup.urls[0] === dup.urls[1] ? 'SAME' : 'DIFFERENT'}`);
        console.log('');
        totalDuplicates += (dup.count - 1);
    });

    console.log(`Total duplicate entries to remove: ${totalDuplicates}\n`);

    await client.close();
}

checkDuplicateNames().catch(console.error);
