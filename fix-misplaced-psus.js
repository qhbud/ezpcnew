require('dotenv').config();
const { MongoClient } = require('mongodb');

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const dbName = process.env.DB_NAME || 'pcbuilder';

async function fixMisplacedPSUs() {
    const client = new MongoClient(uri);

    try {
        await client.connect();
        console.log('Connected to MongoDB\n');

        const db = client.db(dbName);

        // Find PSUs in the cases collection
        const misplacedPSUs = await db.collection('cases').find({
            $or: [
                { name: { $regex: 'power supply', $options: 'i' } },
                { title: { $regex: 'power supply', $options: 'i' } },
                { name: { $regex: '\\bpsu\\b', $options: 'i' } },
                { title: { $regex: '\\bpsu\\b', $options: 'i' } },
                { wattage: { $exists: true } }
            ]
        }).toArray();

        console.log(`Found ${misplacedPSUs.length} PSUs in the cases collection:\n`);

        for (const psu of misplacedPSUs) {
            const name = psu.name || psu.title || 'Unknown';
            console.log(`- ${name}`);
        }

        if (misplacedPSUs.length === 0) {
            console.log('No misplaced PSUs found. Database is clean!');
            return;
        }

        console.log('\n---\n');
        console.log('Removing these PSUs from cases collection...\n');

        // Delete PSUs from cases collection
        const deleteResult = await db.collection('cases').deleteMany({
            $or: [
                { name: { $regex: 'power supply', $options: 'i' } },
                { title: { $regex: 'power supply', $options: 'i' } },
                { name: { $regex: '\\bpsu\\b', $options: 'i' } },
                { title: { $regex: '\\bpsu\\b', $options: 'i' } },
                { wattage: { $exists: true } }
            ]
        });

        console.log(`✅ Deleted ${deleteResult.deletedCount} PSUs from cases collection\n`);

        // Check if any of these PSUs are already in the psus collection
        console.log('Checking psus collection for duplicates...\n');

        for (const psu of misplacedPSUs) {
            const existsInPSUs = await db.collection('psus').findOne({
                $or: [
                    { name: psu.name },
                    { title: psu.title }
                ]
            });

            if (existsInPSUs) {
                console.log(`⚠️ "${psu.name || psu.title}" already exists in psus collection (skipping)`);
            } else {
                // Add to psus collection
                await db.collection('psus').insertOne(psu);
                console.log(`✅ Added "${psu.name || psu.title}" to psus collection`);
            }
        }

        console.log('\n---\n');

        // Verify the fix
        const remainingCases = await db.collection('cases').find({
            currentPrice: { $gt: 0 }
        }).sort({ currentPrice: -1 }).limit(5).toArray();

        console.log('Top 5 most expensive cases (after fix):\n');
        remainingCases.forEach((caseItem, index) => {
            const name = caseItem.name || caseItem.title || 'Unknown';
            const price = parseFloat(caseItem.currentPrice || caseItem.price || 0);
            console.log(`${index + 1}. ${name} - $${price.toFixed(2)}`);
        });

        console.log('\n✅ Fix complete!');

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await client.close();
    }
}

fixMisplacedPSUs();
