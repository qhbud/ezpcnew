const { MongoClient } = require('mongodb');

const uri = 'mongodb://localhost:27017';

async function listDatabases() {
    const client = new MongoClient(uri);

    try {
        await client.connect();
        console.log('Connected to MongoDB');

        // List all databases
        const adminDb = client.db().admin();
        const dbs = await adminDb.listDatabases();

        console.log('\n=== Available Databases ===');
        dbs.databases.forEach(db => {
            console.log(`  - ${db.name} (${(db.sizeOnDisk / 1024 / 1024).toFixed(2)} MB)`);
        });

        // Check each database for collections
        for (const dbInfo of dbs.databases) {
            if (dbInfo.name === 'admin' || dbInfo.name === 'config' || dbInfo.name === 'local') {
                continue;
            }

            const db = client.db(dbInfo.name);
            const collections = await db.listCollections().toArray();

            console.log(`\n=== Collections in ${dbInfo.name} ===`);
            for (const col of collections) {
                const count = await db.collection(col.name).countDocuments();
                console.log(`  - ${col.name}: ${count} documents`);
            }
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await client.close();
        console.log('\n\nDatabase connection closed');
    }
}

listDatabases();
