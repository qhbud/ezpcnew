const { CoolerDataPopulator } = require('./coolerDataPopulator');
const { connectToDatabase, getDatabase } = require('../config/database');
const Logger = require('./utils/logger');
const ProgressTracker = require('./utils/progressTracker');

class BulkCoolerImporter {
  constructor() {
    this.populator = new CoolerDataPopulator();
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
    Logger.success('✅ Initialized bulk cooler importer');
  }

  async cleanup() {
    if (this.populator.browser) {
      await this.populator.browser.close();
    }
    Logger.info('🚪 Cleanup completed');
  }

  // Generate Amazon search URL for a cooler model
  generateSearchUrl(searchTerm) {
    const query = searchTerm.toLowerCase().replace(/\s+/g, '+');
    return `https://www.amazon.com/s?k=${query}&ref=nb_sb_noss`;
  }

  // Get comprehensive cooler model list (air and water)
  getCoolerModels() {
    return [
      // AIO Water Coolers - 360mm (High-End)
      { model: 'AIO 360mm Liquid Cooler', searchTerms: ['AIO 360mm liquid cooler', '360mm AIO'], type: 'AIO Liquid', size: '360mm', priority: 1 },
      { model: 'Corsair H150i', searchTerms: ['Corsair H150i AIO', 'Corsair iCUE H150i'], type: 'AIO Liquid', size: '360mm', priority: 1 },
      { model: 'NZXT Kraken X73', searchTerms: ['NZXT Kraken X73', 'Kraken X73 360mm'], type: 'AIO Liquid', size: '360mm', priority: 1 },
      { model: 'Arctic Liquid Freezer II 360', searchTerms: ['Arctic Liquid Freezer II 360', 'Arctic 360mm AIO'], type: 'AIO Liquid', size: '360mm', priority: 1 },

      // AIO Water Coolers - 280mm (Performance)
      { model: 'AIO 280mm Liquid Cooler', searchTerms: ['AIO 280mm liquid cooler', '280mm AIO'], type: 'AIO Liquid', size: '280mm', priority: 1 },
      { model: 'Corsair H115i', searchTerms: ['Corsair H115i AIO', 'Corsair iCUE H115i'], type: 'AIO Liquid', size: '280mm', priority: 1 },
      { model: 'NZXT Kraken X63', searchTerms: ['NZXT Kraken X63', 'Kraken X63 280mm'], type: 'AIO Liquid', size: '280mm', priority: 1 },
      { model: 'Arctic Liquid Freezer II 280', searchTerms: ['Arctic Liquid Freezer II 280', 'Arctic 280mm AIO'], type: 'AIO Liquid', size: '280mm', priority: 1 },

      // AIO Water Coolers - 240mm (Mainstream)
      { model: 'AIO 240mm Liquid Cooler', searchTerms: ['AIO 240mm liquid cooler', '240mm AIO'], type: 'AIO Liquid', size: '240mm', priority: 1 },
      { model: 'Corsair H100i', searchTerms: ['Corsair H100i AIO', 'Corsair iCUE H100i'], type: 'AIO Liquid', size: '240mm', priority: 1 },
      { model: 'NZXT Kraken X53', searchTerms: ['NZXT Kraken X53', 'Kraken X53 240mm'], type: 'AIO Liquid', size: '240mm', priority: 1 },
      { model: 'Arctic Liquid Freezer II 240', searchTerms: ['Arctic Liquid Freezer II 240', 'Arctic 240mm AIO'], type: 'AIO Liquid', size: '240mm', priority: 1 },
      { model: 'Cooler Master MasterLiquid ML240L', searchTerms: ['Cooler Master MasterLiquid ML240L', 'ML240L AIO'], type: 'AIO Liquid', size: '240mm', priority: 2 },

      // AIO Water Coolers - 120mm (Entry AIO)
      { model: 'AIO 120mm Liquid Cooler', searchTerms: ['AIO 120mm liquid cooler', '120mm AIO'], type: 'AIO Liquid', size: '120mm', priority: 2 },
      { model: 'Corsair H60', searchTerms: ['Corsair H60 AIO', 'Corsair H60 120mm'], type: 'AIO Liquid', size: '120mm', priority: 2 },
      { model: 'Cooler Master MasterLiquid ML120L', searchTerms: ['Cooler Master MasterLiquid ML120L', 'ML120L AIO'], type: 'AIO Liquid', size: '120mm', priority: 2 },

      // High-End Air Coolers
      { model: 'Noctua NH-D15', searchTerms: ['Noctua NH-D15', 'NH-D15 air cooler'], type: 'Air', tier: 'High-End', priority: 1 },
      { model: 'Noctua NH-D15S', searchTerms: ['Noctua NH-D15S', 'NH-D15S single fan'], type: 'Air', tier: 'High-End', priority: 1 },
      { model: 'Be Quiet Dark Rock Pro 4', searchTerms: ['Be Quiet Dark Rock Pro 4', 'Dark Rock Pro 4'], type: 'Air', tier: 'High-End', priority: 1 },
      { model: 'Thermalright Peerless Assassin 120', searchTerms: ['Thermalright Peerless Assassin 120', 'Peerless Assassin 120'], type: 'Air', tier: 'High-End', priority: 1 },
      { model: 'Scythe Fuma 2', searchTerms: ['Scythe Fuma 2', 'Fuma 2 air cooler'], type: 'Air', tier: 'High-End', priority: 1 },
      { model: 'Deepcool Assassin III', searchTerms: ['Deepcool Assassin III', 'Assassin III air cooler'], type: 'Air', tier: 'High-End', priority: 1 },

      // Performance Air Coolers
      { model: 'Noctua NH-U12S', searchTerms: ['Noctua NH-U12S', 'NH-U12S tower cooler'], type: 'Air', tier: 'Performance', priority: 1 },
      { model: 'Be Quiet Dark Rock 4', searchTerms: ['Be Quiet Dark Rock 4', 'Dark Rock 4'], type: 'Air', tier: 'Performance', priority: 1 },
      { model: 'Cooler Master Hyper 212', searchTerms: ['Cooler Master Hyper 212', 'Hyper 212 cooler'], type: 'Air', tier: 'Performance', priority: 1 },
      { model: 'Arctic Freezer 34 eSports DUO', searchTerms: ['Arctic Freezer 34 eSports DUO', 'Freezer 34 eSports'], type: 'Air', tier: 'Performance', priority: 1 },
      { model: 'Scythe Mugen 5', searchTerms: ['Scythe Mugen 5', 'Mugen 5 air cooler'], type: 'Air', tier: 'Performance', priority: 1 },
      { model: 'Deepcool Gammaxx 400', searchTerms: ['Deepcool Gammaxx 400', 'Gammaxx 400'], type: 'Air', tier: 'Performance', priority: 2 },

      // Mainstream Air Coolers
      { model: 'Noctua NH-U12A', searchTerms: ['Noctua NH-U12A', 'NH-U12A cooler'], type: 'Air', tier: 'Mainstream', priority: 1 },
      { model: 'Be Quiet Pure Rock 2', searchTerms: ['Be Quiet Pure Rock 2', 'Pure Rock 2'], type: 'Air', tier: 'Mainstream', priority: 1 },
      { model: 'Arctic Freezer 34', searchTerms: ['Arctic Freezer 34', 'Freezer 34 air cooler'], type: 'Air', tier: 'Mainstream', priority: 1 },
      { model: 'Cooler Master Hyper 212 EVO', searchTerms: ['Cooler Master Hyper 212 EVO', 'Hyper 212 EVO'], type: 'Air', tier: 'Mainstream', priority: 2 },

      // Low Profile Air Coolers (for small form factor)
      { model: 'Noctua NH-L9i', searchTerms: ['Noctua NH-L9i', 'NH-L9i low profile'], type: 'Air', tier: 'Low Profile', priority: 1 },
      { model: 'Noctua NH-L12S', searchTerms: ['Noctua NH-L12S', 'NH-L12S low profile'], type: 'Air', tier: 'Low Profile', priority: 1 },
      { model: 'Be Quiet Shadow Rock LP', searchTerms: ['Be Quiet Shadow Rock LP', 'Shadow Rock LP'], type: 'Air', tier: 'Low Profile', priority: 1 },
      { model: 'Cryorig C7', searchTerms: ['Cryorig C7', 'C7 low profile cooler'], type: 'Air', tier: 'Low Profile', priority: 2 },

      // General Search Terms (catch additional models)
      { model: 'CPU Air Cooler', searchTerms: ['CPU air cooler tower', 'air CPU cooler'], type: 'Air', tier: 'General', priority: 2 },
      { model: 'CPU Liquid Cooler', searchTerms: ['CPU liquid cooler AIO', 'liquid CPU cooler'], type: 'AIO Liquid', tier: 'General', priority: 2 },
      { model: 'RGB CPU Cooler', searchTerms: ['RGB CPU cooler', 'RGB air cooler'], type: 'Mixed', tier: 'General', priority: 2 }
    ];
  }

