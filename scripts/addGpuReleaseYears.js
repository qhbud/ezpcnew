require('dotenv').config();
const { MongoClient } = require('mongodb');

// GPU release year data
const gpuReleaseYears = [
    // NVIDIA RTX 50 Series
    { name: 'RTX 5090', year: 2025 },
    { name: 'RTX 5080', year: 2025 },
    { name: 'RTX 5070', year: 2025 },
    { name: 'RTX 5060 Ti', year: 2025 },
    { name: 'RTX 5060', year: 2025 },

    // NVIDIA RTX 40 Series
    { name: 'RTX 4090', year: 2022 },
    { name: 'RTX 4080 Super', year: 2024 },
    { name: 'RTX 4080', year: 2022 },
    { name: 'RTX 4070 Super', year: 2024 },
    { name: 'RTX 4070 Ti Super', year: 2024 },
    { name: 'RTX 4070 Ti', year: 2023 },
    { name: 'RTX 4070', year: 2023 },
    { name: 'RTX 4060 Ti', year: 2023 },
    { name: 'RTX 4060', year: 2023 },

    // AMD RX 7000 Series
    { name: 'RX 7900 XTX', year: 2022 },
    { name: 'RX 7900 XT', year: 2022 },
    { name: 'RX 7900 GRE', year: 2023 },
    { name: 'RX 7800 XT', year: 2023 },
    { name: 'RX 7700 XT', year: 2023 },
    { name: 'RX 7600 XT', year: 2024 },
    { name: 'RX 7600', year: 2023 },

    // AMD RX 6000 Series
    { name: 'RX 6950 XT', year: 2020 },
    { name: 'RX 6900 XT', year: 2020 },
    { name: 'RX 6800 XT', year: 2020 },
    { name: 'RX 6800', year: 2020 },
    { name: 'RX 6750 XT', year: 2020 },
    { name: 'RX 6700 XT', year: 2020 },
    { name: 'RX 6650 XT', year: 2020 },
    { name: 'RX 6600 XT', year: 2020 },
    { name: 'RX 6600', year: 2020 },

    // Intel Arc
    { name: 'Arc A770', year: 2022 },
    { name: 'Arc A750', year: 2022 },
    { name: 'Arc A580', year: 2022 }
];

// Normalize GPU name for matching
function normalizeName(name) {
    if (!name) return '';
    return name
        .toLowerCase()
        .replace(/geforce\s+/gi, '')
        .replace(/radeon\s+/gi, '')
        .replace(/graphics\s+card/gi, '')
        .replace(/\s+gaming/gi, '')
        .replace(/\s+oc/gi, '')
        .replace(/\s+\d+gb/gi, '') // Remove memory size
        .replace(/\s+gddr\d+/gi, '')
        .replace(/\s+/g, ' ')
        .trim();
}

// Check if GPU names match
function namesMatch(dbName, benchmarkName) {
    if (!dbName || !benchmarkName) return false;

    const normalizedDb = normalizeName(dbName);
    const normalizedBenchmark = normalizeName(benchmarkName);

    // Check if benchmark name is contained in db name
    if (normalizedDb.includes(normalizedBenchmark)) return true;

    // For more precise matching, check for exact model match
    // Extract model number like "RTX 4090", "RX 7900 XTX", "Arc A770"
    const dbModel = normalizedDb.match(/(rtx|rx|arc)\s+[\w\s]+/i);
    const benchModel = normalizedBenchmark.match(/(rtx|rx|arc)\s+[\w\s]+/i);

    if (dbModel && benchModel) {
        return dbModel[0].trim() === benchModel[0].trim();
    }

    return false;
}

async function addGpuReleaseYears() {
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
        let matchedGpus = new Set();

        // Process each collection
        for (const collectionName of gpuCollections) {
            const collection = db.collection(collectionName);
            const allGpus = await collection.find({}).toArray();

            console.log(`🔄 Processing ${collectionName} (${allGpus.length} GPUs)...`);

            for (const gpu of allGpus) {
                // Skip GPUs without names
                if (!gpu.name && !gpu.title) {
                    console.log(`   ⚠️  Skipping GPU with no name (ID: ${gpu._id})`);
                    continue;
                }

                const gpuName = gpu.name || gpu.title;

                // Try to find matching release year data
                const releaseData = gpuReleaseYears.find(g => namesMatch(gpuName, g.name));

                if (releaseData) {
                    // Update GPU with release year
                    await collection.updateOne(
                        { _id: gpu._id },
                        {
                            $set: {
                                releaseYear: releaseData.year
                            }
                        }
                    );

                    console.log(`   ✅ ${gpuName} -> ${releaseData.year}`);
                    totalUpdated++;
                    matchedGpus.add(releaseData.name);
                }
            }

            console.log('');
        }

        // Find release year entries that weren't matched
        const unmatchedReleaseYears = gpuReleaseYears.filter(g => !matchedGpus.has(g.name));

        console.log('\n📊 SUMMARY:');
        console.log(`   ✅ Updated ${totalUpdated} GPUs with release year data`);

        if (unmatchedReleaseYears.length > 0) {
            console.log(`\n   ⚠️  ${unmatchedReleaseYears.length} GPU models not matched:`);
            unmatchedReleaseYears.forEach(g => {
                console.log(`      - ${g.name} (${g.year})`);
            });
            console.log('\n   These GPUs may not exist in your database yet.');
        }

        // Verify the updates
        console.log('\n🔍 Verification:');
        for (const collectionName of gpuCollections) {
            const collection = db.collection(collectionName);
            const withReleaseYear = await collection.countDocuments({ releaseYear: { $exists: true } });
            if (withReleaseYear > 0) {
                console.log(`   ${collectionName}: ${withReleaseYear} GPUs with release years`);
            }
        }

    } catch (error) {
        console.error('❌ Error adding GPU release years:', error);
        throw error;
    } finally {
        await client.close();
        console.log('\n🔌 Disconnected from MongoDB');
    }
}

addGpuReleaseYears()
    .then(() => {
        console.log('\n✨ GPU release years added successfully');
        process.exit(0);
    })
    .catch(error => {
        console.error('\n💥 Operation failed:', error);
        process.exit(1);
    });
