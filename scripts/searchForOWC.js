require('dotenv').config();
const { MongoClient } = require('mongodb');

async function searchForOWC() {
    const uri = process.env.MONGODB_URI;
    const client = new MongoClient(uri);

    try {
        await client.connect();
        console.log('Connected to MongoDB\n');

        const db = client.db(process.env.DB_NAME || 'pcbuilder');
        const ramCollection = db.collection('rams');

        // Search for any RAM with OWC in the title
        const owcRams = await ramCollection.find({
            $or: [
                { title: /owc/i },
                { name: /owc/i }
            ]
        }).toArray();

        console.log(`Total RAM modules in database: ${await ramCollection.countDocuments()}`);
        console.log(`RAM modules with "OWC" in title: ${owcRams.length}\n`);

        if (owcRams.length > 0) {
            console.log('OWC RAM modules found:');
            owcRams.forEach(ram => {
                console.log(`\nTitle: ${ram.title || ram.name}`);
                console.log(`ID: ${ram._id}`);
                console.log(`Price: $${ram.price || ram.currentPrice || ram.basePrice || 'N/A'}`);
            });
        } else {
            console.log('No RAM modules with "OWC" found in the database.');
        }

    } catch (error) {
        console.error('Error:', error);
        throw error;
    } finally {
        await client.close();
    }
}

searchForOWC()
    .then(() => process.exit(0))
    .catch(error => {
        console.error('Operation failed:', error);
        process.exit(1);
    });
