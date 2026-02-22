const mongoose = require('mongoose');
require('dotenv').config();

// Typical AIB card lengths in mm (conservative — most popular AIB triple-fan cards)
// Order matters: more specific patterns first
const lengthMap = [
  // Intel Arc Battlemage
  { match: /arc\W*b580/i,              length: 295 },
  { match: /arc\W*b570/i,              length: 280 },
  // Intel Arc Alchemist
  { match: /arc\W*a770/i,              length: 285 },
  { match: /arc\W*a750/i,              length: 280 },
  { match: /arc\W*a580/i,              length: 250 },
  { match: /arc\W*a380/i,              length: 175 },

  // RTX 5000 series
  { match: /rtx\W*5090/i,              length: 355 },
  { match: /rtx\W*5080/i,              length: 345 },
  { match: /rtx\W*5070\W*ti/i,         length: 325 },
  { match: /rtx\W*5070/i,              length: 285 },
  { match: /rtx\W*5060\W*ti/i,         length: 270 },
  { match: /rtx\W*5060/i,              length: 230 },

  // RTX 4000 series
  { match: /rtx\W*4090/i,              length: 350 },
  { match: /rtx\W*4080\W*super/i,      length: 336 },
  { match: /rtx\W*4080/i,              length: 336 },
  { match: /rtx\W*4070\W*ti\W*super/i, length: 325 },
  { match: /rtx\W*4070\W*ti/i,         length: 320 },
  { match: /rtx\W*4070\W*super/i,      length: 295 },
  { match: /rtx\W*4070/i,              length: 285 },
  { match: /rtx\W*4060\W*ti/i,         length: 285 },
  { match: /rtx\W*4060/i,              length: 240 },

  // RTX 3000 series
  { match: /rtx\W*3090\W*ti/i,         length: 340 },
  { match: /rtx\W*3090/i,              length: 336 },
  { match: /rtx\W*3080\W*ti/i,         length: 325 },
  { match: /rtx\W*3080/i,              length: 320 },
  { match: /rtx\W*3070\W*ti/i,         length: 305 },
  { match: /rtx\W*3070/i,              length: 285 },
  { match: /rtx\W*3060\W*ti/i,         length: 280 },
  { match: /rtx\W*3060/i,              length: 280 },
  { match: /rtx\W*3050/i,              length: 240 },

  // RX 7000 series — XTX before XT
  { match: /rx\W*7900\W*xtx/i,         length: 330 },
  { match: /rx\W*7900\W*xt/i,          length: 320 },
  { match: /rx\W*7900\W*gre/i,         length: 300 },
  { match: /rx\W*7800\W*xt/i,          length: 310 },
  { match: /rx\W*7700\W*xt/i,          length: 300 },
  { match: /rx\W*7600\W*xt/i,          length: 265 },
  { match: /rx\W*7600/i,               length: 260 },

  // RX 6000 series
  { match: /rx\W*6950\W*xt/i,          length: 325 },
  { match: /rx\W*6900\W*xt/i,          length: 320 },
  { match: /rx\W*6800\W*xt/i,          length: 310 },
  { match: /rx\W*6800/i,               length: 305 },
  { match: /rx\W*6750\W*xt/i,          length: 300 },
  { match: /rx\W*6700\W*xt/i,          length: 295 },
  { match: /rx\W*6650\W*xt/i,          length: 270 },
  { match: /rx\W*6600\W*xt/i,          length: 265 },
  { match: /rx\W*6600/i,               length: 235 },
  { match: /rx\W*6500\W*xt/i,          length: 200 },
  { match: /rx\W*6400/i,               length: 200 },
];

async function fill() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/pcbuilder');
  const db = mongoose.connection.db;

  const collections = await db.listCollections().toArray();
  const gpuCols = collections.map(c => c.name).filter(n => n.startsWith('gpus_')).sort();

  let totalUpdated = 0;
  let totalSkipped = 0;

  for (const col of gpuCols) {
    const docs = await db.collection(col).find({}, { projection: { _id: 1, name: 1, length: 1 } }).toArray();

    for (const doc of docs) {
      const entry = lengthMap.find(e => e.match.test(doc.name));
      if (entry) {
        await db.collection(col).updateOne({ _id: doc._id }, { $set: { length: entry.length } });
        totalUpdated++;
      } else {
        console.log(`⚠️  No length match: [${col}] ${doc.name}`);
        totalSkipped++;
      }
    }
  }

  console.log(`\nDone. Updated: ${totalUpdated}, Unmatched: ${totalSkipped}`);
  await mongoose.disconnect();
}

fill().catch(console.error);
