const { RamDataPopulatorFixed } = require('./ramDataPopulatorFixed');
const Logger = require('./utils/logger');

async function testFixedMainPopulator() {
    const populator = new RamDataPopulatorFixed();
    
    try {
        Logger.info('🧪 Testing Fixed Main RAM Populator...');
        
        await populator.connect();
        await populator.initBrowser();
        
        // Test with a single search to verify it actually saves
        const testUrl = 'https://www.amazon.com/s?k=DDR4+16GB+desktop+memory&ref=sr_nr_p_36_1';
        const testModel = 'test_ddr4_fixed';
        
        Logger.info(`🔍 Testing URL: ${testUrl}`);
        
        // Check database count before
        const { getDatabase } = require('../config/database');
        const db = getDatabase();
        const ramsCollection = db.collection('rams');
        const countBefore = await ramsCollection.countDocuments();
        Logger.info(`📦 Database count BEFORE: ${countBefore}`);
        
        const result = await populator.scrapeRamFromAmazon(testUrl, testModel);
        
        // Check database count after
        const countAfter = await ramsCollection.countDocuments();
        Logger.info(`📦 Database count AFTER: ${countAfter}`);
        
        Logger.info('\n📊 Test Results:');
        Logger.info(`   Success: ${result.success}`);
        Logger.info(`   New: ${result.count || 0}`);
        Logger.info(`   Duplicates: ${result.duplicates || 0}`);
        Logger.info(`   Updated: ${result.updated || 0}`);
        Logger.info(`   Total found: ${result.total || 0}`);
        Logger.info(`   Database grew by: ${countAfter - countBefore}`);
        
        if (result.success && result.count > 0 && (countAfter - countBefore) === result.count) {
            Logger.success(`✅ SUCCESS: All ${result.count} new RAM modules were properly saved!`);
        } else if (result.success && result.count > 0) {
            Logger.warn(`⚠️  Found ${result.count} new RAM but database only grew by ${countAfter - countBefore}`);
        } else {
            Logger.error(`❌ No new RAM modules were saved`);
        }
        
        // Show some sample data
        if (countAfter > countBefore) {
            Logger.info('\n📋 Sample of newly saved RAM:');
            const newRam = await ramsCollection.find({}).sort({createdAt: -1}).limit(3).toArray();
            newRam.forEach((ram, index) => {
                Logger.info(`${index + 1}. ${ram.title}`);
                Logger.info(`   Manufacturer: ${ram.manufacturer || 'Unknown'}`);
                Logger.info(`   Type: ${ram.memoryType || 'Unknown'}`);
                Logger.info(`   Speed: ${ram.speed || 'Unknown'}`);
                Logger.info(`   Price: ${ram.currentPrice ? `$${ram.currentPrice}` : 'N/A'}`);
            });
        }
        
    } catch (error) {
        Logger.error('❌ Test failed:', error.message);
        console.error('Full error:', error);
    } finally {
        await populator.close();
    }
}

testFixedMainPopulator()
    .then(() => {
        console.log('\n✅ Fixed main populator test completed');
        process.exit(0);
    })
    .catch(error => {
        console.error('\n💥 Fixed main populator test failed:', error);
        process.exit(1);
    });