const { CPUDataPopulator } = require('./cpuDataPopulator');
const { connectToDatabase, getDatabase } = require('../config/database');
const Logger = require('./utils/logger');
const ProgressTracker = require('./utils/progressTracker');

class BulkCpuImporter {
  constructor() {
    this.populator = new CPUDataPopulator();
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
    Logger.success('✅ Initialized bulk CPU importer');
  }

  async cleanup() {
    if (this.populator.browser) {
      await this.populator.browser.close();
    }
    Logger.info('🚪 Cleanup completed');
  }

  // Generate Amazon search URL for a CPU model
  generateSearchUrl(searchTerm) {
    const query = searchTerm.toLowerCase().replace(/\s+/g, '+');
    return `https://www.amazon.com/s?k=${query}&ref=nb_sb_noss`;
  }

  // Get comprehensive CPU model list
  getCpuModels() {
    return [
      // Intel Core Ultra (Arrow Lake) - Latest Gen
      { model: 'Intel Core Ultra 9 285K', searchTerms: ['Intel Core Ultra 9 285K', 'Core Ultra 9 285K'], manufacturer: 'Intel', priority: 1, tier: 'flagship', socket: 'LGA1851' },
      { model: 'Intel Core Ultra 7 265K', searchTerms: ['Intel Core Ultra 7 265K', 'Core Ultra 7 265K'], manufacturer: 'Intel', priority: 1, tier: 'high-end', socket: 'LGA1851' },
      { model: 'Intel Core Ultra 5 245K', searchTerms: ['Intel Core Ultra 5 245K', 'Core Ultra 5 245K'], manufacturer: 'Intel', priority: 1, tier: 'mainstream', socket: 'LGA1851' },

      // Intel Core 13th Gen (Raptor Lake)
      { model: 'Intel Core i9-13900K', searchTerms: ['Intel Core i9-13900K', 'i9-13900K'], manufacturer: 'Intel', priority: 1, tier: 'flagship', socket: 'LGA1700' },
      { model: 'Intel Core i9-13900F', searchTerms: ['Intel Core i9-13900F', 'i9-13900F'], manufacturer: 'Intel', priority: 1, tier: 'flagship', socket: 'LGA1700' },
      { model: 'Intel Core i7-13700K', searchTerms: ['Intel Core i7-13700K', 'i7-13700K'], manufacturer: 'Intel', priority: 1, tier: 'high-end', socket: 'LGA1700' },
      { model: 'Intel Core i7-13700F', searchTerms: ['Intel Core i7-13700F', 'i7-13700F'], manufacturer: 'Intel', priority: 1, tier: 'high-end', socket: 'LGA1700' },
      { model: 'Intel Core i5-13600K', searchTerms: ['Intel Core i5-13600K', 'i5-13600K'], manufacturer: 'Intel', priority: 1, tier: 'mainstream', socket: 'LGA1700' },
      { model: 'Intel Core i5-13400F', searchTerms: ['Intel Core i5-13400F', 'i5-13400F'], manufacturer: 'Intel', priority: 1, tier: 'mainstream', socket: 'LGA1700' },

      // Intel Core 12th Gen (Alder Lake) - Still Popular
      { model: 'Intel Core i9-12900K', searchTerms: ['Intel Core i9-12900K', 'i9-12900K'], manufacturer: 'Intel', priority: 2, tier: 'flagship', socket: 'LGA1700' },
      { model: 'Intel Core i7-12700K', searchTerms: ['Intel Core i7-12700K', 'i7-12700K'], manufacturer: 'Intel', priority: 2, tier: 'high-end', socket: 'LGA1700' },
      { model: 'Intel Core i5-12600K', searchTerms: ['Intel Core i5-12600K', 'i5-12600K'], manufacturer: 'Intel', priority: 2, tier: 'mainstream', socket: 'LGA1700' },
      { model: 'Intel Core i5-12400F', searchTerms: ['Intel Core i5-12400F', 'i5-12400F'], manufacturer: 'Intel', priority: 2, tier: 'mainstream', socket: 'LGA1700' },

      // AMD Ryzen 7000 Series (Zen 4) - Latest AM5
      { model: 'AMD Ryzen 9 7950X', searchTerms: ['AMD Ryzen 9 7950X', 'Ryzen 9 7950X'], manufacturer: 'AMD', priority: 1, tier: 'flagship', socket: 'AM5' },
      { model: 'AMD Ryzen 9 7900X', searchTerms: ['AMD Ryzen 9 7900X', 'Ryzen 9 7900X'], manufacturer: 'AMD', priority: 1, tier: 'flagship', socket: 'AM5' },
      { model: 'AMD Ryzen 7 7800X3D', searchTerms: ['AMD Ryzen 7 7800X3D', 'Ryzen 7 7800X3D'], manufacturer: 'AMD', priority: 1, tier: 'high-end', socket: 'AM5' },
      { model: 'AMD Ryzen 7 7700X', searchTerms: ['AMD Ryzen 7 7700X', 'Ryzen 7 7700X'], manufacturer: 'AMD', priority: 1, tier: 'high-end', socket: 'AM5' },
      { model: 'AMD Ryzen 5 7600X', searchTerms: ['AMD Ryzen 5 7600X', 'Ryzen 5 7600X'], manufacturer: 'AMD', priority: 1, tier: 'mainstream', socket: 'AM5' },

      // AMD Ryzen 5000 Series (Zen 3) - Still Very Popular AM4
      { model: 'AMD Ryzen 9 5950X', searchTerms: ['AMD Ryzen 9 5950X', 'Ryzen 9 5950X'], manufacturer: 'AMD', priority: 2, tier: 'flagship', socket: 'AM4' },
      { model: 'AMD Ryzen 9 5900X', searchTerms: ['AMD Ryzen 9 5900X', 'Ryzen 9 5900X'], manufacturer: 'AMD', priority: 2, tier: 'flagship', socket: 'AM4' },
      { model: 'AMD Ryzen 7 5800X3D', searchTerms: ['AMD Ryzen 7 5800X3D', 'Ryzen 7 5800X3D'], manufacturer: 'AMD', priority: 2, tier: 'high-end', socket: 'AM4' },
      { model: 'AMD Ryzen 7 5800X', searchTerms: ['AMD Ryzen 7 5800X', 'Ryzen 7 5800X'], manufacturer: 'AMD', priority: 2, tier: 'high-end', socket: 'AM4' },
      { model: 'AMD Ryzen 7 5700X', searchTerms: ['AMD Ryzen 7 5700X', 'Ryzen 7 5700X'], manufacturer: 'AMD', priority: 2, tier: 'high-end', socket: 'AM4' },
      { model: 'AMD Ryzen 5 5600X', searchTerms: ['AMD Ryzen 5 5600X', 'Ryzen 5 5600X'], manufacturer: 'AMD', priority: 2, tier: 'mainstream', socket: 'AM4' },
      { model: 'AMD Ryzen 5 5600', searchTerms: ['AMD Ryzen 5 5600', 'Ryzen 5 5600'], manufacturer: 'AMD', priority: 2, tier: 'mainstream', socket: 'AM4' },

      // Budget/Entry Level
      { model: 'Intel Core i3-13100F', searchTerms: ['Intel Core i3-13100F', 'i3-13100F'], manufacturer: 'Intel', priority: 3, tier: 'entry', socket: 'LGA1700' },
      { model: 'AMD Ryzen 5 4600G', searchTerms: ['AMD Ryzen 5 4600G', 'Ryzen 5 4600G'], manufacturer: 'AMD', priority: 3, tier: 'entry', socket: 'AM4' },

      // High-End Desktop (HEDT)
      { model: 'AMD Threadripper 7980X', searchTerms: ['AMD Threadripper 7980X', 'Threadripper 7980X'], manufacturer: 'AMD', priority: 3, tier: 'workstation', socket: 'sTRX5' },
      { model: 'AMD Threadripper 7970X', searchTerms: ['AMD Threadripper 7970X', 'Threadripper 7970X'], manufacturer: 'AMD', priority: 3, tier: 'workstation', socket: 'sTRX5' },
      { model: 'Intel Core i9-13980HX', searchTerms: ['Intel Core i9-13980HX', 'i9-13980HX'], manufacturer: 'Intel', priority: 3, tier: 'mobile', socket: 'BGA' }
    ];
  }

