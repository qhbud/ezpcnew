require('dotenv').config();
const mongoose = require('mongoose');

const gpuSchema = new mongoose.Schema({}, { strict: false, collection: 'gpus' });
const GPU = mongoose.model('GPU', gpuSchema);

async function searchRecentGPUs() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB\n');

        console.log('═══════════════════════════════════════════════════════════════════════════');
        console.log('SEARCHING FOR RECENTLY ADDED GPUs');
        console.log('═══════════════════════════════════════════════════════════════════════════\n');

        // Search for ProArt
        console.log('1. Searching for "ProArt"...\n');
        const proArtGPUs = await GPU.find({
            name: { $regex: 'ProArt', $options: 'i' }
        }).lean();

        if (proArtGPUs.length > 0) {
            console.log(`Found ${proArtGPUs.length} ProArt GPU(s):\n`);
            proArtGPUs.forEach((gpu, i) => {
                console.log(`${i + 1}. ${gpu.name}`);
                console.log(`   Price: $${gpu.price || gpu.currentPrice || 'N/A'}`);
                console.log(`   Created: ${gpu.createdAt || 'Unknown'}`);
                console.log(`   Last Price Check: ${gpu.lastPriceCheck || 'Never'}`);
                console.log(`   URL: ${gpu.sourceUrl || gpu.amazonUrl || 'N/A'}`);
                console.log('');
            });
        } else {
            console.log('No ProArt GPUs found.\n');
        }

        // Search for 4080 Super
        console.log('2. Searching for "4080 Super"...\n');
        const super4080s = await GPU.find({
            name: { $regex: '4080.*Super', $options: 'i' }
        }).lean();

        if (super4080s.length > 0) {
            console.log(`Found ${super4080s.length} RTX 4080 Super GPU(s):\n`);
            super4080s.forEach((gpu, i) => {
                console.log(`${i + 1}. ${gpu.name}`);
                console.log(`   Price: $${gpu.price || gpu.currentPrice || 'N/A'}`);
                console.log(`   Created: ${gpu.createdAt || 'Unknown'}`);
                console.log(`   Last Price Check: ${gpu.lastPriceCheck || 'Never'}`);
                console.log(`   URL: ${gpu.sourceUrl || gpu.amazonUrl || 'N/A'}`);
                console.log('');
            });
        } else {
            console.log('No 4080 Super GPUs found.\n');
        }

        // Get most recently added GPUs (last 24 hours)
        console.log('═══════════════════════════════════════════════════════════════════════════');
        console.log('3. GPUs ADDED IN LAST 7 DAYS');
        console.log('═══════════════════════════════════════════════════════════════════════════\n');

        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const recentGPUs = await GPU.find({
            createdAt: { $gte: sevenDaysAgo }
        }).sort({ createdAt: -1 }).lean();

        if (recentGPUs.length > 0) {
            console.log(`Found ${recentGPUs.length} recently added GPU(s):\n`);
            recentGPUs.forEach((gpu, i) => {
                console.log(`${i + 1}. ${gpu.name?.substring(0, 80)}...`);
                console.log(`   Price: $${gpu.price || gpu.currentPrice || 'N/A'}`);
                console.log(`   Added: ${gpu.createdAt}`);
                console.log(`   Last Price Check: ${gpu.lastPriceCheck || 'Never'}`);
                console.log(`   Update Failed: ${gpu.updateFailed || false}`);
                console.log('');
            });
        } else {
            console.log('No GPUs added in the last 7 days.\n');
        }

        // Check if there's a price update progress file
        console.log('═══════════════════════════════════════════════════════════════════════════');
        console.log('4. CHECKING PRICE UPDATE PROGRESS');
        console.log('═══════════════════════════════════════════════════════════════════════════\n');

        const fs = require('fs');
        const progressFile = './price-update-progress.json';

        if (fs.existsSync(progressFile)) {
            const progress = JSON.parse(fs.readFileSync(progressFile, 'utf8'));
            console.log('Progress file found:');
            console.log(`  Last updated: ${progress.lastUpdated || 'Unknown'}`);
            console.log(`  GPUs processed: ${progress.gpusProcessed || 0}`);
            console.log(`  Total GPUs: ${progress.totalGpus || 0}`);
            console.log('');
        } else {
            console.log('No price update progress file found.\n');
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error(error);
    } finally {
        await mongoose.connection.close();
        console.log('✅ Database connection closed');
    }
}

searchRecentGPUs();
