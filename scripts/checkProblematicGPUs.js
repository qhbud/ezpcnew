const { connectToDatabase, getDatabase } = require('../config/database');

async function checkProblematicGPUs() {
  await connectToDatabase();
  const db = getDatabase();

  console.log('🔍 Checking all problematic GPUs to see update status...\n');

  const problematicGPUs = [
    { collection: 'gpus_rtx_4070_super', name: 'MSI Gaming RTX 4070 Super 12G Ventus 2X OC', expected: 499.00 },
    { collection: 'gpus_arc_a770', name: 'Sparkle Intel Arc A770 ROC Luna OC Edition', expected: 299.99 },
    { collection: 'gpus_arc_a770', name: 'Sparkle Intel Arc A770 Titan OC Edition', expected: 369.85 },
    { collection: 'gpus_rtx_4070', name: 'MSI Gaming GeForce RTX 4070 12GB GDRR6X', expected: 477.22 }
  ];

  const perfectDeployTime = new Date('2025-09-23T05:45:00Z'); // When we started the bulk update with Perfect method

  for (const prob of problematicGPUs) {
    console.log(`\n🔍 Checking: ${prob.name.substring(0, 50)}...`);

    const gpu = await db.collection(prob.collection).findOne({
      name: { $regex: prob.name, $options: 'i' }
    });

    if (gpu) {
      const lastUpdate = gpu.updatedAt ? new Date(gpu.updatedAt) : null;
      const updatedWithPerfect = lastUpdate && lastUpdate > perfectDeployTime;

      console.log(`   Expected: $${prob.expected}`);
      console.log(`   Current: $${gpu.currentPrice}`);
      console.log(`   Last Updated: ${gpu.updatedAt || 'Never'}`);
      console.log(`   Detection Method: ${gpu.detectionMethod || 'Unknown'}`);
      console.log(`   Price Source: ${gpu.priceSource || 'Unknown'}`);
      console.log(`   Updated with Perfect method: ${updatedWithPerfect ? 'YES' : 'NO'}`);

      if (!updatedWithPerfect) {
        console.log(`   ❌ This GPU was NOT updated with Perfect method!`);
      }
    } else {
      console.log(`   ❌ GPU not found in ${prob.collection}`);
    }
  }

  console.log(`\n\n🎯 ISSUE IDENTIFIED:`);
  console.log(`Some GPUs have updatedAt: undefined, meaning they were never updated`);
  console.log(`or were updated before we deployed the Perfect method.`);
  console.log(`\nThe Perfect method works in testing but these specific GPUs`);
  console.log(`in the database still have old prices from previous scraping methods.`);

  process.exit(0);
}

checkProblematicGPUs().catch(console.error);