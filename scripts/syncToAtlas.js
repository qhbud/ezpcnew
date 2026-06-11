const { MongoClient } = require('mongodb');

const LOCAL_URI = 'mongodb://localhost:27017/pcbuilder';
const ATLAS_URI = 'mongodb+srv://easypcworlddev_db_user:2gD9bDhq9s09A4pd@cluster0.agetgnb.mongodb.net/pcbuilder?appName=Cluster0';
const DB_NAME = 'pcbuilder';
const BATCH_SIZE = 500;

async function syncToAtlas() {
    const localClient = new MongoClient(LOCAL_URI);
    const atlasClient = new MongoClient(ATLAS_URI);

    try {
        console.log('Connecting to local MongoDB...');
        await localClient.connect();
        const localDb = localClient.db(DB_NAME);

        console.log('Connecting to MongoDB Atlas...');
        await atlasClient.connect();
        const atlasDb = atlasClient.db(DB_NAME);

        const collections = await localDb.listCollections().toArray();
        console.log(`\nFound ${collections.length} collections to sync:\n`);
        collections.forEach(c => console.log(`  - ${c.name}`));
        console.log('');

        for (const { name } of collections) {
            const localCol = localDb.collection(name);
            const atlasCol = atlasDb.collection(name);

            const totalDocs = await localCol.countDocuments();
            if (totalDocs === 0) {
                console.log(`Skipping ${name} (empty)`);
                continue;
            }

            console.log(`Syncing ${name} (${totalDocs} documents)...`);

            // Drop and recreate on Atlas
            await atlasCol.drop().catch(() => {}); // ignore if doesn't exist

            // Stream in batches
            let synced = 0;
            const cursor = localCol.find({});
            let batch = [];

            for await (const doc of cursor) {
                batch.push(doc);
                if (batch.length === BATCH_SIZE) {
                    await atlasCol.insertMany(batch, { ordered: false });
                    synced += batch.length;
                    process.stdout.write(`\r  ${synced}/${totalDocs}`);
                    batch = [];
                }
            }
            if (batch.length > 0) {
                await atlasCol.insertMany(batch, { ordered: false });
                synced += batch.length;
            }

            console.log(`\r  ${synced}/${totalDocs} - done`);
        }

        console.log('\nSync complete!');

    } catch (err) {
        console.error('Sync failed:', err.message);
        process.exit(1);
    } finally {
        await localClient.close();
        await atlasClient.close();
    }
}

syncToAtlas();
