const { CoolerDataPopulator } = require('./coolerDataPopulator');
const Logger = require('./utils/logger');

async function populateCoolers() {
    const populator = new CoolerDataPopulator();
    
    try {
        Logger.info('🚀 Starting CPU Cooler database population (Amazon only)...');
        
        await populator.connect();
        await populator.initBrowser();
        
        // Amazon cooler searches - comprehensive coverage
        const coolerSearches = [
            // Liquid/AIO Coolers by size
            {
                url: 'https://www.amazon.com/s?k=CPU+liquid+cooler+360mm+AIO&ref=sr_nr_p_36_1',
                model: 'liquid_360mm'
            },
            {
                url: 'https://www.amazon.com/s?k=CPU+liquid+cooler+280mm+AIO&ref=sr_nr_p_36_1',
                model: 'liquid_280mm'
            },
            {
                url: 'https://www.amazon.com/s?k=CPU+liquid+cooler+240mm+AIO&ref=sr_nr_p_36_1',
                model: 'liquid_240mm'
            },
            {
                url: 'https://www.amazon.com/s?k=CPU+liquid+cooler+120mm+AIO&ref=sr_nr_p_36_1',
                model: 'liquid_120mm'
            },
            
            // Air Coolers by type
            {
                url: 'https://www.amazon.com/s?k=CPU+air+cooler+tower+heatsink&ref=sr_nr_p_36_1',
                model: 'air_tower'
            },
            {
                url: 'https://www.amazon.com/s?k=CPU+low+profile+cooler+heatsink&ref=sr_nr_p_36_1',
                model: 'air_low_profile'
            },
            
            // Popular Brands - Liquid
            {
                url: 'https://www.amazon.com/s?k=Corsair+CPU+liquid+cooler+AIO&ref=sr_nr_p_36_1',
                model: 'corsair_liquid'
            },
            {
                url: 'https://www.amazon.com/s?k=NZXT+Kraken+CPU+cooler&ref=sr_nr_p_36_1',
                model: 'nzxt_kraken'
            },
            {
                url: 'https://www.amazon.com/s?k=Cooler+Master+liquid+CPU+cooler&ref=sr_nr_p_36_1',
                model: 'coolermaster_liquid'
            },
            {
                url: 'https://www.amazon.com/s?k=Thermaltake+water+CPU+cooler&ref=sr_nr_p_36_1',
                model: 'thermaltake_liquid'
            },
            
            // Popular Brands - Air
            {
                url: 'https://www.amazon.com/s?k=Noctua+CPU+cooler+heatsink&ref=sr_nr_p_36_1',
                model: 'noctua_air'
            },
            {
                url: 'https://www.amazon.com/s?k=be+quiet+CPU+cooler&ref=sr_nr_p_36_1',
                model: 'bequiet_air'
            },
            {
                url: 'https://www.amazon.com/s?k=Cooler+Master+Hyper+CPU+cooler&ref=sr_nr_p_36_1',
                model: 'coolermaster_air'
            },
            {
                url: 'https://www.amazon.com/s?k=Arctic+CPU+cooler+freezer&ref=sr_nr_p_36_1',
                model: 'arctic_coolers'
            },
            {
                url: 'https://www.amazon.com/s?k=DeepCool+CPU+cooler&ref=sr_nr_p_36_1',
                model: 'deepcool_coolers'
            },
            {
                url: 'https://www.amazon.com/s?k=Scythe+CPU+cooler&ref=sr_nr_p_36_1',
                model: 'scythe_coolers'
            },
            
            // Socket-specific searches
            {
                url: 'https://www.amazon.com/s?k=CPU+cooler+LGA+1700+Intel&ref=sr_nr_p_36_1',
                model: 'intel_lga1700'
            },
            {
                url: 'https://www.amazon.com/s?k=CPU+cooler+AM4+AM5+AMD+Ryzen&ref=sr_nr_p_36_1',
                model: 'amd_am4_am5'
            },
            
            // Performance categories
            {
                url: 'https://www.amazon.com/s?k=RGB+CPU+cooler+gaming&ref=sr_nr_p_36_1',
                model: 'rgb_gaming_coolers'
            },
            {
                url: 'https://www.amazon.com/s?k=quiet+CPU+cooler+silent&ref=sr_nr_p_36_1',
                model: 'silent_coolers'
            }
        ];
        
        let totalNew = 0;
        let totalDuplicates = 0;
        let totalProcessed = 0;
        const results = [];
        
        Logger.info(`📋 Planning to scrape ${coolerSearches.length} different cooler categories from Amazon`);
        
        for (let i = 0; i < coolerSearches.length; i++) {
            const { url, model } = coolerSearches[i];
            
            try {
                Logger.info(`\n🔄 [${i + 1}/${coolerSearches.length}] Processing: ${model}`);
                Logger.info(`   URL: ${url}`);
                
                const result = await populator.scrapeCoolersFromAmazon(url, model);
                
                if (result.success) {
                    totalNew += result.count || 0;
                    totalDuplicates += result.duplicates || 0;
                    totalProcessed += result.total || 0;
                    
                    Logger.success(`✅ [${i + 1}/${coolerSearches.length}] Success: ${result.count} new, ${result.duplicates} duplicates`);
                } else {
                    Logger.warn(`⚠️  [${i + 1}/${coolerSearches.length}] No data found for ${model}`);
                }
                
                results.push({
                    model,
                    url,
                    success: result.success,
                    count: result.count || 0,
                    duplicates: result.duplicates || 0
                });
                
                // Add delay between requests to be respectful
                if (i < coolerSearches.length - 1) {
                    Logger.info('⏳ Waiting 3 seconds before next request...');
                    await new Promise(resolve => setTimeout(resolve, 3000));
                }
                
            } catch (error) {
                Logger.error(`❌ [${i + 1}/${coolerSearches.length}] Failed: ${model} - ${error.message}`);
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
        Logger.info('📊 CPU COOLER DATABASE POPULATION COMPLETE');
        Logger.info('='.repeat(80));
        
        const totalSuccess = results.filter(r => r.success).length;
        const totalFailed = results.filter(r => !r.success).length;
        
        Logger.success(`✅ Successful categories: ${totalSuccess}`);
        Logger.error(`❌ Failed categories: ${totalFailed}`);
        Logger.info(`📋 Total categories processed: ${coolerSearches.length}`);
        
        Logger.info('\n🎯 FINAL TOTALS:');
        Logger.success(`   New coolers added: ${totalNew}`);
        Logger.info(`   Duplicates skipped: ${totalDuplicates}`);
        Logger.info(`   Total coolers processed: ${totalProcessed}`);
        
        // Check final database count
        Logger.info('\n🔍 Checking final database count...');
        const collection = populator.db.collection('coolers');
        const finalCount = await collection.countDocuments();
        
        Logger.success(`📦 Final coolers in database: ${finalCount}`);
        
        // Show detailed results
        Logger.info('\n📈 DETAILED RESULTS:');
        results.forEach((result, index) => {
            if (result.success) {
                Logger.info(`   ${index + 1}. ${result.model}: ${result.count} new, ${result.duplicates} duplicates`);
            } else {
                Logger.warn(`   ${index + 1}. ${result.model}: FAILED - ${result.error || 'No data found'}`);
            }
        });
        
        Logger.info('='.repeat(80));
        
    } catch (error) {
        Logger.error('💥 Fatal error during cooler database population:', error);
        throw error;
    } finally {
        await populator.close();
        Logger.info('🚪 Cleanup completed');
    }
}

// Run the population if this script is executed directly
if (require.main === module) {
    populateCoolers()
        .then(() => {
            Logger.success('\n🎉 CPU Cooler database population completed successfully!');
            process.exit(0);
        })
        .catch(error => {
            Logger.error('\n💥 CPU Cooler database population failed:', error);
            process.exit(1);
        });
}

module.exports = { populateCoolers };