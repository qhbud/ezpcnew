const mongoose = require('mongoose');

// MongoDB Atlas connection string — read from the environment, never hardcoded.
require('dotenv').config({ path: require('path').join(__dirname, '.env.atlas') });
const ATLAS_URI = process.env.MONGODB_URI;
if (!ATLAS_URI) { console.error('MONGODB_URI is not set (put it in .env.atlas or the environment).'); process.exit(1); }

async function verifyAtlasData() {
    console.log('🔍 Verifying data in MongoDB Atlas...\n');
    console.log('═══════════════════════════════════════════════════════════\n');

    try {
        // Connect to Atlas
        await mongoose.connect(ATLAS_URI);
        console.log('✅ Connected to MongoDB Atlas\n');

        // Get all collections
        const collections = await mongoose.connection.db.listCollections().toArray();

        console.log(`📦 Collections in Atlas: ${collections.length}\n`);

        let totalDocs = 0;
        const importantCollections = ['cpus', 'gpus', 'motherboards', 'rams', 'psus', 'coolers', 'cases', 'storages', 'addons'];

        // Check important collections
        console.log('📊 Main Collections:\n');
        for (const collectionName of importantCollections) {
            const collection = mongoose.connection.db.collection(collectionName);
            const count = await collection.countDocuments();

            if (count > 0) {
                console.log(`   ✅ ${collectionName.padEnd(15)} ${count.toLocaleString().padStart(6)} documents`);
                totalDocs += count;

                // Show a sample document
                const sample = await collection.findOne({});
                if (sample && sample.name) {
                    console.log(`      Example: ${sample.name.substring(0, 50)}${sample.name.length > 50 ? '...' : ''}`);
                }
            } else {
                console.log(`   ⚠️  ${collectionName.padEnd(15)} 0 documents (empty)`);
            }
            console.log('');
        }

        // Count GPU subcollections
        console.log('🎮 GPU Subcollections:\n');
        const gpuCollections = collections.filter(c => c.name.startsWith('gpus_'));
        let gpuDocsTotal = 0;

        for (const col of gpuCollections) {
            const count = await mongoose.connection.db.collection(col.name).countDocuments();
            if (count > 0) {
                console.log(`   ${col.name.padEnd(25)} ${count} documents`);
                gpuDocsTotal += count;
            }
        }

        console.log(`\n   Total GPU documents: ${gpuDocsTotal}\n`);

        // Count CPU subcollections
        console.log('💻 CPU Subcollections:\n');
        const cpuCollections = collections.filter(c => c.name.startsWith('cpus_'));
        let cpuDocsTotal = 0;

        for (const col of cpuCollections) {
            const count = await mongoose.connection.db.collection(col.name).countDocuments();
            if (count > 0) {
                console.log(`   ${col.name.padEnd(25)} ${count} documents`);
                cpuDocsTotal += count;
            }
        }

        console.log(`\n   Total CPU documents: ${cpuDocsTotal}\n`);

        console.log('═══════════════════════════════════════════════════════════');
        console.log(`\n📊 Total documents in all collections: ${totalDocs + gpuDocsTotal + cpuDocsTotal}`);
        console.log('\n🎉 Atlas database is populated and ready!\n');

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await mongoose.connection.close();
        console.log('🔌 Connection closed\n');
    }
}

verifyAtlasData();
