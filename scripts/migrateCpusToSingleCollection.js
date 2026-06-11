/**
 * One-time migration: consolidate per-model CPU subcollections (cpus_intel_core_i9, ...)
 * into the single `cpus` collection.
 *
 * Unlike the GPU migration, the main `cpus` collection is ALREADY populated, so this
 * DEDUPES: a subcollection doc is only inserted if no doc with the same sourceUrl or
 * normalized name/title already exists in `cpus`. Each inserted doc gains a
 * `modelCollection` field (e.g. "cpus_intel_core_i9") for parity with GPUs.
 *
 * SAFE: backs up everything first, idempotent (dedup prevents re-inserting), and does
 * NOT drop subcollections — dropping is a separate explicit --drop step after verification.
 *
 * Usage:
 *   node scripts/migrateCpusToSingleCollection.js          # backup + dedup-merge
 *   node scripts/migrateCpusToSingleCollection.js --drop   # AFTER verifying: drop cpus_* subcollections
 */
const fs = require('fs');
const path = require('path');
const { connectToDatabase, getDatabase } = require('../config/database');

const DROP = process.argv.includes('--drop');
const norm = s => String(s || '').toLowerCase().replace(/\s+/g, ' ').trim();

(async () => {
  await connectToDatabase();
  const db = getDatabase();

  const all = await db.listCollections().toArray();
  const subNames = all.map(c => c.name).filter(n => /^cpus_/.test(n)).sort();

  if (DROP) {
    const cpusCount = await db.collection('cpus').countDocuments();
    if (cpusCount === 0) {
      console.error('❌ Refusing to drop: `cpus` collection is empty. Run the migration first.');
      process.exit(1);
    }
    console.log(`\`cpus\` has ${cpusCount} docs. Dropping ${subNames.length} subcollections...`);
    for (const n of subNames) {
      await db.collection(n).drop().then(() => console.log(`  dropped ${n}`)).catch(e => console.log(`  skip ${n}: ${e.message}`));
    }
    console.log('✅ Subcollections dropped.');
    process.exit(0);
  }

  console.log(`Found ${subNames.length} cpus_* subcollections.`);

  // 1. Backup main cpus + all subcollections (outside the repo)
  const backup = { cpus: await db.collection('cpus').find({}).toArray() };
  for (const n of subNames) backup[n] = await db.collection(n).find({}).toArray();
  const totalBackup = Object.values(backup).reduce((s, a) => s + a.length, 0);
  const backupPath = path.join('C:\\agent2', `cpu-migration-backup-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
  fs.writeFileSync(backupPath, JSON.stringify(backup, null, 2));
  console.log(`Backed up ${totalBackup} docs (main cpus + ${subNames.length} subcollections) → ${backupPath}`);

  // 2. Build dedup sets from the existing main `cpus` docs
  const seenUrls = new Set();
  const seenNames = new Set();
  for (const d of backup.cpus) {
    if (d.sourceUrl) seenUrls.add(d.sourceUrl);
    seenNames.add(norm(d.name || d.title));
  }

  // 3. Dedup-merge subcollection docs into `cpus`
  let inserted = 0, skipped = 0;
  for (const n of subNames) {
    for (const d of backup[n]) {
      const url = d.sourceUrl;
      const nm = norm(d.name || d.title);
      const dup = (url && seenUrls.has(url)) || (nm && seenNames.has(nm));
      if (dup) { skipped++; continue; }
      const { _id, ...rest } = d; // let Mongo assign a fresh _id to avoid collisions
      await db.collection('cpus').insertOne({ ...rest, modelCollection: n });
      if (url) seenUrls.add(url);
      if (nm) seenNames.add(nm);
      inserted++;
    }
  }

  const finalCount = await db.collection('cpus').countDocuments();
  console.log(`\n✅ Migration complete. Inserted ${inserted} distinct, skipped ${skipped} duplicates. \`cpus\` now has ${finalCount} docs.`);
  console.log(`Subcollections still intact. After verifying the app, run with --drop to remove them.`);
  process.exit(0);
})().catch(e => { console.error('ERR', e); process.exit(1); });
