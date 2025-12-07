require('dotenv').config();
const { MongoClient } = require('mongodb');

// Benchmark data from your table
const benchmarkData = [
    { name: 'AMD Ryzen 5 5600X', year: 2020, singleThread: 65.52, multiThread: 26.6 },
    { name: 'AMD Ryzen 5 5600', year: 2020, singleThread: 65.52, multiThread: 26.6 },
    { name: 'AMD Ryzen 5 7600', year: 2022, singleThread: 76.43, multiThread: 33.3 },
    { name: 'AMD Ryzen 7 5700X', year: 2022, singleThread: 66, multiThread: 32.6 },
    { name: 'AMD Ryzen 7 5800X', year: 2020, singleThread: 66.5, multiThread: 38.6 },
    { name: 'AMD Ryzen 7 7700X', year: 2022, singleThread: 83.4, multiThread: 47 },
    { name: 'AMD Ryzen 7 7800X3D', year: 2023, singleThread: 77.5, multiThread: 43.5 },
    { name: 'AMD Ryzen 7 9700X', year: 2025, singleThread: 90.1, multiThread: 55.9 },
    { name: 'AMD Ryzen 7 9800X3D', year: 2024, singleThread: 88.1, multiThread: 58.3 },
    { name: 'AMD Ryzen 9 5900X', year: 2020, singleThread: 69.6, multiThread: 47.56 },
    { name: 'AMD Ryzen 9 5950X', year: 2020, singleThread: 68.6, multiThread: 60.5 },
    { name: 'AMD Ryzen 9 7900X', year: 2022, singleThread: 85.8, multiThread: 69 },
    { name: 'AMD Ryzen 9 7950X', year: 2022, singleThread: 86.2, multiThread: 89 },
    { name: 'AMD Ryzen 9 7950X3D', year: 2023, singleThread: 86.2, multiThread: 89 },
    { name: 'AMD Ryzen 9 9900X', year: 2025, singleThread: 92.6, multiThread: 78.2 },
    { name: 'AMD Ryzen 9 9950X', year: 2025, singleThread: 94, multiThread: 100 },
    { name: 'AMD Ryzen 9 9950X3D', year: 2025, singleThread: 94, multiThread: 100 },
    { name: 'Intel Core i5-12400F', year: 2022, singleThread: 72.23, multiThread: 27.61 },
    { name: 'Intel Core i5-12600K', year: 2021, singleThread: 79.7, multiThread: 38.4 },
    { name: 'Intel Core i5-13600K', year: 2022, singleThread: 83.9, multiThread: 51.7 },
    { name: 'Intel Core i7-13700K', year: 2022, singleThread: 88.4, multiThread: 64.8 },
    { name: 'Intel Core i7-13700KF', year: 2022, singleThread: 88.4, multiThread: 64.8 },
    { name: 'Intel Core i9-12900K', year: 2021, singleThread: 81.5, multiThread: 59.1 },
    { name: 'Intel Core i9-13900F', year: 2023, singleThread: 91.1, multiThread: 80.7 },
    { name: 'Intel Core i9-13900K', year: 2022, singleThread: 91.1, multiThread: 80.7 },
    { name: 'Intel Core i9-13900KF', year: 2022, singleThread: 91.1, multiThread: 80.7 },
    { name: 'Intel Core i9-14700K', year: 2024, singleThread: 91.4, multiThread: 73.1 },
    { name: 'Intel Core i9-14900', year: 2024, singleThread: 97.1, multiThread: 82.6 },
    { name: 'Intel Core i9-14900KF', year: 2024, singleThread: 97.1, multiThread: 82.6 },
    { name: 'Intel Core i9-14900KS', year: 2024, singleThread: 97.1, multiThread: 82.6 },
    { name: 'Intel Core Ultra 5', year: 2025, singleThread: 93.5, multiThread: 57 },
    { name: 'Intel Core Ultra 7', year: 2025, singleThread: 97.3, multiThread: 82.6 },
    { name: 'Intel Core Ultra 9', year: 2025, singleThread: 100, multiThread: 95.5 }
];

// Normalize CPU name for matching
function normalizeName(name) {
    if (!name) return '';
    return name
        .toLowerCase()
        .replace(/desktop processor/gi, '')
        .replace(/\s+processor/gi, '')
        .replace(/\s+desktop/gi, '')
        .replace(/\s+unlocked/gi, '')
        .replace(/\d+-core,?\s+\d+-thread/gi, '') // Remove "8-Core, 16-Thread"
        .replace(/™/g, '')
        .replace(/\s+/g, ' ')
        .trim();
}

// Extract the core model name (e.g., "Ryzen 7 5700X" from "AMD Ryzen 7 5700X")
function extractModelName(name) {
    const normalized = normalizeName(name);

    // For AMD CPUs, extract "Ryzen X XXXXXX" pattern
    const amdMatch = normalized.match(/(ryzen\s+\d+\s+\w+)/i);
    if (amdMatch) return amdMatch[1];

    // For Intel CPUs, extract "Core iX-XXXXX" pattern
    const intelMatch = normalized.match(/(core\s+i\d+-\w+)/i);
    if (intelMatch) return intelMatch[1];

    // For Intel Core Ultra, extract "Core Ultra X"
    const ultraMatch = normalized.match(/(core\s+ultra\s+\d+)/i);
    if (ultraMatch) return ultraMatch[1];

    return normalized;
}

