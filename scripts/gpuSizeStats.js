const mongoose = require('mongoose');
require('dotenv').config();

async function check() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/pcbuilder');
  const db = mongoose.connection.db;

  const collections = await db.listCollections().toArray();
  const gpuCols = collections.map(c => c.name).filter(n => n.startsWith('gpus_'));

  let total = 0;
  let tooLongITX = 0;  // > 300mm
  let tooLongMATX = 0; // > 340mm

  const matxOffenders = {};
  const itxOnlyOffenders = {};

  for (const col of gpuCols) {
    const docs = await db.collection(col).find({}, { projection: { name: 1, length: 1 } }).toArray();
    total += docs.length;

    for (const d of docs) {
      const len = d.length || 0;
      if (len > 340) {
        tooLongMATX++;
        tooLongITX++;
        const key = col.replace('gpus_', '').toUpperCase();
        matxOffenders[key] = (matxOffenders[key] || 0) + 1;
      } else if (len > 300) {
        tooLongITX++;
        const key = col.replace('gpus_', '').toUpperCase();
        itxOnlyOffenders[key] = (itxOnlyOffenders[key] || 0) + 1;
      }
    }
  }

  const pctITX = ((tooLongITX / total) * 100).toFixed(1);
  const pctMATX = ((tooLongMATX / total) * 100).toFixed(1);

  console.log(`Total GPU listings: ${total}`);
  console.log(`\nToo long for many ITX (>300mm): ${tooLongITX} (${pctITX}%)`);
  console.log(`Too long for most mATX (>340mm): ${tooLongMATX} (${pctMATX}%)`);

  console.log('\nModels too big for mATX (>340mm):');
  Object.entries(matxOffenders).sort((a,b) => b[1]-a[1]).forEach(([k,v]) => console.log(`  ${k}: ${v} listings`));

  console.log('\nModels too big for ITX only (301-340mm):');
  Object.entries(itxOnlyOffenders).sort((a,b) => b[1]-a[1]).forEach(([k,v]) => console.log(`  ${k}: ${v} listings`));

  await mongoose.disconnect();
}

check().catch(console.error);
