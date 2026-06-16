// Post price-update sweep: hide components that are no longer sold / have no
// listed price, un-hide ones that came back, and write a daily log of how many
// components we're "losing" (and regaining) per collection.
//
// A component is considered GONE when its most recent N price checks were all
// unavailable / priceless (default N=2). The consecutive-check requirement keeps
// a single flaky scrape (the recurring Amazon `price_not_found` failures) from
// hiding a product that's actually still for sale — it has to miss two nights in
// a row before we hide it. Hidden docs get `hidden:true` (+ hiddenAt/hiddenReason);
// the API filters those out. Restored docs get `hidden:false` (+ restoredAt).
//
// The daily tally is upserted (keyed by YYYY-MM-DD) into the `price_update_log`
// collection AND appended to logs/availability-log.jsonl.
//
// Usage:
//   node scripts/sweepUnavailableComponents.js                 # sweep + log + write
//   node scripts/sweepUnavailableComponents.js --dry-run       # report only, no writes
//   node scripts/sweepUnavailableComponents.js --min-consecutive=3
//   node scripts/sweepUnavailableComponents.js --report        # print recent log, no sweep
//
// DB target follows MONGODB_URI (defaults to .env.atlas = Atlas). Override with
// MONGODB_URI=mongodb://localhost:27017/pcbuilder for the local dev DB.

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.atlas') });
require('dotenv').config();
const fs = require('fs');
const { MongoClient } = require('mongodb');

const DRY_RUN = process.argv.includes('--dry-run');
const REPORT_ONLY = process.argv.includes('--report');
const MIN_CONSECUTIVE = (() => {
    const a = process.argv.find(x => x.startsWith('--min-consecutive='));
    const n = a ? parseInt(a.split('=')[1], 10) : 2;
    return Number.isFinite(n) && n >= 1 ? n : 2;
})();

const LOG_COLLECTION = 'price_update_log';
const LOG_FILE = path.join(__dirname, '..', 'logs', 'availability-log.jsonl');

const realPrice = v => { const n = parseFloat(v); return !isNaN(n) && n > 0; };

// True when a single price check (live doc or a priceHistory entry) shows the
// product as unavailable or without a usable price.
function checkUnavailable(snap) {
    if (!snap) return true;
    if (snap.isAvailable === false) return true;
    return !(realPrice(snap.price) || realPrice(snap.currentPrice));
}

// A product is "gone" only if its last MIN_CONSECUTIVE checks were all
// unavailable. With fewer than that many history entries, fall back to the
// live doc's current state.
function isGone(doc, minConsecutive) {
    const hist = Array.isArray(doc.priceHistory) ? doc.priceHistory : [];
    const recent = hist.slice(-minConsecutive);
    if (recent.length >= minConsecutive) return recent.every(checkUnavailable);
    return checkUnavailable(doc);
}

function isComponentCollection(name) {
    if (name.startsWith('system.')) return false;
    const known = ['motherboards', 'rams', 'storages', 'psus', 'cases', 'coolers', 'addons', 'cpus', 'gpus'];
    return known.includes(name) || name.startsWith('gpus_') || name.startsWith('cpus_');
}

function todayStamp() {
    return new Date().toISOString().slice(0, 10); // YYYY-MM-DD (UTC)
}

async function printReport(db) {
    const docs = await db.collection(LOG_COLLECTION).find({}).sort({ date: -1 }).limit(14).toArray();
    if (!docs.length) { console.log('No availability log entries yet.'); return; }
    console.log(`\nAvailability log — last ${docs.length} day(s) (newest first):\n`);
    console.log('  date         lost  restored  hidden   visible');
    console.log('  ' + '-'.repeat(48));
    docs.forEach(d => {
        const t = d.totals || {};
        console.log(`  ${d.date}   ${String(t.newlyHidden ?? 0).padStart(4)}  ${String(t.restored ?? 0).padStart(8)}  ${String(t.hidden ?? 0).padStart(6)}  ${String(t.visible ?? 0).padStart(8)}`);
    });
    console.log('');
}

