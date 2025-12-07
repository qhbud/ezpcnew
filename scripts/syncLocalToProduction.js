require('dotenv').config();
const { MongoClient } = require('mongodb');

async function syncLocalToProduction() {
    // Local connection
    const localUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/pcbuilder';
    const localClient = new MongoClient(localUri);

    // Production connection
    const prodEnv = require('dotenv').config({ path: '.env.atlas' });
    const prodUri = prodEnv.parsed.MONGODB_URI;
    const prodClient = new MongoClient(prodUri);

    try {
        // Connect to both databases
        await localClient.connect();
        console.log('✅ Connected to local MongoDB\n');

        await prodClient.connect();
        console.log('✅ Connected to production MongoDB Atlas\n');

        const localDb = localClient.db('pcbuilder');
        const prodDb = prodClient.db('pcbuilder');

        // Get all collection names from local database
        const collections = await localDb.listCollections().toArray();
        const collectionNames = collections.map(c => c.name);

        console.log(`📦 Found ${collectionNames.length} collections in local database:`);
        collectionNames.forEach(name => console.log(`   - ${name}`));
        console.log('');

        // Sync each collection
        for (const collectionName of collectionNames) {
            console.log(`\n${'='.repeat(60)}`);
            console.log(`📊 Syncing collection: ${collectionName}`);
            console.log('='.repeat(60));

            const localCollection = localDb.collection(collectionName);
            const prodCollection = prodDb.collection(collectionName);

            // Get all documents from local
            const localDocs = await localCollection.find({}).toArray();
            console.log(`📥 Found ${localDocs.length} documents in local ${collectionName}`);

            if (localDocs.length === 0) {
                console.log(`⚠️  Skipping empty collection: ${collectionName}`);
                continue;
            }

            // Show sample
            console.log(`Sample from ${collectionName}:`);
            localDocs.slice(0, 3).forEach(doc => {
                const displayText = doc.title || doc.name || doc.model || doc._id?.toString() || 'Unknown';
                console.log(`  - ${displayText.toString().substring(0, 60)}`);
            });

            // Clear production collection
            const deleteResult = await prodCollection.deleteMany({});
            console.log(`🗑️  Deleted ${deleteResult.deletedCount} documents from production ${collectionName}`);

            // Remove _id to let MongoDB generate new ones
            const docsToInsert = localDocs.map(doc => {
                const { _id, ...docWithoutId } = doc;
                return docWithoutId;
            });

            // Insert into production
            const insertResult = await prodCollection.insertMany(docsToInsert);
            console.log(`✅ Inserted ${insertResult.insertedCount} documents into production ${collectionName}`);

            // Verify
            const prodCount = await prodCollection.countDocuments();
            if (prodCount === localDocs.length) {
                console.log(`✅ Verified: ${prodCount} documents in production`);
            } else {
                console.log(`⚠️  Warning: Expected ${localDocs.length}, found ${prodCount}`);
            }
        }

        console.log(`\n${'='.repeat(60)}`);
        console.log('📊 FINAL SUMMARY');
        console.log('='.repeat(60));

        // Final verification for all collections
        for (const collectionName of collectionNames) {
            const localCount = await localDb.collection(collectionName).countDocuments();
            const prodCount = await prodDb.collection(collectionName).countDocuments();
            const status = localCount === prodCount ? '✅' : '⚠️';
            console.log(`${status} ${collectionName}: Local=${localCount}, Production=${prodCount}`);
        }

        console.log('\n✅ Successfully synchronized all collections to production!');

    } catch (error) {
        console.error('❌ Error:', error);
        throw error;
    } finally {
        await localClient.close();
        await prodClient.close();
        console.log('\n✅ Database connections closed');
    }
}

// Check if --confirm flag is present
if (process.argv.includes('--confirm')) {
    syncLocalToProduction()
        .then(() => process.exit(0))
        .catch(error => {
            console.error('Operation failed:', error);
            process.exit(1);
        });
} else {
    console.log('⚠️  WARNING: This will REPLACE ALL DATA in the PRODUCTION database!');
    console.log('');
    console.log('This script will:');
    console.log('1. Export ALL collections from your local MongoDB');
    console.log('2. DELETE all data in the production MongoDB Atlas database');
    console.log('3. Import your local data to production');
    console.log('');
    console.log('Collections that will be synced:');
    console.log('  - cpus, gpus, rams, motherboards, storages, psus, cases, coolers, etc.');
    console.log('');
    console.log('To proceed, run this script with the --confirm flag:');
    console.log('  node scripts/syncLocalToProduction.js --confirm');
    process.exit(0);
}
