// Scrape real thermal specs (rated TDP, noise dBA, airflow CFM, fan RPM,
// heatpipes, radiator size) from each live cooler's Amazon product page and
// populate them. Product detail pages (feature bullets + spec tables) usually
// list specs the search title doesn't, so this upgrades the derived estimates
// from backfillCoolerPerformance.js to real values where they're published.
//
// Usage:
//   node scripts/populateCoolerThermalData.js               # all coolers, write
//   node scripts/populateCoolerThermalData.js --dry-run     # preview, no writes
//   node scripts/populateCoolerThermalData.js --limit=3     # first 3 only
//
// DB target follows MONGODB_URI (defaults to .env.atlas = Atlas). Override with
// MONGODB_URI=mongodb://localhost:27017/pcbuilder for the local dev DB.

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.atlas') });
require('dotenv').config();
const { MongoClient } = require('mongodb');
const puppeteer = require('puppeteer');
const { parseCoolerFields, extractAmazonPageDetails } = require('./ingestNewComponents');

const DRY_RUN = process.argv.includes('--dry-run');
const LIMIT = (() => {
  const a = process.argv.find(x => x.startsWith('--limit='));
  return a ? parseInt(a.slice('--limit='.length), 10) : Infinity;
})();
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
const sleep = ms => new Promise(r => setTimeout(r, ms));

function pageText(doc, details) {
  const specs = details.specs && typeof details.specs === 'object'
    ? Object.entries(details.specs).map(([k, v]) => `${k} ${v}`).join(' ') : '';
  return [doc.name, doc.title, details.title, (details.features || []).join(' '), specs]
    .filter(Boolean).join(' ');
}

(async () => {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/pcbuilder';
  const isAtlas = uri.includes('mongodb+srv');
  const client = new MongoClient(uri);
  await client.connect();
  const col = client.db(process.env.DB_NAME || 'pcbuilder').collection('coolers');

  const coolers = (await col.find({}).toArray())
    .filter(c => c.sourceUrl || c.productUrl || c.url)
    .slice(0, LIMIT);
  console.log(`${DRY_RUN ? 'DRY RUN — ' : ''}Scraping thermal data for ${coolers.length} coolers ` +
    `(${isAtlas ? 'ATLAS' : 'local'})\n`);

  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const summary = { processed: 0, ratedTdp: 0, noise: 0, airflow: 0, rpm: 0, heatpipes: 0, radiator: 0, failed: 0, updated: 0 };
  let consecutiveBlank = 0;

  try {
    for (const doc of coolers) {
      const url = doc.sourceUrl || doc.productUrl || doc.url;
      const page = await browser.newPage();
      let details = { title: '', features: [], specs: {} };
      try {
        await page.setUserAgent(UA);
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
        await sleep(2000);
        details = await extractAmazonPageDetails(page);
      } catch (e) {
        // fall through with empty details
      } finally {
        await page.close().catch(() => {});
      }

      const blank = !details.title && (!details.features || !details.features.length) &&
        (!details.specs || !Object.keys(details.specs).length);
      if (blank) {
        consecutiveBlank++;
        summary.failed++;
        console.log(`  ✗ ${(doc.name || doc.title || '?').slice(0, 55)} — no page data`);
        if (consecutiveBlank >= 6) { console.log('\n⚠ 6 blank pages in a row — likely bot-blocked, stopping.'); break; }
        await sleep(1500);
        continue;
      }
      consecutiveBlank = 0;
      summary.processed++;

      const f = parseCoolerFields(pageText(doc, details));
      const perf = f.performance;
      const set = {
        'performance.estimatedTdp': perf.estimatedTdp,
        'performance.tdpBasis': perf.tdpBasis,
        thermalDataUpdatedAt: new Date().toISOString()
      };
      const found = [];
      if (perf.tdpBasis === 'rated') { set['performance.tdp'] = perf.tdp; summary.ratedTdp++; found.push(`TDP ${perf.tdp}W`); }
      if (perf.noise != null) { set['performance.noise'] = perf.noise; set['fan.noise'] = perf.noise; summary.noise++; found.push(`${perf.noise}dBA`); }
      if (perf.airflow != null) { set['performance.airflow'] = perf.airflow; set['fan.airflow'] = perf.airflow; summary.airflow++; found.push(`${perf.airflow}CFM`); }
      if (f.fan.speed && f.fan.speed.max != null) { set['fan.speed'] = f.fan.speed; summary.rpm++; found.push(`${f.fan.speed.min ? f.fan.speed.min + '-' : ''}${f.fan.speed.max}RPM`); }
      if (f.heatpipes != null) { set.heatpipes = f.heatpipes; summary.heatpipes++; found.push(`${f.heatpipes}hp`); }
      if (f.radiator && f.radiator.size != null) { set['radiator.size'] = f.radiator.size; summary.radiator++; found.push(`${f.radiator.size}mm rad`); }

      console.log(`  ✓ ${(doc.name || doc.title || '?').slice(0, 55)} — ${found.length ? found.join(', ') : 'no new thermal specs'}`);

      if (!DRY_RUN) { await col.updateOne({ _id: doc._id }, { $set: set }); summary.updated++; }
      await sleep(1500);
    }
  } finally {
    await browser.close().catch(() => {});
    await client.close().catch(() => {});
  }

  console.log('\nSummary:', JSON.stringify(summary));
})().catch(e => { console.error(e.stack || e.message); process.exit(1); });
