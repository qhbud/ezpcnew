const { PSUDataPopulator } = require('./psuDataPopulator');
const Logger = require('./utils/logger');

async function populatePSUs() {
    const populator = new PSUDataPopulator();
    
    try {
        Logger.info('🚀 Starting Power Supply database population...');
        
        await populator.connect();
        await populator.initBrowser();
        
        // PSU searches covering different wattages, certifications, and brands
        const psuSearches = [
            // High-End PSUs (1000W+)
            {
                url: 'https://www.amazon.com/s?k=1000W+power+supply+80+plus+gold+modular&ref=sr_nr_p_36_1',
                model: '1000w_gold_modular'
            },
            {
                url: 'https://www.amazon.com/s?k=1200W+power+supply+80+plus+platinum&ref=sr_nr_p_36_1',
                model: '1200w_platinum'
            },
            {
                url: 'https://www.amazon.com/s?k=1600W+power+supply+80+plus+titanium&ref=sr_nr_p_36_1',
                model: '1600w_titanium'
            },
            
            // Performance PSUs (750W-850W)
            {
                url: 'https://www.amazon.com/s?k=750W+power+supply+80+plus+gold+fully+modular&ref=sr_nr_p_36_1',
                model: '750w_gold_fully_modular'
            },
            {
                url: 'https://www.amazon.com/s?k=850W+power+supply+80+plus+gold&ref=sr_nr_p_36_1',
                model: '850w_gold'
            },
            {
                url: 'https://www.amazon.com/s?k=750W+power+supply+80+plus+platinum+modular&ref=sr_nr_p_36_1',
                model: '750w_platinum_modular'
            },
            
            // Mid-Range PSUs (600W-700W)
            {
                url: 'https://www.amazon.com/s?k=650W+power+supply+80+plus+gold&ref=sr_nr_p_36_1',
                model: '650w_gold'
            },
            {
                url: 'https://www.amazon.com/s?k=600W+power+supply+80+plus+bronze+semi+modular&ref=sr_nr_p_36_1',
                model: '600w_bronze_semi_modular'
            },
            {
                url: 'https://www.amazon.com/s?k=700W+power+supply+80+plus+gold&ref=sr_nr_p_36_1',
                model: '700w_gold'
            },
            
            // Budget PSUs (450W-550W)
            {
                url: 'https://www.amazon.com/s?k=500W+power+supply+80+plus+bronze&ref=sr_nr_p_36_1',
                model: '500w_bronze'
            },
            {
                url: 'https://www.amazon.com/s?k=450W+power+supply+80+plus&ref=sr_nr_p_36_1',
                model: '450w'
            },
            {
                url: 'https://www.amazon.com/s?k=550W+power+supply+80+plus+bronze&ref=sr_nr_p_36_1',
                model: '550w_bronze'
            },
            
            // Popular Brands
            {
                url: 'https://www.amazon.com/s?k=Corsair+power+supply+RM+series&ref=sr_nr_p_36_1',
                model: 'corsair_rm_series'
            },
            {
                url: 'https://www.amazon.com/s?k=EVGA+SuperNOVA+power+supply&ref=sr_nr_p_36_1',
                model: 'evga_supernova'
            },
            {
                url: 'https://www.amazon.com/s?k=Seasonic+Focus+power+supply&ref=sr_nr_p_36_1',
                model: 'seasonic_focus'
            },
            {
                url: 'https://www.amazon.com/s?k=Cooler+Master+MWE+power+supply&ref=sr_nr_p_36_1',
                model: 'coolermaster_mwe'
            },
            {
                url: 'https://www.amazon.com/s?k=Thermaltake+Toughpower+power+supply&ref=sr_nr_p_36_1',
                model: 'thermaltake_toughpower'
            },
            {
                url: 'https://www.amazon.com/s?k=be+quiet+power+supply+straight+power&ref=sr_nr_p_36_1',
                model: 'bequiet_straight_power'
            },
            
            // SFF/Compact PSUs
            {
                url: 'https://www.amazon.com/s?k=SFX+power+supply+600W+modular&ref=sr_nr_p_36_1',
                model: 'sfx_600w_modular'
            },
            {
                url: 'https://www.amazon.com/s?k=SFX-L+power+supply+gold&ref=sr_nr_p_36_1',
                model: 'sfx_l_gold'
            },
            
            // Specific Certifications
            {
                url: 'https://www.amazon.com/s?k=power+supply+80+plus+titanium+modular&ref=sr_nr_p_36_1',
                model: 'titanium_modular'
            },
            {
                url: 'https://www.amazon.com/s?k=power+supply+80+plus+platinum+fully+modular&ref=sr_nr_p_36_1',
                model: 'platinum_fully_modular'
            },
            
            // RGB/Gaming PSUs
            {
                url: 'https://www.amazon.com/s?k=RGB+power+supply+gaming+modular&ref=sr_nr_p_36_1',
                model: 'rgb_gaming_modular'
            },
            
            // Silent/Fanless PSUs
            {
                url: 'https://www.amazon.com/s?k=fanless+power+supply+passive+cooling&ref=sr_nr_p_36_1',
                model: 'fanless_passive'
            },
            
            // Additional Amazon searches
            {
                url: 'https://www.amazon.com/s?k=modular+power+supply+gold+certified&ref=sr_nr_p_36_1',
                model: 'amazon_modular_gold'
            },
            {
                url: 'https://www.amazon.com/s?k=gaming+power+supply+rgb&ref=sr_nr_p_36_1',
                model: 'amazon_gaming_rgb'
            }
        ];
        
        let totalNew = 0;
        let totalDuplicates = 0;
        let totalUpdated = 0;
        const results = [];
        
        Logger.info(`📋 Planning to scrape ${psuSearches.length} different PSU categories`);
        
        for (let i = 0; i < psuSearches.length; i++) {
            const { url, model } = psuSearches[i];
            
            try {
                Logger.info(`\n🔄 [${i + 1}/${psuSearches.length}] Processing: ${model}`);
                Logger.info(`   URL: ${url}`);
                
                const result = await populator.scrapePSUsFromAmazon(url, model);
                
                if (result.success) {
                    totalNew += result.count || 0;
                    totalDuplicates += result.duplicates || 0;
                    totalUpdated += result.updated || 0;
                    
                    Logger.success(`✅ [${i + 1}/${psuSearches.length}] Success: ${result.count} new, ${result.duplicates} duplicates, ${result.updated} updated`);
                } else {
                    Logger.warn(`⚠️  [${i + 1}/${psuSearches.length}] No data found for ${model}`);
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
                if (i < psuSearches.length - 1) {
                    Logger.info('⏳ Waiting 3 seconds before next request...');
                    await new Promise(resolve => setTimeout(resolve, 3000));
                }
                
            } catch (error) {
                Logger.error(`❌ [${i + 1}/${psuSearches.length}] Failed: ${model} - ${error.message}`);
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
        Logger.info('📊 POWER SUPPLY DATABASE POPULATION COMPLETE');
        Logger.info('='.repeat(80));
        
        const totalSuccess = results.filter(r => r.success).length;
        const totalFailed = results.filter(r => !r.success).length;
        
        Logger.success(`✅ Successful categories: ${totalSuccess}`);
        Logger.error(`❌ Failed categories: ${totalFailed}`);
        Logger.info(`📋 Total categories processed: ${psuSearches.length}`);
        
        Logger.info('\n🎯 FINAL TOTALS:');
        Logger.success(`   New PSUs added: ${totalNew}`);
        Logger.info(`   Duplicates skipped: ${totalDuplicates}`);
        Logger.info(`   Existing PSUs updated: ${totalUpdated}`);
        Logger.info(`   Total PSUs processed: ${totalNew + totalDuplicates + totalUpdated}`);
        
        // Check final database count
        Logger.info('\n🔍 Checking final database count...');
        const collection = populator.db.collection('psus');
        const finalCount = await collection.countDocuments();
        
        Logger.success(`📦 Final PSUs in database: ${finalCount}`);
        
        // Show detailed results
        Logger.info('\n📈 DETAILED RESULTS:');
        results.forEach((result, index) => {
            if (result.success) {
                Logger.info(`   ${index + 1}. ${result.model}: ${result.count} new, ${result.duplicates} duplicates, ${result.updated} updated`);
            } else {
                Logger.warn(`   ${index + 1}. ${result.model}: FAILED - ${result.error || 'No data found'}`);
            }
        });
        
        Logger.info('='.repeat(80));
        
    } catch (error) {
        Logger.error('💥 Fatal error during PSU database population:', error);
        throw error;
    } finally {
        await populator.close();
        Logger.info('🚪 Cleanup completed');
    }
}

// Run the population if this script is executed directly
if (require.main === module) {
    populatePSUs()
        .then(() => {
            Logger.success('\n🎉 Power Supply database population completed successfully!');
            process.exit(0);
        })
        .catch(error => {
            Logger.error('\n💥 Power Supply database population failed:', error);
            process.exit(1);
        });
}

module.exports = { populatePSUs };