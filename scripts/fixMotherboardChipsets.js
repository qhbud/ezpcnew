const { connectToDatabase } = require('../config/database');

// Known chipset keywords to detect from name — ordered most specific first
const CHIPSET_PATTERNS = [
    // LGA1851
    'Z890', 'B860', 'H810',
    // LGA1700
    'Z790', 'Z690', 'Z690', 'H770', 'H670', 'B760', 'B660', 'H610', 'Q670',
    // AM5
    'X870E', 'X870', 'B850', 'B650E', 'B650', 'X670E', 'X670', 'A620',
    // AM4
    'X570', 'B550', 'X470', 'B450', 'A520', 'B350', 'X370', 'A320',
];

function detectChipset(name) {
    const n = (name || '').toUpperCase();
    for (const chipset of CHIPSET_PATTERNS) {
        // Match as a word boundary so "B650" doesn't match "B650E" unexpectedly
        const regex = new RegExp(`(^|\\s|/)${chipset}(\\s|$|/|\\.|,|-)`, 'i');
        if (regex.test(n) || n.includes(chipset)) {
            return chipset;
        }
    }
    return null;
}

async function fixMotherboardChipsets() {
    const db = await connectToDatabase();
    const col = db.collection('motherboards');

    const all = await col.find({}).toArray();
    const missing = all.filter(d => {
        if (!d.chipset) return true;
        if (d.chipset === '' || d.chipset === 'Unknown' || d.chipset === 'unknown') return true;
        return false;
    });

    const chipsetCounts = {};
    all.forEach(d => { const c = d.chipset || 'MISSING'; chipsetCounts[c] = (chipsetCounts[c] || 0) + 1; });
    console.log('Current chipset distribution:');
    console.log(JSON.stringify(chipsetCounts, null, 2));
    console.log(`\nFound ${missing.length} motherboards with unknown/missing chipset\n`);

    let updated = 0;
    let skipped = 0;
    const skippedList = [];

    for (const mb of missing) {
        const chipset = detectChipset(mb.name || mb.title || '');

        if (!chipset) {
            skipped++;
            if (skippedList.length < 10) {
                skippedList.push(`  - "${(mb.name || '').substring(0, 80)}" | socket:${mb.socket}`);
            }
            continue;
        }

        await col.updateOne({ _id: mb._id }, { $set: { chipset } });
        updated++;
    }

    console.log(`✅ Updated: ${updated}`);
    console.log(`⚠️  Skipped: ${skipped}`);
    if (skippedList.length > 0) {
        console.log('\nSkipped examples:');
        skippedList.forEach(e => console.log(e));
    }

    const finalAll = await col.find({}, { projection: { chipset: 1 } }).toArray();
    const finalCounts = {};
    finalAll.forEach(d => { const c = d.chipset || 'MISSING'; finalCounts[c] = (finalCounts[c] || 0) + 1; });
    console.log('\nFinal chipset distribution:');
    console.log(JSON.stringify(finalCounts, null, 2));

    process.exit(0);
}

fixMotherboardChipsets().catch(e => { console.error(e); process.exit(1); });
