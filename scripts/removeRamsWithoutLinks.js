require('dotenv').config();
const { MongoClient } = require('mongodb');

async function removeRamsWithoutLinks() {
    const uri = process.env.MONGODB_URI;
    const client = new MongoClient(uri);

    try {
        await client.connect();
        console.log('Connected to MongoDB\n');

        const db = client.db(process.env.DB_NAME || 'pcbuilder');
        const ramCollection = db.collection('rams');

        const allRams = await ramCollection.find({}).toArray();
        console.log(`Total RAM modules: ${allRams.length}\n`);

        // Find RAMs without links
        const ramsWithoutLinks = allRams.filter(ram => {
            const hasLink = ram.link || ram.url || ram.productUrl;
            return !hasLink;
        });

        console.log(`RAM modules without links: ${ramsWithoutLinks.length}\n`);

        if (ramsWithoutLinks.length > 0) {
            console.log('Examples of RAM without links:');
            ramsWithoutLinks.slice(0, 5).forEach(ram => {
                console.log(`- ${(ram.title || ram.name || 'Unknown').substring(0, 80)}`);
                console.log(`  ID: ${ram._id}, Price: $${ram.price || ram.currentPrice || ram.basePrice || 'N/A'}`);
            });

            console.log('\nDeleting RAM modules without links...');

            const idsToDelete = ramsWithoutLinks.map(ram => ram._id);
            const result = await ramCollection.deleteMany({
                _id: { $in: idsToDelete }
            });

            console.log(`\nDeleted ${result.deletedCount} RAM modules without links`);

            const finalCount = await ramCollection.countDocuments();
            console.log(`Final RAM count: ${finalCount}`);
        } else {
            console.log('All RAM modules have links!');
        }

    } catch (error) {
        console.error('Error:', error);
        throw error;
    } finally {
        await client.close();
    }
}

removeRamsWithoutLinks()
    .then(() => process.exit(0))
    .catch(error => {
        console.error('Operation failed:', error);
        process.exit(1);
    });
