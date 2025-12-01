const { GPUDataPopulator } = require('./gpuDataPopulator');
const { connectToDatabase, getDatabase } = require('../config/database');
const Logger = require('./utils/logger');
const ProgressTracker = require('./utils/progressTracker');

class BulkGpuImporter {
  constructor() {
    this.populator = new GPUDataPopulator();
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
    Logger.success('✅ Initialized bulk GPU importer');
  }

  async cleanup() {
    if (this.populator.browser) {
      await this.populator.browser.close();
    }
    Logger.info('🚪 Cleanup completed');
  }

  // Generate Amazon search URL for a GPU model
  generateSearchUrl(searchTerm) {
    const query = searchTerm.toLowerCase().replace(/\s+/g, '+');
    return `https://www.amazon.com/s?k=${query}&ref=nb_sb_noss`;
  }

  // Get comprehensive GPU model list
  getGpuModels() {
    return [
      // NVIDIA RTX 50 Series (Latest Generation)
      { model: 'RTX 5090', searchTerms: ['RTX 5090', 'GeForce RTX 5090'], manufacturer: 'NVIDIA', priority: 1 },
      { model: 'RTX 5080', searchTerms: ['RTX 5080', 'GeForce RTX 5080'], manufacturer: 'NVIDIA', priority: 1 },
      { model: 'RTX 5070', searchTerms: ['RTX 5070', 'GeForce RTX 5070'], manufacturer: 'NVIDIA', priority: 1 },
      { model: 'RTX 5060', searchTerms: ['RTX 5060', 'GeForce RTX 5060'], manufacturer: 'NVIDIA', priority: 1 },

      // NVIDIA RTX 40 Series (Most Popular)
      { model: 'RTX 4090', searchTerms: ['RTX 4090', 'GeForce RTX 4090'], manufacturer: 'NVIDIA', priority: 1 },
      { model: 'RTX 4080 Super', searchTerms: ['RTX 4080 Super'], manufacturer: 'NVIDIA', priority: 1 },
      { model: 'RTX 4080', searchTerms: ['RTX 4080', 'GeForce RTX 4080'], manufacturer: 'NVIDIA', priority: 1 },
      { model: 'RTX 4070 Ti Super', searchTerms: ['RTX 4070 Ti Super'], manufacturer: 'NVIDIA', priority: 1 },
      { model: 'RTX 4070 Ti', searchTerms: ['RTX 4070 Ti'], manufacturer: 'NVIDIA', priority: 1 },
      { model: 'RTX 4070 Super', searchTerms: ['RTX 4070 Super'], manufacturer: 'NVIDIA', priority: 1 },
      { model: 'RTX 4070', searchTerms: ['RTX 4070', 'GeForce RTX 4070'], manufacturer: 'NVIDIA', priority: 1 },
      { model: 'RTX 4060 Ti', searchTerms: ['RTX 4060 Ti'], manufacturer: 'NVIDIA', priority: 1 },
      { model: 'RTX 4060', searchTerms: ['RTX 4060', 'GeForce RTX 4060'], manufacturer: 'NVIDIA', priority: 1 },

      // NVIDIA RTX 30 Series (Still Popular)
      { model: 'RTX 3090 Ti', searchTerms: ['RTX 3090 Ti'], manufacturer: 'NVIDIA', priority: 2 },
      { model: 'RTX 3090', searchTerms: ['RTX 3090', 'GeForce RTX 3090'], manufacturer: 'NVIDIA', priority: 2 },
      { model: 'RTX 3080 Ti', searchTerms: ['RTX 3080 Ti'], manufacturer: 'NVIDIA', priority: 2 },
      { model: 'RTX 3080', searchTerms: ['RTX 3080', 'GeForce RTX 3080'], manufacturer: 'NVIDIA', priority: 2 },
      { model: 'RTX 3070 Ti', searchTerms: ['RTX 3070 Ti'], manufacturer: 'NVIDIA', priority: 2 },
      { model: 'RTX 3070', searchTerms: ['RTX 3070', 'GeForce RTX 3070'], manufacturer: 'NVIDIA', priority: 2 },
      { model: 'RTX 3060 Ti', searchTerms: ['RTX 3060 Ti'], manufacturer: 'NVIDIA', priority: 2 },
      { model: 'RTX 3060', searchTerms: ['RTX 3060', 'GeForce RTX 3060'], manufacturer: 'NVIDIA', priority: 2 },

      // AMD RX 7000 Series (RDNA 3)
      { model: 'RX 7900 XTX', searchTerms: ['RX 7900 XTX', 'Radeon RX 7900 XTX'], manufacturer: 'AMD', priority: 1 },
      { model: 'RX 7900 XT', searchTerms: ['RX 7900 XT', 'Radeon RX 7900 XT'], manufacturer: 'AMD', priority: 1 },
      { model: 'RX 7800 XT', searchTerms: ['RX 7800 XT', 'Radeon RX 7800 XT'], manufacturer: 'AMD', priority: 1 },
      { model: 'RX 7700 XT', searchTerms: ['RX 7700 XT', 'Radeon RX 7700 XT'], manufacturer: 'AMD', priority: 1 },
      { model: 'RX 7600 XT', searchTerms: ['RX 7600 XT', 'Radeon RX 7600 XT'], manufacturer: 'AMD', priority: 1 },
      { model: 'RX 7600', searchTerms: ['RX 7600', 'Radeon RX 7600'], manufacturer: 'AMD', priority: 1 },

      // AMD RX 6000 Series (RDNA 2)
      { model: 'RX 6950 XT', searchTerms: ['RX 6950 XT'], manufacturer: 'AMD', priority: 2 },
      { model: 'RX 6900 XT', searchTerms: ['RX 6900 XT'], manufacturer: 'AMD', priority: 2 },
      { model: 'RX 6800 XT', searchTerms: ['RX 6800 XT'], manufacturer: 'AMD', priority: 2 },
      { model: 'RX 6700 XT', searchTerms: ['RX 6700 XT'], manufacturer: 'AMD', priority: 2 },
      { model: 'RX 6600 XT', searchTerms: ['RX 6600 XT'], manufacturer: 'AMD', priority: 2 },
      { model: 'RX 6600', searchTerms: ['RX 6600'], manufacturer: 'AMD', priority: 2 },

      // Intel Arc
      { model: 'Arc A770', searchTerms: ['Arc A770', 'Intel Arc A770'], manufacturer: 'Intel', priority: 2 },
      { model: 'Arc A750', searchTerms: ['Arc A750', 'Intel Arc A750'], manufacturer: 'Intel', priority: 2 }
    ];
  }

