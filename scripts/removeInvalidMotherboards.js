const { connectToDatabase } = require('../config/database');

async function removeInvalidMotherboards() {
    const db = await connectToDatabase();
    const col = db.collection('motherboards');

    const all = await col.find({}).toArray();

    const toRemove = all.filter(mb => {
        const ff = (mb.formFactor || '').toString().trim();
        const sock = (mb.socket || '').toString().trim();
        const chip = (mb.chipset || '').toString().trim();
        const mem = mb.memoryType;
        const memOk = Array.isArray(mem) ? mem.length > 0 : !!mem;

        const ffBad = !ff || ff === 'Unknown' || ff === 'unknown';
        const sockBad = !sock || sock === 'Unknown' || sock === 'unknown';
        const chipBad = !chip || chip === 'Unknown' || chip === 'unknown';
        const memBad = !memOk;

        return ffBad || sockBad || chipBad || memBad;
    });

    console.log(`Found ${toRemove.length} motherboards to remove (out of ${all.length} total)\n`);

    toRemove.forEach(mb => {
        const ff = mb.formFactor || 'MISSING';
        const sock = mb.socket || 'MISSING';
        const chip = mb.chipset || 'MISSING';
        const mem = mb.memoryType || 'MISSING';
        console.log(` - "${(mb.name || '').substring(0, 70)}" | ff:${ff} | sock:${sock} | chip:${chip} | mem:${JSON.stringify(mem)}`);
    });

    if (toRemove.length === 0) {
        console.log('Nothing to remove.');
        process.exit(0);
    }

    const ids = toRemove.map(mb => mb._id);
    const result = await col.deleteMany({ _id: { $in: ids } });

    console.log(`\n✅ Removed: ${result.deletedCount}`);
    console.log(`Remaining: ${all.length - result.deletedCount}`);

    process.exit(0);
}

removeInvalidMotherboards().catch(e => { console.error(e); process.exit(1); });
