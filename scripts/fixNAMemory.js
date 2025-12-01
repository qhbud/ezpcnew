const { connectToDatabase, getDatabase } = require('../config/database');

// VRAM fallback lookup table - COMPLETE for all GPU models
function getStandardVRAM(gpuModel) {
  const vramTable = {
    // RTX 50 Series
    'RTX 5090': { size: 32, type: 'GDDR7' },
    'RTX 5080': { size: 16, type: 'GDDR7' },
    'RTX 5070 Ti': { size: 16, type: 'GDDR7' },
    'RTX 5070': { size: 12, type: 'GDDR7' },
    'RTX 5060 Ti': { size: 16, type: 'GDDR7' },
    'RTX 5060': { size: 8, type: 'GDDR7' },
    
    // RTX 40 Series
    'RTX 4090': { size: 24, type: 'GDDR6X' },
    'RTX 4080 Super': { size: 16, type: 'GDDR6X' },
    'RTX 4080': { size: 16, type: 'GDDR6X' },
    'RTX 4070 Ti Super': { size: 16, type: 'GDDR6X' },
    'RTX 4070 Ti': { size: 12, type: 'GDDR6X' },
    'RTX 4070 Super': { size: 12, type: 'GDDR6X' },
    'RTX 4070': { size: 12, type: 'GDDR6X' },
    'RTX 4060 Ti': { size: 16, type: 'GDDR6X' },
    'RTX 4060': { size: 8, type: 'GDDR6X' },
    'RTX 4050': { size: 6, type: 'GDDR6' },
    
    // RTX 30 Series
    'RTX 3090 Ti': { size: 24, type: 'GDDR6X' },
    'RTX 3090': { size: 24, type: 'GDDR6X' },
    'RTX 3080 Ti': { size: 12, type: 'GDDR6X' },
    'RTX 3080': { size: 10, type: 'GDDR6X' },
    'RTX 3070 Ti': { size: 8, type: 'GDDR6X' },
    'RTX 3070': { size: 8, type: 'GDDR6' },
    'RTX 3060 Ti': { size: 8, type: 'GDDR6' },
    'RTX 3060': { size: 12, type: 'GDDR6' },
    'RTX 3050': { size: 8, type: 'GDDR6' },
    
    // AMD RX 7000 Series (RDNA 3)
    'RX 7900 XTX': { size: 24, type: 'GDDR6' },
    'RX 7900 XT': { size: 20, type: 'GDDR6' },
    'RX 7900 GRE': { size: 16, type: 'GDDR6' },
    'RX 7800 XT': { size: 16, type: 'GDDR6' },
    'RX 7700 XT': { size: 12, type: 'GDDR6' },
    'RX 7600 XT': { size: 16, type: 'GDDR6' },
    'RX 7600': { size: 8, type: 'GDDR6' },
    
    // AMD RX 6000 Series (RDNA 2)
    'RX 6950 XT': { size: 16, type: 'GDDR6' },
    'RX 6900 XT': { size: 16, type: 'GDDR6' },
    'RX 6800 XT': { size: 16, type: 'GDDR6' },
    'RX 6800': { size: 16, type: 'GDDR6' },
    'RX 6750 XT': { size: 12, type: 'GDDR6' },
    'RX 6700 XT': { size: 12, type: 'GDDR6' },
    'RX 6650 XT': { size: 8, type: 'GDDR6' },
    'RX 6600 XT': { size: 8, type: 'GDDR6' },
    'RX 6600': { size: 8, type: 'GDDR6' },
    'RX 6500 XT': { size: 4, type: 'GDDR6' },
    'RX 6400': { size: 4, type: 'GDDR6' },
    
    // Intel Arc (Alchemist)
    'Arc A770': { size: 16, type: 'GDDR6' },
    'Arc A750': { size: 8, type: 'GDDR6' },
    'Arc A580': { size: 8, type: 'GDDR6' },
    'Arc A380': { size: 6, type: 'GDDR6' }
  };
  
  return vramTable[gpuModel] || null;
}

async function fixNAMemoryRecords() {
  await connectToDatabase();
  const db = getDatabase();
  
  // Get all GPU collections
  const collections = await db.listCollections({ name: /^gpus_/ }).toArray();
  console.log('Found GPU collections:', collections.map(c => c.name));
  
  let totalUpdated = 0;
  
  for (const collection of collections) {
    const collectionName = collection.name;
    
    // Find GPUs with missing memory field or memory.size = null
    const gpus = await db.collection(collectionName).find({
      $or: [
        { memory: { $exists: false } },
        { "memory.size": null }
      ]
    }).toArray();
    
    console.log(`\nFixing ${gpus.length} GPUs with N/A memory in ${collectionName}...`);
    
    for (const gpu of gpus) {
      const fallbackMemory = getStandardVRAM(gpu.gpuModel);
      
      if (fallbackMemory) {
        await db.collection(collectionName).updateOne(
          { _id: gpu._id },
          { $set: { memory: fallbackMemory } }
        );
        console.log(`✅ Fixed ${gpu.gpuModel || 'Unknown'} with fallback ${fallbackMemory.size}GB ${fallbackMemory.type}`);
        totalUpdated++;
      } else {
        console.log(`⚠️  No fallback available for ${gpu.gpuModel || 'Unknown'}`);
      }
    }
  }
  
  console.log(`\n🎉 Fixed ${totalUpdated} GPU records with fallback memory values!`);
  process.exit(0);
}

fixNAMemoryRecords().catch(console.error);