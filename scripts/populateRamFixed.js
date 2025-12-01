const { RamDataPopulatorFixed } = require('./ramDataPopulatorFixed');
const Logger = require('./utils/logger');

async function populateRamFixed() {
    const populator = new RamDataPopulatorFixed();
    
    try {
        Logger.info('🚀 Starting Fixed RAM population (Amazon only)...');
        
        await populator.connect();
        await populator.initBrowser();
        
        // Amazon-only RAM searches - diverse RAM types
        const ramSearches = [
            {
                url: 'https://www.amazon.com/s?k=DDR4-3200+16GB+desktop+memory&ref=sr_nr_p_36_1',
                model: 'DDR4-3200'
            },
            {
                url: 'https://www.amazon.com/s?k=DDR4-3600+32GB+desktop+memory&ref=sr_nr_p_36_1',
                model: 'DDR4-3600'
            },
            {
                url: 'https://www.amazon.com/s?k=DDR5-5600+16GB+desktop+memory&ref=sr_nr_p_36_1',
                model: 'DDR5-5600'
            },
            {
                url: 'https://www.amazon.com/s?k=DDR5-6000+32GB+desktop+memory&ref=sr_nr_p_36_1',
                model: 'DDR5-6000'
            },
            {
                url: 'https://www.amazon.com/s?k=Corsair+Vengeance+RGB+Pro+DDR4&ref=sr_nr_p_36_1',
                model: 'corsair_vengeance_rgb'
            },
            {
                url: 'https://www.amazon.com/s?k=G.Skill+Trident+Z5+Neo+DDR5&ref=sr_nr_p_36_1',
                model: 'gskill_trident_z5'
            },
            {
                url: 'https://www.amazon.com/s?k=Crucial+Ballistix+DDR4+gaming+memory&ref=sr_nr_p_36_1',
                model: 'crucial_ballistix'
            },
            {
                url: 'https://www.amazon.com/s?k=Kingston+FURY+Beast+DDR4+memory&ref=sr_nr_p_36_1',
                model: 'kingston_fury'
            },
            {
                url: 'https://www.amazon.com/s?k=64GB+DDR5+desktop+memory+kit&ref=sr_nr_p_36_1',
                model: '64gb_ddr5_kits'
            },
            {
                url: 'https://www.amazon.com/s?k=8GB+DDR4+desktop+memory&ref=sr_nr_p_36_1',
                model: '8gb_ddr4'
            }
        ];
        
        let totalNew = 0;
        let totalDuplicates = 0;
        let totalUpdated = 0;
        let totalProcessed = 0;
        const results = [];
        
        Logger.info(`📋 Planning to scrape ${ramSearches.length} different RAM categories from Amazon`);
        
        for (let i = 0; i < ramSearches.length; i++) {
            const { url, model } = ramSearches[i];
            
            try {
                Logger.info(`\n🔄 [${i + 1}/${ramSearches.length}] Processing: ${model}`);
                Logger.info(`   URL: ${url}`);
                
                const result = await populator.scrapeRamFromAmazon(url, model);
                
                if (result.success) {
                    totalNew += result.count || 0;
                    totalDuplicates += result.duplicates || 0;
                    totalUpdated += result.updated || 0;
                    totalProcessed += result.total || 0;
                    
                    Logger.success(`✅ [${i + 1}/${ramSearches.length}] Success: ${result.count} new, ${result.duplicates} duplicates, ${result.updated} updated`);
                } else {
                    Logger.warn(`⚠️  [${i + 1}/${ramSearches.length}] No data found for ${model}`);
                }
                
                results.push({
                    model,
                    url,
                    success: result.success,
                    count: result.count || 0,
                    duplicates: result.duplicates || 0,
                    updated: result.updated || 0
                });
                
                // Add delay between requests to be respectful
                if (i < ramSearches.length - 1) {
                    Logger.info('⏳ Waiting 3 seconds before next request...');
                    await new Promise(resolve => setTimeout(resolve, 3000));
                }
                
            } catch (error) {
                Logger.error(`❌ [${i + 1}/${ramSearches.length}] Failed: ${model} - ${error.message}`);
                results.push({
                    model,
                    url,
                    success: false,
                    error: error.message
                });
                continue;
            }
        }
        
        // Final summary
        Logger.info('\n' + '='.repeat(80));
        Logger.info('📊 FIXED RAM DATABASE POPULATION COMPLETE');
        Logger.info('='.repeat(80));
        
        const totalSuccess = results.filter(r => r.success).length;
        const totalFailed = results.filter(r => !r.success).length;
        
        Logger.success(`✅ Successful categories: ${totalSuccess}`);
        Logger.error(`❌ Failed categories: ${totalFailed}`);
        Logger.info(`📋 Total categories processed: ${ramSearches.length}`);
        
        Logger.info('\n🎯 FINAL TOTALS:');
        Logger.success(`   New RAM modules added: ${totalNew}`);
        Logger.info(`   Duplicates skipped: ${totalDuplicates}`);
        Logger.info(`   Existing modules updated: ${totalUpdated}`);
        Logger.info(`   Total RAM modules processed: ${totalProcessed}`);
        
        // Check final database count
        Logger.info('\n🔍 Checking final database count...');
        const { connectToDatabase, getDatabase } = require('../config/database');
        const db = getDatabase();
        const ramsCollection = db.collection('rams');
        const finalCount = await ramsCollection.countDocuments();
        
        Logger.success(`📦 Final RAM modules in database: ${finalCount}`);
        Logger.info('='.repeat(80));
        
    } catch (error) {
        Logger.error('💥 Fatal error during RAM database population:', error);
        throw error;
    } finally {
        await populator.close();
        Logger.info('🚪 Cleanup completed');
    }
}

// Run the population if this script is executed directly
if (require.main === module) {
    populateRamFixed()
        .then(() => {
            Logger.success('\n🎉 Fixed RAM database population completed successfully!');
            process.exit(0);
        })
        .catch(error => {
            Logger.error('\n💥 Fixed RAM database population failed:', error);
            process.exit(1);
        });
}

module.exports = { populateRamFixed };