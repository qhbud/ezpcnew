const { MongoClient, ObjectId } = require('mongodb');
require('dotenv').config();

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/pcparts';

// Helper functions from server.js
function isDesktopOrLaptop(title) {
    const lowerTitle = title.toLowerCase();
    return (
        lowerTitle.includes('gaming desktop') ||
        lowerTitle.includes('gaming pc') ||
        lowerTitle.includes(' pc ') ||
        lowerTitle.includes('desktop computer') ||
        lowerTitle.includes('desktop pc') ||
        lowerTitle.includes('gaming laptop') ||
        lowerTitle.includes('laptop') ||
        lowerTitle.includes('notebook') ||
        lowerTitle.includes('prebuilt') ||
        lowerTitle.includes('pre-built') ||
        lowerTitle.includes('workstation')
    );
}

function hasValidPrice(component) {
    const price = parseFloat(component.currentPrice || component.price);
    return !isNaN(price) && price > 0;
}

// Component IDs from the error logs
const failingComponents = [
    { type: 'gpu', id: '68bd0c542b16d7dcff922898', collection: 'gpus_rtx_3080_ti' },
    { type: 'cpu', id: '68f9aa02873a1cd5d7b52cd0', collection: 'cpus_amd_ryzen_9' },
    { type: 'motherboard', id: '68c27e6bf98ae41bd1703611', collection: 'motherboards' },
    { type: 'ram', id: '69082e31e05902f2be41108d', collection: 'rams' },
    { type: 'cooler', id: '68c32f075c4ed61c66a00ec0', collection: 'coolers' },
    { type: 'psu', id: '68c22be4cd32f76f9aa4aecc', collection: 'psus' },
    { type: 'storage', id: '6911660f97fb0dacc1810d81', collection: 'storages' },
    { type: 'case', id: '6921692b26218241f91ec2ee', collection: 'cases' }
];

async function checkComponents() {
    const client = new MongoClient(uri);

    try {
        await client.connect();
        console.log('Connected to MongoDB\n');

        const db = client.db();

        for (const comp of failingComponents) {
            console.log(`\n🔍 Checking ${comp.type}: ${comp.id}`);

            const objectId = new ObjectId(comp.id);
            const collection = db.collection(comp.collection);
            const doc = await collection.findOne({ _id: objectId });

            if (doc) {
                const title = doc.title || doc.name || '';
                const price = doc.currentPrice || doc.price;

                console.log(`   Title: ${title}`);
                console.log(`   Price: ${price}`);
                console.log(`   Is Desktop/Laptop: ${isDesktopOrLaptop(title)}`);
                console.log(`   Has Valid Price: ${hasValidPrice(doc)}`);

                const wouldBeFiltered = isDesktopOrLaptop(title) || !hasValidPrice(doc);
                if (wouldBeFiltered) {
                    console.log(`   ❌ WOULD BE FILTERED OUT BY API`);
                    if (isDesktopOrLaptop(title)) {
                        console.log(`      Reason: Desktop/Laptop filter`);
                    }
                    if (!hasValidPrice(doc)) {
                        console.log(`      Reason: Invalid price`);
                    }
                } else {
                    console.log(`   ✅ Would pass API filters`);
                }
            } else {
                console.log(`   ❌ Not found in ${comp.collection}`);
            }
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await client.close();
    }
}

checkComponents();
