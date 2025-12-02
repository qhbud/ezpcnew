require('dotenv').config();
const { MongoClient } = require('mongodb');

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const dbName = process.env.DB_NAME || 'pcbuilder';

async function checkCases() {
    const client = new MongoClient(uri);

    try {
        await client.connect();
        console.log('Connected to MongoDB');

        const db = client.db(dbName);

        // Get all cases
        const cases = await db.collection('cases').find({
            currentPrice: { $gt: 0 }
        }).sort({ currentPrice: -1 }).limit(20).toArray();

        console.log(`\nFound ${cases.length} cases with prices\n`);

        // Check if any are actually PSUs
        cases.forEach((caseItem, index) => {
            const name = caseItem.name || caseItem.title || 'Unknown';
            const price = parseFloat(caseItem.currentPrice || caseItem.price || 0);

            // Check if it's actually a PSU
            const isPSU = name.toLowerCase().includes('power supply') ||
                          name.toLowerCase().includes('psu') ||
                          name.toLowerCase().includes('watt') ||
                          caseItem.wattage;

            console.log(`${index + 1}. ${isPSU ? '⚠️ PSU:' : 'Case:'} ${name}`);
            console.log(`   Price: $${price.toFixed(2)}`);
            if (caseItem.wattage) {
                console.log(`   Wattage: ${caseItem.wattage}W (THIS IS A PSU!)`);
            }
            console.log('');
        });

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await client.close();
    }
}

checkCases();
