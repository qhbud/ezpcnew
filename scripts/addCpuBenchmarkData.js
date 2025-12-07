require('dotenv').config();
const { MongoClient } = require('mongodb');

// Benchmark data from your table
const benchmarkData = [
    { name: 'AMD Ryzen 5 5600X', year: 2020, singleThread: 65.52, multiThread: 26.6 },
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
        .replace(/\s+/g, ' ')
        .trim();
}

// Check if two CPU names match
function namesMatch(dbName, benchmarkName) {
    const normalizedDb = normalizeName(dbName);
    const normalizedBenchmark = normalizeName(benchmarkName);

    // Exact match after normalization
    if (normalizedDb === normalizedBenchmark) return true;

    // Check if benchmark name is contained in db name
    if (normalizedDb.includes(normalizedBenchmark)) return true;

    // Check if db name is contained in benchmark name
    if (normalizedBenchmark.includes(normalizedDb)) return true;

    return false;
}

async function addCpuBenchmarkData() {
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
        let totalNotFound = [];
        let matchedBenchmarks = new Set();

        // Process each collection
        for (const collectionName of cpuCollections) {
            const collection = db.collection(collectionName);
            const allCpus = await collection.find({}).toArray();

            console.log(`🔄 Processing ${collectionName} (${allCpus.length} CPUs)...`);

            for (const cpu of allCpus) {
                // Skip CPUs without names
                if (!cpu.name) {
                    console.log(`   ⚠️  Skipping CPU with no name (ID: ${cpu._id})`);
                    continue;
                }

                // Try to find matching benchmark data
                const benchmark = benchmarkData.find(b => namesMatch(cpu.name, b.name));

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
                                performance: benchmark.singleThread // Use single thread as primary performance metric
                            }
                        }
                    );

                    console.log(`   ✅ ${cpu.name} -> ST: ${benchmark.singleThread}%, MT: ${benchmark.multiThread}%`);
                    totalUpdated++;
                    matchedBenchmarks.add(benchmark.name);
                }
            }
        }

        // Find benchmarks that weren't matched
        const unmatchedBenchmarks = benchmarkData.filter(b => !matchedBenchmarks.has(b.name));

        console.log('\n\n📊 SUMMARY:');
        console.log(`   ✅ Updated ${totalUpdated} CPUs with benchmark data`);

        if (unmatchedBenchmarks.length > 0) {
            console.log(`\n   ⚠️  ${unmatchedBenchmarks.length} benchmarks not matched to any CPU:`);
            unmatchedBenchmarks.forEach(b => {
                console.log(`      - ${b.name}`);
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
        console.error('❌ Error adding CPU benchmark data:', error);
        throw error;
    } finally {
        await client.close();
        console.log('\n🔌 Disconnected from MongoDB');
    }
}

addCpuBenchmarkData()
    .then(() => {
        console.log('\n✨ Benchmark data added successfully');
        process.exit(0);
    })
    .catch(error => {
        console.error('\n💥 Operation failed:', error);
        process.exit(1);
    });
