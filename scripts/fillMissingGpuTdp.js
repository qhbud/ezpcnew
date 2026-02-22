const mongoose = require('mongoose');
require('dotenv').config();

// Order matters — more specific patterns first
// \W* between brand and model handles ™, ®, spaces, etc.
const tdpMap = [
  // Intel Arc Battlemage
  { match: /arc\W*b580/i,           tdp: 190 },
  { match: /arc\W*b570/i,           tdp: 150 },
  // Intel Arc Alchemist
  { match: /arc\W*a770/i,           tdp: 225 },
  { match: /arc\W*a750/i,           tdp: 225 },
  { match: /arc\W*a580/i,           tdp: 185 },
  { match: /arc\W*a380/i,           tdp: 75  },

  // RTX 5000 series
  { match: /rtx\W*5090/i,           tdp: 575 },
  { match: /rtx\W*5080/i,           tdp: 360 },
  { match: /rtx\W*5070\W*ti/i,      tdp: 300 },
  { match: /rtx\W*5070/i,           tdp: 250 },
  { match: /rtx\W*5060\W*ti/i,      tdp: 180 },
  { match: /rtx\W*5060/i,           tdp: 150 },

  // RTX 4000 series
  { match: /rtx\W*4090/i,           tdp: 450 },
  { match: /rtx\W*4080\W*super/i,   tdp: 320 },
  { match: /rtx\W*4080/i,           tdp: 320 },
  { match: /rtx\W*4070\W*ti\W*super/i, tdp: 285 },
  { match: /rtx\W*4070\W*ti/i,      tdp: 285 },
  { match: /rtx\W*4070\W*super/i,   tdp: 220 },
  { match: /rtx\W*4070/i,           tdp: 200 },
  { match: /rtx\W*4060\W*ti/i,      tdp: 160 },
  { match: /rtx\W*4060/i,           tdp: 115 },

  // RTX 3000 series
  { match: /rtx\W*3090\W*ti/i,      tdp: 450 },
  { match: /rtx\W*3090/i,           tdp: 350 },
  { match: /rtx\W*3080\W*ti/i,      tdp: 350 },
  { match: /rtx\W*3080\W*12/i,      tdp: 350 },
  { match: /rtx\W*3080/i,           tdp: 320 },
  { match: /rtx\W*3070\W*ti/i,      tdp: 290 },
  { match: /rtx\W*3070/i,           tdp: 220 },
  { match: /rtx\W*3060\W*ti/i,      tdp: 200 },
  { match: /rtx\W*3060/i,           tdp: 170 },
  { match: /rtx\W*3050/i,           tdp: 130 },

  // RX 7000 series — XTX before XT
  { match: /rx\s+7900\s*xtx/i,      tdp: 355 },
  { match: /rx\s+7900\s*xt/i,       tdp: 315 },
  { match: /rx\s+7900\s*gre/i,      tdp: 260 },
  { match: /rx\s+7800\s*xt/i,       tdp: 263 },
  { match: /rx\s+7700\s*xt/i,       tdp: 245 },
  { match: /rx\s+7600\s*xt/i,       tdp: 190 },
  { match: /rx\s+7600/i,            tdp: 165 },

  // RX 6000 series — most specific first
  { match: /rx\s+6950\s*xt/i,       tdp: 335 },
  { match: /rx\s+6900\s*xt/i,       tdp: 300 },
  { match: /rx\s+6800\s*xt/i,       tdp: 300 },
  { match: /rx\s+6800/i,            tdp: 250 },
  { match: /rx\s+6750\s*xt/i,       tdp: 250 },
  { match: /rx\s+6700\s*xt/i,       tdp: 230 },
  { match: /rx\s+6650\s*xt/i,       tdp: 180 },
  { match: /rx\s+6600\s*xt/i,       tdp: 160 },
  { match: /rx\s+6600/i,            tdp: 132 },
  { match: /rx\s+6500\s*xt/i,       tdp: 107 },
  { match: /rx\s+6400/i,            tdp: 53  },
];

async function fill() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/pcbuilder');
  const db = mongoose.connection.db;

  const collections = await db.listCollections().toArray();
  const gpuCols = collections.map(c => c.name).filter(n => n.startsWith('gpus_')).sort();

  const missingTdp = { $or: [{ tdp: { $exists: false } }, { tdp: null }, { tdp: 0 }, { tdp: '' }] };

  let totalUpdated = 0;
  let totalSkipped = 0;

  for (const col of gpuCols) {
    const docs = await db.collection(col).find(missingTdp, { projection: { _id: 1, name: 1 } }).toArray();
    if (!docs.length) continue;

    for (const doc of docs) {
      const entry = tdpMap.find(e => e.match.test(doc.name));
      if (entry) {
        await db.collection(col).updateOne({ _id: doc._id }, { $set: { tdp: entry.tdp } });
        console.log(`✅ [${col}] ${doc.name}  →  ${entry.tdp}W`);
        totalUpdated++;
      } else {
        console.log(`⚠️  [${col}] No match: ${doc.name}`);
        totalSkipped++;
      }
    }
  }

  console.log(`\nDone. Updated: ${totalUpdated}, Unmatched: ${totalSkipped}`);
  await mongoose.disconnect();
}

fill().catch(console.error);
