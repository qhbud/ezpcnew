const { MongoClient } = require('mongodb');
require('dotenv').config();

const uri = process.env.MONGODB_URI;

async function findItems() {
    const client = new MongoClient(uri);

    try {
        await client.connect();
        console.log('Connected to MongoDB');

        const db = client.db('pcpartpicker');

        // Search for Sirlyr
        console.log('\n=== Searching for Sirlyr ===');
        const sirlyr = await db.collection('cases').find({ name: /Sirlyr/i }).toArray();
        console.log(`Found ${sirlyr.length} matches:`);
        sirlyr.forEach(item => console.log(`  - ${item.name} | ${item.brand} | $${item.price}`));

        // Search for GM100
        console.log('\n=== Searching for GM100 ===');
        const gm100 = await db.collection('cases').find({ name: /GM100/i }).toArray();
        console.log(`Found ${gm100.length} matches:`);
        gm100.forEach(item => console.log(`  - ${item.name} | ${item.brand} | $${item.price}`));

        // Search for Seagate Exos 24TB
        console.log('\n=== Searching for Seagate 24TB ===');
        const seagate24 = await db.collection('storage').find({ name: /24TB|ST24000/i }).toArray();
        console.log(`Found ${seagate24.length} matches:`);
        seagate24.forEach(item => console.log(`  - ${item.name} | ${item.capacity} | $${item.price}`));

        // Search for WD_BLACK SN8100
        console.log('\n=== Searching for WD_BLACK SN8100 ===');
        const wdblack = await db.collection('storage').find({ name: /SN8100/i }).toArray();
        console.log(`Found ${wdblack.length} matches:`);
        wdblack.forEach(item => console.log(`  - ${item.name} | ${item.capacity} | $${item.price}`));

        // Search for Seagate 22TB
        console.log('\n=== Searching for Seagate 22TB ===');
        const seagate22 = await db.collection('storage').find({ name: /22TB|ST22000/i }).toArray();
        console.log(`Found ${seagate22.length} matches:`);
        seagate22.forEach(item => console.log(`  - ${item.name} | ${item.capacity} | $${item.price}`));

        // Search for Silicon Power US75
        console.log('\n=== Searching for Silicon Power US75 ===');
        const sp = await db.collection('storage').find({ name: /US75|SP04KGBP44US7505/i }).toArray();
        console.log(`Found ${sp.length} matches:`);
        sp.forEach(item => console.log(`  - ${item.name} | ${item.capacity} | $${item.price}`));

        // Search for Kingston Fury Renegade G5
        console.log('\n=== Searching for Kingston Fury Renegade G5 ===');
        const kingston = await db.collection('storage').find({ name: /Renegade G5|SFYR2S/i }).toArray();
        console.log(`Found ${kingston.length} matches:`);
        kingston.forEach(item => console.log(`  - ${item.name} | ${item.capacity} | $${item.price}`));

        // Search for Toshiba PS3/PS4
        console.log('\n=== Searching for Toshiba PS3/PS4 ===');
        const toshiba = await db.collection('storage').find({
            $and: [
                { $or: [{ brand: /toshiba/i }, { name: /toshiba/i }] },
                { name: /PS3|PS4/i }
            ]
        }).toArray();
        console.log(`Found ${toshiba.length} matches:`);
        toshiba.forEach(item => console.log(`  - ${item.name} | ${item.brand} | ${item.capacity} | $${item.price}`));

        // Search for MaxDigitalData
        console.log('\n=== Searching for MaxDigitalData ===');
        const maxdigital = await db.collection('storage').find({ name: /MaxDigitalData/i }).toArray();
        console.log(`Found ${maxdigital.length} matches:`);
        maxdigital.forEach(item => console.log(`  - ${item.name} | ${item.brand} | ${item.capacity} | $${item.price}`));

    } catch (error) {
        console.error('Error searching database:', error);
    } finally {
        await client.close();
        console.log('\n\nDatabase connection closed');
    }
}

findItems();
