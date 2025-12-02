require('dotenv').config();
const { MongoClient } = require('mongodb');

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const dbName = process.env.DB_NAME || 'pcbuilder';

async function fixOnlyActualPSUs() {
    const client = new MongoClient(uri);

    try {
        await client.connect();
        console.log('Connected to MongoDB\n');

        const db = client.db(dbName);

        // Find items that are ACTUAL PSUs (not just mentions of PSU compatibility)
        const actualPSUs = await db.collection('cases').find({
            $or: [
                // Items with "Power Supply" in the name/title
                { name: { $regex: '^.*Power Supply', $options: 'i' } },
                { title: { $regex: '^.*Power Supply', $options: 'i' } },
                // CORSAIR HX1500i specifically (the one causing the bug)
                { name: { $regex: 'CORSAIR HX1500i', $options: 'i' } },
                { title: { $regex: 'CORSAIR HX1500i', $options: 'i' } }
            ]
        }).toArray();

        console.log(`Found ${actualPSUs.length} ACTUAL PSUs (not cases) in the cases collection:\n`);

        for (const psu of actualPSUs) {
            const name = psu.name || psu.title || 'Unknown';
            console.log(`- ${name}`);
        }

        if (actualPSUs.length === 0) {
            console.log('No actual PSUs found. Moving back misclassified cases...\n');

            // Move back the cases that were wrongly classified
            const wronglyMoved = await db.collection('psus').find({
                $or: [
                    { name: { $regex: 'Case', $options: 'i' } },
                    { title: { $regex: 'Case', $options: 'i' } },
                    { name: { $regex: 'Cooler Master NR200', $options: 'i' } },
                    { title: { $regex: 'Cooler Master NR200', $options: 'i' } },
                    { name: { $regex: 'Lian Li A3', $options: 'i' } },
                    { title: { $regex: 'Lian Li A3', $options: 'i' } },
                    { name: { $regex: 'JONSBO', $options: 'i' } },
                    { title: { $regex: 'JONSBO', $options: 'i' } }
                ]
            }).toArray();

            console.log(`Found ${wronglyMoved.length} cases that were wrongly moved to psus collection\n`);

            for (const caseItem of wronglyMoved) {
                const name = caseItem.name || caseItem.title;

                // Check if already exists in cases
                const existsInCases = await db.collection('cases').findOne({
                    $or: [
                        { name: name },
                        { title: name }
                    ]
                });

                if (!existsInCases) {
                    await db.collection('cases').insertOne(caseItem);
                    await db.collection('psus').deleteOne({ _id: caseItem._id });
                    console.log(`✅ Moved back: ${name}`);
                } else {
                    await db.collection('psus').deleteOne({ _id: caseItem._id });
                    console.log(`⚠️ Deleted duplicate from psus: ${name}`);
                }
            }

            return;
        }

        console.log('\n---\n');
        console.log('These are ACTUAL power supplies that should be removed from cases:\n');

        for (const psu of actualPSUs) {
            const name = psu.name || psu.title || 'Unknown';
            const isRealPSU = name.includes('Power Supply') || name.includes('CORSAIR HX') || name.includes('Sirlyr RGB LED');
            console.log(`${isRealPSU ? '✅ PSU:' : '⚠️ CASE:'} ${name}`);
        }

        console.log('\n✅ Fix complete - Ready to remove actual PSUs from cases collection');

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await client.close();
    }
}

fixOnlyActualPSUs();
