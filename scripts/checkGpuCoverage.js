const mongoose = require('mongoose');
require('dotenv').config();

const gpuBenchmarks = {
    'RTX 5090': 205.5,
    'RTX 5080': 172.6,
    'RTX 5070 Ti': 171.5,
    'RTX 5070': 152.6,
    'RTX 5060 Ti': 118.9,
    'RTX 5060': 103.7,
    'RTX 4090': 203.3,
    'RTX 4080 Super': 185.6,
    'RTX 4080': 183.6,
    'RTX 4070 Ti Super': 166.6,
    'RTX 4070 Super': 149.8,
    'RTX 4070 Ti': 166.6,
    'RTX 4070': 133,
    'RTX 4060 Ti': 105,
    'RTX 4060': 83.9,
    'RTX 3090 Ti': 134.1,
    'RTX 3090': 131.85,
    'RTX 3080 Ti': 130.05,
    'RTX 3080': 128.175,
    'RTX 3070 Ti': 120.975,
    'RTX 3070': 117.15,
    'RTX 3060 Ti': 111.15,
    'RTX 3060': 90.75,
    'RTX 3050': 66.6,
    'RX 7900 XTX': 140.2,
    'RX 7900 XT': 131,
    'RX 7900 GRE': 126.3,
    'RX 7900': 126.3,
    'RX 7800 XT': 107.1,
    'RX 7700 XT': 97.6,
    'RX 7600 XT': 64.3,
    'RX 7600': 60.6,
    'RX 6950 XT': 140.55,
    'RX 6900 XT': 138.975,
    'RX 6800 XT': 135.9,
    'RX 6800': 130.5,
    'RX 6750 XT': 120,
    'RX 6700 XT': 110,
    'RX 6650 XT': 100,
    'RX 6600 XT': 90,
    'RX 6600': 80,
    'RX 6500 XT': 60,
    'RX 6400': 45,
    'Arc A770': 95,
    'Arc A750': 85,
    'Arc A580': 70,
    'Arc A380': 50
};

async function check() {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/pcbuilder');
    const db = mongoose.connection.db;

    // Get all GPU collections and all GPU documents
    const collections = await db.listCollections().toArray();
    const gpuCollections = collections.filter(c => c.name.startsWith('gpus_') || c.name === 'gpus');

    const allGpus = [];
    for (const col of gpuCollections) {
        const docs = await db.collection(col.name).find({}).toArray();
        allGpus.push(...docs);
    }

    console.log(`Total GPU products in DB: ${allGpus.length}\n`);

    // Use the same matching logic as getGpuPerformance
    const sortedModels = Object.entries(gpuBenchmarks)
        .sort((a, b) => b[0].length - a[0].length);

    // For each benchmark chipset, check if any GPU product matches
    const covered = [];
    const missing = [];

    for (const [model, score] of sortedModels) {
        const matchingProducts = allGpus.filter(gpu => {
            const name = gpu.name || gpu.title || gpu.model || '';
            return name.includes(model);
        });

        if (matchingProducts.length > 0) {
            covered.push({ model, score, count: matchingProducts.length });
        } else {
            missing.push({ model, score });
        }
    }

    // Sort missing by score descending (highest performance first)
    missing.sort((a, b) => b.score - a.score);
    covered.sort((a, b) => b.score - a.score);

    console.log(`=== BENCHMARKED CHIPSETS WITH PRODUCTS (${covered.length}) ===`);
    for (const c of covered) {
        console.log(`  ✅ ${c.model.padEnd(20)} Score: ${String(c.score).padEnd(8)} Products: ${c.count}`);
    }

    console.log(`\n=== BENCHMARKED CHIPSETS WITH NO PRODUCTS (${missing.length}) ===`);
    for (const m of missing) {
        const pct = ((m.score / 205.5) * 100).toFixed(1);
        console.log(`  ❌ ${m.model.padEnd(20)} Score: ${String(m.score).padEnd(8)} (${pct}%)`);
    }

    console.log(`\n=== SUMMARY ===`);
    console.log(`Benchmark chipsets: ${Object.keys(gpuBenchmarks).length}`);
    console.log(`With products:      ${covered.length}`);
    console.log(`Missing products:   ${missing.length}`);

    await mongoose.disconnect();
}

check().catch(e => { console.error(e); process.exit(1); });
