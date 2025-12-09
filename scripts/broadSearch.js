const { MongoClient } = require('mongodb');
const fs = require('fs');
const path = require('path');

// Read .env.atlas file
const envPath = path.join(__dirname, '..', '.env.atlas');
const envContent = fs.readFileSync(envPath, 'utf8');
const envLines = envContent.split('\n');
let uri = '';

for (const line of envLines) {
    if (line.startsWith('MONGODB_URI=')) {
        uri = line.substring('MONGODB_URI='.length).trim();
        break;
    }
}

async function broadSearch() {
    const client = new MongoClient(uri);

    try {
        await client.connect();
        console.log('Connected to Production MongoDB\n');

        const db = client.db('pcpartpicker');

        // Get collection count
        const storageCount = await db.collection('storage').countDocuments();
        const caseCount = await db.collection('cases').countDocuments();
        console.log(`Storage items: ${storageCount}`);
        console.log(`Case items: ${caseCount}\n`);

        // Search for any Sirlyr
        console.log('=== Searching for ANY Sirlyr ===');
        const sirlyr = await db.collection('cases').find({ $or: [
            { name: /sirlyr/i },
            { brand: /sirlyr/i }
        ]}).toArray();
        console.log(`Found ${sirlyr.length} matches`);
        sirlyr.forEach(item => console.log(`  ${item.name}`));

        // Search for ANY GM100
        console.log('\n=== Searching for ANY GM100 ===');
        const gm = await db.collection('cases').find({ name: /gm100/i }).toArray();
        console.log(`Found ${gm.length} matches`);
        gm.forEach(item => console.log(`  ${item.name}`));

        // Search for ANY 24TB storage
        console.log('\n=== Searching for ANY 24TB ===');
        const storage24 = await db.collection('storage').find({
            $or: [
                { capacity: /24/i },
                { name: /24.*tb|24000/i }
            ]
        }).toArray();
        console.log(`Found ${storage24.length} matches`);
        storage24.slice(0, 10).forEach(item => console.log(`  ${item.name} | ${item.capacity} | $${item.price}`));

        // Search for WD Black
        console.log('\n=== Searching for WD Black (first 10) ===');
        const wdblack = await db.collection('storage').find({
            $or: [
                { brand: /wd.*black/i },
                { name: /wd.*black/i },
                { name: /WD_BLACK/i }
            ]
        }).limit(10).toArray();
        console.log(`Found ${wdblack.length} matches`);
        wdblack.forEach(item => console.log(`  ${item.name} | ${item.capacity} | $${item.price}`));

        // Search for 22TB
        console.log('\n=== Searching for ANY 22TB ===');
        const storage22 = await db.collection('storage').find({
            $or: [
                { capacity: /22/i },
                { name: /22.*tb|22000/i }
            ]
        }).toArray();
        console.log(`Found ${storage22.length} matches`);
        storage22.slice(0, 10).forEach(item => console.log(`  ${item.name} | ${item.capacity} | $${item.price}`));

        // Search for Silicon Power
        console.log('\n=== Searching for Silicon Power ===');
        const sp = await db.collection('storage').find({
            $or: [
                { brand: /silicon.*power/i },
                { name: /silicon.*power/i }
            ]
        }).limit(10).toArray();
        console.log(`Found ${sp.length} matches`);
        sp.forEach(item => console.log(`  ${item.name} | ${item.capacity} | $${item.price}`));

        // Search for Kingston
        console.log('\n=== Searching for Kingston Fury ===');
        const kingston = await db.collection('storage').find({
            $or: [
                { brand: /kingston/i },
                { name: /kingston.*fury/i }
            ]
        }).limit(10).toArray();
        console.log(`Found ${kingston.length} matches`);
        kingston.forEach(item => console.log(`  ${item.name} | ${item.capacity} | $${item.price}`));

        // Search for Toshiba
        console.log('\n=== Searching for Toshiba ===');
        const toshiba = await db.collection('storage').find({
            $or: [
                { brand: /toshiba/i },
                { name: /toshiba/i }
            ]
        }).limit(10).toArray();
        console.log(`Found ${toshiba.length} matches`);
        toshiba.forEach(item => console.log(`  ${item.name} | ${item.capacity} | $${item.price}`));

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await client.close();
        console.log('\nDatabase connection closed');
    }
}

broadSearch();
