const { connectToDatabase } = require('../config/database');

async function run() {
    const db = await connectToDatabase();
    const col = db.collection('motherboards');

    const total = await col.countDocuments();
    const toRemove = await col.find({ $or: [{ m2Slots: null }, { m2Slots: { $exists: false } }] }).toArray();

    console.log(`Total: ${total}  |  Missing M.2: ${toRemove.length}`);
    toRemove.forEach(mb => console.log(` - "${(mb.name || '').substring(0, 80)}"`));

    if (toRemove.length === 0) { process.exit(0); }

    const ids = toRemove.map(mb => mb._id);
    const result = await col.deleteMany({ _id: { $in: ids } });

    console.log(`\n✅ Removed: ${result.deletedCount}`);
    console.log(`Remaining: ${total - result.deletedCount}`);
    process.exit(0);
}

run().catch(e => { console.error(e); process.exit(1); });
