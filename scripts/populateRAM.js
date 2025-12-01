const { RamDataPopulator } = require('./ramDataPopulator');
const Logger = require('./utils/logger');

async function populateRAM(searchUrl, ramModel) {
  const populator = new RamDataPopulator();
  
  try {
    Logger.info('🧠 RAM Data Populator');
    Logger.info('====================\n');
    
    await populator.connect();
    await populator.initBrowser();
    
    Logger.info(`Processing: ${ramModel} from ${searchUrl}`);
    
    const result = await populator.populateRamData(searchUrl, ramModel);
    
    if (result.success) {
      Logger.success('✅ RAM population completed successfully!');
      Logger.info(`   New RAM modules: ${result.count}`);
      Logger.info(`   Duplicates skipped: ${result.duplicates}`);
      Logger.info(`   Total processed: ${result.total}`);
    } else {
      Logger.error('❌ Failed to populate RAM data');
      process.exit(1);
    }
    
  } catch (error) {
    Logger.error('Error:', error);
    process.exit(1);
  } finally {
    await populator.close();
  }
}

// Command line interface
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.length >= 2) {
    const ramModel = args[0];
    const searchUrl = args[1];
    
    Logger.info(`Command line mode: ${ramModel} from ${searchUrl}`);
    
    populateRAM(searchUrl, ramModel)
      .then(() => {
        Logger.success('\n🎉 RAM population completed!');
        process.exit(0);
      })
      .catch((error) => {
        Logger.error('Script failed:', error);
        process.exit(1);
      });
  } else {
    Logger.error('❌ Usage: node populateRAM.js "RAM_MODEL" "SEARCH_URL"');
    Logger.info('📖 Examples:');
    Logger.info('   node populateRAM.js "DDR5-5600 32GB" "https://amazon.com/s?k=ddr5+5600+32gb"');
    Logger.info('   node populateRAM.js "DDR4-3200 16GB" "https://amazon.com/s?k=ddr4+3200+16gb"');
    process.exit(1);
  }
}