const { parentPort, workerData } = require('worker_threads');
const { RamDataPopulator } = require('../ramDataPopulator');

class RamWorker {
  constructor(workerId, batch, config) {
    this.workerId = workerId;
    this.batch = batch;
    this.config = config;
    this.populator = new RamDataPopulator();
  }

  // Generate Amazon search URL for a RAM model
  generateSearchUrl(searchTerm) {
    const query = searchTerm.toLowerCase().replace(/\s+/g, '+');
    return `https://www.amazon.com/s?k=${query}&ref=nb_sb_noss`;
  }

  async initialize() {
    try {
      await this.populator.connect();
      await this.populator.initBrowser();
      return true;
    } catch (error) {
      throw new Error(`Worker ${this.workerId} initialization failed: ${error.message}`);
    }
  }

  async processBatch() {
    let successful = 0;
    let failed = 0;
    const models = {};

    for (let i = 0; i < this.batch.length; i++) {
      const ramModel = this.batch[i];
      const { model, searchTerms, type, speed } = ramModel;

      // Send progress update
      parentPort.postMessage({
        type: 'progress',
        workerId: this.workerId,
        model: model,
        current: i + 1,
        total: this.batch.length
      });

      try {
        // Use the first search term for the URL
        const searchUrl = this.generateSearchUrl(searchTerms[0]);

        // Use the existing populateRamData method
        const result = await this.populator.populateRamData(searchUrl, model);

        if (result.success) {
          successful++;
          models[model] = {
            status: 'success',
            type,
            speed,
            count: result.count,
            duplicates: result.duplicates,
            updated: result.updated
          };

          // Send success result
          parentPort.postMessage({
            type: 'result',
            success: true,
            model: model,
            memoryType: type,
            speed: speed,
            count: result.count,
            duplicates: result.duplicates,
            updated: result.updated
          });
        } else {
          failed++;
          models[model] = {
            status: 'error',
            error: result.message || 'No RAM found',
            type,
            speed
          };

          // Send failure result
          parentPort.postMessage({
            type: 'result',
            success: false,
            model: model,
            memoryType: type,
            speed: speed,
            error: result.message || 'No RAM found'
          });
        }

        // Rate limiting - wait between models
        const delay = 2 + Math.random() * 2; // 2-4 seconds for workers
        await new Promise(resolve => setTimeout(resolve, delay * 1000));

      } catch (error) {
        failed++;
        models[model] = {
          status: 'error',
          error: error.message,
          type,
          speed
        };

        // Send failure result
        parentPort.postMessage({
          type: 'result',
          success: false,
          model: model,
          memoryType: type,
          speed: speed,
          error: error.message
        });
      }
    }

    return { successful, failed, models };
  }

  async cleanup() {
    try {
      await this.populator.close();
    } catch (error) {
      console.error(`Worker ${this.workerId} cleanup error:`, error.message);
    }
  }
}

// Main worker execution
async function runWorker() {
  const { workerId, batch, config } = workerData;
  const worker = new RamWorker(workerId, batch, config);

  try {
    // Initialize the worker
    await worker.initialize();

    // Process the batch
    const results = await worker.processBatch();

    // Cleanup
    await worker.cleanup();

    // Worker completed successfully
    process.exit(0);

  } catch (error) {
    console.error(`Worker ${workerId} failed:`, error.message);

    // Try to cleanup even on error
    try {
      await worker.cleanup();
    } catch (cleanupError) {
      console.error(`Worker ${workerId} cleanup failed:`, cleanupError.message);
    }

    process.exit(1);
  }
}

// Handle worker termination
process.on('SIGTERM', async () => {
  console.log(`Worker ${workerData.workerId} received SIGTERM, shutting down gracefully...`);
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log(`Worker ${workerData.workerId} received SIGINT, shutting down gracefully...`);
  process.exit(0);
});

// Start the worker
runWorker().catch(error => {
  console.error(`Worker ${workerData.workerId} crashed:`, error.message);
  process.exit(1);
});
