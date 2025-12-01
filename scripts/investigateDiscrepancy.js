const { connectToDatabase, getDatabase } = require('../config/database');

async function investigateDiscrepancy() {
  await connectToDatabase();
  const db = getDatabase();

  console.log('🔍 Investigating why Perfect method works in testing but not in practice...\n');

  // Check one of the problematic cards - MSI RTX 4070 Super Ventus 2X
  const gpu = await db.collection('gpus_rtx_4070_super').findOne({
    name: { $regex: 'MSI Gaming RTX 4070 Super 12G Ventus 2X OC', $options: 'i' }
  });

  if (gpu) {
    console.log('📋 GPU Details:');
    console.log(`Name: ${gpu.name}`);
    console.log(`Current Price: $${gpu.currentPrice}`);
    console.log(`Source URL: ${gpu.sourceUrl}`);
    console.log(`Last Updated: ${gpu.updatedAt}`);
    console.log(`Detection Method: ${gpu.detectionMethod || 'Unknown'}`);
    console.log(`Price Source: ${gpu.priceSource || 'Unknown'}`);
    console.log(`Base Price: $${gpu.basePrice || 'Unknown'}`);
    console.log(`Sale Price: $${gpu.salePrice || 'Unknown'}`);
    console.log(`Is On Sale: ${gpu.isOnSale || false}`);
    console.log('\n');

    console.log('🔍 Key Questions:');
    console.log('1. Was this GPU updated with the new Perfect method?');
    console.log('2. What detection method was actually used?');
    console.log('3. When was it last updated vs when we deployed Perfect method?');
    console.log('\n');

    // Check when our Perfect method was deployed vs when this was updated
    const perfectDeployTime = new Date('2025-09-23T05:45:00Z'); // When we started the bulk update
    const lastUpdate = new Date(gpu.updatedAt);

    console.log(`Perfect method deployed: ${perfectDeployTime}`);
    console.log(`GPU last updated: ${lastUpdate}`);
    console.log(`Updated with Perfect method: ${lastUpdate > perfectDeployTime ? 'YES' : 'NO'}`);

  } else {
    console.log('❌ Could not find MSI RTX 4070 Super Ventus 2X');

    // Let's see what MSI cards we do have
    const msiCards = await db.collection('gpus_rtx_4070_super').find({
      name: { $regex: 'MSI', $options: 'i' }
    }).toArray();

    console.log('\n📋 Available MSI RTX 4070 Super cards:');
    msiCards.forEach((card, i) => {
      console.log(`${i + 1}. ${card.name}`);
      console.log(`   Price: $${card.currentPrice}`);
      console.log(`   Updated: ${card.updatedAt}`);
      console.log(`   Method: ${card.detectionMethod || 'Unknown'}`);
    });
  }

  process.exit(0);
}

investigateDiscrepancy().catch(console.error);