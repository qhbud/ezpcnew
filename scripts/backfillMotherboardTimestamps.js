/**
 * One-time fix: motherboard `lastUpdated` is stale (~9 months) or missing on many
 * docs even though prices are current — the MB price updater appends priceHistory
 * and updates price but never bumps the timestamp. This backfills `lastUpdated`
 * (and `updatedAt`) from each board's most recent priceHistory entry date, so the
 * UI stops showing every motherboard as 9 months stale.
 *
 * Usage: node scripts/backfillMotherboardTimestamps.js
 */
const { connectToDatabase, getDatabase } = require('../config/database');

const toDate = v => { if (!v) return null; const d = v instanceof Date ? v : new Date(v); return isNaN(d) ? null : d; };

(async () => {
  await connectToDatabase();
  const db = getDatabase();
  const mbs = await db.collection('motherboards').find({}).toArray();

  let updated = 0, skipped = 0;
  for (const mb of mbs) {
    // newest priceHistory entry date = the true last-update time
    let newest = null;
    if (Array.isArray(mb.priceHistory)) {
      for (const e of mb.priceHistory) {
        const d = toDate(e && (e.date || e.timestamp || e.day));
        if (d && (!newest || d > newest)) newest = d;
      }
    }
    if (!newest) { skipped++; continue; }

    const cur = toDate(mb.lastUpdated);
    // Only write if missing or older than the newest history entry
    if (!cur || cur < newest) {
      await db.collection('motherboards').updateOne(
        { _id: mb._id },
        { $set: { lastUpdated: newest, updatedAt: newest } }
      );
      updated++;
    } else {
      skipped++;
    }
  }
  console.log(`Motherboards: ${mbs.length} total | lastUpdated backfilled on ${updated} | skipped ${skipped} (already current or no history)`);
  process.exit(0);
})().catch(e => { console.error('ERR', e); process.exit(1); });
