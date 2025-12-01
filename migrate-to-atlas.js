const mongoose = require('mongoose');
const { MongoClient } = require('mongodb');

// Connection strings
const LOCAL_URI = 'mongodb://localhost:27017/pcbuilder';
const ATLAS_URI = 'mongodb+srv://easypcworlddev_db_user:***REMOVED***@cluster0.agetgnb.mongodb.net/pcbuilder?appName=Cluster0';

async function migrateData() {
    console.log('🚀 Starting data migration from Local MongoDB to Atlas...\n');
    console.log('═══════════════════════════════════════════════════════════\n');

    let localClient, atlasClient;

    try {
        // Connect to both databases
        console.log('🔌 Connecting to local MongoDB...');
        localClient = await MongoClient.connect(LOCAL_URI);
        const localDb = localClient.db('pcbuilder');
        console.log('✅ Connected to local MongoDB\n');

        console.log('🔌 Connecting to MongoDB Atlas...');
        atlasClient = await MongoClient.connect(ATLAS_URI);
        const atlasDb = atlasClient.db('pcbuilder');
        console.log('✅ Connected to MongoDB Atlas\n');

        // Get all collections from local
        const collections = await localDb.listCollections().toArray();
        console.log(`📦 Found ${collections.length} collections to migrate\n`);

        let totalDocsMigrated = 0;
        let successCount = 0;
        let errorCount = 0;

        // Migrate each collection
        for (const collectionInfo of collections) {
            const collectionName = collectionInfo.name;

            try {
                console.log(`📁 Migrating collection: ${collectionName}`);

                // Get all documents from local collection
                const localCollection = localDb.collection(collectionName);
                const documents = await localCollection.find({}).toArray();

                if (documents.length === 0) {
                    console.log(`   ⚠️  Empty collection - skipping`);
                    console.log('');
                    continue;
                }

                // Insert into Atlas collection
                const atlasCollection = atlasDb.collection(collectionName);

                // Delete existing documents in Atlas (if any) to avoid duplicates
                await atlasCollection.deleteMany({});

                // Insert all documents
                const result = await atlasCollection.insertMany(documents);

                console.log(`   ✅ Migrated ${result.insertedCount} documents`);
                console.log('');

                totalDocsMigrated += result.insertedCount;
                successCount++;

            } catch (error) {
                console.error(`   ❌ Error migrating ${collectionName}:`, error.message);
                console.log('');
                errorCount++;
            }
        }

        console.log('═══════════════════════════════════════════════════════════');
        console.log('\n📊 Migration Summary:');
        console.log(`   ✅ Collections migrated: ${successCount}`);
        console.log(`   ❌ Collections failed: ${errorCount}`);
        console.log(`   📄 Total documents migrated: ${totalDocsMigrated.toLocaleString()}`);
        console.log('\n🎉 Migration complete!\n');

    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        console.error(error);
    } finally {
        // Close connections
        if (localClient) {
            await localClient.close();
            console.log('🔌 Local connection closed');
        }
        if (atlasClient) {
            await atlasClient.close();
            console.log('🔌 Atlas connection closed');
        }
    }
}

migrateData();
