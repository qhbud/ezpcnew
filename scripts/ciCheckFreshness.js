/**
 * CI helper: reports how many component documents were price-checked recently,
 * and (with --assert-min) fails the job if too few were — used to verify the
 * GitHub Actions price-update actually did work, since updateAllComponentPrices.js
 * itself always exits 0 even on internal failure.
 *
 * Usage:
 *   node scripts/ciCheckFreshness.js                          # report only
 *   node scripts/ciCheckFreshness.js --window-hours=6 --assert-min=1
 *
 * Emits GitHub Actions ::error:: annotations on failure so they surface in the UI.
 */
const { connectToDatabase, getDatabase } = require('../config/database');

const arg = (name, def) => {
  const hit = process.argv.slice(2).find(a => a.startsWith(`--${name}=`));
  return hit ? hit.split('=')[1] : def;
};
const windowHours = Number(arg('window-hours', 6));
const assertMinRaw = arg('assert-min', null);
const assertMin = assertMinRaw === null ? null : Number(assertMinRaw);
const onlyCollection = arg('collection', null); // restrict to one collection (per-collection CI jobs)

const COMPONENT_COLLECTIONS = ['cpus', 'gpus', 'motherboards', 'rams', 'storages', 'psus', 'cases', 'coolers', 'addons'];

(async () => {
  if (!process.env.MONGODB_URI) {
    console.error('::error::MONGODB_URI is not set. Add it under repo Settings → Secrets and variables → Actions.');
    process.exit(1);
  }

  let db;
  try {
    await connectToDatabase();
    db = getDatabase();
  } catch (e) {
    console.error(`::error::Could not connect to MongoDB Atlas: ${e.message}`);
    console.error('Check the MONGODB_URI secret and that Atlas Network Access allows 0.0.0.0/0 (GitHub runner IPs change).');
    process.exit(1);
  }

  const since = new Date(Date.now() - windowHours * 3600 * 1000);
  const present = (await db.listCollections().toArray()).map(c => c.name);

  // GPUs are sharded across per-model `gpus_*` collections (they were never consolidated
  // into a single `gpus` collection like CPUs were), so the logical "gpus" component maps
  // to many physical collections. Group them under one label for counting + reporting.
  const shardsFor = (name) =>
    name === 'gpus'
      ? present.filter(p => p === 'gpus' || p.startsWith('gpus_'))
      : (present.includes(name) ? [name] : []);

  const logical = onlyCollection ? [onlyCollection] : COMPONENT_COLLECTIONS;
  const groups = logical
    .map(name => ({ label: name, names: shardsFor(name) }))
    .filter(g => g.names.length > 0);
  if (onlyCollection && groups.length === 0) {
    console.error(`::error::Collection "${onlyCollection}" not found in database.`);
    process.exit(1);
  }

  console.log(`\n────────────────────────────────────────────────────────────`);
  console.log(`Freshness check @ ${new Date().toISOString()}`);
  console.log(`Counting components price-checked since ${since.toISOString()} (last ${windowHours}h)`);
  console.log(`────────────────────────────────────────────────────────────`);

  let totalRecent = 0, totalDocs = 0;
  for (const { label, names } of groups) {
    let docs = 0, recent = 0;
    for (const name of names) {
      const col = db.collection(name);
      docs += await col.countDocuments();
      recent += await col.countDocuments({
        $or: [{ lastPriceCheck: { $gte: since } }, { updatedAt: { $gte: since } }],
      });
    }
    totalRecent += recent;
    totalDocs += docs;
    console.log(`  ${label.padEnd(13)} ${String(recent).padStart(5)} / ${String(docs).padStart(5)} updated`);
  }
  console.log(`────────────────────────────────────────────────────────────`);
  console.log(`  TOTAL         ${String(totalRecent).padStart(5)} / ${String(totalDocs).padStart(5)} updated in last ${windowHours}h`);
  console.log(`────────────────────────────────────────────────────────────\n`);

  if (assertMin !== null) {
    if (totalRecent < assertMin) {
      console.error(`::error::Only ${totalRecent} component(s) updated in the last ${windowHours}h (expected ≥ ${assertMin}). The price run likely failed — review the "Run the price update" logs above.`);
      process.exit(1);
    }
    console.log(`✅ Verification passed: ${totalRecent} components updated (≥ ${assertMin} required).`);
  }
  process.exit(0);
})().catch(e => {
  console.error(`::error::Freshness check crashed: ${e.message}`);
  process.exit(1);
});
