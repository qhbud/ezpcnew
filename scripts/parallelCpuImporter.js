const { Worker } = require('worker_threads');
const path = require('path');
const Logger = require('./utils/logger');
const ProgressTracker = require('./utils/progressTracker');

class ParallelCpuImporter {
  constructor(maxWorkers = 3) {
    this.maxWorkers = maxWorkers;
    this.workers = [];
    this.results = {
      total: 0,
      successful: 0,
      failed: 0,
      models: {}
    };
    this.progressTracker = new ProgressTracker();
  }

  // Get CPU models list (same as in bulkCpuImporter.js)
  getCpuModels() {
    return [
      // Intel Core 13th Gen (Raptor Lake) - Latest
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

  // Create worker batches
  createWorkerBatches(cpuModels, numWorkers) {
    const batches = Array.from({ length: numWorkers }, () => []);
    
    cpuModels.forEach((cpu, index) => {
      batches[index % numWorkers].push(cpu);
    });
    
    return batches.filter(batch => batch.length > 0);
  }

  // Process worker batch with progress tracking
  async processWorkerBatchWithProgress(workerId, batch, progressCallback) {
    return new Promise((resolve, reject) => {
      const workerPath = path.join(__dirname, 'workers', 'cpuWorker.js');
      const worker = new Worker(workerPath, {
        workerData: {
          workerId,
          batch,
          config: {
            headless: true,
            devtools: false
          }
        }
      });

      const results = {
        successful: 0,
        failed: 0,
        models: {}
      };

      worker.on('message', (message) => {
        if (message.type === 'progress') {
          Logger.info(`Worker ${workerId}: Processing ${message.model} (${message.current}/${message.total})`);
          if (progressCallback) {
            progressCallback(message.model, message.current, message.total);
          }
        } else if (message.type === 'result') {
          if (message.success) {
            results.successful++;
            results.models[message.model] = {
              status: 'success',
              manufacturer: message.manufacturer,
              count: message.count
            };
            Logger.success(`Worker ${workerId}: ✅ ${message.model} (${message.count} CPUs found)`);
          } else {
            results.failed++;
            results.models[message.model] = {
              status: 'error',
              error: message.error,
              manufacturer: message.manufacturer
            };
            Logger.error(`Worker ${workerId}: ❌ ${message.model} - ${message.error}`);
          }

          if (progressCallback) {
            progressCallback(message.model, null, null, message.success);
          }
        }
      });

      worker.on('error', (error) => {
        Logger.error(`Worker ${workerId} error: ${error.message}`);
        reject(error);
      });

      worker.on('exit', (code) => {
        if (code !== 0) {
          Logger.error(`Worker ${workerId} exited with code ${code}`);
          reject(new Error(`Worker exited with code ${code}`));
        } else {
          Logger.success(`Worker ${workerId} completed successfully`);
          resolve(results);
        }
      });

      this.workers.push(worker);
    });
  }

  // Main parallel import function
  async importCpusParallel(options = {}) {
    const {
      manufacturers = ['Intel', 'AMD'],
      priority = [1, 2],
      maxModels = null,
      startFrom = null,
      tier = null,
      workers = this.maxWorkers
    } = options;

    Logger.info(`🚀 Starting parallel CPU import with ${workers} workers...`);

    const allModels = this.getCpuModels();
    
    // Filter models based on options
    let modelsToImport = allModels.filter(model => 
      manufacturers.includes(model.manufacturer) && 
      priority.includes(model.priority) &&
      (!tier || model.tier === tier)
    );

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

    Logger.info(`📋 Will import ${modelsToImport.length} CPU models across ${workers} workers`);

    // Create worker batches
    const batches = this.createWorkerBatches(modelsToImport, workers);
    
    Logger.info('📊 Worker Distribution:');
    batches.forEach((batch, index) => {
      Logger.info(`   Worker ${index + 1}: ${batch.length} CPUs (${batch.map(b => `${b.manufacturer} ${b.model.split(' ').slice(-1)[0]}`).join(', ')})`);
    });

    // Initialize progress tracking
    const progressBar = this.progressTracker.createSimpleBar(
      modelsToImport.length, 
      '🔍 CPU Import: [{bar}] {percentage}% | {value}/{total} CPUs completed | ETA: {eta}s'
    );

    let completedCpus = 0;
    progressBar.start(modelsToImport.length, 0, { status: 'Starting parallel import...' });

    const progressCallback = (model, current, total, success) => {
      if (success !== undefined) {
        completedCpus++;
        progressBar.update(completedCpus, { status: `Completed: ${model}` });
      }
    };

    // Start all workers in parallel
    const workerPromises = batches.map((batch, index) => 
      this.processWorkerBatchWithProgress(index + 1, batch, progressCallback)
    );

    try {
      Logger.info('\n⏰ Starting parallel CPU import process...\n');

      // Wait for all workers to complete
      const workerResults = await Promise.all(workerPromises);
      
      // Stop progress bar
      progressBar.stop();

      // Aggregate results
      workerResults.forEach(result => {
        this.results.successful += result.successful;
        this.results.failed += result.failed;
        Object.assign(this.results.models, result.models);
      });

      this.results.total = this.results.successful + this.results.failed;

      // Print final summary
      this.printSummary();

    } catch (error) {
      progressBar.stop();
      Logger.error(`💥 Parallel import failed: ${error.message}`);
      throw error;
    } finally {
      // Clean up workers
      await this.cleanup();
    }
  }

  // Print import summary
  printSummary() {
    Logger.info('\n' + '='.repeat(80));
    Logger.info('📊 PARALLEL CPU IMPORT SUMMARY');
    Logger.info('='.repeat(80));

    Logger.info(`📈 Overall Stats:`);
    Logger.info(`   Total Models: ${this.results.total}`);
    Logger.info(`   Successful: ${this.results.successful}`);
    Logger.info(`   Failed: ${this.results.failed}`);
    Logger.info(`   Success Rate: ${((this.results.successful / this.results.total) * 100).toFixed(1)}%`);

    const manufacturers = {};
    const tiers = {};
    let totalCpuCount = 0;

    Logger.info(`\n💻 Model Details:`);
    Object.entries(this.results.models).forEach(([model, info]) => {
      const status = info.status === 'success' ? '✅' : '❌';
      const countInfo = info.count ? ` (${info.count} CPUs)` : '';
      Logger.info(`   ${status} ${model.padEnd(25)} - ${info.manufacturer}${countInfo}`);
      
      if (info.error) {
        Logger.info(`      Error: ${info.error}`);
      }

      // Aggregate stats
      if (info.status === 'success' && info.count) {
        totalCpuCount += info.count;
      }
      
      manufacturers[info.manufacturer] = (manufacturers[info.manufacturer] || 0) + 1;
    });

    Logger.info(`\n🏭 By Manufacturer:`);
    Object.entries(manufacturers).forEach(([manufacturer, count]) => {
      Logger.info(`   ${manufacturer}: ${count} models imported`);
    });

    Logger.info(`\n📊 Total CPUs Found: ${totalCpuCount}`);
    Logger.info('\n🎉 Parallel CPU import process completed!');
  }

  // Cleanup workers and resources
  async cleanup() {
    for (const worker of this.workers) {
      try {
        await worker.terminate();
      } catch (error) {
        Logger.error(`Error terminating worker: ${error.message}`);
      }
    }
    this.workers = [];
    Logger.info('🚪 All workers cleaned up');
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
    tier: null,
    workers: 3
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
    } else if (arg === '--workers' && i + 1 < args.length) {
      options.workers = parseInt(args[i + 1]);
      i++;
    } else if (arg === '--help') {
      console.log(`
Parallel CPU Import Script Usage:
=================================

node parallelCpuImporter.js [options]

Options:
  --intel-only       Import only Intel CPUs
  --amd-only         Import only AMD CPUs  
  --priority-1       Import only Priority 1 CPUs (latest gen)
  --priority-2       Import only Priority 2 CPUs (older gen)
  --flagship-only    Import only flagship tier CPUs (i9/Ryzen 9)
  --mainstream-only  Import only mainstream tier CPUs (i5/Ryzen 5)
  --limit N          Import only first N models
  --start-from MODEL Resume from specific model
  --workers N        Number of parallel workers (default: 3)
  --help             Show this help message

Examples:
  node parallelCpuImporter.js                              # Import all CPUs with 3 workers
  node parallelCpuImporter.js --workers 2                  # Use 2 workers
  node parallelCpuImporter.js --intel-only --workers 4     # Intel only with 4 workers
  node parallelCpuImporter.js --priority-1 --flagship-only # Latest flagship CPUs
  node parallelCpuImporter.js --limit 10 --workers 2       # Import first 10 models with 2 workers
      `);
      process.exit(0);
    }
  }

  const importer = new ParallelCpuImporter(options.workers);
  
  try {
    await importer.importCpusParallel(options);
  } catch (error) {
    Logger.error(`💥 Import process failed: ${error.message}`);
    process.exit(1);
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

module.exports = ParallelCpuImporter;