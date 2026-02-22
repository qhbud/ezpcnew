const mongoose = require('mongoose');
require('dotenv').config();

// Official TDP values (AMD PPT / Intel PL1 base TDP)
const tdpMap = [
  // AMD
  { match: /ryzen 5 7600/i,    tdp: 65  },
  { match: /ryzen 7 7700x/i,   tdp: 105 },
  { match: /9700x/i,           tdp: 65  },
  { match: /ryzen 7 9800x3d/i, tdp: 120 },
  { match: /ryzen 9 7950x3d/i, tdp: 120 },
  { match: /ryzen 9 9900x/i,   tdp: 120 },
  { match: /ryzen 9 9950x3d/i, tdp: 170 },
  { match: /9950x/i,           tdp: 170 },
  { match: /9900x/i,           tdp: 120 },
  // Intel
  { match: /i7-13700kf/i,      tdp: 125 },
  { match: /i9-12900/i,        tdp: 65  },
  { match: /i9-13900kf/i,      tdp: 125 },
  { match: /i9-14900ks/i,      tdp: 150 },
  { match: /i9-14900kf/i,      tdp: 125 },
  { match: /i9-14900k/i,       tdp: 125 },
  { match: /ultra 5 245k/i,    tdp: 125 },
  { match: /ultra 9.{0,30}285/i, tdp: 125 },
];

async function fill() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/pcbuilder');
  const db = mongoose.connection.db;

  const missingTdp = { $or: [{ tdp: { $exists: false } }, { tdp: null }, { tdp: 0 }] };
  const cpus = await db.collection('cpus').find(missingTdp, { projection: { _id: 1, name: 1 } }).toArray();

  let updated = 0;
  for (const cpu of cpus) {
    const entry = tdpMap.find(e => e.match.test(cpu.name));
    if (entry) {
      await db.collection('cpus').updateOne({ _id: cpu._id }, { $set: { tdp: entry.tdp } });
      console.log(`✅ ${cpu.name}  →  ${entry.tdp}W`);
      updated++;
    } else {
      console.log(`⚠️  No TDP mapping found for: ${cpu.name}`);
    }
  }

  console.log(`\nDone. Updated ${updated}/${cpus.length} CPUs.`);
  await mongoose.disconnect();
}

fill().catch(console.error);
