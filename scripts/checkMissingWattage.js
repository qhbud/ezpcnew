const mongoose = require('mongoose');
require('dotenv').config();

async function check() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/pcbuilder');
  const db = mongoose.connection.db;

  const missingTdp = { $or: [{ tdp: { $exists: false } }, { tdp: null }, { tdp: 0 }] };

  const cpus = await db.collection('cpus').find(missingTdp, { projection: { name: 1, tdp: 1 } }).sort({ name: 1 }).toArray();
  const gpus = await db.collection('gpus').find(missingTdp, { projection: { name: 1, tdp: 1 } }).sort({ name: 1 }).toArray();

  console.log('=== CPUs missing wattage (TDP) ===');
  cpus.forEach(c => console.log(' -', c.name));
  console.log('Total:', cpus.length);

  console.log('\n=== GPUs missing wattage (TDP) ===');
  gpus.forEach(g => console.log(' -', g.name));
  console.log('Total:', gpus.length);

  await mongoose.disconnect();
}

check().catch(console.error);
