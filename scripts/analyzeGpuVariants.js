const { MongoClient } = require('mongodb');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/pcbuilder';
const DB_NAME = process.env.DB_NAME || 'pcbuilder';

// Same model extraction as server.js
function extractGPUModel(name) {
    if (!name) return 'Unknown';
    const upper = name.toUpperCase();

    // NVIDIA patterns
    const nvidiaPatterns = [
        /RTX\s*50\s*90/i, /RTX\s*50\s*80/i, /RTX\s*50\s*70\s*TI/i, /RTX\s*50\s*70/i,
        /RTX\s*50\s*60\s*TI/i, /RTX\s*50\s*60/i,
        /RTX\s*40\s*90/i, /RTX\s*40\s*80\s*SUPER/i, /RTX\s*40\s*80/i,
        /RTX\s*40\s*70\s*TI\s*SUPER/i, /RTX\s*40\s*70\s*TI/i, /RTX\s*40\s*70\s*SUPER/i, /RTX\s*40\s*70/i,
        /RTX\s*40\s*60\s*TI/i, /RTX\s*40\s*60/i,
        /RTX\s*30\s*90\s*TI/i, /RTX\s*30\s*90/i, /RTX\s*30\s*80\s*TI/i, /RTX\s*30\s*80/i,
        /RTX\s*30\s*70\s*TI/i, /RTX\s*30\s*70/i, /RTX\s*30\s*60\s*TI/i, /RTX\s*30\s*60/i,
        /RTX\s*30\s*50/i,
        /GTX\s*16\s*60\s*SUPER/i, /GTX\s*16\s*60\s*TI/i, /GTX\s*16\s*60/i,
        /GTX\s*16\s*50\s*SUPER/i, /GTX\s*16\s*50/i,
    ];

    // AMD patterns
    const amdPatterns = [
        /RX\s*9070\s*XT/i, /RX\s*9070/i,
        /RX\s*7900\s*XTX/i, /RX\s*7900\s*XT/i, /RX\s*7900\s*GRE/i,
        /RX\s*7800\s*XT/i, /RX\s*7700\s*XT/i, /RX\s*7600\s*XT/i, /RX\s*7600/i,
        /RX\s*6950\s*XT/i, /RX\s*6900\s*XT/i, /RX\s*6800\s*XT/i, /RX\s*6800/i,
        /RX\s*6750\s*XT/i, /RX\s*6700\s*XT/i, /RX\s*6700/i,
        /RX\s*6650\s*XT/i, /RX\s*6600\s*XT/i, /RX\s*6600/i,
        /RX\s*6500\s*XT/i, /RX\s*6400/i,
    ];

    // Intel patterns
    const intelPatterns = [
        /ARC\s*B580/i, /ARC\s*B570/i,
        /ARC\s*A770/i, /ARC\s*A750/i, /ARC\s*A580/i, /ARC\s*A380/i,
    ];

    for (const pattern of [...nvidiaPatterns, ...amdPatterns, ...intelPatterns]) {
        if (pattern.test(upper)) {
            const match = upper.match(pattern);
            if (match) {
                return match[0].replace(/\s+/g, ' ').trim();
            }
        }
    }
    return name.substring(0, 50);
}

async function analyze() {
    const client = new MongoClient(MONGODB_URI);
    await client.connect();
    const db = client.db(DB_NAME);

    // Get all GPU collections
    const collections = await db.listCollections({ name: /^gpus_/ }).toArray();
    const collNames = collections.map(c => c.name);

    // Also check main gpus collection
    const mainColl = await db.listCollections({ name: 'gpus' }).toArray();
    if (mainColl.length > 0) collNames.push('gpus');

    console.log(`Found ${collNames.length} GPU collections: ${collNames.join(', ')}`);

    // Gather all GPUs
    const allGpus = [];
    for (const name of collNames) {
        const gpus = await db.collection(name).find({}).toArray();
        gpus.forEach(g => { g._collection = name; });
        allGpus.push(...gpus);
    }

    console.log(`Total individual GPU cards: ${allGpus.length}\n`);

    // Group by model
    const modelMap = {};
    for (const gpu of allGpus) {
        const model = extractGPUModel(gpu.name || gpu.title || '');
        if (!modelMap[model]) modelMap[model] = [];
        modelMap[model].push({
            name: gpu.name || gpu.title,
            price: gpu.currentPrice || gpu.price,
            collection: gpu._collection,
            isAvailable: gpu.isAvailable !== false
        });
    }

    // Sort by variant count
    const sorted = Object.entries(modelMap).sort((a, b) => a[1].length - b[1].length);

    console.log('=== GPU Models by Variant Count ===');
    console.log('Models with < 3 variants (NEED MORE):');
    let needMore = 0;
    for (const [model, variants] of sorted) {
        if (variants.length < 3) {
            needMore++;
            console.log(`  ${model}: ${variants.length} variant(s)`);
            variants.forEach(v => console.log(`    - ${(v.name || '').substring(0, 80)} ($${v.price}) [${v.collection}]`));
        }
    }
    console.log(`\nModels already with 3+ variants:`);
    for (const [model, variants] of sorted) {
        if (variants.length >= 3) {
            console.log(`  ${model}: ${variants.length} variants`);
        }
    }

    console.log(`\n=== SUMMARY ===`);
    console.log(`Total models: ${sorted.length}`);
    console.log(`Models needing more variants (< 3): ${needMore}`);
    console.log(`Models with 3+ variants: ${sorted.length - needMore}`);

    await client.close();
}

analyze().catch(console.error);
