const { RamDataPopulator } = require('./ramDataPopulator');
const Logger = require('./utils/logger');

async function populateRamMinimal() {
    const populator = new RamDataPopulator();
    
    try {
        Logger.info('🚀 Starting minimal RAM population...');
        
        await populator.connect();
        await populator.initBrowser();
        
        // Just test 3 searches to avoid overwhelming
        const ramSearches = [
            {
                url: 'https://www.amazon.com/s?k=DDR4-3200+16GB+desktop+memory&ref=sr_nr_p_36_1',
                model: 'DDR4-3200'
            },
            {
                url: 'https://www.amazon.com/s?k=DDR5-5600+32GB+desktop+memory&ref=sr_nr_p_36_1', 
                model: 'DDR5-5600'
            },
            {
                url: 'https://www.amazon.com/s?k=Corsair+Vengeance+RGB+DDR4&ref=sr_nr_p_36_1',
                model: 'corsair_vengeance'
            }
        ];
        
        let totalNew = 0;
        let totalDuplicates = 0;
        let totalProcessed = 0;
        
        for (let i = 0; i < ramSearches.length; i++) {
            const { url, model } = ramSearches[i];
            
            try {
                Logger.info(`\n🔄 [${i + 1}/${ramSearches.length}] Processing: ${model}`);
                Logger.info(`   URL: ${url}`);
                
                const result = await populator.populateRamData(url, model);
                
                if (result.success) {
                    totalNew += result.count || 0;
                    totalDuplicates += result.duplicates || 0;
                    totalProcessed += result.total || 0;
                    
                    Logger.success(`✅ [${i + 1}/${ramSearches.length}] Success: ${result.count} new, ${result.duplicates} duplicates`);
                } else {
                    Logger.warn(`⚠️  [${i + 1}/${ramSearches.length}] No data found for ${model}`);
                }
                
                // Add small delay between requests
                if (i < ramSearches.length - 1) {
                    Logger.info('⏳ Waiting 2 seconds...');
                    await new Promise(resolve => setTimeout(resolve, 2000));
                }
                
            } catch (error) {
                Logger.error(`❌ [${i + 1}/${ramSearches.length}] Failed: ${model} - ${error.message}`);
                continue;
            }
        }
        
        Logger.info('\n📊 MINIMAL POPULATION RESULTS:');
        Logger.success(`✅ New RAM modules: ${totalNew}`);
        Logger.info(`🔄 Duplicates: ${totalDuplicates}`);
        Logger.info(`📦 Total processed: ${totalProcessed}`);
        
    } catch (error) {
        Logger.error('💥 Fatal error:', error);
    } finally {
        await populator.close();
    }
}

populateRamMinimal()
    .then(() => {
        Logger.success('\n🎉 Minimal RAM population completed!');
        process.exit(0);
    })
    .catch(error => {
        Logger.error('\n💥 Minimal RAM population failed:', error);
        process.exit(1);
    });