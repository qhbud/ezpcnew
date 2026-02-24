const { connectToDatabase } = require('../config/database');

async function fixAnomalies() {
    const db = await connectToDatabase();
    const col = db.collection('motherboards');

    const all = await col.find({}).toArray();
    let fixed = 0;

    for (const mb of all) {
        const ff = (mb.formFactor || '').toLowerCase();
        const isITX = ff.includes('itx');
        const isMATX = ff.includes('micro') || ff.includes('matx');

        let update = {};

        // RAM slots: valid values are 2 or 4 (ITX=2, everything else=4)
        const validRam = isITX ? 2 : 4;
        if (!mb.ramSlots || mb.ramSlots < 1 || mb.ramSlots > 4) {
            update.ramSlots = validRam;
        }

        // M.2 slots: 0 is suspicious (nearly every modern board has at least 1)
        // but we'll trust it if it was actually scraped — only override if null/undefined
        if (mb.m2Slots == null) {
            update.m2Slots = isITX ? 1 : (isMATX ? 2 : 3);
        }

        // PCIe slots: 0 makes no sense
        if (!mb.pcieSlots || mb.pcieSlots < 1) {
            update.pcieSlots = isITX ? 1 : (isMATX ? 2 : 3);
        }

        if (Object.keys(update).length > 0) {
            const name = (mb.name || '').substring(0, 70);
            console.log(`Fixing "${name}"`);
            console.log(`  ram:${mb.ramSlots}→${update.ramSlots ?? mb.ramSlots}  m2:${mb.m2Slots}→${update.m2Slots ?? mb.m2Slots}  pcie:${mb.pcieSlots}→${update.pcieSlots ?? mb.pcieSlots}`);
            await col.updateOne({ _id: mb._id }, { $set: update });
            fixed++;
        }
    }

    console.log(`\n✅ Fixed ${fixed} anomalies out of ${all.length} boards`);
    process.exit(0);
}

fixAnomalies().catch(e => { console.error(e); process.exit(1); });
