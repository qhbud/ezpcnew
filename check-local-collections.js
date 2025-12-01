require('dotenv').config();
const mongoose = require('mongoose');

async function checkLocalCollections() {
    try {
        // Connect to local MongoDB
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to local MongoDB\n');

        // Get all collections
        const collections = await mongoose.connection.db.listCollections().toArray();

        console.log('📁 Collections in local database:');
        console.log('═══════════════════════════════════════\n');

        if (collections.length === 0) {
            console.log('❌ No collections found - database is empty\n');
        } else {
            for (const col of collections) {
                const count = await mongoose.connection.db.collection(col.name).countDocuments();
                console.log(`📦 ${col.name}`);
                console.log(`   Documents: ${count.toLocaleString()}`);
                console.log('');
            }

            console.log('═══════════════════════════════════════');
            const totalDocs = await Promise.all(
                collections.map(col => mongoose.connection.db.collection(col.name).countDocuments())
            );
            const total = totalDocs.reduce((a, b) => a + b, 0);
            console.log(`📊 Total documents: ${total.toLocaleString()}`);
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await mongoose.connection.close();
    }
}

checkLocalCollections();
