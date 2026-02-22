const mongoose = require('mongoose');
require('dotenv').config();

async function check() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/pcbuilder');
  const db = mongoose.connection.db;

  const rx7900xt = await db.collection('gpus_rx_7900_xt').findOne({ name: /7900 XT.*Renewed/i });
  console.log('RX 7900 XT (Renewed):', rx7900xt?.name);
  console.log('  tdp:', rx7900xt?.tdp, 'W');
  console.log('  length:', rx7900xt?.length, 'mm');

  const collections = await db.listCollections().toArray();
  const gpuCols = collections.map(c => c.name).filter(n => n.startsWith('gpus_'));

  const seen = new Set();
  const overITX = [];
  const overMATX = [];

  for (const col of gpuCols) {
    const docs = await db.collection(col).find({ length: { $gt: 330 } }, { projection: { name: 1, length: 1 } }).toArray();
    docs.forEach(d => {
      const key = d.name?.slice(0, 50) || '';
      if (!seen.has(key)) {
        seen.add(key);
        if (d.length > 340) overMATX.push(d);
        else overITX.push(d);
      }
    });
  }

  console.log('\n--- GPUs > 340mm (too long for most ITX AND mATX cases) ---');
  overMATX.sort((a,b) => b.length - a.length).forEach(d => console.log(`  ${d.length}mm  ${d.name?.slice(0,70)}`));

  console.log('\n--- GPUs 331-340mm (too long for most ITX, borderline mATX) ---');
  overITX.sort((a,b) => b.length - a.length).forEach(d => console.log(`  ${d.length}mm  ${d.name?.slice(0,70)}`));

  await mongoose.disconnect();
}

check().catch(console.error);