// Check if two CPU names match
function namesMatch(dbName, benchmarkName) {
    if (!dbName || !benchmarkName) return false;

    const normalizedDb = normalizeName(dbName);
    const normalizedBenchmark = normalizeName(benchmarkName);

    // Exact match after normalization
    if (normalizedDb === normalizedBenchmark) return true;

    // Check if benchmark name is fully contained in db name
    if (normalizedDb.includes(normalizedBenchmark)) return true;

    // For more specific matching, extract key components
    // AMD: Extract "ryzen X XXXX" (e.g., "ryzen 7 5700x")
    // Intel: Extract "core iX-XXXX" (e.g., "core i7-13700kf")

    // AMD Ryzen matching
    const amdDbMatch = normalizedDb.match(/ryzen\s+(\d+)\s+(\w+)/);
    const amdBenchMatch = normalizedBenchmark.match(/ryzen\s+(\d+)\s+(\w+)/);

    if (amdDbMatch && amdBenchMatch) {
        // Must match series (5/7/9) and model (5700x, 7950x3d, etc.)
        return amdDbMatch[1] === amdBenchMatch[1] && amdDbMatch[2] === amdBenchMatch[2];
    }

    // Intel Core matching
    const intelDbMatch = normalizedDb.match(/core\s+i(\d+)-(\w+)/);
    const intelBenchMatch = normalizedBenchmark.match(/core\s+i(\d+)-(\w+)/);

    if (intelDbMatch && intelBenchMatch) {
        // Must match series (5/7/9) and model number
        // Compare base model (e.g., "13900" matches "13900k", "13900kf", etc.)
        const dbBase = intelDbMatch[2].replace(/k[fs]?$/, '');
        const benchBase = intelBenchMatch[2].replace(/k[fs]?$/, '');

        return intelDbMatch[1] === intelBenchMatch[1] && dbBase === benchBase;
    }

    // Intel Core Ultra matching
    const ultraDbMatch = normalizedDb.match(/core\s+ultra\s+(\d+)/);
    const ultraBenchMatch = normalizedBenchmark.match(/core\s+ultra\s+(\d+)/);

    if (ultraDbMatch && ultraBenchMatch) {
        return ultraDbMatch[1] === ultraBenchMatch[1];
    }

    return false;
}

async function updateAllCpuBenchmarks() {
    const uri = process.env.MONGODB_URI;
    const client = new MongoClient(uri);

    try {
        await client.connect();
        console.log('✅ Connected to MongoDB\n');

        const db = client.db(process.env.DB_NAME || 'pcbuilder');

        // Find all CPU collections
        const collections = await db.listCollections().toArray();
        const cpuCollections = collections
            .filter(col => col.name === 'cpus' || col.name.startsWith('cpus_'))
            .map(col => col.name);

        console.log(`📂 Found ${cpuCollections.length} CPU collections\n`);

        let totalUpdated = 0;
        let totalSkipped = 0;
        let matchedBenchmarks = new Set();

        // Process each collection
        for (const collectionName of cpuCollections) {
            const collection = db.collection(collectionName);
            const allCpus = await collection.find({}).toArray();

            console.log(`🔄 Processing ${collectionName} (${allCpus.length} CPUs)...`);

            for (const cpu of allCpus) {
                // Skip CPUs without names
                if (!cpu.name && !cpu.title) {
                    console.log(`   ⚠️  Skipping CPU with no name (ID: ${cpu._id})`);
                    totalSkipped++;
                    continue;
                }

                const cpuName = cpu.name || cpu.title;

                // Try to find matching benchmark data
                const benchmark = benchmarkData.find(b => namesMatch(cpuName, b.name));

                if (benchmark) {
                    // Update CPU with benchmark data
                    await collection.updateOne(
                        { _id: cpu._id },
                        {
                            $set: {
                                singleThreadScore: benchmark.singleThread,
                                multiThreadScore: benchmark.multiThread,
                                singleCorePerformance: benchmark.singleThread,
                                multiThreadPerformance: benchmark.multiThread,
                                hasBenchmark: true,
                                performance: benchmark.singleThread,
                                releaseYear: benchmark.year
                            }
                        }
                    );

                    console.log(`   ✅ ${cpuName} (${benchmark.year}) -> ST: ${benchmark.singleThread}%, MT: ${benchmark.multiThread}%`);
                    totalUpdated++;
                    matchedBenchmarks.add(benchmark.name);
                } else {
                    console.log(`   ⚠️  No match: ${cpuName}`);
                }
            }

            console.log('');
        }

        // Find benchmarks that weren't matched
        const unmatchedBenchmarks = benchmarkData.filter(b => !matchedBenchmarks.has(b.name));

        console.log('\n📊 SUMMARY:');
        console.log(`   ✅ Updated ${totalUpdated} CPUs with benchmark data`);
        console.log(`   ⚠️  Skipped ${totalSkipped} CPUs (no name field)`);

        if (unmatchedBenchmarks.length > 0) {
            console.log(`\n   ⚠️  ${unmatchedBenchmarks.length} benchmarks not matched to any CPU:`);
            unmatchedBenchmarks.forEach(b => {
                console.log(`      - ${b.name} (${b.year})`);
            });
            console.log('\n   These CPUs may not exist in your database yet.');
        }

        // Verify the updates
        console.log('\n🔍 Verification:');
        for (const collectionName of cpuCollections) {
            const collection = db.collection(collectionName);
            const withBenchmarks = await collection.countDocuments({ hasBenchmark: true });
            if (withBenchmarks > 0) {
                console.log(`   ${collectionName}: ${withBenchmarks} CPUs with benchmarks`);
            }
        }

    } catch (error) {
        console.error('❌ Error updating CPU benchmark data:', error);
        throw error;
    } finally {
        await client.close();
        console.log('\n🔌 Disconnected from MongoDB');
    }
}

updateAllCpuBenchmarks()
    .then(() => {
        console.log('\n✨ Benchmark data updated successfully');
        process.exit(0);
    })
    .catch(error => {
        console.error('\n💥 Operation failed:', error);
        process.exit(1);
    });