  // Import CPUs for a specific model
  async importModelCpus(modelInfo, progressTracker = null) {
    const { model, searchTerms, manufacturer } = modelInfo;
    
    Logger.info(`\n🔍 Starting import for ${manufacturer} ${model}`);

    try {
      // Update progress if tracker provided
      if (progressTracker) {
        progressTracker.updateProgress('current', 10, 'Generating search URL...');
      }

      // Use the first search term for the URL
      const searchUrl = this.generateSearchUrl(searchTerms[0]);
      Logger.info(`   Search URL: ${searchUrl}`);

      if (progressTracker) {
        progressTracker.updateProgress('current', 20, 'Starting CPU data population...');
      }

      // Use the existing populateCPUData method from CPUDataPopulator
      await this.populator.populateCPUData(searchUrl, model);

      if (progressTracker) {
        progressTracker.updateProgress('current', 80, 'Processing results...');
      }

      this.results.models[model] = {
        status: 'success',
        manufacturer
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
        manufacturer
      };
      this.results.failed++;
    }

    this.results.total++;

    // Rate limiting - wait between models
    const delay = 3 + Math.random() * 3; // 3-6 seconds
    Logger.info(`   ⏳ Waiting ${delay.toFixed(1)}s before next model...`);
    await new Promise(resolve => setTimeout(resolve, delay * 1000));
  }

