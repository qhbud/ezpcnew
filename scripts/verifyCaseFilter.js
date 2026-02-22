const mongoose = require('mongoose');
require('dotenv').config();

async function check() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/pcbuilder');
  const db = mongoose.connection.db;

  const allCases = await db.collection('cases').find({ currentPrice: { $gt: 0 } }).toArray();

  function isITX(c) {
    const ffs = Array.isArray(c.formFactor) ? c.formFactor : [c.formFactor || ''];
    return ffs.some(ff => { const u = (ff||'').toUpperCase().replace(/-/g,'').replace(/\s+/g,''); return u.includes('ITX') && !u.includes('ATX'); });
  }
  function isMATX(c) {
    const ffs = Array.isArray(c.formFactor) ? c.formFactor : [c.formFactor || ''];
    return ffs.some(ff => { const u = (ff||'').toUpperCase().replace(/-/g,'').replace(/\s+/g,''); return u.includes('MATX') || u.includes('MICROATX'); });
  }

  const itxCases = allCases.filter(isITX);
  const matxCases = allCases.filter(isMATX);

  // Simulate: RTX 4090 selected (length: 350mm)
  const gpuLength = 350;
  const filteredForGpu = allCases.filter(c => {
    if (isITX(c) && gpuLength > 330) return false;
    if (isMATX(c) && gpuLength > 340) return false;
    return true;
  });

  console.log(`Total cases: ${allCases.length}`);
  console.log(`ITX cases: ${itxCases.length}`);
  console.log(`mATX cases: ${matxCases.length}`);
  console.log(`\nSimulation: RTX 4090 selected (${gpuLength}mm)`);
  console.log(`Cases after GPU size filter: ${filteredForGpu.length} (removed ${allCases.length - filteredForGpu.length} too-small cases)`);
  console.log(`ITX cases removed: ${itxCases.filter(c => gpuLength > 330).length}`);
  console.log(`mATX cases removed: ${matxCases.filter(c => gpuLength > 340).length}`);

  await mongoose.disconnect();
}

check().catch(console.error);
