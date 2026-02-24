const mongoose = require('mongoose');
require('dotenv').config();
async function check() {
  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;
  
  const all = await db.collection('rams').find({}, { projection: { name: 1, speed: 1 } }).limit(10).toArray();
  all.forEach(r => console.log(typeof r.speed, '|', r.speed, '|', r.name?.slice(0,50)));
  
  const numeric = await db.collection('rams').countDocuments({ speed: { $type: 'number' } });
  const str = await db.collection('rams').countDocuments({ speed: { $type: 'string' } });
  const missing = await db.collection('rams').countDocuments({ speed: { $exists: false } });
  console.log('\nSpeed types: number:', numeric, '| string:', str, '| missing:', missing);
  
  await mongoose.disconnect();
}
check().catch(console.error);
