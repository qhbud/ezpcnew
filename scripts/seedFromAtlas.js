const { MongoClient } = require('mongodb');
require('dotenv').config({ path: '.env.atlas' });

const ATLAS_URI = process.env.ATLAS_URI;
if (!ATLAS_URI) {
    console.error('Error: ATLAS_URI not set. Add it to .env.atlas');
    process.exit(1);
}

const LOCAL_URI = process.env.LOCAL_URI || 'mongodb://localhost:27017/pcbuilder';
const DB_NAME = 'pcbuilder';
const BATCH_SIZE = 500;

async function seedFromAtlas() {
    const atlasClient = new MongoClient(ATLAS_URI);
    const localClient = new MongoClient(LOCAL_URI);

    try {
        console.log('Connecting to MongoDB Atlas...');
        await atlasClient.connect();
        const atlasDb = atlasClient.db(DB_NAME);

        console.log('Connecting to local MongoDB...');
        await localClient.connect();
        const localDb = localClient.db(DB_NAME);

        const collections = await atlasDb.listCollections().toArray();
        console.log(`\nFound ${collections.length} collections to seed:\n`);
        collections.forEach(c => console.log(`  - ${c.name}`));
        console.log('');

        for (const { name } of collections) {
            const atlasCol = atlasDb.collection(name);
            const localCol = localDb.collection(name);

            const totalDocs = await atlasCol.countDocuments();
            if (totalDocs === 0) {
                console.log(`Skipping ${name} (empty)`);
                continue;
            }

            console.log(`Seeding ${name} (${totalDocs} documents)...`);

            // Drop and recreate locally
            await localCol.drop().catch(() => {});

            let seeded = 0;
            const cursor = atlasCol.find({});
            let batch = [];

            for await (const doc of cursor) {
                batch.push(doc);
                if (batch.length === BATCH_SIZE) {
                    await localCol.insertMany(batch, { ordered: false });
                    seeded += batch.length;
                    process.stdout.write(`\r  ${seeded}/${totalDocs}`);
                    batch = [];
                }
            }
            if (batch.length > 0) {
                await localCol.insertMany(batch, { ordered: false });
                seeded += batch.length;
            }

            console.log(`\r  ${seeded}/${totalDocs} - done`);
        }

        console.log('\nSeed complete! Your local database is ready.');

    } catch (err) {
        console.error('Seed failed:', err.message);
        process.exit(1);
    } finally {
        await atlasClient.close();
        await localClient.close();
    }
}

seedFromAtlas();
