require('dotenv').config();
const { MongoClient } = require('mongodb');

// Complete GPU release year mapping
const gpuYearMapping = {
    // NVIDIA RTX 50 Series - 2025
    '5090': 2025,
    '5080': 2025,
    '5070 ti': 2025,
    '5070': 2025,
    '5060 ti': 2025,
    '5060': 2025,

    // NVIDIA RTX 40 Series
    '4090': 2022,
    '4080 super': 2024,
    '4080': 2022,
    '4070 ti super': 2024,
    '4070 ti': 2023,
    '4070 super': 2024,
    '4070': 2023,
    '4060 ti': 2023,
    '4060': 2023,

    // NVIDIA RTX 30 Series
    '3090 ti': 2022,
    '3090': 2020,
    '3080 ti': 2021,
    '3080': 2020,
    '3070 ti': 2021,
    '3070': 2020,
    '3060 ti': 2020,
    '3060': 2021,
    '3050': 2022,

    // AMD RX 7000 Series
    'rx 7900 xtx': 2022,
    'rx 7900 xt': 2022,
    'rx 7900 gre': 2023,
    'rx 7800 xt': 2023,
    'rx 7700 xt': 2023,
    'rx 7600 xt': 2024,
    'rx 7600': 2023,

    // AMD RX 6000 Series - all 2020
    'rx 6950 xt': 2020,
    'rx 6900 xt': 2020,
    'rx 6800 xt': 2020,
    'rx 6800': 2020,
    'rx 6750 xt': 2020,
    'rx 6700 xt': 2020,
    'rx 6650 xt': 2020,
    'rx 6600 xt': 2020,
    'rx 6600': 2020,
    'rx 6500 xt': 2022,
    'rx 6400': 2022,

    // Intel Arc
    'arc a770': 2022,
    'arc a750': 2022,
    'arc a580': 2022,
    'arc a380': 2022
};

function getGpuYear(gpuName) {
    if (!gpuName) return null;

    const nameLower = gpuName.toLowerCase();

    // Check each pattern
    for (const [model, year] of Object.entries(gpuYearMapping)) {
        if (nameLower.includes(model)) {
            return year;
        }
    }

    return null;
}

async function addMissingGpuYears() {
    const uri = process.env.MONGODB_URI;
    const client = new MongoClient(uri);

    try {
        await client.connect();
        console.log('✅ Connected to MongoDB\n');

        const db = client.db(process.env.DB_NAME || 'pcbuilder');

        // Find all GPU collections
        const collections = await db.listCollections().toArray();
        const gpuCollections = collections
            .filter(col => col.name === 'gpus' || col.name.startsWith('gpus_'))
            .map(col => col.name);

        console.log(`📂 Found ${gpuCollections.length} GPU collections\n`);

        let totalUpdated = 0;

        for (const collectionName of gpuCollections) {
            const collection = db.collection(collectionName);

            // Find all GPUs without releaseYear
            const gpusWithoutYear = await collection.find({
                $or: [
                    { releaseYear: { $exists: false } },
                    { releaseYear: null }
                ]
            }).toArray();

            if (gpusWithoutYear.length === 0) {
                console.log(`✓ ${collectionName}: All GPUs have release years`);
                continue;
            }

            console.log(`🔄 Processing ${collectionName} (${gpusWithoutYear.length} missing years)...`);

            for (const gpu of gpusWithoutYear) {
                const gpuName = gpu.name || gpu.title;
                const year = getGpuYear(gpuName);

                if (year) {
                    await collection.updateOne(
                        { _id: gpu._id },
                        { $set: { releaseYear: year } }
                    );

                    console.log(`   ✅ ${gpuName.substring(0, 60)} -> ${year}`);
                    totalUpdated++;
                } else {
                    console.log(`   ⚠️  Could not determine year for: ${gpuName.substring(0, 60)}`);
                }
            }

            console.log('');
        }

        console.log(`\n📊 SUMMARY:`);
        console.log(`   ✅ Updated ${totalUpdated} GPUs with release years`);

    } catch (error) {
        console.error('❌ Error:', error);
        throw error;
    } finally {
        await client.close();
        console.log('\n🔌 Disconnected from MongoDB');
    }
}

addMissingGpuYears()
    .then(() => {
        console.log('\n✨ Missing GPU release years added successfully');
        process.exit(0);
    })
    .catch(error => {
        console.error('\n💥 Operation failed:', error);
        process.exit(1);
    });
