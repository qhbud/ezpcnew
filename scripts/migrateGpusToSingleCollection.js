// Consolidate all per-model `gpus_*` shard collections into a single `gpus`
// collection (mirrors the earlier CPU consolidation into `cpus`). Each migrated
// doc keeps a `modelCollection` field = its original shard name so the original
// grouping is never lost; `gpuModel` (already present on GPU docs, e.g. "RTX 4090")
// remains the model key the API/UI group on.
//
//   node scripts/migrateGpusToSingleCollection.js                 # dry run
//   node scripts/migrateGpusToSingleCollection.js --commit        # copy shards -> gpus
//   node scripts/migrateGpusToSingleCollection.js --commit --drop-shards  # also delete shards
//
// Copy-first + verify + JSON backups; --drop-shards is destructive and only acts
// after the `gpus` count matches the summed shard count. Loads .env.atlas first
// (Atlas) unless MONGODB_URI is already set.
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.atlas') });
require('dotenv').config();
const { MongoClient } = require('mongodb');

const TARGET = 'gpus';
const BACKUP_DIR = process.env.GPU_BACKUP_DIR || 'C:\\agent2\\gpu-consolidation-backup';

function parseArgs(argv) {
  const o = { commit: false, dropShards: false };
  for (const a of argv) {
    if (a === '--commit') o.commit = true;
    else if (a === '--drop-shards') o.dropShards = true;
  }
  return o;
}

// Derive a "RTX 4090"-style model from a shard name, used only to backfill
// gpuModel when a doc is somehow missing it.
function modelFromShardName(name) {
  return name
    .replace(/^gpus_/, '')
    .split('_')
    .map((tok) => (/^(rtx|rx|gtx|arc)$/i.test(tok) ? tok.toUpperCase() : (/^[a-z]+$/i.test(tok) ? tok.toUpperCase() : tok)))
    .join(' ')
    .trim();
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const mode = args.dropShards ? 'COMMIT + DROP SHARDS' : (args.commit ? 'COMMIT' : 'DRY RUN');
  console.log(`GPU consolidation — mode: ${mode}\n`);

  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  const db = client.db(process.env.DB_NAME || 'pcbuilder');

  const shardNames = (await db.listCollections().toArray())
    .map((c) => c.name)
    .filter((n) => /^gpus_/.test(n))
    .sort();

  if (shardNames.length === 0) {
    console.log('No gpus_* shard collections found — nothing to migrate.');
    await client.close();
    return;
  }

  const target = db.collection(TARGET);
  const existingIds = new Set((await target.find({}, { projection: { _id: 1 } }).toArray()).map((d) => String(d._id)));
  console.log(`Target \`${TARGET}\` currently holds ${existingIds.size} docs.\n`);

  let totalShardDocs = 0;
  let totalToInsert = 0;
  let totalInserted = 0;
  const perShard = [];

  if (args.commit) fs.mkdirSync(BACKUP_DIR, { recursive: true });

  for (const shard of shardNames) {
    const docs = await db.collection(shard).find({}).toArray();
    totalShardDocs += docs.length;

    // Tag each doc with its origin + ensure gpuModel is present.
    const prepared = docs.map((d) => ({
      ...d,
      modelCollection: d.modelCollection || shard,
      gpuModel: d.gpuModel || modelFromShardName(shard)
    }));

    const toInsert = prepared.filter((d) => !existingIds.has(String(d._id)));
    totalToInsert += toInsert.length;
    perShard.push({ shard, docs: docs.length, newToTarget: toInsert.length });

    if (args.commit) {
      // Backup the raw shard before any write.
      fs.writeFileSync(path.join(BACKUP_DIR, `${shard}.json`), JSON.stringify(docs, null, 2));
      if (toInsert.length) {
        const res = await target.insertMany(toInsert, { ordered: false });
        totalInserted += res.insertedCount;
        toInsert.forEach((d) => existingIds.add(String(d._id)));
      }
    }
  }

  console.log('Per-shard:');
  for (const s of perShard) console.log(`  ${s.shard.padEnd(24)} ${String(s.docs).padStart(4)} docs  (${s.newToTarget} new to ${TARGET})`);
  console.log(`\nShards: ${shardNames.length} | total shard docs: ${totalShardDocs} | would-insert: ${totalToInsert}`);

  if (args.commit) {
    const finalCount = await target.countDocuments({});
    console.log(`Inserted: ${totalInserted} | \`${TARGET}\` now holds: ${finalCount}`);
    console.log(`Backups written to: ${BACKUP_DIR}`);

    if (args.dropShards) {
      // Safety gate: only drop once the target holds at least the summed shard docs.
      if (finalCount >= totalShardDocs) {
        console.log('\nDropping shard collections…');
        for (const shard of shardNames) { await db.collection(shard).drop().catch((e) => console.warn(`  drop ${shard} failed: ${e.message}`)); console.log(`  dropped ${shard}`); }
        console.log('All gpus_* shards dropped.');
      } else {
        console.log(`\n⚠️  Refusing to drop shards: \`${TARGET}\` (${finalCount}) < summed shard docs (${totalShardDocs}).`);
      }
    } else {
      console.log('\n(Shards kept. Re-run with --drop-shards after verifying the site, to delete them.)');
    }
  } else {
    console.log('\n(Dry run — re-run with --commit to copy into `gpus`.)');
  }

  await client.close();
}

main().catch((e) => { console.error('ERR', e.stack || e.message); process.exit(1); });
