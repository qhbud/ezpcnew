const { connectToDatabase } = require('../config/database');

/**
 * Extract M.2 slot count from the board name/title.
 * Many boards explicitly say "Quad M.2", "3X M.2", "Dual M.2", etc.
 */
function detectM2FromName(name) {
    const n = (name || '').toUpperCase();

    // Explicit word forms: "Quad M.2", "Triple M.2", "Dual M.2"
    if (/\bQUAD\s+M\.?2\b/.test(n))   return 4;
    if (/\bTRIPLE\s+M\.?2\b/.test(n)) return 3;
    if (/\bDUAL\s+M\.?2\b/.test(n))   return 2;
    if (/\bSINGLE\s+M\.?2\b/.test(n)) return 1;

    // Numeric forms: "4X M.2", "4 M.2", "3x M.2"
    const numMatch = n.match(/(\d+)\s*[Xx×]?\s*M\.?2/);
    if (numMatch) {
        const val = parseInt(numMatch[1]);
        if (val >= 1 && val <= 8) return val;
    }

    return null;
}


async function fixM2SlotCounts() {
    const db = await connectToDatabase();
    const col = db.collection('motherboards');
    const all = await col.find({}).toArray();

    let updated = 0;
    let unchanged = 0;

    for (const mb of all) {
        const current = mb.m2Slots;
        const name = mb.name || mb.title || '';

        // Try to get value from name only — no defaults
        const fromName = detectM2FromName(name);

        let newVal;
        if (fromName !== null) {
            newVal = fromName;      // name is authoritative
        } else {
            newVal = null;          // unknown — leave blank
        }

        // Treat stored 0 as "not found" (same as null)
        const normalizedCurrent = (current === 0) ? null : current;

        if (newVal !== normalizedCurrent) {
            const shortName = name.substring(0, 65);
            console.log(`"${shortName}"`);
            console.log(`  m2: ${current} → ${newVal !== null ? newVal + ' (from name)' : 'null (blank)'}`);
            await col.updateOne({ _id: mb._id }, { $set: { m2Slots: newVal } });
            updated++;
        } else {
            unchanged++;
        }
    }

    console.log(`\n✅ Updated: ${updated}`);
    console.log(`   Unchanged: ${unchanged}`);
    process.exit(0);
}

fixM2SlotCounts().catch(e => { console.error(e); process.exit(1); });
