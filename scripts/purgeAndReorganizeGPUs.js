const { connectToDatabase, getDatabase } = require('../config/database');

async function purgeAndReorganizeGPUs() {
  try {
    console.log('Connecting to database...');
    await connectToDatabase();
    const db = getDatabase();
    
    // Get existing GPU data before purging
    console.log('Retrieving existing GPU data...');
    const gpusCollection = db.collection('gpus');
    const existingGPUs = await gpusCollection.find({}).toArray();
    console.log(`Found ${existingGPUs.length} existing GPUs`);
    
    // Drop the existing GPUs collection
    console.log('Purging existing GPU collection...');
    await gpusCollection.drop().catch(() => {
      console.log('GPU collection did not exist or was already empty');
    });
    
    // Group GPUs by chipset/model for reorganization
    const gpusByModel = {};
    
    existingGPUs.forEach(gpu => {
      let model = extractGPUModel(gpu.chipset || gpu.name || 'unknown');
      
      if (!gpusByModel[model]) {
        gpusByModel[model] = [];
      }
      gpusByModel[model].push(gpu);
    });
    
    console.log('GPU models found:', Object.keys(gpusByModel));
    
    // Create separate collections for each GPU model
    for (const [model, gpus] of Object.entries(gpusByModel)) {
      const collectionName = `gpus_${model.toLowerCase().replace(/\s+/g, '_')}`;
      console.log(`Creating collection: ${collectionName} with ${gpus.length} GPUs`);
      
      if (gpus.length > 0) {
        const modelCollection = db.collection(collectionName);
        await modelCollection.insertMany(gpus);
        
        // Create indexes for performance
        await modelCollection.createIndex({ name: 1 });
        await modelCollection.createIndex({ price: 1 });
        await modelCollection.createIndex({ partner: 1 });
      }
    }
    
    console.log('Database purge and reorganization completed successfully!');
    return Object.keys(gpusByModel);
    
  } catch (error) {
    console.error('Error during purge and reorganization:', error);
    throw error;
  }
}

