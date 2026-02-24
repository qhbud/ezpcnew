const { MotherboardDataPopulator } = require('./motherboardDataPopulator');
const { connectToDatabase, getDatabase } = require('../config/database');
const Logger = require('./utils/logger');
const ProgressTracker = require('./utils/progressTracker');

class BulkMotherboardImporter {
  constructor() {
    this.populator = new MotherboardDataPopulator();
    this.results = {
      total: 0,
      successful: 0,
      failed: 0,
      models: {}
    };
  }

  async initialize() {
    await this.populator.connect();
    await this.populator.initBrowser();
    Logger.success('✅ Initialized bulk motherboard importer');
  }

  async cleanup() {
    if (this.populator.browser) {
      await this.populator.browser.close();
    }
    Logger.info('🚪 Cleanup completed');
  }

  // Generate Amazon search URL for a motherboard model
  generateSearchUrl(searchTerm) {
    const query = searchTerm.toLowerCase().replace(/\s+/g, '+');
    return `https://www.amazon.com/s?k=${query}&ref=nb_sb_noss`;
  }

  // Get comprehensive motherboard model list
  getMotherboardModels() {
    return [
      // ============================================================
      // LGA1851 - Intel Core Ultra 200 series (Arrow Lake)
      // ============================================================

      // Z890 High-End
      { model: 'Z890 ATX', searchTerms: ['Z890 ATX motherboard LGA1851'], manufacturer: 'Intel', socket: 'LGA1851', priority: 1 },
      { model: 'Z890 Micro-ATX', searchTerms: ['Z890 Micro ATX motherboard mATX LGA1851'], manufacturer: 'Intel', socket: 'LGA1851', priority: 1 },
      { model: 'Z890 Mini-ITX', searchTerms: ['Z890 Mini ITX motherboard LGA1851'], manufacturer: 'Intel', socket: 'LGA1851', priority: 1 },

      // B860 Mainstream
      { model: 'B860 ATX', searchTerms: ['B860 ATX motherboard LGA1851'], manufacturer: 'Intel', socket: 'LGA1851', priority: 1 },
      { model: 'B860 Micro-ATX', searchTerms: ['B860 Micro ATX motherboard mATX LGA1851'], manufacturer: 'Intel', socket: 'LGA1851', priority: 1 },

      // H810 Budget
      { model: 'H810 Micro-ATX', searchTerms: ['H810 Micro ATX motherboard LGA1851'], manufacturer: 'Intel', socket: 'LGA1851', priority: 2 },

      // ============================================================
      // LGA1700 - Intel 12th/13th Gen (Alder/Raptor Lake)
      // ============================================================

      // Z790 High-End
      { model: 'Z790 ATX', searchTerms: ['Z790 ATX motherboard LGA1700'], manufacturer: 'Intel', socket: 'LGA1700', priority: 1 },
      { model: 'Z790 Micro-ATX', searchTerms: ['Z790 Micro ATX motherboard mATX LGA1700'], manufacturer: 'Intel', socket: 'LGA1700', priority: 1 },
      { model: 'Z790 Mini-ITX', searchTerms: ['Z790 Mini ITX motherboard LGA1700'], manufacturer: 'Intel', socket: 'LGA1700', priority: 1 },

      // B760 Mainstream
      { model: 'B760 ATX', searchTerms: ['B760 ATX motherboard LGA1700'], manufacturer: 'Intel', socket: 'LGA1700', priority: 1 },
      { model: 'B760 Micro-ATX', searchTerms: ['B760 Micro ATX motherboard mATX LGA1700'], manufacturer: 'Intel', socket: 'LGA1700', priority: 1 },
      { model: 'B760 Mini-ITX', searchTerms: ['B760 Mini ITX motherboard LGA1700'], manufacturer: 'Intel', socket: 'LGA1700', priority: 1 },

      // H770 Mid-Range
      { model: 'H770 ATX', searchTerms: ['H770 ATX motherboard LGA1700'], manufacturer: 'Intel', socket: 'LGA1700', priority: 2 },

      // H610 Budget
      { model: 'H610 Micro-ATX', searchTerms: ['H610 Micro ATX motherboard LGA1700'], manufacturer: 'Intel', socket: 'LGA1700', priority: 2 },

      // Z690 Previous High-End
      { model: 'Z690 ATX', searchTerms: ['Z690 ATX motherboard LGA1700'], manufacturer: 'Intel', socket: 'LGA1700', priority: 2 },
      { model: 'Z690 Micro-ATX', searchTerms: ['Z690 Micro ATX motherboard mATX LGA1700'], manufacturer: 'Intel', socket: 'LGA1700', priority: 2 },

      // B660 Previous Mainstream
      { model: 'B660 ATX', searchTerms: ['B660 ATX motherboard LGA1700'], manufacturer: 'Intel', socket: 'LGA1700', priority: 2 },
      { model: 'B660 Micro-ATX', searchTerms: ['B660 Micro ATX motherboard mATX LGA1700'], manufacturer: 'Intel', socket: 'LGA1700', priority: 2 },

      // ============================================================
      // AM5 - AMD Ryzen 7000/8000/9000 series
      // ============================================================

      // X870E Flagship
      { model: 'X870E ATX', searchTerms: ['X870E ATX motherboard AM5'], manufacturer: 'AMD', socket: 'AM5', priority: 1 },

      // X870 High-End
      { model: 'X870 ATX', searchTerms: ['X870 ATX motherboard AM5'], manufacturer: 'AMD', socket: 'AM5', priority: 1 },
      { model: 'X870 Micro-ATX', searchTerms: ['X870 Micro ATX motherboard mATX AM5'], manufacturer: 'AMD', socket: 'AM5', priority: 1 },

      // B850 Mainstream
      { model: 'B850 ATX', searchTerms: ['B850 ATX motherboard AM5'], manufacturer: 'AMD', socket: 'AM5', priority: 1 },
      { model: 'B850 Micro-ATX', searchTerms: ['B850 Micro ATX motherboard mATX AM5'], manufacturer: 'AMD', socket: 'AM5', priority: 1 },

      // X670E Flagship (previous gen)
      { model: 'X670E ATX', searchTerms: ['X670E ATX motherboard AM5'], manufacturer: 'AMD', socket: 'AM5', priority: 1 },

      // X670 High-End (previous gen)
      { model: 'X670 ATX', searchTerms: ['X670 ATX motherboard AM5'], manufacturer: 'AMD', socket: 'AM5', priority: 1 },
      { model: 'X670 Micro-ATX', searchTerms: ['X670 Micro ATX motherboard mATX AM5'], manufacturer: 'AMD', socket: 'AM5', priority: 2 },

      // B650E Mainstream (previous gen)
      { model: 'B650E ATX', searchTerms: ['B650E ATX motherboard AM5'], manufacturer: 'AMD', socket: 'AM5', priority: 1 },

      // B650 Mainstream (previous gen)
      { model: 'B650 ATX', searchTerms: ['B650 ATX motherboard AM5'], manufacturer: 'AMD', socket: 'AM5', priority: 1 },
      { model: 'B650 Micro-ATX', searchTerms: ['B650 Micro ATX motherboard mATX AM5'], manufacturer: 'AMD', socket: 'AM5', priority: 1 },
      { model: 'B650 Mini-ITX', searchTerms: ['B650 Mini ITX motherboard AM5'], manufacturer: 'AMD', socket: 'AM5', priority: 1 },

      // A620 Budget
      { model: 'A620 Micro-ATX', searchTerms: ['A620 Micro ATX motherboard mATX AM5'], manufacturer: 'AMD', socket: 'AM5', priority: 2 },

      // ============================================================
      // AM4 - AMD Ryzen 1000–5000 series
      // ============================================================

      // X570 High-End
      { model: 'X570 ATX', searchTerms: ['X570 ATX motherboard AM4'], manufacturer: 'AMD', socket: 'AM4', priority: 2 },
      { model: 'X570 Micro-ATX', searchTerms: ['X570 Micro ATX motherboard mATX AM4'], manufacturer: 'AMD', socket: 'AM4', priority: 2 },
      { model: 'X570 Mini-ITX', searchTerms: ['X570 Mini ITX motherboard AM4'], manufacturer: 'AMD', socket: 'AM4', priority: 2 },

      // B550 Mainstream
      { model: 'B550 ATX', searchTerms: ['B550 ATX motherboard AM4'], manufacturer: 'AMD', socket: 'AM4', priority: 2 },
      { model: 'B550 Micro-ATX', searchTerms: ['B550 Micro ATX motherboard mATX AM4'], manufacturer: 'AMD', socket: 'AM4', priority: 2 },
      { model: 'B550 Mini-ITX', searchTerms: ['B550 Mini ITX motherboard AM4'], manufacturer: 'AMD', socket: 'AM4', priority: 2 },

      // B450 Previous Mainstream
      { model: 'B450 ATX', searchTerms: ['B450 ATX motherboard AM4'], manufacturer: 'AMD', socket: 'AM4', priority: 2 },
      { model: 'B450 Micro-ATX', searchTerms: ['B450 Micro ATX motherboard mATX AM4'], manufacturer: 'AMD', socket: 'AM4', priority: 2 },

      // A520 Budget
      { model: 'A520 Micro-ATX', searchTerms: ['A520 Micro ATX motherboard AM4'], manufacturer: 'AMD', socket: 'AM4', priority: 2 },
    ];
  }