  // Import coolers for a specific model
  async importModelCoolers(modelInfo, progressTracker = null) {
    const { model, searchTerms, type, size, tier } = modelInfo;
    
    Logger.info(`\n🔍 Starting import for ${type} ${model} ${size ? `(${size})` : ''}`);

    try {
      // Update progress if tracker provided
      if (progressTracker) {
        progressTracker.updateProgress('current', 10, 'Generating search URL...');
      }

      // Use the first search term for the URL
      const searchUrl = this.generateSearchUrl(searchTerms[0]);
      Logger.info(`   Search URL: ${searchUrl}`);

      if (progressTracker) {
        progressTracker.updateProgress('current', 20, 'Starting cooler data population...');
      }

      // Use the existing populateCoolerData method from CoolerDataPopulator
      await this.populator.populateCoolerData(searchUrl, model);

      if (progressTracker) {
        progressTracker.updateProgress('current', 80, 'Processing results...');
      }

      this.results.models[model] = {
        status: 'success',
        type,
        size: size || tier,
        tier: tier || 'Unknown'
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
        type,
        size: size || tier,
        tier: tier || 'Unknown'
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
  async importBulkCoolers(options = {}) {
    const {
      types = ['Air', 'AIO Liquid'],
      tiers = ['High-End', 'Performance', 'Mainstream', 'Low Profile', 'General'],
      priority = [1, 2], // Which priority levels to include
      maxModels = null,
      startFrom = null
    } = options;

    Logger.info('🚀 Starting bulk cooler import process...\n');

    const allModels = this.getCoolerModels();
    
    // Filter models based on options
    let modelsToImport = allModels.filter(model => 
      types.some(type => model.type === type || model.type === 'Mixed') &&
      (model.tier ? tiers.includes(model.tier) : true) &&
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

    Logger.info(`📋 Will import ${modelsToImport.length} cooler models:`);
    modelsToImport.forEach((model, i) => {
      const sizeInfo = model.size ? ` (${model.size})` : '';
      const tierInfo = model.tier ? ` - ${model.tier}` : '';
      Logger.info(`   ${(i + 1).toString().padStart(2, '0')}. ${model.type} ${model.model}${sizeInfo}${tierInfo} (Priority ${model.priority})`);
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
        `Importing ${modelInfo.type} ${modelInfo.model} (${i + 1}/${modelsToImport.length})`);
      
      // Update current model progress
      progressTracker.updateProgress('current', 0, 'Initializing model import...');
      
      await this.importModelCoolers(modelInfo, progressTracker);
      
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
    Logger.info('📊 BULK COOLER IMPORT SUMMARY');
    Logger.info('='.repeat(80));

    Logger.info(`📈 Overall Stats:`);
    Logger.info(`   Total Models: ${this.results.total}`);
    Logger.info(`   Successful: ${this.results.successful}`);
    Logger.info(`   Failed: ${this.results.failed}`);

    // Group by type
    const typeGroups = {};
    Object.entries(this.results.models).forEach(([model, info]) => {
      if (!typeGroups[info.type]) {
        typeGroups[info.type] = { successful: 0, failed: 0, models: [] };
      }
      if (info.status === 'success') {
        typeGroups[info.type].successful++;
      } else {
        typeGroups[info.type].failed++;
      }
      typeGroups[info.type].models.push({ model, ...info });
    });

    Logger.info(`\n📦 Results by Type:`);
    Object.entries(typeGroups).forEach(([type, group]) => {
      Logger.info(`   ${type}: ${group.successful} successful, ${group.failed} failed`);
    });

    Logger.info(`\n📦 Model Details:`);
    Object.entries(this.results.models).forEach(([model, info]) => {
      const status = info.status === 'success' ? '✅' : '❌';
      const sizeInfo = info.size ? ` (${info.size})` : '';
      Logger.info(`   ${status} ${model.padEnd(35)}${sizeInfo} - ${info.type}`);
      if (info.error) {
        Logger.info(`      Error: ${info.error}`);
      }
    });

    Logger.info('\n🎉 Bulk cooler import process completed!');
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  
  const options = {
    types: ['Air', 'AIO Liquid'],
    tiers: ['High-End', 'Performance', 'Mainstream', 'Low Profile', 'General'],
    priority: [1, 2],
    maxModels: null,
    startFrom: null
  };

  // Parse arguments
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    if (arg === '--air-only') {
      options.types = ['Air'];
    } else if (arg === '--liquid-only' || arg === '--aio-only') {
      options.types = ['AIO Liquid'];
    } else if (arg === '--high-end-only') {
      options.tiers = ['High-End'];
    } else if (arg === '--performance-only') {
      options.tiers = ['Performance'];
    } else if (arg === '--mainstream-only') {
      options.tiers = ['Mainstream'];
    } else if (arg === '--low-profile-only') {
      options.tiers = ['Low Profile'];
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
Bulk Cooler Import Script Usage:
================================

node bulkCoolerImporter.js [options]

Options:
  --air-only             Import only air coolers
  --liquid-only          Import only AIO liquid coolers
  --aio-only             Same as --liquid-only
  --high-end-only        Import only high-end coolers
  --performance-only     Import only performance coolers
  --mainstream-only      Import only mainstream coolers
  --low-profile-only     Import only low profile coolers
  --priority-1           Import only Priority 1 coolers (latest/best)
  --priority-2           Import only Priority 2 coolers (older/budget)
  --limit N              Import only first N models
  --start-from MODEL     Resume from specific model
  --help                 Show this help message

Examples:
  node bulkCoolerImporter.js                              # Import all coolers
  node bulkCoolerImporter.js --air-only                   # Import only air coolers
  node bulkCoolerImporter.js --liquid-only                # Import only AIO liquid coolers
  node bulkCoolerImporter.js --high-end-only              # Import only high-end coolers
  node bulkCoolerImporter.js --limit 5                    # Import first 5 models
  node bulkCoolerImporter.js --start-from "Noctua NH-D15" # Resume from NH-D15
      `);
      process.exit(0);
    }
  }

  const importer = new BulkCoolerImporter();
  
  try {
    await importer.initialize();
    await importer.importBulkCoolers(options);
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

module.exports = BulkCoolerImporter;