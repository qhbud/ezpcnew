const { connectToDatabase } = require('../config/database');

// Chipsets that are DDR5-only
const DDR5_ONLY_CHIPSETS = new Set([
    'Z890', 'B860', 'H810',          // LGA1851
    'X870E', 'X870', 'B850',          // AM5 new gen
    'X670E', 'X670', 'B650E', 'B650', // AM5 previous gen
    'A620',                            // AM5 budget
]);

// Chipsets that are DDR4-only
const DDR4_ONLY_CHIPSETS = new Set([
    'X570', 'B550', 'B450', 'A520',   // AM4
    'X470', 'B450', 'A320', 'X370',   // AM4 older
]);

// LGA1851 is always DDR5
const DDR5_ONLY_SOCKETS = new Set(['AM5', 'LGA1851']);

// AM4 is always DDR4
const DDR4_ONLY_SOCKETS = new Set(['AM4']);

// LGA1700 boards can be DDR4 or DDR5 — detect from name
function detectDdrFromName(name) {
    const upper = (name || '').toUpperCase();
    const hasDdr5 = upper.includes('DDR5');
    const hasDdr4 = upper.includes('DDR4');
    if (hasDdr5 && hasDdr4) return ['DDR4', 'DDR5']; // dual-channel board supporting both
    if (hasDdr5) return ['DDR5'];
    if (hasDdr4) return ['DDR4'];
    return null;
}

function getMemoryType(mb) {
    const socket = (mb.socket || '').toString().trim().toUpperCase();
    const chipset = (mb.chipset || '').toString().trim().toUpperCase();
    const name = mb.name || mb.title || '';

    // Socket-level certainty
    if (DDR5_ONLY_SOCKETS.has(socket)) return ['DDR5'];
    if (DDR4_ONLY_SOCKETS.has(socket)) return ['DDR4'];

    // Chipset-level certainty (covers LGA1851/AM5/AM4 chipsets explicitly)
    if (DDR5_ONLY_CHIPSETS.has(chipset)) return ['DDR5'];
    if (DDR4_ONLY_CHIPSETS.has(chipset)) return ['DDR4'];

    // LGA1700: detect from name
    const fromName = detectDdrFromName(name);
    if (fromName) return fromName;

    // LGA1700 fallback by chipset generation
    if (['Z790', 'Z690', 'B760', 'B660', 'H670', 'H770'].includes(chipset)) {
        // Most Z790/B760 are DDR5, Z690/B660 are mixed — try name first, then default DDR5 for Z790/B760
        if (chipset === 'Z790' || chipset === 'B760') return ['DDR5'];
        if (chipset === 'Z690' || chipset === 'B660') return ['DDR4']; // older default
        return ['DDR5'];
    }

    if (chipset === 'H610') return ['DDR4']; // H610 is typically DDR4

    return null; // Unknown — skip
}

async function fixMotherboardDdrTypes() {
    const db = await connectToDatabase();
    const col = db.collection('motherboards');

    const all = await col.find({}).toArray();
    const missing = all.filter(d => {
        if (!d.memoryType) return true;
        if (Array.isArray(d.memoryType) && d.memoryType.length === 0) return true;
        return false;
    });

    console.log(`Found ${missing.length} motherboards missing memoryType (out of ${all.length} total)\n`);

    let updated = 0;
    let skipped = 0;
    const skippedExamples = [];

    for (const mb of missing) {
        const memoryType = getMemoryType(mb);

        if (!memoryType) {
            skipped++;
            if (skippedExamples.length < 5) {
                skippedExamples.push(`  - ${(mb.name||'').substring(0,70)} | socket:${mb.socket} chipset:${mb.chipset}`);
            }
            continue;
        }

        await col.updateOne(
            { _id: mb._id },
            { $set: { memoryType } }
        );
        updated++;
    }

    console.log(`✅ Updated: ${updated}`);
    console.log(`⚠️  Skipped (could not determine): ${skipped}`);
    if (skippedExamples.length > 0) {
        console.log('\nSkipped examples:');
        skippedExamples.forEach(e => console.log(e));
    }

    // Final count
    const finalMissing = await col.countDocuments({ $or: [{ memoryType: { $exists: false } }, { memoryType: [] }] });
    console.log(`\nFinal missing memoryType: ${finalMissing}`);

    process.exit(0);
}

fixMotherboardDdrTypes().catch(e => { console.error(e); process.exit(1); });
