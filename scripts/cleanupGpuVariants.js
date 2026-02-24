/**
 * cleanupGpuVariants.js
 *
 * Removes non-GPU products (fans, cables, brackets, water blocks, etc.)
 * and wrong-model GPUs from collections, then re-checks counts.
 */

const { MongoClient } = require('mongodb');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/pcbuilder';
const DB_NAME = process.env.DB_NAME || 'pcbuilder';

// Items that are NOT graphics cards - filter by keywords and price
const NON_GPU_KEYWORDS = [
    'water block', 'waterblock', 'cooling fan', 'fan replacement',
    'cable', 'bracket', 'riser', 'backplate', 'heatsink', 'thermal pad',
    'power supply', 'psu', 'case for', 'compatible with', 'cover',
    'stand', 'holder', 'mount', 'adapter', 'extension', 'shroud',
    'replacement fan', 'gpu fan', 'graphics card fan', 'cooler fan',
    'sag bracket', 'anti-sag', 'brace', 'support bracket'
];

// Minimum realistic GPU prices by tier
const MIN_GPU_PRICES = {
    'flagship': 500,
    'high-end': 300,
    'upper-mid': 200,
    'mid-range': 120,
    'entry': 80
};

// Model-to-collection mapping for cross-checking
const MODEL_CHECKS = {
    'gpus_rtx_5090': { must: ['5090'], mustNot: [] },
    'gpus_rtx_5080': { must: ['5080'], mustNot: ['5090'] },
    'gpus_rtx_5070_ti': { must: ['5070'], mustTi: true, mustNot: ['SUPER'] },
    'gpus_rtx_5070': { must: ['5070'], mustNot: ['TI', '5070 TI'] },
    'gpus_rtx_5060_ti': { must: ['5060'], mustTi: true, mustNot: ['SUPER'] },
    'gpus_rtx_5060': { must: ['5060'], mustNot: ['TI', '5060 TI'] },
    'gpus_rtx_4090': { must: ['4090'], mustNot: [] },
    'gpus_rtx_4080_super': { must: ['4080', 'SUPER'], mustNot: [] },
    'gpus_rtx_4080': { must: ['4080'], mustNot: ['SUPER'] },
    'gpus_rtx_4070_ti_super': { must: ['4070', 'TI', 'SUPER'], mustNot: [] },
    'gpus_rtx_4070_ti': { must: ['4070', 'TI'], mustNot: ['SUPER'] },
    'gpus_rtx_4070_super': { must: ['4070', 'SUPER'], mustNot: ['TI'] },
    'gpus_rtx_4070': { must: ['4070'], mustNot: ['TI', 'SUPER'] },
    'gpus_rtx_4060_ti': { must: ['4060', 'TI'], mustNot: ['SUPER'] },
    'gpus_rtx_4060': { must: ['4060'], mustNot: ['TI', '4060 TI'] },
    'gpus_rtx_3090_ti': { must: ['3090', 'TI'], mustNot: [] },
    'gpus_rtx_3090': { must: ['3090'], mustNot: ['TI'] },
    'gpus_rtx_3080_ti': { must: ['3080', 'TI'], mustNot: [] },
    'gpus_rtx_3080': { must: ['3080'], mustNot: ['TI'] },
    'gpus_rtx_3070_ti': { must: ['3070', 'TI'], mustNot: [] },
    'gpus_rtx_3070': { must: ['3070'], mustNot: ['TI'] },
    'gpus_rtx_3060_ti': { must: ['3060', 'TI'], mustNot: [] },
    'gpus_rtx_3060': { must: ['3060'], mustNot: ['3060 TI'] },
    'gpus_rtx_3050': { must: ['3050'], mustNot: [] },
    'gpus_rx_7900_xtx': { must: ['7900', 'XTX'], mustNot: [] },
    'gpus_rx_7900_xt': { must: ['7900', 'XT'], mustNot: ['XTX', 'GRE'] },
    'gpus_rx_7900_gre': { must: ['7900', 'GRE'], mustNot: [] },
    'gpus_rx_7800_xt': { must: ['7800', 'XT'], mustNot: [] },
    'gpus_rx_7700_xt': { must: ['7700', 'XT'], mustNot: [] },
    'gpus_rx_7600_xt': { must: ['7600', 'XT'], mustNot: [] },
    'gpus_rx_7600': { must: ['7600'], mustNot: ['XT'] },
    'gpus_rx_6950_xt': { must: ['6950', 'XT'], mustNot: [] },
    'gpus_rx_6900_xt': { must: ['6900', 'XT'], mustNot: [] },
    'gpus_rx_6800_xt': { must: ['6800', 'XT'], mustNot: [] },
    'gpus_rx_6800': { must: ['6800'], mustNot: ['XT'] },
    'gpus_rx_6750_xt': { must: ['6750', 'XT'], mustNot: [] },
    'gpus_rx_6700_xt': { must: ['6700', 'XT'], mustNot: [] },
    'gpus_rx_6650_xt': { must: ['6650', 'XT'], mustNot: [] },
    'gpus_rx_6600_xt': { must: ['6600', 'XT'], mustNot: [] },
    'gpus_rx_6600': { must: ['6600'], mustNot: ['XT'] },
    'gpus_rx_6500_xt': { must: ['6500', 'XT'], mustNot: [] },
    'gpus_rx_6400': { must: ['6400'], mustNot: [] },
    'gpus_arc_a770': { must: ['A770'], mustNot: [] },
    'gpus_arc_a750': { must: ['A750'], mustNot: [] },
    'gpus_arc_a580': { must: ['A580'], mustNot: [] },
    'gpus_arc_a380': { must: ['A380'], mustNot: [] },
};

