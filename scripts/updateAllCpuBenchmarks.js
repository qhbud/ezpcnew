require('dotenv').config();
const { MongoClient } = require('mongodb');

// CPU benchmark index — REBUILT 2026-06-20 from THREE real published sources, each
// metric normalized to its set-max (=100), equal-weighted, then rescaled so the top
// CPU = 100 per metric (single-thread: Core Ultra 9 285K; multi-thread: Ryzen 9
// 9950X3D). Sources: PassMark (Single Thread Rating / CPU Mark), Cinebench R23
// (Single / Multi), Geekbench 6 (Single-Core / Multi-Core). Regenerate via
// scripts/_blendCpu.js (embeds the raw source numbers + methodology). singleThread
// feeds singleCorePerformance, multiThread feeds multiThreadPerformance.
// Ordered by single-thread desc. One entry per canonical modelToken (see below):
// AMD uses the exact model (X3D/X/non-X distinct); Intel folds KF->K and F->base
// but keeps K vs non-K and KS distinct; Ultra folds K/non-K of a SKU together.
const benchmarkData = [
    { name: 'Intel Core Ultra 9 285K', year: 2024, singleThread: 100, multiThread: 99.6 },
    { name: 'AMD Ryzen 9 9950X3D', year: 2025, singleThread: 98.3, multiThread: 100 },
    { name: 'AMD Ryzen 9 9950X', year: 2025, singleThread: 97.3, multiThread: 96 },
    { name: 'AMD Ryzen 9 9900X', year: 2025, singleThread: 97.2, multiThread: 80.9 },
    { name: 'Intel Core i9-14900KS', year: 2024, singleThread: 96.8, multiThread: 94.5 },
    { name: 'AMD Ryzen 7 9700X', year: 2025, singleThread: 96.5, multiThread: 59.1 },
    { name: 'AMD Ryzen 9 9900X3D', year: 2025, singleThread: 95.9, multiThread: 85.2 },
    { name: 'AMD Ryzen 5 9600X', year: 2024, singleThread: 95.7, multiThread: 54.5 },
    { name: 'Intel Core Ultra 7 265K', year: 2024, singleThread: 95.4, multiThread: 87.9 },
    { name: 'Intel Core i9-14900K', year: 2024, singleThread: 94.6, multiThread: 89.1 },
    { name: 'Intel Core i9-13900KS', year: 2023, singleThread: 94.2, multiThread: 91.1 },
    { name: 'Intel Core Ultra 5 245K', year: 2024, singleThread: 93.5, multiThread: 61.2 },
    { name: 'AMD Ryzen 7 9800X3D', year: 2024, singleThread: 93, multiThread: 64.8 },
    { name: 'Intel Core i9-13900K', year: 2022, singleThread: 92.9, multiThread: 87.1 },
    { name: 'Intel Core i7-14700K', year: 2024, singleThread: 90.2, multiThread: 79.4 },
    { name: 'Intel Core i7-13700K', year: 2022, singleThread: 88, multiThread: 72.5 },
    { name: 'AMD Ryzen 9 7950X', year: 2022, singleThread: 87, multiThread: 85.6 },
    { name: 'AMD Ryzen 9 7900X', year: 2022, singleThread: 86.9, multiThread: 74.2 },
    { name: 'AMD Ryzen 9 7950X3D', year: 2023, singleThread: 86.7, multiThread: 87.8 },
    { name: 'AMD Ryzen 7 7700X', year: 2022, singleThread: 86.4, multiThread: 55.1 },
    { name: 'Intel Core i9-13900', year: 2022, singleThread: 85.6, multiThread: 71.4 },
    { name: 'Intel Core i5-14600K', year: 2023, singleThread: 85.2, multiThread: 63 },
    { name: 'Intel Core i9-14900', year: 2024, singleThread: 85.1, multiThread: 69.3 },
    { name: 'AMD Ryzen 5 7600X', year: 2022, singleThread: 84.8, multiThread: 49 },
    { name: 'AMD Ryzen 9 7900', year: 2023, singleThread: 84.5, multiThread: 72 },
    { name: 'AMD Ryzen 7 7700', year: 2023, singleThread: 83.9, multiThread: 57.6 },
    { name: 'Intel Core i7-14700', year: 2024, singleThread: 83.2, multiThread: 63.5 },
    { name: 'Intel Core i5-13600K', year: 2022, singleThread: 83.2, multiThread: 59.3 },
    { name: 'Intel Core i9-12900K', year: 2021, singleThread: 82.4, multiThread: 63 },
    { name: 'AMD Ryzen 5 7600', year: 2022, singleThread: 80.7, multiThread: 41.2 },
    { name: 'Intel Core i9-12900', year: 2021, singleThread: 80.2, multiThread: 54.8 },
    { name: 'Intel Core i7-12700K', year: 2021, singleThread: 78.6, multiThread: 55.6 },
    { name: 'Intel Core i5-12600K', year: 2021, singleThread: 78.5, multiThread: 44.7 },
    { name: 'AMD Ryzen 7 7800X3D', year: 2023, singleThread: 77.3, multiThread: 52.4 },
    { name: 'Intel Core i5-14500', year: 2024, singleThread: 77.2, multiThread: 50.3 },
    { name: 'Intel Core i5-13500', year: 2023, singleThread: 75, multiThread: 49.2 },
    { name: 'Intel Core i5-14400F', year: 2023, singleThread: 71.8, multiThread: 42.7 },
    { name: 'Intel Core i5-13400F', year: 2023, singleThread: 70.7, multiThread: 41.9 },
    { name: 'Intel Core i3-13100F', year: 2023, singleThread: 70, multiThread: 27.3 },
    { name: 'Intel Core i5-12400F', year: 2022, singleThread: 69.8, multiThread: 32.7 },
    { name: 'AMD Ryzen 9 5950X', year: 2020, singleThread: 68.6, multiThread: 60.3 },
    { name: 'AMD Ryzen 7 5800X', year: 2020, singleThread: 67.8, multiThread: 40.7 },
    { name: 'Intel Core i3-12100F', year: 2022, singleThread: 67.7, multiThread: 26.4 },
    { name: 'AMD Ryzen 9 5900X', year: 2020, singleThread: 67.2, multiThread: 48.5 },
    { name: 'Intel Core i9-11900', year: 2021, singleThread: 66.8, multiThread: 36.6 },
    { name: 'AMD Ryzen 5 5600X', year: 2020, singleThread: 65.9, multiThread: 32.7 },
    { name: 'AMD Ryzen 7 5700X', year: 2022, singleThread: 65.8, multiThread: 37.7 },
    { name: 'AMD Ryzen 7 5800X3D', year: 2022, singleThread: 64.2, multiThread: 45 },
    { name: 'AMD Ryzen 5 5600', year: 2020, singleThread: 63.5, multiThread: 34.6 },
    { name: 'Intel Core i5-11400F', year: 2021, singleThread: 59.6, multiThread: 29 },
    { name: 'AMD Ryzen 5 5500', year: 2022, singleThread: 58.8, multiThread: 33.7 },
    { name: 'AMD Ryzen 7 5700X3D', year: 2024, singleThread: 58.6, multiThread: 41.4 },
];

