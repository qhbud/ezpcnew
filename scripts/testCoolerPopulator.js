const { CoolerDataPopulator } = require('./coolerDataPopulator');
const Logger = require('./utils/logger');

async function testCoolerPopulator() {
    const populator = new CoolerDataPopulator();
    
    try {
        Logger.info('🧪 Testing CPU Cooler Populator...');
        
        await populator.connect();
        await populator.initBrowser();
        
        // Test with a single search to verify it works
        const testUrl = 'https://www.amazon.com/s?k=CPU+liquid+cooler+240mm+AIO&ref=sr_nr_p_36_1';
        const testModel = 'test_liquid_240mm';
        
        Logger.info(`🔍 Testing URL: ${testUrl}`);
        
        // Check database count before
        const collection = populator.db.collection('coolers');
        const countBefore = await collection.countDocuments();
        Logger.info(`📦 Database count BEFORE: ${countBefore}`);
        
        const result = await populator.scrapeCoolersFromAmazon(testUrl, testModel);
        
        // Check database count after
        const countAfter = await collection.countDocuments();
        Logger.info(`📦 Database count AFTER: ${countAfter}`);
        
        Logger.info('\n📊 Test Results:');
        Logger.info(`   Success: ${result.success}`);
        Logger.info(`   New: ${result.count || 0}`);
        Logger.info(`   Duplicates: ${result.duplicates || 0}`);
        Logger.info(`   Total found: ${result.total || 0}`);
        Logger.info(`   Database grew by: ${countAfter - countBefore}`);
        
        if (result.success && result.count > 0 && (countAfter - countBefore) === result.count) {
            Logger.success(`✅ SUCCESS: All ${result.count} new coolers were properly saved!`);
        } else if (result.success && result.count > 0) {
            Logger.warn(`⚠️  Found ${result.count} new coolers but database only grew by ${countAfter - countBefore}`);
        } else {
            Logger.error(`❌ No new coolers were saved`);
        }
        
        // Show some sample data
        if (countAfter > countBefore) {
            Logger.info('\n📋 Sample of newly saved coolers:');
            const newCoolers = await collection.find({}).sort({createdAt: -1}).limit(3).toArray();
            newCoolers.forEach((cooler, index) => {
                Logger.info(`${index + 1}. ${cooler.title}`);
                Logger.info(`   Manufacturer: ${cooler.manufacturer || 'Unknown'}`);
                Logger.info(`   Type: ${cooler.coolerType || 'Unknown'}`);
                Logger.info(`   Radiator Size: ${cooler.radiatorSize || 'N/A'}`);
                Logger.info(`   Socket Compatibility: ${cooler.socketCompatibility ? cooler.socketCompatibility.join(', ') : 'N/A'}`);
                Logger.info(`   Price: ${cooler.currentPrice ? `$${cooler.currentPrice}` : 'N/A'}`);
                Logger.info(`   RGB: ${cooler.specifications?.rgb ? 'Yes' : 'No'}`);
            });
        }
        
    } catch (error) {
        Logger.error('❌ Test failed:', error.message);
        console.error('Full error:', error);
    } finally {
        await populator.close();
    }
}

testCoolerPopulator()
    .then(() => {
        console.log('\n✅ Cooler populator test completed');
        process.exit(0);
    })
    .catch(error => {
        console.error('\n💥 Cooler populator test failed:', error);
        process.exit(1);
    });