  // Import motherboards for a specific model
  async importModelMotherboards(modelInfo, progressTracker = null) {
    const { model, searchTerms, manufacturer, socket } = modelInfo;
    
    Logger.info(`\n🔍 Starting import for ${manufacturer} ${model} (${socket})`);

    try {
      // Update progress if tracker provided
      if (progressTracker) {
        progressTracker.updateProgress('current', 10, 'Generating search URL...');
      }

      // Use the first search term for the URL
      const searchUrl = this.generateSearchUrl(searchTerms[0]);
      Logger.info(`   Search URL: ${searchUrl}`);

      if (progressTracker) {
        progressTracker.updateProgress('current', 20, 'Starting motherboard data population...');
      }

      // Use the existing populateMotherboardData method from MotherboardDataPopulator
      await this.populator.populateMotherboardData(searchUrl, model);

      if (progressTracker) {
        progressTracker.updateProgress('current', 80, 'Processing results...');
      }

      this.results.models[model] = {
        status: 'success',
        manufacturer,
        socket
      };
      
      this.results.successful++;
      Logger.success(`   ✅ Successfully imported ${model}`);

      if (progressTracker) {
        progressTracker.updateProgress('current', 100, `${model} import complete!`);
      }

    } catch (error) {
      Logger.error(`   ❌ Failed to import ${model}: ${error.message}`);
      this.results.models[model] = {
        status: 'error',
        error: error.message,
        manufacturer,
        socket
      };
      this.results.failed++;
    }

    this.results.total++;

    // Rate limiting - wait between models
    const delay = 4 + Math.random() * 4; // 4-8 seconds
    Logger.info(`   ⏳ Waiting ${delay.toFixed(1)}s before next model...`);
    await new Promise(resolve => setTimeout(resolve, delay * 1000));
  }

