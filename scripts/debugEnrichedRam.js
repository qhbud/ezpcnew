const { RamDataPopulatorFixed } = require('./ramDataPopulatorFixed');
const Logger = require('./utils/logger');

// Override the DatabaseService method to log data
class DebugDatabaseService {
  constructor(db) {
    this.db = db;
  }
  
  async saveRamWithDuplicateDetection(ramData, collectionName) {
    console.log('\n🔍 DEBUG: Data being sent to saveRamWithDuplicateDetection:');
    console.log(`📦 RAM data count: ${ramData.length}`);
    console.log(`📂 Collection: ${collectionName}`);
    
    // Log first few RAM modules in detail
    ramData.slice(0, 3).forEach((ram, index) => {
      console.log(`\n📋 RAM ${index + 1}:`);
      console.log(`   Title: ${ram.title || ram.name || 'NO TITLE'}`);
      console.log(`   URL: ${ram.sourceUrl || 'NO URL'}`);
      console.log(`   Price: ${ram.currentPrice || ram.price || 'NO PRICE'}`);
      console.log(`   Manufacturer: ${ram.manufacturer || 'NO MANUFACTURER'}`);
      console.log(`   Memory Type: ${ram.memoryType || 'NO MEMORY TYPE'}`);
      console.log(`   Has all required fields: ${!!(ram.title && ram.sourceUrl)}`);
    });
    
    // Call the original method and log results
    const { DatabaseService } = require('./services/databaseService');
    const realService = new DatabaseService(this.db);
    
    try {
      const result = await realService.saveRamWithDuplicateDetection(ramData, collectionName);
      console.log(`\n✅ Save result: ${result.newCount} new, ${result.duplicateCount} duplicates, ${result.updatedCount} updated`);
      return result;
    } catch (error) {
      console.log(`\n❌ Save failed: ${error.message}`);
      throw error;
    }
  }
}

async function debugEnrichedRam() {
    const populator = new RamDataPopulatorFixed();
    
    try {
        Logger.info('🧪 Debugging Enriched RAM Data...');
        
        await populator.connect();
        
        // Replace the database service with our debug version
        populator.databaseService = new DebugDatabaseService(populator.db);
        
        await populator.initBrowser();
        
        // Test with a single search
        const testUrl = 'https://www.amazon.com/s?k=DDR4+16GB+desktop+memory&ref=sr_nr_p_36_1';
        const testModel = 'debug_test';
        
        const result = await populator.scrapeRamFromAmazon(testUrl, testModel);
        
        console.log('\n📊 Final Results:');
        console.log(`   Success: ${result.success}`);
        console.log(`   New: ${result.count || 0}`);
        console.log(`   Duplicates: ${result.duplicates || 0}`);
        console.log(`   Updated: ${result.updated || 0}`);
        
    } catch (error) {
        Logger.error('❌ Debug failed:', error.message);
        console.error('Full error:', error);
    } finally {
        await populator.close();
    }
}

debugEnrichedRam()
    .then(() => {
        console.log('\n✅ Debug completed');
        process.exit(0);
    })
    .catch(error => {
        console.error('\n💥 Debug failed:', error);
        process.exit(1);
    });