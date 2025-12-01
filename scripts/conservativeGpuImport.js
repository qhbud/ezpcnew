const { AmazonGpuImporter } = require('./amazonGpuImporter');
const { connectToDatabase, getDatabase } = require('../config/database');

/**
 * Conservative GPU Import for New PAAPI5 Accounts
 * 
 * New Amazon PAAPI5 accounts are limited to:
 * - 1 request per second (1 TPS)
 * - 8,640 requests per day (TPD)
 * 
 * This script imports GPUs one chipset at a time with proper delays
 */

class ConservativeGpuImporter {
  constructor() {
    this.importer = new AmazonGpuImporter();
    this.delayBetweenRequests = 65000; // 65 seconds to be extra safe
    this.requestCount = 0;
    this.maxDailyRequests = 100; // Conservative limit to avoid hitting daily cap
  }

  async importSingleChipset(chipsetName) {
    const GPU_CHIPSETS = {
      'RTX 4090': {
        searchTerms: ['RTX 4090', 'GeForce RTX 4090'],
        manufacturer: 'NVIDIA',
        architecture: 'Ada Lovelace',
        memorySize: 24,
        memoryType: 'GDDR6X'
      },
      'RTX 4080': {
        searchTerms: ['RTX 4080', 'GeForce RTX 4080'],
        manufacturer: 'NVIDIA', 
        architecture: 'Ada Lovelace',
        memorySize: 16,
        memoryType: 'GDDR6X'
      },
      'RTX 3080': {
        searchTerms: ['RTX 3080', 'GeForce RTX 3080'],
        manufacturer: 'NVIDIA',
        architecture: 'Ampere',
        memorySize: 10,
        memoryType: 'GDDR6X'
      }
    };

    const chipsetInfo = GPU_CHIPSETS[chipsetName];
    if (!chipsetInfo) {
      throw new Error(`Unknown chipset: ${chipsetName}`);
    }

    console.log(`🔍 Searching for ${chipsetName} GPUs...`);
    console.log('⏰ Please wait - respecting Amazon rate limits...');
    
    try {
      const gpus = await this.importer.searchGpusByChipset(chipsetName, chipsetInfo);
      this.requestCount++;
      
      console.log(`✅ Found ${gpus.length} ${chipsetName} GPUs`);
      
      if (gpus.length > 0) {
        console.log(`📋 Sample GPU: ${gpus[0].name}`);
        console.log(`💰 Price: $${gpus[0].price}`);
        console.log(`🏭 Partner: ${gpus[0].partner}`);
        
        // Insert into database
        const db = getDatabase();
        const result = await db.collection('gpus').insertMany(gpus);
        console.log(`💾 Inserted ${result.insertedCount} GPUs into database`);
        
        return {
          chipset: chipsetName,
          count: gpus.length,
          inserted: result.insertedCount,
          success: true
        };
      } else {
        return {
          chipset: chipsetName,
          count: 0,
          inserted: 0,
          success: true,
          message: 'No GPUs found for this search term'
        };
      }
      
    } catch (error) {
      if (error.message.includes('TooManyRequests')) {
        return {
          chipset: chipsetName,
          count: 0,
          inserted: 0,
          success: false,
          message: 'Rate limit exceeded - try again later'
        };
      }
      throw error;
    }
  }

  async importMultipleChipsets(chipsets) {
    console.log('🚀 Starting Conservative GPU Import...');
    console.log(`📊 Planning to import ${chipsets.length} chipsets`);
    console.log(`⏱️  Estimated time: ${Math.ceil(chipsets.length * this.delayBetweenRequests / 1000 / 60)} minutes\n`);
    
    await connectToDatabase();
    
    const results = [];
    
    for (let i = 0; i < chipsets.length; i++) {
      const chipset = chipsets[i];
      
      console.log(`\n[${i + 1}/${chipsets.length}] Processing ${chipset}...`);
      
      if (this.requestCount >= this.maxDailyRequests) {
        console.log(`⚠️  Reached daily request limit (${this.maxDailyRequests})`);
        break;
      }
      
      try {
        const result = await this.importSingleChipset(chipset);
        results.push(result);
        
        if (!result.success) {
          console.log(`❌ Failed: ${result.message}`);
          break; // Stop on rate limit
        }
        
      } catch (error) {
        console.log(`❌ Error importing ${chipset}: ${error.message}`);
        results.push({
          chipset: chipset,
          count: 0,
          inserted: 0,
          success: false,
          message: error.message
        });
      }
      
      // Wait before next request (except for last item)
      if (i < chipsets.length - 1) {
        console.log(`⏳ Waiting ${this.delayBetweenRequests / 1000}s for rate limit...`);
        await new Promise(resolve => setTimeout(resolve, this.delayBetweenRequests));
      }
    }
    
    // Summary
    console.log('\n📊 Import Summary:');
    console.log('==================');
    
    let totalGpus = 0;
    let totalInserted = 0;
    let successCount = 0;
    
    for (const result of results) {
      const status = result.success ? '✅' : '❌';
      console.log(`${status} ${result.chipset}: ${result.count} found, ${result.inserted} inserted`);
      
      if (result.success) {
        totalGpus += result.count;
        totalInserted += result.inserted;
        successCount++;
      }
    }
    
    console.log('\n🎯 Totals:');
    console.log(`   Chipsets processed: ${successCount}/${chipsets.length}`);
    console.log(`   GPUs found: ${totalGpus}`);
    console.log(`   GPUs inserted: ${totalInserted}`);
    console.log(`   API requests used: ${this.requestCount}`);
    console.log(`   Remaining today: ~${this.maxDailyRequests - this.requestCount}`);
    
    return results;
  }
}

// Command line interface
async function main() {
  const args = process.argv.slice(2);
  const importer = new ConservativeGpuImporter();
  
  try {
    if (args.length === 0) {
      // Default: import top 3 chipsets
      const defaultChipsets = ['RTX 4090', 'RTX 4080', 'RTX 3080'];
      console.log('🔧 No chipsets specified, using defaults:', defaultChipsets.join(', '));
      await importer.importMultipleChipsets(defaultChipsets);
      
    } else if (args.length === 1) {
      // Single chipset
      await connectToDatabase();
      const result = await importer.importSingleChipset(args[0]);
      console.log('\n🎉 Single chipset import completed:', result);
      
    } else {
      // Multiple specified chipsets
      await importer.importMultipleChipsets(args);
    }
    
    console.log('\n✅ GPU import process completed!');
    
  } catch (error) {
    console.error('\n❌ Import failed:', error.message);
    
    if (error.message.includes('TooManyRequests')) {
      console.error('\n💡 Tips to avoid rate limits:');
      console.error('   - New accounts: 1 request per second max');
      console.error('   - Wait 60+ seconds between requests');
      console.error('   - Try again in a few hours');
      console.error('   - Consider importing one chipset at a time');
    }
    
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { ConservativeGpuImporter };