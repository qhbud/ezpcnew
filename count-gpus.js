require('dotenv').config();
const mongoose = require('mongoose');

const gpuSchema = new mongoose.Schema({}, { strict: false, collection: 'gpus' });
const GPU = mongoose.model('GPU', gpuSchema);

async function countGPUs() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB\n');

        const totalGPUs = await GPU.countDocuments({});
        console.log(`Total GPUs in database: ${totalGPUs}\n`);

        if (totalGPUs > 0) {
            // Get a few sample GPUs
            const sampleGPUs = await GPU.find({}).limit(5).lean();
            console.log('Sample GPUs:\n');
            sampleGPUs.forEach((gpu, i) => {
                console.log(`${i + 1}. ${gpu.name?.substring(0, 80)}...`);
                console.log(`   Price: $${gpu.price || gpu.currentPrice || 'N/A'}`);
                console.log('');
            });

            // Get most recently modified
            const recent = await GPU.find({}).sort({ updatedAt: -1 }).limit(5).lean();
            console.log('═══════════════════════════════════════════════════════════════════════════');
            console.log('Most Recently Updated GPUs:');
            console.log('═══════════════════════════════════════════════════════════════════════════\n');
            recent.forEach((gpu, i) => {
                console.log(`${i + 1}. ${gpu.name?.substring(0, 80)}...`);
                console.log(`   Updated: ${gpu.updatedAt || 'Unknown'}`);
                console.log(`   Price: $${gpu.price || gpu.currentPrice || 'N/A'}`);
                console.log('');
            });
        } else {
            console.log('⚠️ No GPUs found in database!');
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await mongoose.connection.close();
        console.log('✅ Database connection closed');
    }
}

countGPUs();