  // Import GPUs for a specific model
  async importModelGpus(modelInfo, progressTracker = null) {
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
        progressTracker.updateProgress('current', 20, 'Starting GPU data population...');
      }

      // Use the existing populateGPUData method from GPUDataPopulator
      await this.populator.populateGPUData(searchUrl, model);

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
  async importBulkGpus(options = {}) {
    const {
      manufacturers = ['NVIDIA', 'AMD', 'Intel'],
      priority = [1, 2], // Which priority levels to include
      maxModels = null,
      startFrom = null
    } = options;

    Logger.info('🚀 Starting bulk GPU import process...\n');

    const allModels = this.getGpuModels();
    
    // Filter models based on options
    let modelsToImport = allModels.filter(model => 
      manufacturers.includes(model.manufacturer) && 
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

    Logger.info(`📋 Will import ${modelsToImport.length} GPU models:`);
    modelsToImport.forEach((model, i) => {
      Logger.info(`   ${(i + 1).toString().padStart(2, '0')}. ${model.manufacturer} ${model.model} (Priority ${model.priority})`);
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
      
      await this.importModelGpus(modelInfo, progressTracker);
      
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
    Logger.info('📊 BULK GPU IMPORT SUMMARY');
    Logger.info('='.repeat(80));

    Logger.info(`📈 Overall Stats:`);
    Logger.info(`   Total Models: ${this.results.total}`);
    Logger.info(`   Successful: ${this.results.successful}`);
    Logger.info(`   Failed: ${this.results.failed}`);

    Logger.info(`\n📦 Model Details:`);
    Object.entries(this.results.models).forEach(([model, info]) => {
      const status = info.status === 'success' ? '✅' : '❌';
      Logger.info(`   ${status} ${model.padEnd(20)} - ${info.manufacturer}`);
      if (info.error) {
        Logger.info(`      Error: ${info.error}`);
      }
    });

    Logger.info('\n🎉 Bulk GPU import process completed!');
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  
  const options = {
    manufacturers: ['NVIDIA', 'AMD', 'Intel'],
    priority: [1, 2],
    maxModels: null,
    startFrom: null
  };

  // Parse arguments
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    if (arg === '--nvidia-only') {
      options.manufacturers = ['NVIDIA'];
    } else if (arg === '--amd-only') {
      options.manufacturers = ['AMD'];
    } else if (arg === '--intel-only') {
      options.manufacturers = ['Intel'];
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
Bulk GPU Import Script Usage:
============================

node bulkGpuImporter.js [options]

Options:
  --nvidia-only      Import only NVIDIA GPUs
  --amd-only         Import only AMD GPUs  
  --intel-only       Import only Intel GPUs
  --priority-1       Import only Priority 1 GPUs (latest gen)
  --priority-2       Import only Priority 2 GPUs (older gen)
  --limit N          Import only first N models
  --start-from MODEL Resume from specific model (e.g., "RTX 4070")
  --help             Show this help message

Examples:
  node bulkGpuImporter.js                         # Import all GPUs
  node bulkGpuImporter.js --nvidia-only           # Import only NVIDIA GPUs
  node bulkGpuImporter.js --priority-1            # Import only latest generation
  node bulkGpuImporter.js --limit 5               # Import first 5 models
  node bulkGpuImporter.js --start-from "RTX 4070" # Resume from RTX 4070
      `);
      process.exit(0);
    }
  }

  const importer = new BulkGpuImporter();
  
  try {
    await importer.initialize();
    await importer.importBulkGpus(options);
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

module.exports = BulkGpuImporter;