  // Main import function
  async importBulkMotherboards(options = {}) {
    const {
      manufacturers = ['Intel', 'AMD'],
      sockets = ['LGA1700', 'AM5', 'AM4'],
      priority = [1, 2], // Which priority levels to include
      maxModels = null,
      startFrom = null
    } = options;

    Logger.info('🚀 Starting bulk motherboard import process...\n');

    const allModels = this.getMotherboardModels();
    
    // Filter models based on options
    let modelsToImport = allModels.filter(model => 
      manufacturers.includes(model.manufacturer) && 
      sockets.includes(model.socket) &&
      priority.includes(model.priority)
    );

    // Initialize progress tracking
    const progressTracker = new ProgressTracker();
    let overallProgress, modelProgress;

    // Handle start from option
    if (startFrom) {
      const startIndex = modelsToImport.findIndex(m => m.model === startFrom);
      if (startIndex >= 0) {
        modelsToImport = modelsToImport.slice(startIndex);
        Logger.info(`📍 Starting from ${startFrom} (${modelsToImport.length} models remaining)`);
      }
    }

    // Limit models if specified
    if (maxModels) {
      modelsToImport = modelsToImport.slice(0, maxModels);
      Logger.info(`🎯 Limited to first ${maxModels} models`);
    }

    Logger.info(`📋 Will import ${modelsToImport.length} motherboard models:`);
    modelsToImport.forEach((model, i) => {
      Logger.info(`   ${(i + 1).toString().padStart(2, '0')}. ${model.manufacturer} ${model.model} (${model.socket}, Priority ${model.priority})`);
    });

    Logger.info('\n⏰ Starting import process...\n');

    // Initialize progress bars
    const multibar = progressTracker.initializeMultibar();
    overallProgress = progressTracker.createProgressBar('overall', modelsToImport.length, 0, 'Starting import...');
    modelProgress = progressTracker.createProgressBar('current', 100, 0, 'Waiting...');

    // Import each model
    for (let i = 0; i < modelsToImport.length; i++) {
      const modelInfo = modelsToImport[i];
      
      // Update overall progress
      progressTracker.updateProgress('overall', i, 
        `Importing ${modelInfo.manufacturer} ${modelInfo.model} (${i + 1}/${modelsToImport.length})`);
      
      // Update current model progress
      progressTracker.updateProgress('current', 0, 'Initializing model import...');
      
      await this.importModelMotherboards(modelInfo, progressTracker);
      
      // Mark current model as complete
      progressTracker.updateProgress('current', 100, `${modelInfo.model} complete`);
    }

    // Complete overall progress
    progressTracker.completeProgress('overall', 'All models imported!');
    progressTracker.completeProgress('current', 'Import finished');
    
    // Stop progress bars
    setTimeout(() => {
      progressTracker.stopAll();
      // Print final summary
      this.printSummary();
    }, 1000);
  }

