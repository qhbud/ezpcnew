const { RamDataPopulator } = require('./ramDataPopulator');
const Logger = require('./utils/logger');

// Comprehensive RAM search queries for full database population
const RAM_SEARCHES = [
  // DDR5 Gaming/High Performance
  { model: "DDR5-6400 32GB", url: "https://amazon.com/s?k=ddr5+6400+32gb+gaming&ref=sr_nr_p_n_feature_five_browse-bin_0" },
  { model: "DDR5-6000 32GB", url: "https://amazon.com/s?k=ddr5+6000+32gb+gaming&ref=sr_nr_p_n_feature_five_browse-bin_0" },
  { model: "DDR5-5600 32GB", url: "https://amazon.com/s?k=ddr5+5600+32gb+gaming&ref=sr_nr_p_n_feature_five_browse-bin_0" },
  { model: "DDR5-5200 32GB", url: "https://amazon.com/s?k=ddr5+5200+32gb&ref=sr_nr_p_n_feature_five_browse-bin_0" },
  { model: "DDR5-4800 32GB", url: "https://amazon.com/s?k=ddr5+4800+32gb&ref=sr_nr_p_n_feature_five_browse-bin_0" },

  // DDR5 16GB Kits
  { model: "DDR5-6000 16GB", url: "https://amazon.com/s?k=ddr5+6000+16gb+kit&ref=sr_nr_p_n_feature_five_browse-bin_0" },
  { model: "DDR5-5600 16GB", url: "https://amazon.com/s?k=ddr5+5600+16gb+kit&ref=sr_nr_p_n_feature_five_browse-bin_0" },
  { model: "DDR5-5200 16GB", url: "https://amazon.com/s?k=ddr5+5200+16gb&ref=sr_nr_p_n_feature_five_browse-bin_0" },

  // DDR5 High Capacity
  { model: "DDR5-5600 64GB", url: "https://amazon.com/s?k=ddr5+5600+64gb&ref=sr_nr_p_n_feature_five_browse-bin_0" },
  { model: "DDR5-5200 128GB", url: "https://amazon.com/s?k=ddr5+5200+128gb&ref=sr_nr_p_n_feature_five_browse-bin_0" },

  // DDR4 High Performance Gaming
  { model: "DDR4-4000 32GB", url: "https://amazon.com/s?k=ddr4+4000+32gb+gaming&ref=sr_nr_p_n_feature_five_browse-bin_1" },
  { model: "DDR4-3600 32GB", url: "https://amazon.com/s?k=ddr4+3600+32gb+gaming&ref=sr_nr_p_n_feature_five_browse-bin_1" },
  { model: "DDR4-3200 32GB", url: "https://amazon.com/s?k=ddr4+3200+32gb&ref=sr_nr_p_n_feature_five_browse-bin_1" },

  // DDR4 16GB Mainstream
  { model: "DDR4-3600 16GB", url: "https://amazon.com/s?k=ddr4+3600+16gb+kit&ref=sr_nr_p_n_feature_five_browse-bin_1" },
  { model: "DDR4-3200 16GB", url: "https://amazon.com/s?k=ddr4+3200+16gb+kit&ref=sr_nr_p_n_feature_five_browse-bin_1" },
  { model: "DDR4-3000 16GB", url: "https://amazon.com/s?k=ddr4+3000+16gb&ref=sr_nr_p_n_feature_five_browse-bin_1" },

  // DDR4 Budget/Entry Level
  { model: "DDR4-2666 16GB", url: "https://amazon.com/s?k=ddr4+2666+16gb&ref=sr_nr_p_n_feature_five_browse-bin_1" },
  { model: "DDR4-2400 16GB", url: "https://amazon.com/s?k=ddr4+2400+16gb&ref=sr_nr_p_n_feature_five_browse-bin_1" },

  // DDR4 8GB Budget Options
  { model: "DDR4-3200 8GB", url: "https://amazon.com/s?k=ddr4+3200+8gb+kit&ref=sr_nr_p_n_feature_five_browse-bin_1" },
  { model: "DDR4-2666 8GB", url: "https://amazon.com/s?k=ddr4+2666+8gb&ref=sr_nr_p_n_feature_five_browse-bin_1" },

  // DDR4 High Capacity Workstation
  { model: "DDR4-3200 64GB", url: "https://amazon.com/s?k=ddr4+3200+64gb&ref=sr_nr_p_n_feature_five_browse-bin_1" },
  { model: "DDR4-2666 128GB", url: "https://amazon.com/s?k=ddr4+2666+128gb&ref=sr_nr_p_n_feature_five_browse-bin_1" },

  // RGB/Enthusiast RAM
  { model: "DDR5-6000 RGB 32GB", url: "https://amazon.com/s?k=ddr5+6000+rgb+32gb&ref=sr_nr_p_n_feature_five_browse-bin_0" },
  { model: "DDR4-3600 RGB 32GB", url: "https://amazon.com/s?k=ddr4+3600+rgb+32gb&ref=sr_nr_p_n_feature_five_browse-bin_1" },

  // Brand-Specific High-End
  { model: "G.Skill Trident DDR5", url: "https://amazon.com/s?k=gskill+trident+ddr5&ref=sr_nr_p_n_feature_five_browse-bin_0" },
  { model: "Corsair Vengeance DDR5", url: "https://amazon.com/s?k=corsair+vengeance+ddr5&ref=sr_nr_p_n_feature_five_browse-bin_0" },
  { model: "G.Skill Ripjaws DDR4", url: "https://amazon.com/s?k=gskill+ripjaws+ddr4&ref=sr_nr_p_n_feature_five_browse-bin_1" },
  { model: "Corsair Vengeance DDR4", url: "https://amazon.com/s?k=corsair+vengeance+ddr4&ref=sr_nr_p_n_feature_five_browse-bin_1" }
];

