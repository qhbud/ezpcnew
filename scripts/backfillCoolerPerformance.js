// Backfill an estimated cooling-capacity score onto live cooler docs so the
// front end can plot a cooler price/performance graph. Computes the same
// derived metric the ingest scraper now produces (see ingestNewComponents.js).
//
// Usage:
//   node scripts/backfillCoolerPerformance.js            # write to DB
//   node scripts/backfillCoolerPerformance.js --dry-run  # preview only
//
// Reads MONGODB_URI from the environment / .env.atlas. Non-destructive: only
// sets performance.estimatedTdp / tdpBasis / noise / airflow and heatpipes.

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.atlas') });
require('dotenv').config();
const { MongoClient } = require('mongodb');
const { parseCoolerFields } = require('./ingestNewComponents');

const DRY_RUN = process.argv.includes('--dry-run');

// Build the text the parser reasons over from whatever the live doc has.
function coolerText(doc) {
  return [
    doc.name, doc.title, doc.rawTitle,
    doc.coolerType, doc.type, doc.brand, doc.manufacturer,
    doc.radiatorSize ? `${doc.radiatorSize} radiator` : '',
    Array.isArray(doc.features) ? doc.features.join(' ') : '',
    doc.description
  ].filter(Boolean).join(' ');
}

(async () => {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/pcbuilder';
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db(process.env.DB_NAME || 'pcbuilder');
  const col = db.collection('coolers');

  const coolers = await col.find({}).toArray();
  console.log(`${DRY_RUN ? 'DRY RUN — ' : ''}Processing ${coolers.length} coolers\n`);

  let updated = 0, rated = 0, estimated = 0, unknown = 0;
  const rows = [];

  for (const doc of coolers) {
    const fields = parseCoolerFields(coolerText(doc));
    const perf = fields.performance;

    if (perf.estimatedTdp == null) { unknown++; }
    else if (perf.tdpBasis === 'rated') { rated++; } else { estimated++; }

    rows.push([
      perf.estimatedTdp == null ? '   ?' : String(perf.estimatedTdp).padStart(4),
      (perf.tdpBasis || 'none').padEnd(9),
      (fields.type || '?').padEnd(7),
      (doc.name || doc.title || '?').slice(0, 60)
    ]);

    if (!DRY_RUN) {
      const set = {
        'performance.estimatedTdp': perf.estimatedTdp,
        'performance.tdpBasis': perf.tdpBasis
      };
      if (perf.tdp != null) set['performance.tdp'] = perf.tdp;
      if (perf.noise != null) set['performance.noise'] = perf.noise;
      if (perf.airflow != null) set['performance.airflow'] = perf.airflow;
      if (fields.heatpipes != null) set.heatpipes = fields.heatpipes;
      await col.updateOne({ _id: doc._id }, { $set: set });
      updated++;
    }
  }

  console.log('Watts  Basis     Type    Name');
  rows.sort((a, b) => Number(b[0]) - Number(a[0])).forEach(r => console.log(r.join('  ')));
  console.log(`\nSummary: rated=${rated} estimated=${estimated} unknown=${unknown}` +
    (DRY_RUN ? ' (no writes)' : ` updated=${updated}`));

  await client.close();
})().catch(e => { console.error(e.stack || e.message); process.exit(1); });
