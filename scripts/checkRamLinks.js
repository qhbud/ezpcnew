const mongoose = require('mongoose');
require('dotenv').config();
async function check() {
  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;

  const all = await db.collection('rams').find({}, { projection: { name: 1, sourceUrl: 1, productUrl: 1, asin: 1 } }).toArray();

  const bad = all.filter(r => {
    const url = r.sourceUrl || r.productUrl || '';
    return !url || url.includes('localhost') || url === '#' || url === '' || !url.startsWith('http');
  });

  const noAsin = bad.filter(r => !r.asin);
  const hasAsin = bad.filter(r => r.asin);

  console.log(`Total RAM: ${all.length}`);
  console.log(`Bad/missing links: ${bad.length}`);
  console.log(`  - With ASIN (can rebuild URL): ${hasAsin.length}`);
  console.log(`  - No ASIN (harder to fix): ${noAsin.length}`);

  console.log('\n--- Bad links WITH asin ---');
  hasAsin.forEach(r => console.log(`  ASIN:${r.asin}  url:${r.sourceUrl || r.productUrl || '(none)'}  | ${r.name?.slice(0,60)}`));

  console.log('\n--- Bad links WITHOUT asin ---');
  noAsin.forEach(r => console.log(`  url:${r.sourceUrl || r.productUrl || '(none)'}  | ${r.name?.slice(0,60)}`));

  await mongoose.disconnect();
}
check().catch(console.error);