  // Main import function
  async importBulkCpus(options = {}) {
    const {
      manufacturers = ['Intel', 'AMD'],
      priority = [1, 2], // Which priority levels to include
      maxModels = null,
      startFrom = null,
      tier = null // Filter by performance tier
    } = options;

    Logger.info('🚀 Starting bulk CPU import process...\n');

    const allModels = this.getCpuModels();
    
    // Filter models based on options
    let modelsToImport = allModels.filter(model => 
      manufacturers.includes(model.manufacturer) && 
      priority.includes(model.priority) &&
      (!tier || model.tier === tier)
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

    Logger.info(`📋 Will import ${modelsToImport.length} CPU models:`);
    modelsToImport.forEach((model, i) => {
      Logger.info(`   ${(i + 1).toString().padStart(2, '0')}. ${model.manufacturer} ${model.model} (${model.tier}, Priority ${model.priority})`);
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
      
      await this.importModelCpus(modelInfo, progressTracker);
      
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
    Logger.info('📊 BULK CPU IMPORT SUMMARY');
    Logger.info('='.repeat(80));

    Logger.info(`📈 Overall Stats:`);
    Logger.info(`   Total Models: ${this.results.total}`);
    Logger.info(`   Successful: ${this.results.successful}`);
    Logger.info(`   Failed: ${this.results.failed}`);

    Logger.info(`\n💻 Model Details:`);
    Object.entries(this.results.models).forEach(([model, info]) => {
      const status = info.status === 'success' ? '✅' : '❌';
      Logger.info(`   ${status} ${model.padEnd(25)} - ${info.manufacturer}`);
      if (info.error) {
        Logger.info(`      Error: ${info.error}`);
      }
    });

    Logger.info('\n🎉 Bulk CPU import process completed!');
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  
  const options = {
    manufacturers: ['Intel', 'AMD'],
    priority: [1, 2],
    maxModels: null,
    startFrom: null,
    tier: null
  };

  // Parse arguments
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    if (arg === '--intel-only') {
      options.manufacturers = ['Intel'];
    } else if (arg === '--amd-only') {
      options.manufacturers = ['AMD'];
    } else if (arg === '--priority-1') {
      options.priority = [1];
    } else if (arg === '--priority-2') {
      options.priority = [2];
    } else if (arg === '--flagship-only') {
      options.tier = 'flagship';
    } else if (arg === '--mainstream-only') {
      options.tier = 'mainstream';
    } else if (arg === '--limit' && i + 1 < args.length) {
      options.maxModels = parseInt(args[i + 1]);
      i++;
    } else if (arg === '--start-from' && i + 1 < args.length) {
      options.startFrom = args[i + 1];
      i++;
    } else if (arg === '--help') {
      console.log(`
Bulk CPU Import Script Usage:
=============================

node bulkCpuImporter.js [options]

Options:
  --intel-only       Import only Intel CPUs
  --amd-only         Import only AMD CPUs  
  --priority-1       Import only Priority 1 CPUs (latest gen)
  --priority-2       Import only Priority 2 CPUs (older gen)
  --flagship-only    Import only flagship tier CPUs (i9/Ryzen 9)
  --mainstream-only  Import only mainstream tier CPUs (i5/Ryzen 5)
  --limit N          Import only first N models
  --start-from MODEL Resume from specific model
  --help             Show this help message

Examples:
  node bulkCpuImporter.js                              # Import all CPUs
  node bulkCpuImporter.js --intel-only                 # Import only Intel CPUs
  node bulkCpuImporter.js --priority-1 --flagship-only # Latest flagship CPUs
  node bulkCpuImporter.js --limit 10                   # Import first 10 models
      `);
      process.exit(0);
    }
  }

  const importer = new BulkCpuImporter();
  
  try {
    await importer.initialize();
    await importer.importBulkCpus(options);
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

module.exports = BulkCpuImporter;