function extractGPUModel(chipsetOrName) {
  if (!chipsetOrName) return 'unknown';
  
  const name = chipsetOrName.toLowerCase();
  
  // NVIDIA RTX 40 Series - Most specific first
  if (name.includes('rtx 4090 ti')) return '4090_ti';
  if (name.includes('rtx 4090')) return '4090';
  if (name.includes('rtx 4080 super')) return '4080_super';
  if (name.includes('rtx 4080 ti')) return '4080_ti';
  if (name.includes('rtx 4080')) return '4080';
  if (name.includes('rtx 4070 ti super')) return '4070_ti_super';
  if (name.includes('rtx 4070 super')) return '4070_super';
  if (name.includes('rtx 4070 ti')) return '4070_ti';
  if (name.includes('rtx 4070')) return '4070';
  if (name.includes('rtx 4060 ti')) return '4060_ti';
  if (name.includes('rtx 4060')) return '4060';
  if (name.includes('rtx 4050')) return '4050';
  
  // NVIDIA RTX 30 Series - Most specific first
  if (name.includes('rtx 3090 ti')) return '3090_ti';
  if (name.includes('rtx 3090')) return '3090';
  if (name.includes('rtx 3080 ti')) return '3080_ti';
  if (name.includes('rtx 3080')) return '3080';
  if (name.includes('rtx 3070 ti')) return '3070_ti';
  if (name.includes('rtx 3070')) return '3070';
  if (name.includes('rtx 3060 ti')) return '3060_ti';
  if (name.includes('rtx 3060')) return '3060';
  if (name.includes('rtx 3050')) return '3050';
  
  // NVIDIA RTX 20 Series - Most specific first
  if (name.includes('rtx 2080 ti')) return '2080_ti';
  if (name.includes('rtx 2080 super')) return '2080_super';
  if (name.includes('rtx 2080')) return '2080';
  if (name.includes('rtx 2070 super')) return '2070_super';
  if (name.includes('rtx 2070')) return '2070';
  if (name.includes('rtx 2060 super')) return '2060_super';
  if (name.includes('rtx 2060')) return '2060';
  
  // NVIDIA GTX 16 Series - Most specific first
  if (name.includes('gtx 1660 ti')) return '1660_ti';
  if (name.includes('gtx 1660 super')) return '1660_super';
  if (name.includes('gtx 1660')) return '1660';
  if (name.includes('gtx 1650 super')) return '1650_super';
  if (name.includes('gtx 1650')) return '1650';
  
  // NVIDIA GTX 10 Series - Most specific first
  if (name.includes('gtx 1080 ti')) return '1080_ti';
  if (name.includes('gtx 1080')) return '1080';
  if (name.includes('gtx 1070 ti')) return '1070_ti';
  if (name.includes('gtx 1070')) return '1070';
  if (name.includes('gtx 1060')) return '1060';
  if (name.includes('gtx 1050 ti')) return '1050_ti';
  if (name.includes('gtx 1050')) return '1050';
  
  // NVIDIA GTX 9 Series
  if (name.includes('gtx 980 ti')) return '980_ti';
  if (name.includes('gtx 980')) return '980';
  if (name.includes('gtx 970')) return '970';
  if (name.includes('gtx 960')) return '960';
  if (name.includes('gtx 950')) return '950';
  
  // AMD RX 7000 Series (RDNA 3) - Most specific first
  if (name.includes('rx 7900 xtx') || name.includes('7900 xtx')) return '7900_xtx';
  if (name.includes('rx 7900 xt') || name.includes('7900 xt')) return '7900_xt';
  if (name.includes('rx 7800 xt') || name.includes('7800 xt')) return '7800_xt';
  if (name.includes('rx 7700 xt') || name.includes('7700 xt')) return '7700_xt';
  if (name.includes('rx 7600 xt') || name.includes('7600 xt')) return '7600_xt';
  if (name.includes('rx 7600') || name.includes('7600')) return '7600';
  
  // AMD RX 6000 Series (RDNA 2) - Most specific first
  if (name.includes('rx 6950 xt') || name.includes('6950 xt')) return '6950_xt';
  if (name.includes('rx 6900 xt') || name.includes('6900 xt')) return '6900_xt';
  if (name.includes('rx 6800 xt') || name.includes('6800 xt')) return '6800_xt';
  if (name.includes('rx 6800') || name.includes('6800')) return '6800';
  if (name.includes('rx 6750 xt') || name.includes('6750 xt')) return '6750_xt';
  if (name.includes('rx 6700 xt') || name.includes('6700 xt')) return '6700_xt';
  if (name.includes('rx 6650 xt') || name.includes('6650 xt')) return '6650_xt';
  if (name.includes('rx 6600 xt') || name.includes('6600 xt')) return '6600_xt';
  if (name.includes('rx 6600') || name.includes('6600')) return '6600';
  if (name.includes('rx 6500 xt') || name.includes('6500 xt')) return '6500_xt';
  if (name.includes('rx 6400') || name.includes('6400')) return '6400';
  
  // AMD RX 5000 Series (RDNA 1) - Most specific first
  if (name.includes('rx 5700 xt') || name.includes('5700 xt')) return '5700_xt';
  if (name.includes('rx 5700') || name.includes('5700')) return '5700';
  if (name.includes('rx 5600 xt') || name.includes('5600 xt')) return '5600_xt';
  if (name.includes('rx 5500 xt') || name.includes('5500 xt')) return '5500_xt';
  
  // AMD RX 500/400 Series (Polaris)
  if (name.includes('rx 590') || name.includes('590')) return '590';
  if (name.includes('rx 580') || name.includes('580')) return '580';
  if (name.includes('rx 570') || name.includes('570')) return '570';
  if (name.includes('rx 560') || name.includes('560')) return '560';
  if (name.includes('rx 550') || name.includes('550')) return '550';
  if (name.includes('rx 480') || name.includes('480')) return '480';
  if (name.includes('rx 470') || name.includes('470')) return '470';
  if (name.includes('rx 460') || name.includes('460')) return '460';
  
  // AMD Vega Series
  if (name.includes('vega 64') || name.includes('rx vega 64')) return 'vega_64';
  if (name.includes('vega 56') || name.includes('rx vega 56')) return 'vega_56';
  if (name.includes('vega 11')) return 'vega_11';
  if (name.includes('vega 8')) return 'vega_8';
  
  // Intel Arc Series - Most specific first
  if (name.includes('arc a770') || name.includes('a770')) return 'a770';
  if (name.includes('arc a750') || name.includes('a750')) return 'a750';
  if (name.includes('arc a580') || name.includes('a580')) return 'a580';
  if (name.includes('arc a380') || name.includes('a380')) return 'a380';
  if (name.includes('arc a310') || name.includes('a310')) return 'a310';
  
  // Intel Xe Graphics
  if (name.includes('xe max')) return 'xe_max';
  if (name.includes('iris xe')) return 'iris_xe';
  
  // Special patterns for XTX, XT, Ti, Super variants that might be missed
  // Only check for these if they're part of the actual GPU model number, not just anywhere in the text
  if (/\bxtx\b/i.test(name)) return 'xtx_variant';
  if (/\bxt\b/i.test(name) && !/\bxtx\b/i.test(name)) return 'xt_variant';
  if (/\bti\b/i.test(name) && !/\bxtx\b/i.test(name) && !/\bxt\b/i.test(name)) return 'ti_variant';
  if (/\bsuper\b/i.test(name) && !/\bxtx\b/i.test(name) && !/\bxt\b/i.test(name) && !/\bti\b/i.test(name)) return 'super_variant';
  
  // Fallback for unrecognized models
  return 'other';
}

// Run the script if called directly
if (require.main === module) {
  purgeAndReorganizeGPUs()
    .then(models => {
      console.log('Created collections for models:', models);
      process.exit(0);
    })
    .catch(error => {
      console.error('Script failed:', error);
      process.exit(1);
    });
}

module.exports = { purgeAndReorganizeGPUs, extractGPUModel };