(async () => {
    const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/pcbuilder';
    const isAtlas = uri.includes('mongodb+srv');
    const client = new MongoClient(uri);
    await client.connect();
    const db = client.db(process.env.DB_NAME || 'pcbuilder');

    try {
        if (REPORT_ONLY) { await printReport(db); return; }

        const names = (await db.listCollections().toArray())
            .map(c => c.name).filter(isComponentCollection).sort();

        console.log(`${DRY_RUN ? 'DRY RUN — ' : ''}Sweeping ${names.length} collection(s) on ` +
            `${isAtlas ? 'ATLAS' : 'local'} (hide after ${MIN_CONSECUTIVE} consecutive misses)\n`);

        const perCollection = {};
        const totals = { scanned: 0, newlyHidden: 0, restored: 0, hidden: 0, visible: 0 };

        for (const name of names) {
            const col = db.collection(name);
            const docs = await col.find({}, {
                projection: { isAvailable: 1, price: 1, currentPrice: 1, priceHistory: 1, hidden: 1, name: 1, title: 1 }
            }).toArray();

            const stats = { scanned: docs.length, newlyHidden: 0, restored: 0, hidden: 0, visible: 0 };
            const toHide = [], toRestore = [];

            for (const doc of docs) {
                const gone = isGone(doc, MIN_CONSECUTIVE);
                const wasHidden = doc.hidden === true;
                if (gone) {
                    stats.hidden++;
                    if (!wasHidden) { stats.newlyHidden++; toHide.push(doc._id); }
                } else {
                    stats.visible++;
                    if (wasHidden) { stats.restored++; toRestore.push(doc._id); }
                }
            }

            if (!DRY_RUN) {
                if (toHide.length) await col.updateMany({ _id: { $in: toHide } },
                    { $set: { hidden: true, hiddenAt: new Date(), hiddenReason: 'no_price' } });
                if (toRestore.length) await col.updateMany({ _id: { $in: toRestore } },
                    { $set: { hidden: false, restoredAt: new Date() } });
            }

            perCollection[name] = stats;
            Object.keys(totals).forEach(k => totals[k] += stats[k]);

            const flag = stats.newlyHidden ? '  ⬇ ' + stats.newlyHidden + ' lost' : '';
            const back = stats.restored ? '  ⬆ ' + stats.restored + ' back' : '';
            console.log(`  ${name.padEnd(16)} scanned ${String(stats.scanned).padStart(5)}  ` +
                `hidden ${String(stats.hidden).padStart(4)}  visible ${String(stats.visible).padStart(5)}${flag}${back}`);
        }

        console.log(`\nTotals: ${totals.visible} visible, ${totals.hidden} hidden ` +
            `(${totals.newlyHidden} newly lost today, ${totals.restored} restored).`);

        const entry = { date: todayStamp(), runAt: new Date().toISOString(), minConsecutive: MIN_CONSECUTIVE, db: isAtlas ? 'atlas' : 'local', collections: perCollection, totals };

        if (!DRY_RUN) {
            await db.collection(LOG_COLLECTION).updateOne(
                { date: entry.date }, { $set: entry }, { upsert: true });
            try {
                fs.mkdirSync(path.dirname(LOG_FILE), { recursive: true });
                fs.appendFileSync(LOG_FILE, JSON.stringify(entry) + '\n');
            } catch (e) { console.log('  (could not append JSONL log: ' + e.message + ')'); }
            console.log(`\nLogged to '${LOG_COLLECTION}' (date ${entry.date}) and ${path.relative(process.cwd(), LOG_FILE)}.`);
        } else {
            console.log('\n(dry run — nothing written)');
        }
    } finally {
        await client.close().catch(() => {});
    }
})().catch(e => { console.error(e.stack || e.message); process.exit(1); });