// Normalize CPU name for matching: lowercase, strip marketing/spec noise so the
// vendor regexes below land on just "<brand> <series> <model><suffix>".
function normalizeName(name) {
    if (!name) return '';
    return name
        .toLowerCase()
        .replace(/®|\(r\)/gi, '')
        .replace(/™|\(tm\)/gi, '')
        .replace(/desktop processor/gi, '')
        .replace(/\s+processor/gi, '')
        .replace(/\s+desktop/gi, '')
        .replace(/\s+unlocked/gi, '')
        .replace(/new gaming/gi, '')
        .replace(/\d+-core,?\s+\d+-thread/gi, '') // Remove "8-Core, 16-Thread"
        .replace(/\s+/g, ' ')
        .trim();
}

// Canonical model token used for matching. Returns e.g. "amd-9-9950x3d",
// "intel-9-14900k", "intel-9-14900" (non-K distinct from K), "ultra-9-285k".
// AMD: strict — the full alphanumeric model token (so 9950X != 9950X3D,
//   7700 != 7700X). Intel i-series: series + 3-5 digit number + suffix, where
//   the F (iGPU-disabled, identical CPU perf) is dropped and KF folds to K, but
//   K vs non-K and KS stay distinct (real power/clock differences). Accepts a
//   space OR hyphen before the number ("i9 14900" and "i9-14900" both work).
//   Ultra: by SKU number when both names have one, else by tier.
function modelToken(name) {
    const s = normalizeName(name);

    const amd = s.match(/ryzen\s+(\d+)\s+(\d{3,4}[a-z0-9]*)/);
    if (amd) return `amd-${amd[1]}-${amd[2]}`;

    const ultra = s.match(/core\s+ultra\s+(\d+)/);
    if (ultra) {
        // SKU number, K/non-K folded together (e.g. "285K" and "285" -> 285).
        const sku = s.match(/ultra\s+\d+\s+(\d{3})[a-z]*/);
        return sku ? `ultra-sku-${sku[1]}` : `ultra-tier-${ultra[1]}`;
    }

    // Prefer "Core iN <number>"; fall back to a bare "iN-number" (some listings
    // read "Core i9 (12th Gen) i9-12900 ...", where the model trails the brand).
    const intel = s.match(/core\s+i(\d+)[\s-]+(\d{3,5})(ks|kf|k|f)?/)
               || s.match(/\bi(\d+)-(\d{3,5})(ks|kf|k|f)?/);
    if (intel) {
        let suf = intel[3] || '';
        if (suf === 'kf') suf = 'k';   // KF == K (no iGPU, same perf)
        if (suf === 'f') suf = '';      // F  == non-K base (same CPU perf)
        return `intel-${intel[1]}-${intel[2]}${suf}`;
    }
    return null;
}

// Two CPU names match if they share a canonical token (or are identical). The
// Ultra case allows a tier-only benchmark entry (e.g. "Intel Core Ultra 9") to
// match any SKU of that tier when the entry itself has no SKU number.
function namesMatch(dbName, benchmarkName) {
    if (!dbName || !benchmarkName) return false;
    if (normalizeName(dbName) === normalizeName(benchmarkName)) return true;

    const a = modelToken(dbName);
    const b = modelToken(benchmarkName);
    if (!a || !b) return false;
    if (a === b) return true;

    // A tier-only Ultra entry (e.g. "Intel Core Ultra 9", no SKU) matches any
    // Ultra doc of that tier — a safety net for future SKUs not yet in the table.
    if (a.startsWith('ultra-') && b.startsWith('ultra-') && (a.startsWith('ultra-tier-') || b.startsWith('ultra-tier-'))) {
        const tier = (n) => (normalizeName(n).match(/core\s+ultra\s+(\d+)/) || [])[1] || null;
        const ta = tier(dbName), tb = tier(benchmarkName);
        if (ta && ta === tb) return true;
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
