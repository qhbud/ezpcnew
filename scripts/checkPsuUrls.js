const { MongoClient } = require('mongodb');

async function checkPsuUrls() {
    const client = await MongoClient.connect('mongodb://localhost:27017');
    const db = client.db('pcbuilder');

    const psuWithUrl = await db.collection('psus').countDocuments({ url: { $exists: true, $ne: null } });
    console.log('PSUs with URL field:', psuWithUrl);

    const psu = await db.collection('psus').findOne({ url: { $exists: true } });
    if (psu) {
        console.log('\nSample PSU:');
        console.log('Name:', psu.name);
        console.log('URL:', psu.url);
        console.log('Price:', psu.price);
        console.log('Has priceHistory:', !!psu.priceHistory);
        if (psu.priceHistory) {
            console.log('Price history entries:', psu.priceHistory.length);
        }
    }

    // Check storages with any URL fields
    const storageCount = await db.collection('storages').countDocuments();
    console.log('\n\nTotal storages:', storageCount);

    const storageWithUrlCount = await db.collection('storages').countDocuments({ url: { $exists: true, $ne: null } });
    console.log('Storages with URL field:', storageWithUrlCount);

    // Try to find if any storage has a url or sourceUrl field
    const storageWithUrl = await db.collection('storages').findOne({
        $or: [
            { url: { $exists: true } },
            { sourceUrl: { $exists: true } },
            { source: { $exists: true } }
        ]
    });

    if (storageWithUrl) {
        console.log('\nSample storage:');
        console.log('Name:', storageWithUrl.name);
        console.log('URL:', storageWithUrl.url);
        console.log('Price:', storageWithUrl.price);
    } else {
        console.log('No storages have Amazon URLs - they are all manually seeded data');
    }

    await client.close();
}

checkPsuUrls().catch(console.error);
