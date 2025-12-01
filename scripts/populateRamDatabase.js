const { RamDataPopulator } = require('./ramDataPopulator');
const Logger = require('./utils/logger');

async function populateRamDatabase() {
  const populator = new RamDataPopulator();
  
  try {
    Logger.info('🚀 Starting RAM database population...');
    
    await populator.connect();
    await populator.initBrowser();
    
    // Define RAM search URLs for different categories
    const ramSearches = [
      // DDR5 High-End
      {
        url: 'https://www.amazon.com/s?k=DDR5-6000+32GB+desktop+memory&ref=sr_nr_p_36_1',
        model: 'DDR5-6000'
      },
      {
        url: 'https://www.amazon.com/s?k=DDR5-5600+memory+desktop&ref=sr_nr_p_36_1',
        model: 'DDR5-5600'
      },
      {
        url: 'https://www.newegg.com/p/pl?d=DDR5-6400+desktop+memory&N=100007611',
        model: 'DDR5-6400'
      },
      
      // DDR5 Performance
      {
        url: 'https://www.amazon.com/s?k=DDR5-5200+desktop+memory&ref=sr_nr_p_36_1',
        model: 'DDR5-5200'
      },
      {
        url: 'https://www.newegg.com/p/pl?d=DDR5-4800+desktop+memory&N=100007611',
        model: 'DDR5-4800'
      },
      
      // DDR4 High-End
      {
        url: 'https://www.amazon.com/s?k=DDR4-3600+32GB+desktop+memory&ref=sr_nr_p_36_1',
        model: 'DDR4-3600'
      },
      {
        url: 'https://www.amazon.com/s?k=DDR4-4000+desktop+memory&ref=sr_nr_p_36_1',
        model: 'DDR4-4000'
      },
      {
        url: 'https://www.newegg.com/p/pl?d=DDR4-3800+desktop+memory&N=100007611',
        model: 'DDR4-3800'
      },
      
      // DDR4 Performance/Mainstream
      {
        url: 'https://www.amazon.com/s?k=DDR4-3200+16GB+desktop+memory&ref=sr_nr_p_36_1',
        model: 'DDR4-3200'
      },
      {
        url: 'https://www.amazon.com/s?k=DDR4-3000+desktop+memory&ref=sr_nr_p_36_1',
        model: 'DDR4-3000'
      },
      {
        url: 'https://www.newegg.com/p/pl?d=DDR4-2666+desktop+memory&N=100007611',
        model: 'DDR4-2666'
      },
      
      // Popular Brands and Kits
      {
        url: 'https://www.amazon.com/s?k=Corsair+Vengeance+RGB+Pro+DDR4&ref=sr_nr_p_36_1',
        model: 'corsair_vengeance_rgb'
      },
      {
        url: 'https://www.amazon.com/s?k=G.Skill+Trident+Z5+Neo+DDR5&ref=sr_nr_p_36_1',
        model: 'gskill_trident_z5'
      },
      {
        url: 'https://www.newegg.com/p/pl?d=Crucial+Ballistix+DDR4&N=100007611',
        model: 'crucial_ballistix'
      },
      {
        url: 'https://www.amazon.com/s?k=Kingston+FURY+Beast+DDR4&ref=sr_nr_p_36_1',
        model: 'kingston_fury'
      },
      
      // Capacity-based searches
      {
        url: 'https://www.amazon.com/s?k=64GB+DDR5+desktop+memory+kit&ref=sr_nr_p_36_1',
        model: '64gb_ddr5_kits'
      },
      {
        url: 'https://www.amazon.com/s?k=32GB+DDR4+desktop+memory+kit&ref=sr_nr_p_36_1',
        model: '32gb_ddr4_kits'
      },
      {
        url: 'https://www.newegg.com/p/pl?d=16GB+DDR4+desktop+memory&N=100007611',
        model: '16gb_ddr4'
      },
      
      // Best Buy searches
      {
        url: 'https://www.bestbuy.com/site/searchpage.jsp?st=DDR5+desktop+memory',
        model: 'bestbuy_ddr5'
      },
      {
        url: 'https://www.bestbuy.com/site/searchpage.jsp?st=DDR4+gaming+memory',
        model: 'bestbuy_ddr4'
      }
    ];
    
    let totalSuccess = 0;
    let totalFailed = 0;
    const results = [];
    
    Logger.info(`📋 Planning to scrape ${ramSearches.length} different RAM categories`);
    
    for (let i = 0; i < ramSearches.length; i++) {
      const { url, model } = ramSearches[i];
      
      try {
        Logger.info(`\n🔄 [${i + 1}/${ramSearches.length}] Processing: ${model}`);
        Logger.info(`   URL: ${url}`);
        
        const result = await populator.populateRamData(url, model);
        
        if (result.success) {
          totalSuccess++;
          Logger.success(`✅ [${i + 1}/${ramSearches.length}] Successfully processed ${model}`);
          Logger.info(`   New: ${result.count}, Duplicates: ${result.duplicates}, Updated: ${result.updated}`);
        } else {
          totalFailed++;
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
        totalFailed++;
        Logger.error(`❌ [${i + 1}/${ramSearches.length}] Failed to process ${model}: ${error.message}`);
        results.push({
          model,
          url,
          success: false,
          error: error.message
        });
        
        // Continue with next search even if this one failed
        continue;
      }
    }
    
    // Final summary
    Logger.info('\n' + '='.repeat(80));
    Logger.info('📊 RAM DATABASE POPULATION COMPLETE');
    Logger.info('='.repeat(80));
    Logger.success(`✅ Successful categories: ${totalSuccess}`);
    Logger.error(`❌ Failed categories: ${totalFailed}`);
    Logger.info(`📋 Total categories processed: ${ramSearches.length}`);
    
    // Detailed results
    Logger.info('\n📈 DETAILED RESULTS:');
    results.forEach((result, index) => {
      if (result.success) {
        Logger.info(`   ${index + 1}. ${result.model}: ${result.count} new, ${result.duplicates} duplicates, ${result.updated} updated`);
      } else {
        Logger.warn(`   ${index + 1}. ${result.model}: FAILED - ${result.error || 'No data found'}`);
      }
    });
    
    const totalNew = results.reduce((sum, r) => sum + (r.count || 0), 0);
    const totalDuplicates = results.reduce((sum, r) => sum + (r.duplicates || 0), 0);
    const totalUpdated = results.reduce((sum, r) => sum + (r.updated || 0), 0);
    
    Logger.info('\n🎯 FINAL TOTALS:');
    Logger.success(`   New RAM modules added: ${totalNew}`);
    Logger.info(`   Duplicates skipped: ${totalDuplicates}`);
    Logger.info(`   Existing modules updated: ${totalUpdated}`);
    Logger.info(`   Total RAM modules processed: ${totalNew + totalDuplicates + totalUpdated}`);
    
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
  populateRamDatabase()
    .then(() => {
      Logger.success('\n🎉 RAM database population completed successfully!');
      process.exit(0);
    })
    .catch(error => {
      Logger.error('\n💥 RAM database population failed:', error);
      process.exit(1);
    });
}

module.exports = { populateRamDatabase };