async function populateAllRAM() {
  const populator = new RamDataPopulator();
  
  try {
    Logger.info('🧠 Complete RAM Database Population');
    Logger.info('==================================\n');
    
    await populator.connect();
    await populator.initBrowser();
    
    let totalStats = {
      totalProcessed: 0,
      totalNew: 0,
      totalDuplicates: 0,
      totalUpdated: 0,
      successful: 0,
      failed: 0
    };

    Logger.info(`📋 Will process ${RAM_SEARCHES.length} RAM categories\n`);
    
    for (let i = 0; i < RAM_SEARCHES.length; i++) {
      const { model, url } = RAM_SEARCHES[i];
      const progress = `[${i + 1}/${RAM_SEARCHES.length}]`;
      
      Logger.info(`${progress} Processing: ${model}`);
      Logger.info(`        URL: ${url.substring(0, 80)}...`);
      
      try {
        const result = await populator.populateRamData(url, model);
        
        if (result.success) {
          totalStats.totalProcessed += result.total || 0;
          totalStats.totalNew += result.count || 0;
          totalStats.totalDuplicates += result.duplicates || 0;
          totalStats.totalUpdated += result.updated || 0;
          totalStats.successful++;
          
          Logger.success(`✅ ${model}: ${result.count} new, ${result.duplicates} dupes, ${result.total} total`);
        } else {
          totalStats.failed++;
          Logger.error(`❌ ${model}: Failed - ${result.message || 'Unknown error'}`);
        }
      } catch (error) {
        totalStats.failed++;
        Logger.error(`❌ ${model}: Error - ${error.message}`);
      }
      
      // Brief pause between searches to be respectful
      if (i < RAM_SEARCHES.length - 1) {
        Logger.info('⏳ Brief pause before next search...\n');
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    // Final summary
    Logger.info('\n' + '='.repeat(50));
    Logger.success('🎉 RAM DATABASE POPULATION COMPLETE!');
    Logger.info('='.repeat(50));
    Logger.info(`📊 FINAL STATISTICS:`);
    Logger.info(`   Categories processed: ${totalStats.successful + totalStats.failed}`);
    Logger.info(`   Successful: ${totalStats.successful}`);
    Logger.info(`   Failed: ${totalStats.failed}`);
    Logger.info(`   Total RAM modules processed: ${totalStats.totalProcessed}`);
    Logger.info(`   New RAM modules added: ${totalStats.totalNew}`);
    Logger.info(`   Duplicates skipped: ${totalStats.totalDuplicates}`);
    Logger.info(`   RAM modules updated: ${totalStats.totalUpdated}`);
    Logger.info('='.repeat(50));
    
    if (totalStats.failed > 0) {
      Logger.warn(`⚠️  ${totalStats.failed} categories failed - check logs above`);
    }
    
  } catch (error) {
    Logger.error('Population script failed:', error);
    process.exit(1);
  } finally {
    await populator.close();
  }
}

// Run if called directly
if (require.main === module) {
  populateAllRAM()
    .then(() => {
      Logger.success('\n🚀 Complete RAM population finished!');
      process.exit(0);
    })
    .catch((error) => {
      Logger.error('Script failed:', error);
      process.exit(1);
    });
}

module.exports = { populateAllRAM };