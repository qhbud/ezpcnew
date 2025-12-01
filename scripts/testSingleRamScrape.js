const { RamDataPopulator } = require('./ramDataPopulator');
const Logger = require('./utils/logger');

async function testSingleRamScrape() {
    const populator = new RamDataPopulator();
    
    try {
        Logger.info('🧪 Testing single RAM scrape...');
        
        await populator.connect();
        await populator.initBrowser();
        
        // Test with a simple Amazon search for DDR4 RAM
        const testUrl = 'https://www.amazon.com/s?k=DDR4+16GB+desktop+memory&ref=sr_nr_p_36_1';
        const testModel = 'test_ddr4_16gb';
        
        Logger.info(`🔍 Testing URL: ${testUrl}`);
        
        const result = await populator.populateRamData(testUrl, testModel);
        
        Logger.info('📊 Test Results:');
        Logger.info(`   Success: ${result.success}`);
        Logger.info(`   New: ${result.count || 0}`);
        Logger.info(`   Duplicates: ${result.duplicates || 0}`);
        Logger.info(`   Updated: ${result.updated || 0}`);
        Logger.info(`   Total: ${result.total || 0}`);
        
        if (result.ram && result.ram.length > 0) {
            Logger.info('\n🎯 First few RAM modules found:');
            result.ram.slice(0, 3).forEach((ram, index) => {
                Logger.info(`${index + 1}. ${ram.title || ram.name || 'Unknown'}`);
                Logger.info(`   Manufacturer: ${ram.manufacturer || 'Unknown'}`);
                Logger.info(`   Type: ${ram.memoryType || 'Unknown'}`);
                Logger.info(`   Speed: ${ram.speed || 'Unknown'}`);
                Logger.info(`   Capacity: ${ram.capacity || 'Unknown'}`);
                Logger.info(`   Price: ${ram.currentPrice ? `$${ram.currentPrice}` : ram.price ? `$${ram.price}` : 'N/A'}`);
            });
        }
        
    } catch (error) {
        Logger.error('❌ Test failed:', error.message);
        console.error('Full error:', error);
    } finally {
        await populator.close();
    }
}

testSingleRamScrape()
    .then(() => {
        console.log('\n✅ Test completed');
        process.exit(0);
    })
    .catch(error => {
        console.error('\n💥 Test failed:', error);
        process.exit(1);
    });