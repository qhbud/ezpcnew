require('dotenv').config();
const { MongoClient } = require('mongodb');

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const dbName = process.env.DB_NAME || 'pcbuilder';

async function finalPSUFix() {
    const client = new MongoClient(uri);

    try {
        await client.connect();
        console.log('Connected to MongoDB\n');

        const db = client.db(dbName);

        // Find items with wattage field (these are PSUs)
        const itemsWithWattage = await db.collection('cases').find({
            wattage: { $exists: true, $ne: null }
        }).toArray();

        console.log(`Found ${itemsWithWattage.length} items with wattage field (actual PSUs):\n`);

        for (const item of itemsWithWattage) {
            const name = item.name || item.title || 'Unknown';
            console.log(`- ${name} (${item.wattage}W)`);
        }

        if (itemsWithWattage.length === 0) {
            console.log('No PSUs found in cases collection!');
            return;
        }

        console.log('\n---\n');

        // Delete these PSUs from cases collection
        const deleteResult = await db.collection('cases').deleteMany({
            wattage: { $exists: true, $ne: null }
        });

        console.log(`✅ Deleted ${deleteResult.deletedCount} PSUs from cases collection\n`);

        // Add them to psus collection if not already there
        for (const psu of itemsWithWattage) {
            const existsInPSUs = await db.collection('psus').findOne({
                $or: [
                    { name: psu.name },
                    { title: psu.title }
                ]
            });

            if (existsInPSUs) {
                console.log(`⚠️ "${psu.name || psu.title}" already exists in psus collection (skipping)`);
            } else {
                await db.collection('psus').insertOne(psu);
                console.log(`✅ Added "${psu.name || psu.title}" to psus collection`);
            }
        }

        console.log('\n---\n');

        // Verify the fix
        const topCases = await db.collection('cases').find({
            currentPrice: { $gt: 0 }
        }).sort({ currentPrice: -1 }).limit(3).toArray();

        console.log('Top 3 most expensive items in cases collection (after fix):\n');
        topCases.forEach((caseItem, index) => {
            const name = caseItem.name || caseItem.title || 'Unknown';
            const price = parseFloat(caseItem.currentPrice || caseItem.price || 0);
            const hasWattage = caseItem.wattage ? ` (${caseItem.wattage}W - PSU!)` : '';
            console.log(`${index + 1}. ${name}${hasWattage} - $${price.toFixed(2)}`);
        });

        console.log('\n✅ Fix complete!');

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await client.close();
    }
}

finalPSUFix();
