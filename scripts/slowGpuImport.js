const { AmazonGpuImporter } = require('./amazonGpuImporter');
const { connectToDatabase, getDatabase } = require('../config/database');

/**
 * Ultra-Conservative GPU Import with Proper Delays
 * 
 * Amazon PAAPI5 new accounts: 1 request per second MAX
 * This version waits BEFORE every single request
 */

async function importSingleGpuWithDelay(chipsetName) {
  const GPU_CHIPSETS = {
    'RTX 4090': {
      searchTerms: ['RTX 4090'],
      manufacturer: 'NVIDIA',
      architecture: 'Ada Lovelace',
      memorySize: 24,
      memoryType: 'GDDR6X'
    },
    'RTX 3080': {
      searchTerms: ['RTX 3080'],
      manufacturer: 'NVIDIA',
      architecture: 'Ampere',
      memorySize: 10,
      memoryType: 'GDDR6X'
    }
  };

  const chipsetInfo = GPU_CHIPSETS[chipsetName];
  if (!chipsetInfo) {
    throw new Error(`Unknown chipset: ${chipsetName}. Available: ${Object.keys(GPU_CHIPSETS).join(', ')}`);
  }

  console.log('🚀 Starting Ultra-Conservative GPU Import...');
  console.log(`🎯 Target: ${chipsetName}`);
  console.log('⏰ Waiting 90 seconds before making ANY API request...');
  console.log('📝 This ensures we respect Amazon\'s strict rate limits\n');

  // Wait 90 seconds before the first (and only) request
  for (let i = 90; i > 0; i -= 10) {
    process.stdout.write(`⏳ Waiting ${i} seconds... \r`);
    await new Promise(resolve => setTimeout(resolve, 10000));
  }
  console.log('\n');

  console.log('🔌 Connecting to database...');
  await connectToDatabase();

  console.log('🔑 Initializing Amazon API client...');
  const importer = new AmazonGpuImporter();

  console.log(`🔍 Making API request for ${chipsetName}...`);
  console.log('📡 Sending request to Amazon Product Advertising API...\n');

  try {
    const gpus = await importer.searchGpusByChipset(chipsetName, chipsetInfo);
    
    console.log(`✅ API Request Successful!`);
    console.log(`📊 Found ${gpus.length} ${chipsetName} GPUs\n`);

    if (gpus.length > 0) {
      console.log('📋 Sample Results:');
      gpus.slice(0, 3).forEach((gpu, index) => {
        console.log(`   ${index + 1}. ${gpu.name}`);
        console.log(`      💰 Price: $${gpu.price}`);
        console.log(`      🏭 Brand: ${gpu.partner}`);
        console.log('');
      });

      console.log('💾 Inserting GPUs into database...');
      const db = getDatabase();
      const result = await db.collection('gpus').insertMany(gpus);
      console.log(`✅ Successfully inserted ${result.insertedCount} GPUs`);

      // Show database query examples
      console.log('\n🔍 You can now query your GPUs:');
      console.log(`   db.gpus.find({ chipsetGroup: "${chipsetName}" })`);
      console.log(`   db.gpus.find({ partner: "EVGA" })`);
      console.log('   db.gpus.find({ price: { $lt: 700 } })');

      return {
        success: true,
        chipset: chipsetName,
        found: gpus.length,
        inserted: result.insertedCount,
        samples: gpus.slice(0, 3).map(gpu => ({
          name: gpu.name,
          price: gpu.price,
          partner: gpu.partner
        }))
      };

    } else {
      console.log('ℹ️  No GPUs found for this search term');
      console.log('💡 This could mean:');
      console.log('   - No matching products on Amazon');
      console.log('   - Different search terms needed');
      console.log('   - Regional availability issues');

      return {
        success: true,
        chipset: chipsetName,
        found: 0,
        inserted: 0,
        message: 'No GPUs found for search term'
      };
    }

  } catch (error) {
    console.log('❌ API Request Failed');
    
    if (error.message.includes('TooManyRequests')) {
      console.log('🚫 Rate Limit Error Details:');
      console.log('   - Amazon allows 1 request per second for new accounts');
      console.log('   - You may have made requests recently from other tools');
      console.log('   - API keys might still be activating (48-72 hours)');
      console.log('   - Associate account might need sales history');
      console.log('\n💡 Solutions:');
      console.log('   - Wait longer (try again in 4-6 hours)');
      console.log('   - Check if your Associate account is fully approved');
      console.log('   - Verify your API keys are 72+ hours old');
      
      return {
        success: false,
        chipset: chipsetName,
        error: 'Rate limit exceeded',
        suggestion: 'Wait 4-6 hours and try again'
      };
      
    } else {
      console.log(`🔥 Unexpected Error: ${error.message}`);
      throw error;
    }
  }
}

// Run the import
async function main() {
  const chipset = process.argv[2] || 'RTX 3080';
  
  try {
    const result = await importSingleGpuWithDelay(chipset);
    
    console.log('\n🎉 Import Process Completed!');
    console.log('📊 Final Result:', JSON.stringify(result, null, 2));
    
    if (result.success && result.found > 0) {
      console.log('\n✅ SUCCESS: GPUs imported and ready to use!');
    } else if (result.success && result.found === 0) {
      console.log('\n⚠️  SUCCESS: No errors, but no GPUs found');
    } else {
      console.log('\n❌ RATE LIMITED: Try again later');
    }
    
  } catch (error) {
    console.error('\n💥 Fatal Error:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { importSingleGpuWithDelay };