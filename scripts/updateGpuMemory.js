const { connectToDatabase, getDatabase } = require('../config/database');

// Memory extraction function
function extractMemoryFromTitle(title) {
  if (!title) return { size: null, type: null };
  
  const sizeMatch = title.match(/(\d+)\s*GB/i);
  const typeMatch = title.match(/GDDR\d+[A-Z]*/i);
  
  return {
    size: sizeMatch ? parseInt(sizeMatch[1]) : null,
    type: typeMatch ? typeMatch[0] : null
  };
}

async function updateExistingGPUs() {
  await connectToDatabase();
  const db = getDatabase();
  
  // Get all GPU collections
  const collections = await db.listCollections({ name: /^gpus_/ }).toArray();
  console.log('Found GPU collections:', collections.map(c => c.name));
  
  let totalUpdated = 0;
  
  for (const collection of collections) {
    const collectionName = collection.name;
    const gpus = await db.collection(collectionName).find({ memory: { $exists: false } }).toArray();
    
    console.log(`\nUpdating ${gpus.length} GPUs in ${collectionName}...`);
    
    for (const gpu of gpus) {
      const memoryInfo = extractMemoryFromTitle(gpu.name);
      
      if (memoryInfo.size) {
        await db.collection(collectionName).updateOne(
          { _id: gpu._id },
          { $set: { memory: memoryInfo } }
        );
        console.log(`✅ Updated ${gpu.gpuModel || 'Unknown'} with ${memoryInfo.size}GB ${memoryInfo.type || 'GDDR'}`);
        totalUpdated++;
      }
    }
  }
  
  console.log(`\n🎉 Updated ${totalUpdated} GPU records with memory information!`);
  process.exit(0);
}

updateExistingGPUs().catch(console.error);