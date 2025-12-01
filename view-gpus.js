#!/usr/bin/env node

const { DatabaseManager } = require('./scripts/databaseManager');

async function viewGPUs() {
  const dbManager = new DatabaseManager();
  
  try {
    console.log('🔌 Connecting to database...');
    await dbManager.connect();
    
    console.log('\n📊 Database Overview:');
    const overview = await dbManager.getDatabaseOverview();
    console.log(JSON.stringify(overview, null, 2));
    
    console.log('\n🔍 Searching for RTX GPUs:');
    const rtxGpus = await dbManager.searchRTXGPUs();
    console.log(`Found ${rtxGpus.length} RTX GPUs:`);
    
         rtxGpus.forEach((gpu, index) => {
       console.log(`\n${index + 1}. ${gpu.name}`);
       console.log(`   💰 Base Price: $${gpu.basePrice || 'N/A'}`);
       console.log(`   🏷️  Sale Price: $${gpu.salePrice || 'N/A'}`);
       console.log(`   🔥 On Sale: ${gpu.isOnSale ? 'Yes' : 'No'}`);
       console.log(`   💵 Current Price: $${gpu.currentPrice || 'N/A'}`);
       console.log(`   🏭 Partner: ${gpu.partner || 'N/A'}`);
       console.log(`   🏢 Source: ${gpu.source || 'N/A'}`);
       console.log(`   🔗 Product Link: ${gpu.sourceUrl || 'N/A'}`);
       console.log(`   📅 Scraped: ${gpu.scrapedAt || 'N/A'}`);
     });
    
    
    
  } catch (error) {
    console.error('❌ Error viewing GPUs:', error);
  } finally {
    process.exit(0);
  }
}

viewGPUs();
