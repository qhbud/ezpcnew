const { MongoClient } = require('mongodb');
require('dotenv').config();

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/pcparts';

async function checkPopularityScores() {
    const client = new MongoClient(uri);

    try {
        await client.connect();
        console.log('Connected to MongoDB');

        const db = client.db();

        // Get all collections
        const collections = await db.listCollections().toArray();

        console.log('\n=== Popularity Score Check ===\n');

        let totalComponentsWithSaves = 0;
        let totalComponents = 0;

        for (const collInfo of collections) {
            const collectionName = collInfo.name;

            // Skip system collections
            if (collectionName.startsWith('system.')) continue;

            const collection = db.collection(collectionName);

            // Count total documents
            const total = await collection.countDocuments();

            // Count documents with saveCount > 0
            const withSaves = await collection.countDocuments({ saveCount: { $gt: 0 } });

            // Get top 5 most saved components
            const topSaved = await collection
                .find({ saveCount: { $gt: 0 } })
                .sort({ saveCount: -1 })
                .limit(5)
                .toArray();

            if (total > 0) {
                totalComponents += total;
                totalComponentsWithSaves += withSaves;

                console.log(`📦 ${collectionName}`);
                console.log(`   Total: ${total}`);
                console.log(`   With saves: ${withSaves} (${((withSaves/total)*100).toFixed(1)}%)`);

                if (topSaved.length > 0) {
                    console.log(`   Top saved:`);
                    topSaved.forEach((comp, idx) => {
                        const name = comp.title || comp.name || 'Unknown';
                        console.log(`     ${idx + 1}. ${name.substring(0, 60)} - ${comp.saveCount} saves`);
                    });
                }
                console.log('');
            }
        }

        console.log('\n=== Summary ===');
        console.log(`Total components: ${totalComponents}`);
        console.log(`Components with saves: ${totalComponentsWithSaves} (${((totalComponentsWithSaves/totalComponents)*100).toFixed(2)}%)`);
        console.log(`Components with 0 saves: ${totalComponents - totalComponentsWithSaves}`);

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await client.close();
    }
}

checkPopularityScores();
