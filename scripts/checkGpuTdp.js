const mongoose = require('mongoose');
require('dotenv').config();

async function check() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/pcbuilder');
  const db = mongoose.connection.db;

  const collections = await db.listCollections().toArray();
  const gpuCols = collections.map(c => c.name).filter(n => n.startsWith('gpus_'));

  console.log(`Checking ${gpuCols.length} GPU collections...\n`);

  const missing = [];

  for (const col of gpuCols.sort()) {
    const docs = await db.collection(col).find(
      { $or: [{ tdp: { $exists: false } }, { tdp: null }, { tdp: 0 }, { tdp: '' }] },
      { projection: { name: 1, tdp: 1 } }
    ).toArray();

    if (docs.length) {
      docs.forEach(d => missing.push({ collection: col, name: d.name, tdp: d.tdp }));
    }
  }

  if (missing.length === 0) {
    console.log('All GPUs have TDP data.');
  } else {
    console.log(`GPUs missing TDP (${missing.length} total):\n`);
    missing.forEach(m => console.log(`  [${m.collection}]  ${m.name}  | tdp: ${JSON.stringify(m.tdp)}`));
  }

  // Spot-check RX 7900 XT collection
  console.log('\n--- RX 7900 XT collection sample ---');
  const xt = await db.collection('gpus_rx_7900_xt').find({}, { projection: { name: 1, tdp: 1 } }).limit(5).toArray();
  xt.forEach(g => console.log(' ', g.name, '| tdp:', g.tdp));

  await mongoose.disconnect();
}

check().catch(console.error);