function isNonGpuProduct(name, price) {
    if (!name) return true;
    const lower = name.toLowerCase();

    // Check for accessory keywords
    for (const kw of NON_GPU_KEYWORDS) {
        if (lower.includes(kw)) return true;
    }

    // Suspiciously cheap - likely an accessory
    if (price && price < 50) return true;

    return false;
}

function isWrongModel(name, collectionName) {
    const check = MODEL_CHECKS[collectionName];
    if (!check) return false;

    const upper = (name || '').toUpperCase();

    // Must contain all required terms
    for (const term of check.must) {
        if (!upper.includes(term)) return true;
    }

    // Special Ti check - need "TI" but not as part of another word
    if (check.mustTi) {
        if (!/\bTI\b/.test(upper)) return true;
    }

    // Must not contain excluded terms (strict check)
    for (const term of check.mustNot) {
        if (term === 'TI') {
            // Check for standalone TI (not part of "STRIX" etc.)
            if (/\bTI\b/.test(upper)) return true;
        } else if (term === 'SUPER') {
            if (/\bSUPER\b/.test(upper)) return true;
        } else if (term === 'XT') {
            if (/\bXT\b/.test(upper) || /\bXTX\b/.test(upper)) return true;
        } else if (term === 'XTX') {
            if (/\bXTX\b/.test(upper)) return true;
        } else if (term === 'GRE') {
            if (/\bGRE\b/.test(upper)) return true;
        } else {
            // For compound terms like "3060 TI" or "4060 TI"
            if (upper.includes(term)) return true;
        }
    }

    return false;
}

async function main() {
    const client = new MongoClient(MONGODB_URI);
    await client.connect();
    const db = client.db(DB_NAME);

    console.log('🧹 GPU Variant Cleanup\n');

    const collections = await db.listCollections({ name: /^gpus_/ }).toArray();
    const collNames = collections.map(c => c.name).sort();

    let totalRemoved = 0;
    const report = [];

    for (const collName of collNames) {
        const coll = db.collection(collName);
        const gpus = await coll.find({}).toArray();

        const toRemove = [];

        for (const gpu of gpus) {
            const name = gpu.name || gpu.title || '';
            const price = gpu.currentPrice || gpu.price || gpu.basePrice;
            const reasons = [];

            if (isNonGpuProduct(name, price)) {
                reasons.push('non-GPU product');
            }
            if (isWrongModel(name, collName)) {
                reasons.push('wrong model');
            }

            if (reasons.length > 0) {
                toRemove.push({ id: gpu._id, name, price, reasons: reasons.join(', ') });
            }
        }

        if (toRemove.length > 0) {
            console.log(`\n📦 ${collName}: removing ${toRemove.length} bad entries`);
            for (const item of toRemove) {
                console.log(`   ❌ ${item.name.substring(0, 70)}... ($${item.price}) [${item.reasons}]`);
                await coll.deleteOne({ _id: item.id });
                totalRemoved++;
            }
        }

        const remaining = gpus.length - toRemove.length;
        report.push({ collection: collName, before: gpus.length, removed: toRemove.length, after: remaining });
    }

    console.log('\n\n' + '='.repeat(60));
    console.log('📊 CLEANUP REPORT');
    console.log('='.repeat(60));
    console.log(`Total bad entries removed: ${totalRemoved}\n`);

    console.log('Collections still below 3 variants:');
    let needMore = 0;
    for (const r of report) {
        if (r.after < 3) {
            console.log(`  ⚠️  ${r.collection}: ${r.after} variants (was ${r.before})`);
            needMore++;
        }
    }
    if (needMore === 0) {
        console.log('  ✅ All collections have 3+ variants!');
    }
    console.log('='.repeat(60));

    await client.close();
}

main().catch(console.error);
