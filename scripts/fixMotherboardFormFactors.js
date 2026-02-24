const { connectToDatabase } = require('../config/database');

function detectFormFactor(name, chipset) {
    const n = (name || '').toUpperCase();
    const c = (chipset || '').toUpperCase();

    // Check most specific first
    if (n.includes('MINI-ITX') || n.includes('MINI ITX') || n.includes('MINIITX') || n.includes('ITX')) {
        return 'Mini-ITX';
    }
    if (n.includes('E-ATX') || n.includes('EATX') || n.includes('EXTENDED ATX')) {
        return 'E-ATX';
    }
    if (n.includes('MICRO-ATX') || n.includes('MICRO ATX') || n.includes('MICROATX') ||
        n.includes('M-ATX') || n.includes('MATX')) {
        return 'Micro-ATX';
    }
    if (n.includes('ATX')) {
        return 'ATX';
    }

    // Chipset suffix: e.g. B760M, A520M, B650M → Micro-ATX
    if (/[A-Z]\d+M(\s|$|-|_)/.test(c) || c.endsWith('M')) {
        return 'Micro-ATX';
    }

    // Name contains chipset with M suffix: "B760M", "A520M", "B650M"
    if (/[A-Z]\d+M(\s|$|-|_)/.test(n)) {
        return 'Micro-ATX';
    }

    return null;
}

async function fixMotherboardFormFactors() {
    const db = await connectToDatabase();
    const col = db.collection('motherboards');

    const all = await col.find({}).toArray();
    const missing = all.filter(d => {
        if (!d.formFactor) return true;
        if (d.formFactor === '' || d.formFactor === 'Unknown' || d.formFactor === 'unknown') return true;
        return false;
    });

    // Also check existing form factors for consistency
    const formFactorCounts = {};
    all.forEach(d => { const f = d.formFactor || 'MISSING'; formFactorCounts[f] = (formFactorCounts[f] || 0) + 1; });
    console.log('Current form factor distribution:');
    console.log(JSON.stringify(formFactorCounts, null, 2));
    console.log(`\nFound ${missing.length} motherboards missing formFactor (out of ${all.length} total)\n`);

    let updated = 0;
    let skipped = 0;
    const skippedList = [];

    for (const mb of missing) {
        const formFactor = detectFormFactor(mb.name || mb.title || '', mb.chipset || '');

        if (!formFactor) {
            skipped++;
            if (skippedList.length < 10) {
                skippedList.push(`  - "${(mb.name || '').substring(0, 80)}" | chipset:${mb.chipset}`);
            }
            continue;
        }

        await col.updateOne({ _id: mb._id }, { $set: { formFactor } });
        updated++;
    }

    console.log(`✅ Updated: ${updated}`);
    console.log(`⚠️  Skipped (could not detect): ${skipped}`);
    if (skippedList.length > 0) {
        console.log('\nSkipped examples:');
        skippedList.forEach(e => console.log(e));
    }

    // Final distribution
    const finalAll = await col.find({}, { projection: { formFactor: 1 } }).toArray();
    const finalCounts = {};
    finalAll.forEach(d => { const f = d.formFactor || 'MISSING'; finalCounts[f] = (finalCounts[f] || 0) + 1; });
    console.log('\nFinal form factor distribution:');
    console.log(JSON.stringify(finalCounts, null, 2));

    process.exit(0);
}

fixMotherboardFormFactors().catch(e => { console.error(e); process.exit(1); });
