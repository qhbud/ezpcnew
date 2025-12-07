require('dotenv').config();
const { MongoClient } = require('mongodb');

async function removeDuplicatesByTitle() {
    const uri = process.env.MONGODB_URI;
    const client = new MongoClient(uri);

    try {
        await client.connect();
        console.log('Connected to MongoDB\n');

        const db = client.db(process.env.DB_NAME || 'pcbuilder');
        const ramCollection = db.collection('rams');

        const allRams = await ramCollection.find({}).toArray();
        console.log(`Total RAM modules: ${allRams.length}\n`);

        // Group by exact title
        const ramsByTitle = new Map();

        allRams.forEach(ram => {
            const title = (ram.title || ram.name || '').trim();

            if (!ramsByTitle.has(title)) {
                ramsByTitle.set(title, []);
            }
            ramsByTitle.get(title).push(ram);
        });

        // Find and remove duplicates
        const duplicatesToDelete = [];

        ramsByTitle.forEach((rams, title) => {
            if (rams.length > 1) {
                console.log(`Found ${rams.length} duplicates:`);
                console.log(`  Title: ${title.substring(0, 80)}...`);

                // Keep the first one, delete the rest
                const toKeep = rams[0];
                const toDelete = rams.slice(1);

                console.log(`  Keeping: ${toKeep._id}`);
                toDelete.forEach(dup => {
                    console.log(`  Deleting: ${dup._id}`);
                    duplicatesToDelete.push(dup._id);
                });
                console.log('');
            }
        });

        console.log(`Total duplicates to remove: ${duplicatesToDelete.length}`);
        console.log(`Unique RAM titles: ${ramsByTitle.size}\n`);

        if (duplicatesToDelete.length > 0) {
            const result = await ramCollection.deleteMany({
                _id: { $in: duplicatesToDelete }
            });
            console.log(`Deleted ${result.deletedCount} duplicate RAM modules`);

            const finalCount = await ramCollection.countDocuments();
            console.log(`Final RAM count: ${finalCount}`);
        } else {
            console.log('No duplicates found!');
        }

    } catch (error) {
        console.error('Error:', error);
        throw error;
    } finally {
        await client.close();
    }
}

removeDuplicatesByTitle()
    .then(() => process.exit(0))
    .catch(error => {
        console.error('Operation failed:', error);
        process.exit(1);
    });
