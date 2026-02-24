const mongoose = require('mongoose');
require('dotenv').config();

async function check() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/pcbuilder');
  const db = mongoose.connection.db;

  const collections = await db.listCollections().toArray();
  const gpuCollections = collections.filter(c => c.name.startsWith('gpus_'));

  console.log('=== GPU DATA AUDIT ===');
  console.log(`Found ${gpuCollections.length} GPU collections\n`);

  let grandTotal = 0, grandBench = 0, grandPrice = 0, grandLink = 0;
  const allResults = [];

  for (const colInfo of gpuCollections.sort((a, b) => a.name.localeCompare(b.name))) {
    const col = db.collection(colInfo.name);
    const docs = await col.find({}).toArray();
    if (docs.length === 0) continue;

    for (const gpu of docs) {
      grandTotal++;

      const hasBenchmark = gpu.performanceScore !== undefined && gpu.performanceScore !== null && gpu.performanceScore > 0;
      if (hasBenchmark) grandBench++;

      const hasPrice = gpu.price !== undefined && gpu.price !== null && gpu.price > 0;
      if (hasPrice) grandPrice++;

      const hasLink = gpu.sourceUrl !== undefined && gpu.sourceUrl !== null && gpu.sourceUrl !== '';
      if (hasLink) grandLink++;

      const issues = [];
      if (!hasBenchmark) issues.push('NO BENCHMARK');
      if (!hasPrice) issues.push('NO PRICE');
      if (!hasLink) issues.push('NO LINK');

      const status = issues.length === 0 ? 'OK' : 'ISSUE';
      allResults.push({
        status,
        name: gpu.name || 'Unknown',
        collection: colInfo.name,
        price: hasPrice ? gpu.price : null,
        benchmark: hasBenchmark ? gpu.performanceScore : null,
        hasLink,
        link: gpu.sourceUrl || null,
        issues
      });
    }
  }

  // Print per-GPU results grouped
  console.log('--- PER-GPU DETAILS ---\n');
  for (const r of allResults) {
    const icon = r.issues.length === 0 ? '  OK' : '  !!';
    const priceStr = r.price !== null ? `$${r.price}` : 'MISSING';
    const benchStr = r.benchmark !== null ? r.benchmark : 'MISSING';
    const linkStr = r.hasLink ? 'Yes' : 'MISSING';
    console.log(`${icon} ${r.name}`);
    console.log(`     Collection: ${r.collection}`);
    console.log(`     Price: ${priceStr} | Benchmark: ${benchStr} | Link: ${linkStr}`);
    if (r.issues.length > 0) console.log(`     ISSUES: ${r.issues.join(', ')}`);
    console.log('');
  }

  // Summary
  console.log('=== TOTALS ===');
  console.log(`Total GPUs:  ${grandTotal}`);
  console.log(`Benchmarks:  ${grandBench}/${grandTotal} (${grandTotal > 0 ? (grandBench/grandTotal*100).toFixed(1) : 0}%)`);
  console.log(`Prices:      ${grandPrice}/${grandTotal} (${grandTotal > 0 ? (grandPrice/grandTotal*100).toFixed(1) : 0}%)`);
  console.log(`Links:       ${grandLink}/${grandTotal} (${grandTotal > 0 ? (grandLink/grandTotal*100).toFixed(1) : 0}%)`);

  // Issues summary
  const noBench = allResults.filter(r => r.benchmark === null);
  const noPrice = allResults.filter(r => r.price === null);
  const noLink = allResults.filter(r => !r.hasLink);

  if (noBench.length > 0) {
    console.log(`\n--- GPUs MISSING BENCHMARKS (${noBench.length}) ---`);
    noBench.forEach(r => console.log(`  - ${r.name} (${r.collection})`));
  }
  if (noPrice.length > 0) {
    console.log(`\n--- GPUs MISSING PRICES (${noPrice.length}) ---`);
    noPrice.forEach(r => console.log(`  - ${r.name} (${r.collection})`));
  }
  if (noLink.length > 0) {
    console.log(`\n--- GPUs MISSING LINKS (${noLink.length}) ---`);
    noLink.forEach(r => console.log(`  - ${r.name} (${r.collection})`));
  }

  // Also check empty GPU collections
  const emptyColls = [];
  for (const colInfo of gpuCollections) {
    const count = await db.collection(colInfo.name).countDocuments();
    if (count === 0) emptyColls.push(colInfo.name);
  }
  if (emptyColls.length > 0) {
    console.log(`\n--- EMPTY GPU COLLECTIONS (${emptyColls.length}) ---`);
    emptyColls.forEach(c => console.log(`  - ${c}`));
  }

  await mongoose.disconnect();
}

check().catch(e => { console.error(e); process.exit(1); });
