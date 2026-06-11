/**
 * One-time migration: consolidate per-model GPU subcollections (gpus_rtx_5090, ...)
 * into a single `gpus` collection.
 *
 * Each migrated document gains a `modelCollection` field holding its original
 * subcollection name (e.g. "gpus_rtx_5090"), so the /api/parts/gpus/:collection
 * drill-down route can still filter by model after the migration.
 *
 * SAFE: backs up all subcollection docs to a JSON file first, is idempotent
 * (aborts if `gpus` already has docs unless --force), and does NOT drop the
 * source subcollections — dropping is a separate explicit step after verification.
 *
 * Usage:
 *   node scripts/migrateGpusToSingleCollection.js            # migrate (backup + insert)
 *   node scripts/migrateGpusToSingleCollection.js --force    # migrate even if gpus non-empty
 *   node scripts/migrateGpusToSingleCollection.js --drop     # AFTER verifying: drop gpus_* subcollections
 */
const fs = require('fs');
const path = require('path');
const { connectToDatabase, getDatabase } = require('../config/database');

const FORCE = process.argv.includes('--force');
const DROP = process.argv.includes('--drop');

(async () => {
  await connectToDatabase();
  const db = getDatabase();

  const all = await db.listCollections().toArray();
  const subNames = all.map(c => c.name).filter(n => /^gpus_/.test(n)).sort();

  if (DROP) {
    // Safety: only drop if the single `gpus` collection is populated.
    const gpusCount = await db.collection('gpus').countDocuments();
    if (gpusCount === 0) {
      console.error('❌ Refusing to drop: `gpus` collection is empty. Run the migration first.');
      process.exit(1);
    }
    console.log(`\`gpus\` has ${gpusCount} docs. Dropping ${subNames.length} subcollections...`);
    for (const n of subNames) {
      await db.collection(n).drop().then(() => console.log(`  dropped ${n}`)).catch(e => console.log(`  skip ${n}: ${e.message}`));
    }
    console.log('✅ Subcollections dropped.');
    process.exit(0);
  }

  console.log(`Found ${subNames.length} gpus_* subcollections.`);

  const existing = await db.collection('gpus').countDocuments();
  if (existing > 0 && !FORCE) {
    console.error(`❌ \`gpus\` already has ${existing} docs. Use --force to proceed (may duplicate).`);
    process.exit(1);
  }

  // 1. Backup everything (outside the repo so it isn't committed)
  const backup = {};
  let totalDocs = 0;
  for (const n of subNames) {
    const docs = await db.collection(n).find({}).toArray();
    backup[n] = docs;
    totalDocs += docs.length;
  }
  const backupPath = path.join('C:\\agent2', `gpu-migration-backup-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
  fs.writeFileSync(backupPath, JSON.stringify(backup, null, 2));
  console.log(`Backed up ${totalDocs} docs from ${subNames.length} subcollections → ${backupPath}`);

  // 2. Migrate: insert each doc into `gpus` with modelCollection stamped
  let inserted = 0;
  for (const n of subNames) {
    const docs = backup[n];
    if (!docs.length) continue;
    const stamped = docs.map(d => ({ ...d, modelCollection: n }));
    const result = await db.collection('gpus').insertMany(stamped, { ordered: false });
    inserted += result.insertedCount;
    console.log(`  ${n}: inserted ${result.insertedCount}/${docs.length}`);
  }

  const finalCount = await db.collection('gpus').countDocuments();
  console.log(`\n✅ Migration complete. Inserted ${inserted} docs. \`gpus\` now has ${finalCount} docs.`);
  console.log(`Subcollections still intact. After verifying the app, run with --drop to remove them.`);
  process.exit(0);
})().catch(e => { console.error('ERR', e); process.exit(1); });
