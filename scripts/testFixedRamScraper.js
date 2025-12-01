const { RamDataPopulatorFixed } = require('./ramDataPopulatorFixed');
const Logger = require('./utils/logger');

async function testFixedRamScraper() {
    const populator = new RamDataPopulatorFixed();
    
    try {
        Logger.info('🧪 Testing Fixed RAM Scraper...');
        
        await populator.connect();
        await populator.initBrowser();
        
        // Test with a simple Amazon search for DDR4 RAM
        const testUrl = 'https://www.amazon.com/s?k=DDR4+16GB+desktop+memory&ref=sr_nr_p_36_1';
        const testModel = 'test_ddr4_16gb';
        
        Logger.info(`🔍 Testing URL: ${testUrl}`);
        
        const result = await populator.scrapeRamFromAmazon(testUrl, testModel);
        
        Logger.info('\n📊 Test Results:');
        Logger.info(`   Success: ${result.success}`);
        Logger.info(`   New: ${result.count || 0}`);
        Logger.info(`   Duplicates: ${result.duplicates || 0}`);
        Logger.info(`   Updated: ${result.updated || 0}`);
        Logger.info(`   Total: ${result.total || 0}`);
        
        if (result.ram && result.ram.length > 0) {
            Logger.info('\n🎯 First few RAM modules found and processed:');
            result.ram.slice(0, 5).forEach((ram, index) => {
                Logger.info(`${index + 1}. ${ram.title || ram.name || 'Unknown'}`);
                Logger.info(`   Manufacturer: ${ram.manufacturer || 'Unknown'}`);
                Logger.info(`   Type: ${ram.memoryType || 'Unknown'}`);
                Logger.info(`   Speed: ${ram.speed || 'Unknown'}`);
                Logger.info(`   Capacity: ${ram.capacity || 'Unknown'}`);
                Logger.info(`   Kit: ${ram.kitConfiguration || 'Unknown'}`);
                Logger.info(`   Price: ${ram.currentPrice ? `$${ram.currentPrice}` : ram.price ? `$${ram.price}` : 'N/A'}`);
                Logger.info(`   RGB: ${ram.specifications?.rgb ? 'Yes' : 'No'}`);
                Logger.info('');
            });
        }
        
        // Now check the database count
        Logger.info('\n🔍 Checking database after scraping...');
        const { connectToDatabase, getDatabase } = require('../config/database');
        const db = getDatabase();
        const ramsCollection = db.collection('rams');
        const totalCount = await ramsCollection.countDocuments();
        
        Logger.success(`📦 Total RAM modules now in database: ${totalCount}`);
        
    } catch (error) {
        Logger.error('❌ Test failed:', error.message);
        console.error('Full error:', error);
    } finally {
        await populator.close();
    }
}

testFixedRamScraper()
    .then(() => {
        console.log('\n✅ Fixed RAM scraper test completed');
        process.exit(0);
    })
    .catch(error => {
        console.error('\n💥 Fixed RAM scraper test failed:', error);
        process.exit(1);
    });