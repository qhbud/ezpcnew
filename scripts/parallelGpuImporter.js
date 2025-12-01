const { GPUDataPopulator } = require('./gpuDataPopulator');
const { connectToDatabase, getDatabase } = require('../config/database');
const Logger = require('./utils/logger');
const ProgressTracker = require('./utils/progressTracker');
const cluster = require('cluster');
const os = require('os');

class ParallelGpuImporter {
  constructor() {
    this.results = {
      total: 0,
      successful: 0,
      failed: 0,
      models: {},
      startTime: Date.now()
    };
    this.maxConcurrentWorkers = Math.min(4, Math.max(2, Math.floor(os.cpus().length / 2))); // Use 2-4 workers
    this.workers = [];
    this.workQueue = [];
    this.completedWork = [];
  }

  // Get comprehensive GPU model list with batching support
  getGpuModels() {
    return [
      // High Priority NVIDIA RTX 40 Series
      { model: 'RTX 4090', searchTerms: ['RTX 4090', 'GeForce RTX 4090'], manufacturer: 'NVIDIA', priority: 1, tier: 'flagship' },
      { model: 'RTX 4080 Super', searchTerms: ['RTX 4080 Super'], manufacturer: 'NVIDIA', priority: 1, tier: 'high-end' },
      { model: 'RTX 4080', searchTerms: ['RTX 4080', 'GeForce RTX 4080'], manufacturer: 'NVIDIA', priority: 1, tier: 'high-end' },
      { model: 'RTX 4070 Ti Super', searchTerms: ['RTX 4070 Ti Super'], manufacturer: 'NVIDIA', priority: 1, tier: 'upper-mid' },
      { model: 'RTX 4070 Ti', searchTerms: ['RTX 4070 Ti'], manufacturer: 'NVIDIA', priority: 1, tier: 'upper-mid' },
      { model: 'RTX 4070 Super', searchTerms: ['RTX 4070 Super'], manufacturer: 'NVIDIA', priority: 1, tier: 'mid-range' },
      { model: 'RTX 4070', searchTerms: ['RTX 4070', 'GeForce RTX 4070'], manufacturer: 'NVIDIA', priority: 1, tier: 'mid-range' },
      { model: 'RTX 4060 Ti', searchTerms: ['RTX 4060 Ti'], manufacturer: 'NVIDIA', priority: 1, tier: 'entry' },
      { model: 'RTX 4060', searchTerms: ['RTX 4060', 'GeForce RTX 4060'], manufacturer: 'NVIDIA', priority: 1, tier: 'entry' },

      // NVIDIA RTX 50 Series (Future/Upcoming)
      { model: 'RTX 5090', searchTerms: ['RTX 5090', 'GeForce RTX 5090'], manufacturer: 'NVIDIA', priority: 1, tier: 'flagship' },
      { model: 'RTX 5080', searchTerms: ['RTX 5080', 'GeForce RTX 5080'], manufacturer: 'NVIDIA', priority: 1, tier: 'high-end' },
      { model: 'RTX 5070 Ti', searchTerms: ['RTX 5070 Ti'], manufacturer: 'NVIDIA', priority: 1, tier: 'upper-mid' },
      { model: 'RTX 5070', searchTerms: ['RTX 5070', 'GeForce RTX 5070'], manufacturer: 'NVIDIA', priority: 1, tier: 'mid-range' },
      { model: 'RTX 5060 Ti', searchTerms: ['RTX 5060 Ti'], manufacturer: 'NVIDIA', priority: 1, tier: 'entry' },
      { model: 'RTX 5060', searchTerms: ['RTX 5060', 'GeForce RTX 5060'], manufacturer: 'NVIDIA', priority: 1, tier: 'entry' },

      // NVIDIA RTX 30 Series (Still Popular)
      { model: 'RTX 3090 Ti', searchTerms: ['RTX 3090 Ti'], manufacturer: 'NVIDIA', priority: 2, tier: 'flagship' },
      { model: 'RTX 3090', searchTerms: ['RTX 3090', 'GeForce RTX 3090'], manufacturer: 'NVIDIA', priority: 2, tier: 'flagship' },
      { model: 'RTX 3080 Ti', searchTerms: ['RTX 3080 Ti'], manufacturer: 'NVIDIA', priority: 2, tier: 'high-end' },
      { model: 'RTX 3080', searchTerms: ['RTX 3080', 'GeForce RTX 3080'], manufacturer: 'NVIDIA', priority: 2, tier: 'high-end' },
      { model: 'RTX 3070 Ti', searchTerms: ['RTX 3070 Ti'], manufacturer: 'NVIDIA', priority: 2, tier: 'upper-mid' },
      { model: 'RTX 3070', searchTerms: ['RTX 3070', 'GeForce RTX 3070'], manufacturer: 'NVIDIA', priority: 2, tier: 'mid-range' },
      { model: 'RTX 3060 Ti', searchTerms: ['RTX 3060 Ti'], manufacturer: 'NVIDIA', priority: 2, tier: 'entry' },
      { model: 'RTX 3060', searchTerms: ['RTX 3060', 'GeForce RTX 3060'], manufacturer: 'NVIDIA', priority: 2, tier: 'entry' },

      // AMD RX 7000 Series (RDNA 3)
      { model: 'RX 7900 XTX', searchTerms: ['RX 7900 XTX', 'Radeon RX 7900 XTX'], manufacturer: 'AMD', priority: 1, tier: 'flagship' },
      { model: 'RX 7900 XT', searchTerms: ['RX 7900 XT', 'Radeon RX 7900 XT'], manufacturer: 'AMD', priority: 1, tier: 'high-end' },
      { model: 'RX 7800 XT', searchTerms: ['RX 7800 XT', 'Radeon RX 7800 XT'], manufacturer: 'AMD', priority: 1, tier: 'upper-mid' },
      { model: 'RX 7700 XT', searchTerms: ['RX 7700 XT', 'Radeon RX 7700 XT'], manufacturer: 'AMD', priority: 1, tier: 'mid-range' },
      { model: 'RX 7600 XT', searchTerms: ['RX 7600 XT', 'Radeon RX 7600 XT'], manufacturer: 'AMD', priority: 1, tier: 'entry' },
      { model: 'RX 7600', searchTerms: ['RX 7600', 'Radeon RX 7600'], manufacturer: 'AMD', priority: 1, tier: 'entry' },

      // AMD RX 6000 Series (RDNA 2)
      { model: 'RX 6950 XT', searchTerms: ['RX 6950 XT'], manufacturer: 'AMD', priority: 2, tier: 'flagship' },
      { model: 'RX 6900 XT', searchTerms: ['RX 6900 XT'], manufacturer: 'AMD', priority: 2, tier: 'flagship' },
      { model: 'RX 6800 XT', searchTerms: ['RX 6800 XT'], manufacturer: 'AMD', priority: 2, tier: 'high-end' },
      { model: 'RX 6700 XT', searchTerms: ['RX 6700 XT'], manufacturer: 'AMD', priority: 2, tier: 'upper-mid' },
      { model: 'RX 6600 XT', searchTerms: ['RX 6600 XT'], manufacturer: 'AMD', priority: 2, tier: 'entry' },
      { model: 'RX 6600', searchTerms: ['RX 6600'], manufacturer: 'AMD', priority: 2, tier: 'entry' },

      // Intel Arc
      { model: 'Arc A770', searchTerms: ['Arc A770', 'Intel Arc A770'], manufacturer: 'Intel', priority: 2, tier: 'mid-range' },
      { model: 'Arc A750', searchTerms: ['Arc A750', 'Intel Arc A750'], manufacturer: 'Intel', priority: 2, tier: 'entry' }
    ];
  }

