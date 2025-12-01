const { Worker } = require('worker_threads');
const path = require('path');
const Logger = require('./utils/logger');
const ProgressTracker = require('./utils/progressTracker');

class ParallelRamImporter {
  constructor(maxWorkers = 3) {
    this.maxWorkers = maxWorkers;
    this.workers = [];
    this.results = {
      total: 0,
      successful: 0,
      failed: 0,
      modules: {}
    };
    this.progressTracker = new ProgressTracker();
  }

  // Get RAM models list (same as in bulkRamImporter.js)
  getRamModels() {
    return [
      // DDR5 High-End Gaming/Enthusiast - Priority 1
      { model: 'DDR5-8000 32GB', searchTerms: ['DDR5 8000MHz 32GB'], manufacturer: 'Various', priority: 1, type: 'DDR5', speed: 8000, tier: 'extreme' },
      { model: 'DDR5-7600 32GB', searchTerms: ['DDR5 7600MHz 32GB'], manufacturer: 'Various', priority: 1, type: 'DDR5', speed: 7600, tier: 'extreme' },
      { model: 'DDR5-7200 32GB', searchTerms: ['DDR5 7200MHz 32GB'], manufacturer: 'Various', priority: 1, type: 'DDR5', speed: 7200, tier: 'extreme' },
      { model: 'DDR5-6800 32GB', searchTerms: ['DDR5 6800MHz 32GB'], manufacturer: 'Various', priority: 1, type: 'DDR5', speed: 6800, tier: 'high-end' },
      { model: 'DDR5-6400 32GB', searchTerms: ['DDR5 6400MHz 32GB gaming'], manufacturer: 'Various', priority: 1, type: 'DDR5', speed: 6400, tier: 'high-end' },
      { model: 'DDR5-6000 32GB', searchTerms: ['DDR5 6000MHz 32GB gaming'], manufacturer: 'Various', priority: 1, type: 'DDR5', speed: 6000, tier: 'high-end' },

      // DDR5 Mainstream Gaming - Priority 1
      { model: 'DDR5-5600 32GB', searchTerms: ['DDR5 5600MHz 32GB'], manufacturer: 'Various', priority: 1, type: 'DDR5', speed: 5600, tier: 'mainstream' },
      { model: 'DDR5-5200 32GB', searchTerms: ['DDR5 5200MHz 32GB'], manufacturer: 'Various', priority: 1, type: 'DDR5', speed: 5200, tier: 'mainstream' },
      { model: 'DDR5-4800 32GB', searchTerms: ['DDR5 4800MHz 32GB'], manufacturer: 'Various', priority: 1, type: 'DDR5', speed: 4800, tier: 'entry' },

      // DDR5 16GB Kits - Priority 1
      { model: 'DDR5-6400 16GB', searchTerms: ['DDR5 6400MHz 16GB kit'], manufacturer: 'Various', priority: 1, type: 'DDR5', speed: 6400, tier: 'high-end' },
      { model: 'DDR5-6000 16GB', searchTerms: ['DDR5 6000MHz 16GB kit'], manufacturer: 'Various', priority: 1, type: 'DDR5', speed: 6000, tier: 'high-end' },
      { model: 'DDR5-5600 16GB', searchTerms: ['DDR5 5600MHz 16GB kit'], manufacturer: 'Various', priority: 1, type: 'DDR5', speed: 5600, tier: 'mainstream' },
      { model: 'DDR5-5200 16GB', searchTerms: ['DDR5 5200MHz 16GB'], manufacturer: 'Various', priority: 1, type: 'DDR5', speed: 5200, tier: 'mainstream' },

      // DDR5 High Capacity - Priority 2
      { model: 'DDR5-6000 64GB', searchTerms: ['DDR5 6000MHz 64GB'], manufacturer: 'Various', priority: 2, type: 'DDR5', speed: 6000, tier: 'workstation' },
      { model: 'DDR5-5600 64GB', searchTerms: ['DDR5 5600MHz 64GB'], manufacturer: 'Various', priority: 2, type: 'DDR5', speed: 5600, tier: 'workstation' },
      { model: 'DDR5-5200 128GB', searchTerms: ['DDR5 5200MHz 128GB'], manufacturer: 'Various', priority: 2, type: 'DDR5', speed: 5200, tier: 'workstation' },

      // DDR4 High-End Gaming - Priority 1
      { model: 'DDR4-4000 32GB', searchTerms: ['DDR4 4000MHz 32GB gaming'], manufacturer: 'Various', priority: 1, type: 'DDR4', speed: 4000, tier: 'high-end' },
      { model: 'DDR4-3800 32GB', searchTerms: ['DDR4 3800MHz 32GB'], manufacturer: 'Various', priority: 1, type: 'DDR4', speed: 3800, tier: 'high-end' },
      { model: 'DDR4-3600 32GB', searchTerms: ['DDR4 3600MHz 32GB gaming'], manufacturer: 'Various', priority: 1, type: 'DDR4', speed: 3600, tier: 'high-end' },
      { model: 'DDR4-3200 32GB', searchTerms: ['DDR4 3200MHz 32GB'], manufacturer: 'Various', priority: 1, type: 'DDR4', speed: 3200, tier: 'mainstream' },

      // DDR4 16GB Mainstream - Priority 1
      { model: 'DDR4-3600 16GB', searchTerms: ['DDR4 3600MHz 16GB kit'], manufacturer: 'Various', priority: 1, type: 'DDR4', speed: 3600, tier: 'high-end' },
      { model: 'DDR4-3200 16GB', searchTerms: ['DDR4 3200MHz 16GB kit'], manufacturer: 'Various', priority: 1, type: 'DDR4', speed: 3200, tier: 'mainstream' },
      { model: 'DDR4-3000 16GB', searchTerms: ['DDR4 3000MHz 16GB'], manufacturer: 'Various', priority: 1, type: 'DDR4', speed: 3000, tier: 'mainstream' },

      // DDR4 Budget/Entry Level - Priority 2
      { model: 'DDR4-2666 16GB', searchTerms: ['DDR4 2666MHz 16GB'], manufacturer: 'Various', priority: 2, type: 'DDR4', speed: 2666, tier: 'entry' },
      { model: 'DDR4-2400 16GB', searchTerms: ['DDR4 2400MHz 16GB'], manufacturer: 'Various', priority: 2, type: 'DDR4', speed: 2400, tier: 'entry' },

      // DDR4 8GB Budget - Priority 2
      { model: 'DDR4-3200 8GB', searchTerms: ['DDR4 3200MHz 8GB kit'], manufacturer: 'Various', priority: 2, type: 'DDR4', speed: 3200, tier: 'entry' },
      { model: 'DDR4-2666 8GB', searchTerms: ['DDR4 2666MHz 8GB'], manufacturer: 'Various', priority: 2, type: 'DDR4', speed: 2666, tier: 'entry' },

      // DDR4 High Capacity Workstation - Priority 2
      { model: 'DDR4-3600 64GB', searchTerms: ['DDR4 3600MHz 64GB'], manufacturer: 'Various', priority: 2, type: 'DDR4', speed: 3600, tier: 'workstation' },
      { model: 'DDR4-3200 64GB', searchTerms: ['DDR4 3200MHz 64GB'], manufacturer: 'Various', priority: 2, type: 'DDR4', speed: 3200, tier: 'workstation' },
      { model: 'DDR4-2666 128GB', searchTerms: ['DDR4 2666MHz 128GB'], manufacturer: 'Various', priority: 2, type: 'DDR4', speed: 2666, tier: 'workstation' },

      // Brand-Specific High-End - Priority 3
      { model: 'Corsair Dominator DDR5', searchTerms: ['Corsair Dominator DDR5'], manufacturer: 'Corsair', priority: 3, type: 'DDR5', speed: 6000, tier: 'premium' },
      { model: 'G.Skill Trident Z5 DDR5', searchTerms: ['G.Skill Trident Z5 DDR5'], manufacturer: 'G.Skill', priority: 3, type: 'DDR5', speed: 6000, tier: 'premium' },
      { model: 'Kingston Fury Beast DDR5', searchTerms: ['Kingston Fury Beast DDR5'], manufacturer: 'Kingston', priority: 3, type: 'DDR5', speed: 5600, tier: 'mainstream' },
      { model: 'G.Skill Trident Z DDR4', searchTerms: ['G.Skill Trident Z DDR4'], manufacturer: 'G.Skill', priority: 3, type: 'DDR4', speed: 3600, tier: 'premium' },
      { model: 'Corsair Vengeance RGB DDR4', searchTerms: ['Corsair Vengeance RGB DDR4'], manufacturer: 'Corsair', priority: 3, type: 'DDR4', speed: 3600, tier: 'high-end' },
      { model: 'Crucial Ballistix DDR4', searchTerms: ['Crucial Ballistix DDR4'], manufacturer: 'Crucial', priority: 3, type: 'DDR4', speed: 3200, tier: 'mainstream' },

      // SO-DIMM Laptop RAM - Priority 3
      { model: 'DDR5-5600 SO-DIMM 32GB', searchTerms: ['DDR5 5600MHz SO-DIMM 32GB laptop'], manufacturer: 'Various', priority: 3, type: 'DDR5', speed: 5600, tier: 'laptop' },
      { model: 'DDR4-3200 SO-DIMM 32GB', searchTerms: ['DDR4 3200MHz SO-DIMM 32GB laptop'], manufacturer: 'Various', priority: 3, type: 'DDR4', speed: 3200, tier: 'laptop' }
    ];
  }

