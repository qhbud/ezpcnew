const { connectToDatabase } = require('../config/database');

const MISSING = {
    $or: [
        { manufacturer: { $exists: false } },
        { manufacturer: '' },
        { manufacturer: 'Unknown' },
        { manufacturer: null }
    ]
};

async function main() {
    const db = await connectToDatabase();
    for (const col of ['rams', 'psus', 'storages']) {
        const docs = await db.collection(col).find(MISSING, { projection: { name: 1, title: 1 } }).toArray();
        console.log(`\n--- ${col} (${docs.length}) ---`);
        docs.forEach(d => console.log((d.name || d.title || '').substring(0, 100)));
    }
    process.exit(0);
}
main().catch(e => { console.error(e); process.exit(1); });