  // Create work batches to distribute among workers
  createWorkBatches(models, options = {}) {
    const {
      batchSize = 3, // Process 3 models per batch to balance load
      manufacturers = ['NVIDIA', 'AMD', 'Intel'],
      priority = [1, 2],
      maxModels = null,
      startFrom = null
    } = options;

    // Filter models based on options
    let filteredModels = models.filter(model => 
      manufacturers.includes(model.manufacturer) && 
      priority.includes(model.priority)
    );

    // Handle start from option
    if (startFrom) {
      const startIndex = filteredModels.findIndex(m => m.model === startFrom);
      if (startIndex >= 0) {
        filteredModels = filteredModels.slice(startIndex);
      }
    }

    // Limit models if specified
    if (maxModels) {
      filteredModels = filteredModels.slice(0, maxModels);
    }

    // Create batches
    const batches = [];
    for (let i = 0; i < filteredModels.length; i += batchSize) {
      const batch = filteredModels.slice(i, i + batchSize);
      batches.push({
        id: Math.floor(i / batchSize) + 1,
        models: batch,
        startIndex: i,
        endIndex: Math.min(i + batchSize - 1, filteredModels.length - 1)
      });
    }

    return batches;
  }

  // Worker process function with progress callback
  async processWorkerBatchWithProgress(workerId, batch, progressCallback) {
    const populator = new GPUDataPopulator();
    let batchResults = {
      workerId,
      batchId: batch.id,
      successful: 0,
      failed: 0,
      models: {},
      startTime: Date.now()
    };

    try {
      Logger.info(`🔧 Worker ${workerId}: Starting batch ${batch.id} (${batch.models.length} models)`);
      
      await populator.connect();
      await populator.initBrowser();

      // Add staggered delay to prevent all workers from starting simultaneously
      const staggerDelay = workerId * 2000 + Math.random() * 3000; // 2-5s per worker
      Logger.info(`🔧 Worker ${workerId}: Staggered delay ${Math.round(staggerDelay/1000)}s...`);
      await new Promise(resolve => setTimeout(resolve, staggerDelay));

      // Process each model in the batch
      for (const modelInfo of batch.models) {
        const { model, searchTerms, manufacturer } = modelInfo;
        
        // Notify progress callback that we're starting this model
        progressCallback(model, false);
        
        try {
          Logger.info(`🔧 Worker ${workerId}: Processing ${manufacturer} ${model}...`);

          // Generate search URL
          const searchUrl = this.generateSearchUrl(searchTerms[0]);
          
          // Use the existing populateGPUData method with enhanced retry logic
          await populator.populateGPUData(searchUrl, model);

          batchResults.models[model] = {
            status: 'success',
            manufacturer,
            workerId
          };
          
          batchResults.successful++;
          Logger.success(`🔧 Worker ${workerId}: ✅ Successfully imported ${model}`);

          // Notify progress callback that we've completed this model
          progressCallback(model, true);

          // Inter-model delay within worker (shorter since workers run in parallel)
          const delay = 2 + Math.random() * 2; // 2-4 seconds between models within worker
          Logger.info(`🔧 Worker ${workerId}: ⏳ Waiting ${delay.toFixed(1)}s before next model...`);
          await new Promise(resolve => setTimeout(resolve, delay * 1000));

        } catch (error) {
          Logger.error(`🔧 Worker ${workerId}: ❌ Failed to import ${model}: ${error.message}`);
          batchResults.models[model] = {
            status: 'error',
            error: error.message,
            manufacturer,
            workerId
          };
          batchResults.failed++;
          
          // Still notify progress callback for failed models
          progressCallback(model, true);
        }
      }

      batchResults.endTime = Date.now();
      batchResults.duration = batchResults.endTime - batchResults.startTime;
      
      Logger.success(`🔧 Worker ${workerId}: Completed batch ${batch.id} in ${Math.round(batchResults.duration/1000)}s`);
      Logger.success(`🔧 Worker ${workerId}: Results: ${batchResults.successful} successful, ${batchResults.failed} failed`);

      return batchResults;

    } catch (error) {
      Logger.error(`🔧 Worker ${workerId}: Batch processing failed: ${error.message}`);
      throw error;
    } finally {
      if (populator.browser) {
        await populator.browser.close();
      }
    }
  }

