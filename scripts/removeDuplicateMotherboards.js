const { connectToDatabase } = require('../config/database');

async function removeDuplicateMotherboards() {
    const db = await connectToDatabase();
    const col = db.collection('motherboards');

    const all = await col.find({}).toArray();
    console.log(`Total motherboards: ${all.length}`);

    // Group by normalized name — keep first, remove rest
    const seen = new Map();
    const toRemove = [];

    for (const mb of all) {
        const key = (mb.name || mb.title || '').trim().toLowerCase().replace(/\s+/g, ' ');
        if (!key) continue;

        if (seen.has(key)) {
            toRemove.push(mb);
        } else {
            seen.set(key, mb);
        }
    }

    console.log(`\nFound ${toRemove.length} duplicates:\n`);
    toRemove.forEach(mb => {
        console.log(` - "${(mb.name || '').substring(0, 80)}"`);
    });

    if (toRemove.length === 0) {
        console.log('No duplicates found.');
        process.exit(0);
    }

    const ids = toRemove.map(mb => mb._id);
    const result = await col.deleteMany({ _id: { $in: ids } });

    console.log(`\n✅ Removed: ${result.deletedCount}`);
    console.log(`Remaining: ${all.length - result.deletedCount}`);

    process.exit(0);
}

removeDuplicateMotherboards().catch(e => { console.error(e); process.exit(1); });