  // Print import summary
  printSummary() {
    Logger.info('\n' + '='.repeat(80));
    Logger.info('📊 BULK MOTHERBOARD IMPORT SUMMARY');
    Logger.info('='.repeat(80));

    Logger.info(`📈 Overall Stats:`);
    Logger.info(`   Total Models: ${this.results.total}`);
    Logger.info(`   Successful: ${this.results.successful}`);
    Logger.info(`   Failed: ${this.results.failed}`);

    Logger.info(`\n📦 Model Details:`);
    Object.entries(this.results.models).forEach(([model, info]) => {
      const status = info.status === 'success' ? '✅' : '❌';
      Logger.info(`   ${status} ${model.padEnd(20)} - ${info.manufacturer} (${info.socket})`);
      if (info.error) {
        Logger.info(`      Error: ${info.error}`);
      }
    });

    Logger.info('\n🎉 Bulk motherboard import process completed!');
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  
  const options = {
    manufacturers: ['Intel', 'AMD'],
    sockets: ['LGA1700', 'AM5', 'AM4'],
    priority: [1, 2],
    maxModels: null,
    startFrom: null
  };

  // Parse arguments
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    if (arg === '--intel-only') {
      options.manufacturers = ['Intel'];
    } else if (arg === '--amd-only') {
      options.manufacturers = ['AMD'];
    } else if (arg === '--lga1700-only') {
      options.sockets = ['LGA1700'];
    } else if (arg === '--am5-only') {
      options.sockets = ['AM5'];
    } else if (arg === '--am4-only') {
      options.sockets = ['AM4'];
    } else if (arg === '--priority-1') {
      options.priority = [1];
    } else if (arg === '--priority-2') {
      options.priority = [2];
    } else if (arg === '--limit' && i + 1 < args.length) {
      options.maxModels = parseInt(args[i + 1]);
      i++;
    } else if (arg === '--start-from' && i + 1 < args.length) {
      options.startFrom = args[i + 1];
      i++;
    } else if (arg === '--help') {
      console.log(`
Bulk Motherboard Import Script Usage:
====================================

node bulkMotherboardImporter.js [options]

Options:
  --intel-only       Import only Intel motherboards
  --amd-only         Import only AMD motherboards  
  --lga1700-only     Import only LGA1700 socket motherboards
  --am5-only         Import only AM5 socket motherboards
  --am4-only         Import only AM4 socket motherboards
  --priority-1       Import only Priority 1 motherboards (latest gen)
  --priority-2       Import only Priority 2 motherboards (older gen)
  --limit N          Import only first N models
  --start-from MODEL Resume from specific model (e.g., "Z790 ATX")
  --help             Show this help message

Examples:
  node bulkMotherboardImporter.js                           # Import all motherboards
  node bulkMotherboardImporter.js --intel-only              # Import only Intel motherboards
  node bulkMotherboardImporter.js --am5-only                # Import only AM5 socket motherboards
  node bulkMotherboardImporter.js --priority-1              # Import only latest generation
  node bulkMotherboardImporter.js --limit 5                 # Import first 5 models
  node bulkMotherboardImporter.js --start-from "Z790 ATX"   # Resume from Z790 ATX
      `);
      process.exit(0);
    }
  }

  const importer = new BulkMotherboardImporter();
  
  try {
    await importer.initialize();
    await importer.importBulkMotherboards(options);
  } catch (error) {
    Logger.error(`💥 Import process failed: ${error.message}`);
    process.exit(1);
  } finally {
    await importer.cleanup();
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  Logger.info('\n⏹️  Import process interrupted by user');
  process.exit(0);
});

if (require.main === module) {
  main();
}

module.exports = BulkMotherboardImporter;