  // Original worker process function (keeping for compatibility)
  async processWorkerBatch(workerId, batch) {
    const populator = new GPUDataPopulator();
    let batchResults = {
      workerId,
      batchId: batch.id,
      successful: 0,
      failed: 0,
      models: {},
      startTime: Date.now()
    };

    try {
      Logger.info(`🔧 Worker ${workerId}: Starting batch ${batch.id} (${batch.models.length} models)`);
      
      await populator.connect();
      await populator.initBrowser();

      // Add staggered delay to prevent all workers from starting simultaneously
      const staggerDelay = workerId * 2000 + Math.random() * 3000; // 2-5s per worker
      Logger.info(`🔧 Worker ${workerId}: Staggered delay ${Math.round(staggerDelay/1000)}s...`);
      await new Promise(resolve => setTimeout(resolve, staggerDelay));

      // Process each model in the batch
      for (const modelInfo of batch.models) {
        const { model, searchTerms, manufacturer } = modelInfo;
        
        try {
          Logger.info(`🔧 Worker ${workerId}: Processing ${manufacturer} ${model}...`);

          // Generate search URL
          const searchUrl = this.generateSearchUrl(searchTerms[0]);
          
          // Use the existing populateGPUData method with enhanced retry logic
          await populator.populateGPUData(searchUrl, model);

          batchResults.models[model] = {
            status: 'success',
            manufacturer,
            workerId
          };
          
          batchResults.successful++;
          Logger.success(`🔧 Worker ${workerId}: ✅ Successfully imported ${model}`);

          // Inter-model delay within worker (shorter since workers run in parallel)
          const delay = 2 + Math.random() * 2; // 2-4 seconds between models within worker
          Logger.info(`🔧 Worker ${workerId}: ⏳ Waiting ${delay.toFixed(1)}s before next model...`);
          await new Promise(resolve => setTimeout(resolve, delay * 1000));

        } catch (error) {
          Logger.error(`🔧 Worker ${workerId}: ❌ Failed to import ${model}: ${error.message}`);
          batchResults.models[model] = {
            status: 'error',
            error: error.message,
            manufacturer,
            workerId
          };
          batchResults.failed++;
        }
      }

      batchResults.endTime = Date.now();
      batchResults.duration = batchResults.endTime - batchResults.startTime;
      
      Logger.success(`🔧 Worker ${workerId}: Completed batch ${batch.id} in ${Math.round(batchResults.duration/1000)}s`);
      Logger.success(`🔧 Worker ${workerId}: Results: ${batchResults.successful} successful, ${batchResults.failed} failed`);

      return batchResults;

    } catch (error) {
      Logger.error(`🔧 Worker ${workerId}: Batch processing failed: ${error.message}`);
      throw error;
    } finally {
      if (populator.browser) {
        await populator.browser.close();
      }
    }
  }

