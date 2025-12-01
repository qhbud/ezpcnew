const { RamDataPopulatorSimple } = require('./ramDataPopulatorSimple');
const Logger = require('./utils/logger');

async function testSimpleRamPopulator() {
    const populator = new RamDataPopulatorSimple();
    
    try {
        Logger.info('🧪 Testing Simple RAM Populator...');
        
        await populator.connect();
        await populator.initBrowser();
        
        // Test with just one search to see if it saves properly
        const testUrl = 'https://www.amazon.com/s?k=Corsair+Vengeance+RGB+Pro+DDR4&ref=sr_nr_p_36_1';
        const testModel = 'corsair_test';
        
        Logger.info(`🔍 Testing URL: ${testUrl}`);
        
        const result = await populator.scrapeRamFromAmazon(testUrl, testModel);
        
        Logger.info('\n📊 Test Results:');
        Logger.info(`   Success: ${result.success}`);
        Logger.info(`   New: ${result.count || 0}`);
        Logger.info(`   Duplicates: ${result.duplicates || 0}`);
        Logger.info(`   Total found: ${result.total || 0}`);
        
        // Now check the database count
        Logger.info('\n🔍 Checking database after scraping...');
        const { connectToDatabase, getDatabase } = require('../config/database');
        const db = getDatabase();
        const ramsCollection = db.collection('rams');
        const totalCount = await ramsCollection.countDocuments();
        
        Logger.success(`📦 Total RAM modules now in database: ${totalCount}`);
        
        if (totalCount > result.count) {
            Logger.info(`📈 Database grew from previous runs`);
        } else if (totalCount === result.count) {
            Logger.success(`✅ All new RAM modules were saved successfully!`);
        } else {
            Logger.warn(`⚠️  Database count is less than expected`);
        }
        
    } catch (error) {
        Logger.error('❌ Test failed:', error.message);
        console.error('Full error:', error);
    } finally {
        await populator.close();
    }
}

testSimpleRamPopulator()
    .then(() => {
        console.log('\n✅ Simple RAM populator test completed');
        process.exit(0);
    })
    .catch(error => {
        console.error('\n💥 Simple RAM populator test failed:', error);
        process.exit(1);
    });