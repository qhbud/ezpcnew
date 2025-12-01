require('dotenv').config();
const mongoose = require('mongoose');

async function check4080SuperCollection() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB\n');

        const db = mongoose.connection.db;
        const collection = db.collection('gpus_rtx_4080_super');

        const gpus = await collection.find({}).toArray();

        console.log('═══════════════════════════════════════════════════════════════════════════');
        console.log(`RTX 4080 SUPER COLLECTION (${gpus.length} GPUs)`);
        console.log('═══════════════════════════════════════════════════════════════════════════\n');

        gpus.forEach((gpu, i) => {
            console.log(`${i + 1}. ${gpu.name || gpu.title}`);
            console.log(`   Price: $${gpu.price || gpu.currentPrice || 'NULL'}`);
            console.log(`   Base Price: $${gpu.basePrice || 'N/A'}`);
            console.log(`   Sale Price: $${gpu.salePrice || 'N/A'}`);
            console.log(`   Is Available: ${gpu.isAvailable !== false ? 'Yes' : 'No'}`);
            console.log(`   Last Price Check: ${gpu.lastPriceCheck || 'Never'}`);
            console.log(`   Created: ${gpu.createdAt || 'Unknown'}`);
            console.log(`   URL: ${gpu.sourceUrl || gpu.amazonUrl || 'N/A'}`);
            console.log('');
        });

        // Check for the ASUS ProArt specifically
        console.log('═══════════════════════════════════════════════════════════════════════════');
        console.log('SEARCHING FOR ASUS ProArt');
        console.log('═══════════════════════════════════════════════════════════════════════════\n');

        const proArt = gpus.filter(gpu =>
            (gpu.name || gpu.title || '').toLowerCase().includes('proart')
        );

        if (proArt.length > 0) {
            console.log(`✅ Found ${proArt.length} ProArt GPU(s):\n`);
            proArt.forEach((gpu, i) => {
                console.log(`${i + 1}. ${gpu.name || gpu.title}`);
                console.log(`   Price: $${gpu.price || gpu.currentPrice || 'NULL'}`);
                console.log(`   Created: ${gpu.createdAt}`);
                console.log('');
            });
        } else {
            console.log('❌ No ProArt RTX 4080 Super found in this collection\n');
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await mongoose.connection.close();
        console.log('✅ Database connection closed');
    }
}

check4080SuperCollection();