  // Generate Amazon search URL for a GPU model
  generateSearchUrl(searchTerm) {
    const query = searchTerm.toLowerCase().replace(/\s+/g, '+');
    return `https://www.amazon.com/s?k=${query}&ref=nb_sb_noss`;
  }

  // Main parallel import function
  async importGpusInParallel(options = {}) {
    const {
      maxWorkers = this.maxConcurrentWorkers,
      ...otherOptions
    } = options;

    Logger.info('🚀 Starting parallel GPU import process...\n');
    Logger.info(`🔧 Configuration: Using ${maxWorkers} parallel workers`);

    const allModels = this.getGpuModels();
    const batches = this.createWorkBatches(allModels, otherOptions);
    
    Logger.info(`📋 Created ${batches.length} work batches from ${allModels.length} total models`);
    batches.forEach((batch, i) => {
      const models = batch.models.map(m => `${m.manufacturer} ${m.model}`).join(', ');
      Logger.info(`   Batch ${batch.id}: ${models}`);
    });

    Logger.info('\n⏰ Starting parallel processing...\n');

    // Initialize progress tracking for parallel processing
    const progressTracker = new ProgressTracker();
    
    // Calculate total GPU models to track
    const totalGpuModels = batches.reduce((sum, batch) => sum + batch.models.length, 0);
    
    // Create single unified progress bar for GPU completion
    const gpuProgressBar = progressTracker.createSimpleBar(totalGpuModels, 
      '🔍 GPU Import: [{bar}] {percentage}% | {value}/{total} GPUs completed | {status} | ETA: {eta_formatted}'
    );
    
    gpuProgressBar.start(totalGpuModels, 0, { status: 'Starting parallel workers...' });
    
    let completedGpus = 0;

    // Process batches in parallel using Promise.all with concurrency control
    const processBatch = async (batch, workerId) => {
      try {
        return await this.processWorkerBatch(workerId, batch);
      } catch (error) {
        Logger.error(`❌ Worker ${workerId} failed: ${error.message}`);
        return {
          workerId,
          batchId: batch.id,
          successful: 0,
          failed: batch.models.length,
          models: batch.models.reduce((acc, model) => {
            acc[model.model] = {
              status: 'error',
              error: error.message,
              manufacturer: model.manufacturer,
              workerId
            };
            return acc;
          }, {}),
          error: error.message
        };
      }
    };

    // Process batches with controlled concurrency
    const allResults = [];
    
    for (let i = 0; i < batches.length; i += maxWorkers) {
      const currentBatches = batches.slice(i, i + maxWorkers);
      
      const promises = currentBatches.map(async (batch, index) => {
        const workerId = i + index + 1;
        
        // Update status to show which GPUs this worker is processing
        const gpuNames = batch.models.map(m => m.model).join(', ');
        gpuProgressBar.update(completedGpus, { 
          status: `Worker ${workerId} processing: ${gpuNames}` 
        });
          
        try {
          const result = await this.processWorkerBatchWithProgress(workerId, batch, (modelName, isComplete) => {
            if (isComplete) {
              completedGpus++;
              gpuProgressBar.update(completedGpus, { 
                status: `✅ Completed ${modelName} (${completedGpus}/${totalGpuModels})` 
              });
            } else {
              gpuProgressBar.update(completedGpus, { 
                status: `🔄 Processing ${modelName}...` 
              });
            }
          });
            
          return result;
        } catch (error) {
          // Still increment for failed models to keep progress accurate
          batch.models.forEach(() => {
            completedGpus++;
            gpuProgressBar.update(completedGpus, { 
              status: `❌ Worker ${workerId} failed` 
            });
          });
          
          Logger.error(`❌ Worker ${workerId} failed: ${error.message}`);
          return {
            workerId,
            batchId: batch.id,
            successful: 0,
            failed: batch.models.length,
            models: batch.models.reduce((acc, model) => {
              acc[model.model] = {
                status: 'error',
                error: error.message,
                manufacturer: model.manufacturer,
                workerId
              };
              return acc;
            }, {}),
            error: error.message
          };
        }
      });
      
      Logger.info(`🔄 Processing batch group ${Math.floor(i / maxWorkers) + 1}: ${currentBatches.length} workers in parallel`);
      const groupResults = await Promise.all(promises);
      allResults.push(...groupResults);
      
      // Brief pause between batch groups
      if (i + maxWorkers < batches.length) {
        gpuProgressBar.update(completedGpus, { 
          status: `Pausing 5s before next batch group...` 
        });
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }
    
    // Complete progress
    gpuProgressBar.update(totalGpuModels, { 
      status: `🎉 All ${totalGpuModels} GPUs completed!` 
    });
    gpuProgressBar.stop();

    // Aggregate results
    this.aggregateResults(allResults);
    this.printSummary();
  }

  // Aggregate results from all workers
  aggregateResults(workerResults) {
    this.results.total = 0;
    this.results.successful = 0;
    this.results.failed = 0;
    this.results.models = {};

    workerResults.forEach(result => {
      if (result) {
        this.results.successful += result.successful;
        this.results.failed += result.failed;
        Object.assign(this.results.models, result.models);
      }
    });

    this.results.total = this.results.successful + this.results.failed;
    this.results.endTime = Date.now();
    this.results.totalDuration = this.results.endTime - this.results.startTime;
  }

  // Print comprehensive import summary
  printSummary() {
    Logger.info('\n' + '='.repeat(100));
    Logger.info('🎯 PARALLEL GPU IMPORT SUMMARY');
    Logger.info('='.repeat(100));

    Logger.info(`⏱️  Total Time: ${Math.round(this.results.totalDuration / 1000)}s (${Math.round(this.results.totalDuration / 60000)} minutes)`);
    Logger.info(`🔧 Workers Used: ${this.maxConcurrentWorkers} parallel workers`);
    Logger.info(`📈 Overall Stats:`);
    Logger.info(`   Total Models: ${this.results.total}`);
    Logger.info(`   Successful: ${this.results.successful} (${Math.round(this.results.successful / this.results.total * 100)}%)`);
    Logger.info(`   Failed: ${this.results.failed} (${Math.round(this.results.failed / this.results.total * 100)}%)`);

    if (this.results.successful > 0) {
      const avgTimePerModel = this.results.totalDuration / this.results.successful;
      Logger.info(`   Avg Time per Model: ${Math.round(avgTimePerModel / 1000)}s`);
    }

    // Group results by manufacturer and worker
    const byManufacturer = {};
    const byWorker = {};

    Object.entries(this.results.models).forEach(([model, info]) => {
      // By manufacturer
      if (!byManufacturer[info.manufacturer]) {
        byManufacturer[info.manufacturer] = { successful: 0, failed: 0 };
      }
      byManufacturer[info.manufacturer][info.status === 'success' ? 'successful' : 'failed']++;

      // By worker
      if (info.workerId) {
        if (!byWorker[info.workerId]) {
          byWorker[info.workerId] = { successful: 0, failed: 0 };
        }
        byWorker[info.workerId][info.status === 'success' ? 'successful' : 'failed']++;
      }
    });

    Logger.info(`\n🏭 Results by Manufacturer:`);
    Object.entries(byManufacturer).forEach(([manufacturer, stats]) => {
      const total = stats.successful + stats.failed;
      const successRate = Math.round(stats.successful / total * 100);
      Logger.info(`   ${manufacturer}: ${stats.successful}/${total} (${successRate}%)`);
    });

    Logger.info(`\n🔧 Results by Worker:`);
    Object.entries(byWorker).forEach(([workerId, stats]) => {
      const total = stats.successful + stats.failed;
      const successRate = Math.round(stats.successful / total * 100);
      Logger.info(`   Worker ${workerId}: ${stats.successful}/${total} (${successRate}%)`);
    });

    Logger.info(`\n📦 Detailed Model Results:`);
    Object.entries(this.results.models).forEach(([model, info]) => {
      const status = info.status === 'success' ? '✅' : '❌';
      const worker = info.workerId ? `[W${info.workerId}]` : '';
      Logger.info(`   ${status} ${model.padEnd(20)} - ${info.manufacturer} ${worker}`);
      if (info.error) {
        Logger.info(`      Error: ${info.error}`);
      }
    });

    Logger.info('\n🎉 Parallel GPU import process completed!');
    
    if (this.results.failed > 0) {
      Logger.warn(`\n⚠️  ${this.results.failed} models failed - consider running with --retry-failed flag`);
    }
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  
  const options = {
    manufacturers: ['NVIDIA', 'AMD', 'Intel'],
    priority: [1, 2],
    maxModels: null,
    startFrom: null,
    maxWorkers: Math.min(4, Math.max(2, Math.floor(os.cpus().length / 2)))
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
    } else if (arg === '--workers' && i + 1 < args.length) {
      options.maxWorkers = Math.min(8, Math.max(1, parseInt(args[i + 1])));
      i++;
    } else if (arg === '--help') {
      console.log(`
Parallel GPU Import Script Usage:
==================================

node parallelGpuImporter.js [options]

Options:
  --nvidia-only      Import only NVIDIA GPUs
  --amd-only         Import only AMD GPUs  
  --intel-only       Import only Intel GPUs
  --priority-1       Import only Priority 1 GPUs (latest gen)
  --priority-2       Import only Priority 2 GPUs (older gen)
  --limit N          Import only first N models
  --start-from MODEL Resume from specific model (e.g., "RTX 4070")
  --workers N        Number of parallel workers (1-8, default: auto)
  --help             Show this help message

Examples:
  node parallelGpuImporter.js                         # Import all GPUs with auto workers
  node parallelGpuImporter.js --nvidia-only           # Import only NVIDIA GPUs
  node parallelGpuImporter.js --priority-1 --workers 2 # Latest gen with 2 workers
  node parallelGpuImporter.js --limit 10 --workers 4   # First 10 models with 4 workers

Performance Notes:
  - Uses 2-4 workers by default based on CPU cores
  - Each worker processes 3 models in sequence
  - Total time is significantly reduced vs sequential processing
  - Workers use enhanced retry mechanisms and bot detection avoidance
      `);
      process.exit(0);
    }
  }

  const importer = new ParallelGpuImporter();
  
  try {
    await importer.importGpusInParallel(options);
  } catch (error) {
    Logger.error(`💥 Parallel import process failed: ${error.message}`);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  Logger.info('\n⏹️  Parallel import process interrupted by user');
  process.exit(0);
});

if (require.main === module) {
  main();
}

module.exports = ParallelGpuImporter;