  // Create worker batches
  createWorkerBatches(ramModels, numWorkers) {
    const batches = Array.from({ length: numWorkers }, () => []);

    ramModels.forEach((ram, index) => {
      batches[index % numWorkers].push(ram);
    });

    return batches.filter(batch => batch.length > 0);
  }

  // Process worker batch with progress tracking
  async processWorkerBatchWithProgress(workerId, batch, progressCallback) {
    return new Promise((resolve, reject) => {
      const workerPath = path.join(__dirname, 'workers', 'ramWorker.js');
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
        modules: {}
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
            results.modules[message.model] = {
              status: 'success',
              memoryType: message.memoryType,
              speed: message.speed,
              count: message.count,
              duplicates: message.duplicates,
              updated: message.updated
            };
            Logger.success(`Worker ${workerId}: ✅ ${message.model} (${message.count} new, ${message.duplicates} dupes, ${message.updated} updated)`);
          } else {
            results.failed++;
            results.modules[message.model] = {
              status: 'error',
              error: message.error,
              memoryType: message.memoryType,
              speed: message.speed
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
  async importRamParallel(options = {}) {
    const {
      memoryType = ['DDR4', 'DDR5'],
      priority = [1, 2],
      maxModels = null,
      startFrom = null,
      tier = null,
      workers = this.maxWorkers
    } = options;

    Logger.info(`🚀 Starting parallel RAM import with ${workers} workers...`);

    const allModels = this.getRamModels();

    // Filter models based on options
    let modelsToImport = allModels.filter(model =>
      memoryType.includes(model.type) &&
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

    Logger.info(`📋 Will import ${modelsToImport.length} RAM configurations across ${workers} workers`);

    // Create worker batches
    const batches = this.createWorkerBatches(modelsToImport, workers);

    Logger.info('📊 Worker Distribution:');
    batches.forEach((batch, index) => {
      const batchSummary = batch.map(b => `${b.type} ${b.speed}MHz`).slice(0, 3).join(', ');
      const moreInfo = batch.length > 3 ? ` + ${batch.length - 3} more` : '';
      Logger.info(`   Worker ${index + 1}: ${batch.length} configs (${batchSummary}${moreInfo})`);
    });

    // Initialize progress tracking
    const progressBar = this.progressTracker.createSimpleBar(
      modelsToImport.length,
      '🧠 RAM Import: [{bar}] {percentage}% | {value}/{total} configs completed | ETA: {eta}s'
    );

    let completedConfigs = 0;
    progressBar.start(modelsToImport.length, 0, { status: 'Starting parallel import...' });

    const progressCallback = (model, current, total, success) => {
      if (success !== undefined) {
        completedConfigs++;
        progressBar.update(completedConfigs, { status: `Completed: ${model}` });
      }
    };

    // Start all workers in parallel
    const workerPromises = batches.map((batch, index) =>
      this.processWorkerBatchWithProgress(index + 1, batch, progressCallback)
    );

    try {
      Logger.info('\n⏰ Starting parallel RAM import process...\n');

      // Wait for all workers to complete
      const workerResults = await Promise.all(workerPromises);

      // Stop progress bar
      progressBar.stop();

      // Aggregate results
      workerResults.forEach(result => {
        this.results.successful += result.successful;
        this.results.failed += result.failed;
        Object.assign(this.results.modules, result.modules);
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
    Logger.info('📊 PARALLEL RAM IMPORT SUMMARY');
    Logger.info('='.repeat(80));

    Logger.info(`📈 Overall Stats:`);
    Logger.info(`   Total Configurations: ${this.results.total}`);
    Logger.info(`   Successful: ${this.results.successful}`);
    Logger.info(`   Failed: ${this.results.failed}`);
    Logger.info(`   Success Rate: ${((this.results.successful / this.results.total) * 100).toFixed(1)}%`);

    const memoryTypes = {};
    const tiers = {};
    let totalRamCount = 0;
    let totalDuplicates = 0;
    let totalUpdated = 0;

    Logger.info(`\n💾 Configuration Details:`);
    Object.entries(this.results.modules).forEach(([model, info]) => {
      const status = info.status === 'success' ? '✅' : '❌';
      const countInfo = info.count !== undefined
        ? ` (${info.count} new, ${info.duplicates} dupes, ${info.updated} updated)`
        : '';
      Logger.info(`   ${status} ${model.padEnd(30)} - ${info.memoryType} @ ${info.speed}MHz${countInfo}`);

      if (info.error) {
        Logger.info(`      Error: ${info.error}`);
      }

      // Aggregate stats
      if (info.status === 'success' && info.count !== undefined) {
        totalRamCount += info.count;
        totalDuplicates += info.duplicates || 0;
        totalUpdated += info.updated || 0;
      }

      memoryTypes[info.memoryType] = (memoryTypes[info.memoryType] || 0) + 1;
    });

    Logger.info(`\n🔧 By Memory Type:`);
    Object.entries(memoryTypes).forEach(([type, count]) => {
      Logger.info(`   ${type}: ${count} configurations imported`);
    });

    Logger.info(`\n📊 Database Stats:`);
    Logger.info(`   Total RAM modules found: ${totalRamCount}`);
    Logger.info(`   Duplicates skipped: ${totalDuplicates}`);
    Logger.info(`   Modules updated: ${totalUpdated}`);

    Logger.info('\n🎉 Parallel RAM import process completed!');
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
    memoryType: ['DDR4', 'DDR5'],
    priority: [1, 2],
    maxModels: null,
    startFrom: null,
    tier: null,
    workers: 3
  };

  // Parse arguments
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--ddr4-only') {
      options.memoryType = ['DDR4'];
    } else if (arg === '--ddr5-only') {
      options.memoryType = ['DDR5'];
    } else if (arg === '--priority-1') {
      options.priority = [1];
    } else if (arg === '--priority-2') {
      options.priority = [2];
    } else if (arg === '--extreme-only') {
      options.tier = 'extreme';
    } else if (arg === '--high-end-only') {
      options.tier = 'high-end';
    } else if (arg === '--mainstream-only') {
      options.tier = 'mainstream';
    } else if (arg === '--workstation-only') {
      options.tier = 'workstation';
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
Parallel RAM Import Script Usage:
=================================

node parallelRamImporter.js [options]

Options:
  --ddr4-only          Import only DDR4 RAM
  --ddr5-only          Import only DDR5 RAM
  --priority-1         Import only Priority 1 RAM (latest gen)
  --priority-2         Import only Priority 2 RAM (older gen)
  --extreme-only       Import only extreme performance RAM (7200MHz+)
  --high-end-only      Import only high-end gaming RAM
  --mainstream-only    Import only mainstream RAM
  --workstation-only   Import only high-capacity workstation RAM
  --limit N            Import only first N models
  --start-from MODEL   Resume from specific model
  --workers N          Number of parallel workers (default: 3)
  --help               Show this help message

Examples:
  node parallelRamImporter.js                              # Import all RAM with 3 workers
  node parallelRamImporter.js --workers 2                  # Use 2 workers
  node parallelRamImporter.js --ddr5-only --workers 4      # DDR5 only with 4 workers
  node parallelRamImporter.js --priority-1 --high-end-only # Latest high-end RAM
  node parallelRamImporter.js --limit 10 --workers 2       # Import first 10 models with 2 workers
      `);
      process.exit(0);
    }
  }

  const importer = new ParallelRamImporter(options.workers);

  try {
    await importer.importRamParallel(options);
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

module.exports = ParallelRamImporter;
