// One-off / repeatable cleanup: hide components that are in the wrong category or
// are not real PC-build parts — e.g. external/portable drives saved as internal
// storage, standalone replacement fans saved as cases, DDR3/older RAM. These get
// hidden:true + hiddenReason:'mislabeled' (NOT 'no_price'), so the nightly
// availability sweep leaves them hidden even though they still have a live price.
//
// Detection is title-based and deliberately conservative (a real case that merely
// advertises "Fans Pre-Installed" must NOT be flagged). Always review --dry-run
// output before applying.
//
// Usage:
//   node scripts/flagMislabeledComponents.js --dry-run   # report + samples, no writes
//   node scripts/flagMislabeledComponents.js             # apply (sets hidden:true)
//
// DB target follows MONGODB_URI (defaults to .env.atlas = Atlas). Override with
// MONGODB_URI=mongodb://localhost:27017/pcbuilder for the local dev DB.

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.atlas') });
require('dotenv').config();
const { MongoClient } = require('mongodb');

const DRY_RUN = process.argv.includes('--dry-run');
const titleOf = d => (d.name || d.title || '');
const memTypeOf = d => String(d.memoryType || (d.specifications || {}).memoryType || (d.specifications || {}).ramType || '');

// Strong "this is an external / not-internal drive" signals. Bare "usb" is NOT
// used — plenty of internal drives mention USB in marketing copy.
const STORAGE_EXTERNAL = /\b(external|portable|my passport|my book|elements desktop|canvio|expansion|game drive|flash drive|thumb drive|sd card|micro\s?sd|memory card|enclosure|docking station|rugged|p10 game|easystore)\b/i;
// Internal-drive signals — a genuine internal SSD (esp. M.2 NVMe) can mention
// "expansion"/"game" in PS5 marketing, so never flag a drive that's clearly internal.
const STORAGE_INTERNAL = /\b(nvme|m\.?2|pcie\s*gen|2280|internal)\b/i;
// A real case always identifies itself as a case/tower/chassis or by form factor.
const CASE_KEYWORD = /\b(case|tower|chassis|atx|itx|matx|m-atx|e-atx|sff|htpc)\b/i;
// Standalone fan / accessory product (only meaningful once CASE_KEYWORD is absent).
const CASE_ACCESSORY = /\b(fan|fans|radiator|aio|cooler|heatsink|dust filter|riser|cable|bracket|stand|rgb strip|led strip|controller|hub)\b/i;

const DETECTORS = {
    storages: d => (STORAGE_EXTERNAL.test(titleOf(d)) && !STORAGE_INTERNAL.test(titleOf(d))) ? 'external_drive' : null,
    cases: d => (!CASE_KEYWORD.test(titleOf(d)) && CASE_ACCESSORY.test(titleOf(d))) ? 'not_a_case' : null,
    rams: d => /\bddr[0-3]\b/i.test(titleOf(d)) || /\bddr[0-3]\b/i.test(memTypeOf(d)) ? 'obsolete_ram' : null,
};

(async () => {
    const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/pcbuilder';
    const isAtlas = uri.includes('mongodb+srv');
    const client = new MongoClient(uri);
    await client.connect();
    const db = client.db(process.env.DB_NAME || 'pcbuilder');

    console.log(`${DRY_RUN ? 'DRY RUN — ' : ''}Scanning for mislabeled components on ${isAtlas ? 'ATLAS' : 'local'}\n`);

    let grandTotal = 0;
    try {
        for (const [name, detect] of Object.entries(DETECTORS)) {
            const docs = await db.collection(name).find({}, {
                projection: { name: 1, title: 1, memoryType: 1, specifications: 1, hidden: 1, hiddenReason: 1 }
            }).toArray();

            const hits = [];
            for (const d of docs) {
                const reason = detect(d);
                if (reason && !(d.hidden === true && d.hiddenReason === 'mislabeled')) {
                    hits.push({ _id: d._id, reason, title: titleOf(d) });
                }
            }

            console.log(`${name}: ${hits.length} mislabeled (of ${docs.length})`);
            hits.slice(0, 30).forEach(h => console.log(`   • [${h.reason}] ${h.title.slice(0, 80)}`));
            if (hits.length > 30) console.log(`   … and ${hits.length - 30} more`);

            if (!DRY_RUN && hits.length) {
                const byReason = {};
                hits.forEach(h => (byReason[h.reason] = byReason[h.reason] || []).push(h._id));
                for (const [reason, ids] of Object.entries(byReason)) {
                    await db.collection(name).updateMany(
                        { _id: { $in: ids } },
                        { $set: { hidden: true, hiddenReason: 'mislabeled', mislabelType: reason, mislabeledAt: new Date() } }
                    );
                }
            }
            grandTotal += hits.length;
            console.log('');
        }

        console.log(`${DRY_RUN ? 'Would flag' : 'Flagged'} ${grandTotal} mislabeled component(s) total.${DRY_RUN ? ' (dry run — nothing written)' : ''}`);
    } finally {
        await client.close().catch(() => {});
    }
})().catch(e => { console.error(e.stack || e.message); process.exit(1); });
