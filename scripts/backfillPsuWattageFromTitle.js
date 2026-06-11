/**
 * Backfill missing PSU `wattage` from the product title.
 *
 * Most PSUs encode wattage either explicitly ("650W") or in the model number
 * (Corsair CX650M, RM850x, HX1000i, SF850 ...). A handful of catalog PSUs have
 * a null wattage, which both hides them from the builder and breaks the
 * power-adequacy check. This fills only the missing ones, idempotently.
 *
 * Safe by default: DRY RUN unless --apply is passed. Never overwrites an
 * existing wattage. Skips docs where no confident wattage can be extracted
 * (e.g. items misfiled into the PSU collection).
 *
 * Usage:
 *   node scripts/backfillPsuWattageFromTitle.js           # dry run
 *   node scripts/backfillPsuWattageFromTitle.js --apply   # write changes
 */
const { connectToDatabase, getDatabase } = require('../config/database');

const APPLY = process.argv.includes('--apply');

// Extract a plausible PSU wattage (300–2000W) from a title string.
function extractWattage(title) {
  if (!title) return null;
  // 1) Explicit wattage: "650W", "650 W", "650-Watt"
  let m = title.match(/\b(\d{3,4})\s*[-]?\s*(?:W|Watt|Watts)\b/i);
  if (m) {
    const w = parseInt(m[1], 10);
    if (w >= 300 && w <= 2000) return w;
  }
  // 2) Common PSU series model numbers (Corsair/Seasonic/EVGA/etc.):
  //    CX650M, RM850x, RM1000x, HX1000i, SF850, TX750, AX1600i, GX750, BX650.
  //    The wattage digits are often followed by a trailing letter (650M, 850x,
  //    1000i), so do NOT require a word boundary after them — just stop the
  //    series prefix from swallowing extra digits. Longer prefixes first.
  m = title.match(/\b(?:RMX|RME|RM|HXI|HX|AXI|AX|CX|TXM|TX|GX|BX|SFX|SF|GF|GM|GA|PX|GP)\s?-?\s?(\d{3,4})(?![\d.])/i);
  if (m) {
    const w = parseInt(m[1], 10);
    // Validate as a sane PSU wattage. The %50 check also rejects stray numbers
    // like model years ("(2025)") that aren't clean wattages.
    if (w >= 300 && w <= 2000 && w % 50 === 0) return w;
  }
  return null;
}

(async () => {
  if (!process.env.MONGODB_URI) {
    console.error('MONGODB_URI is not set.');
    process.exit(1);
  }
  await connectToDatabase();
  const db = getDatabase();
  const col = db.collection('psus');

  const missing = await col.find({
    $or: [{ wattage: { $exists: false } }, { wattage: null }, { wattage: '' }],
  }).toArray();

  console.log(`\nPSUs missing wattage: ${missing.length}  (mode: ${APPLY ? 'APPLY' : 'DRY RUN'})`);
  console.log('────────────────────────────────────────────────────────────');

  let resolved = 0, skipped = 0;
  const ops = [];
  for (const p of missing) {
    const title = p.title || p.name || '';
    const w = extractWattage(title);
    if (w) {
      resolved++;
      console.log(`  ✓ ${String(w).padStart(4)}W  ${title.slice(0, 80)}`);
      ops.push({ updateOne: { filter: { _id: p._id }, update: { $set: { wattage: w } } } });
    } else {
      skipped++;
      console.log(`  ✗  ----  ${title.slice(0, 80)}  (no confident wattage — skipped)`);
    }
  }

  console.log('────────────────────────────────────────────────────────────');
  console.log(`Resolved: ${resolved}   Skipped: ${skipped}`);

  if (APPLY && ops.length) {
    const res = await col.bulkWrite(ops);
    console.log(`\n✅ Applied. Modified ${res.modifiedCount} PSU document(s).`);
  } else if (!APPLY) {
    console.log('\n(dry run — re-run with --apply to write these changes)');
  }
  process.exit(0);
})().catch(e => { console.error('ERR', e.message); process.exit(1); });
