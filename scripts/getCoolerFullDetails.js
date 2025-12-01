const { MongoClient } = require('mongodb');

async function getCoolerFullDetails() {
    const client = await MongoClient.connect('mongodb://localhost:27017');
    const db = client.db('pcbuilder');

    try {
        const cooler = await db.collection('coolers').findOne({
            name: /ID-COOLING.*Blitz X4/i
        });

        if (!cooler) {
            console.log('❌ Cooler not found');
            return;
        }

        console.log('Full Cooler Document:');
        console.log(JSON.stringify(cooler, null, 2));

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await client.close();
    }
}

getCoolerFullDetails();
