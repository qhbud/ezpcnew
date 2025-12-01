const { connectToDatabase, getDatabase } = require('../config/database');
const puppeteer = require('puppeteer');
const config = require('./config/scrapeConfig');
const Logger = require('./utils/logger');
const AmazonScraper = require('./scrapers/amazonScraper');

class AllGpuImporter {
  constructor() {
    this.db = null;
    this.browser = null;
    this.scraper = null;
    this.results = {
      total: 0,
      successful: 0,
      failed: 0,
      models: {}
    };
  }

  async initialize() {
    await connectToDatabase();
    this.db = getDatabase();
    this.browser = await puppeteer.launch(config.browser);
    this.scraper = new AmazonScraper('amazon', config.sites.amazon.selectors);
    Logger.success('✅ Initialized GPU importer');
  }

  async cleanup() {
    if (this.browser) {
      await this.browser.close();
    }
    Logger.info('🚪 Cleanup completed');
  }

  // Define comprehensive GPU model list
  getGpuModels() {
    return [
      // NVIDIA RTX 50 Series (Latest)
      { model: 'RTX 5090', searchTerms: ['RTX 5090', 'GeForce RTX 5090'], manufacturer: 'NVIDIA', tier: 'flagship' },
      { model: 'RTX 5080', searchTerms: ['RTX 5080', 'GeForce RTX 5080'], manufacturer: 'NVIDIA', tier: 'high-end' },
      { model: 'RTX 5070 Ti', searchTerms: ['RTX 5070 Ti', 'GeForce RTX 5070 Ti'], manufacturer: 'NVIDIA', tier: 'high-end' },
      { model: 'RTX 5070', searchTerms: ['RTX 5070', 'GeForce RTX 5070'], manufacturer: 'NVIDIA', tier: 'upper-mid' },
      { model: 'RTX 5060 Ti', searchTerms: ['RTX 5060 Ti', 'GeForce RTX 5060 Ti'], manufacturer: 'NVIDIA', tier: 'mid-range' },
      { model: 'RTX 5060', searchTerms: ['RTX 5060', 'GeForce RTX 5060'], manufacturer: 'NVIDIA', tier: 'mid-range' },

      // NVIDIA RTX 40 Series
      { model: 'RTX 4090', searchTerms: ['RTX 4090', 'GeForce RTX 4090'], manufacturer: 'NVIDIA', tier: 'flagship' },
      { model: 'RTX 4080 Super', searchTerms: ['RTX 4080 Super', 'GeForce RTX 4080 Super'], manufacturer: 'NVIDIA', tier: 'high-end' },
      { model: 'RTX 4080', searchTerms: ['RTX 4080', 'GeForce RTX 4080'], manufacturer: 'NVIDIA', tier: 'high-end' },
      { model: 'RTX 4070 Ti Super', searchTerms: ['RTX 4070 Ti Super', 'GeForce RTX 4070 Ti Super'], manufacturer: 'NVIDIA', tier: 'high-end' },
      { model: 'RTX 4070 Ti', searchTerms: ['RTX 4070 Ti', 'GeForce RTX 4070 Ti'], manufacturer: 'NVIDIA', tier: 'upper-mid' },
      { model: 'RTX 4070 Super', searchTerms: ['RTX 4070 Super', 'GeForce RTX 4070 Super'], manufacturer: 'NVIDIA', tier: 'upper-mid' },
      { model: 'RTX 4070', searchTerms: ['RTX 4070', 'GeForce RTX 4070'], manufacturer: 'NVIDIA', tier: 'upper-mid' },
      { model: 'RTX 4060 Ti', searchTerms: ['RTX 4060 Ti', 'GeForce RTX 4060 Ti'], manufacturer: 'NVIDIA', tier: 'mid-range' },
      { model: 'RTX 4060', searchTerms: ['RTX 4060', 'GeForce RTX 4060'], manufacturer: 'NVIDIA', tier: 'mid-range' },
      { model: 'RTX 4050', searchTerms: ['RTX 4050', 'GeForce RTX 4050'], manufacturer: 'NVIDIA', tier: 'entry' },

      // NVIDIA RTX 30 Series
      { model: 'RTX 3090 Ti', searchTerms: ['RTX 3090 Ti', 'GeForce RTX 3090 Ti'], manufacturer: 'NVIDIA', tier: 'flagship' },
      { model: 'RTX 3090', searchTerms: ['RTX 3090', 'GeForce RTX 3090'], manufacturer: 'NVIDIA', tier: 'flagship' },
      { model: 'RTX 3080 Ti', searchTerms: ['RTX 3080 Ti', 'GeForce RTX 3080 Ti'], manufacturer: 'NVIDIA', tier: 'high-end' },
      { model: 'RTX 3080', searchTerms: ['RTX 3080', 'GeForce RTX 3080'], manufacturer: 'NVIDIA', tier: 'high-end' },
      { model: 'RTX 3070 Ti', searchTerms: ['RTX 3070 Ti', 'GeForce RTX 3070 Ti'], manufacturer: 'NVIDIA', tier: 'upper-mid' },
      { model: 'RTX 3070', searchTerms: ['RTX 3070', 'GeForce RTX 3070'], manufacturer: 'NVIDIA', tier: 'upper-mid' },
      { model: 'RTX 3060 Ti', searchTerms: ['RTX 3060 Ti', 'GeForce RTX 3060 Ti'], manufacturer: 'NVIDIA', tier: 'mid-range' },
      { model: 'RTX 3060', searchTerms: ['RTX 3060', 'GeForce RTX 3060'], manufacturer: 'NVIDIA', tier: 'mid-range' },
      { model: 'RTX 3050', searchTerms: ['RTX 3050', 'GeForce RTX 3050'], manufacturer: 'NVIDIA', tier: 'entry' },

      // AMD RX 7000 Series (RDNA 3)
      { model: 'RX 7900 XTX', searchTerms: ['RX 7900 XTX', 'Radeon RX 7900 XTX'], manufacturer: 'AMD', tier: 'flagship' },
      { model: 'RX 7900 XT', searchTerms: ['RX 7900 XT', 'Radeon RX 7900 XT'], manufacturer: 'AMD', tier: 'high-end' },
      { model: 'RX 7900 GRE', searchTerms: ['RX 7900 GRE', 'Radeon RX 7900 GRE'], manufacturer: 'AMD', tier: 'high-end' },
      { model: 'RX 7800 XT', searchTerms: ['RX 7800 XT', 'Radeon RX 7800 XT'], manufacturer: 'AMD', tier: 'upper-mid' },
      { model: 'RX 7700 XT', searchTerms: ['RX 7700 XT', 'Radeon RX 7700 XT'], manufacturer: 'AMD', tier: 'upper-mid' },
      { model: 'RX 7600 XT', searchTerms: ['RX 7600 XT', 'Radeon RX 7600 XT'], manufacturer: 'AMD', tier: 'mid-range' },
      { model: 'RX 7600', searchTerms: ['RX 7600', 'Radeon RX 7600'], manufacturer: 'AMD', tier: 'mid-range' },

      // AMD RX 6000 Series (RDNA 2)
      { model: 'RX 6950 XT', searchTerms: ['RX 6950 XT', 'Radeon RX 6950 XT'], manufacturer: 'AMD', tier: 'high-end' },
      { model: 'RX 6900 XT', searchTerms: ['RX 6900 XT', 'Radeon RX 6900 XT'], manufacturer: 'AMD', tier: 'high-end' },
      { model: 'RX 6800 XT', searchTerms: ['RX 6800 XT', 'Radeon RX 6800 XT'], manufacturer: 'AMD', tier: 'high-end' },
      { model: 'RX 6800', searchTerms: ['RX 6800', 'Radeon RX 6800'], manufacturer: 'AMD', tier: 'upper-mid' },
      { model: 'RX 6750 XT', searchTerms: ['RX 6750 XT', 'Radeon RX 6750 XT'], manufacturer: 'AMD', tier: 'upper-mid' },
      { model: 'RX 6700 XT', searchTerms: ['RX 6700 XT', 'Radeon RX 6700 XT'], manufacturer: 'AMD', tier: 'upper-mid' },
      { model: 'RX 6650 XT', searchTerms: ['RX 6650 XT', 'Radeon RX 6650 XT'], manufacturer: 'AMD', tier: 'mid-range' },
      { model: 'RX 6600 XT', searchTerms: ['RX 6600 XT', 'Radeon RX 6600 XT'], manufacturer: 'AMD', tier: 'mid-range' },
      { model: 'RX 6600', searchTerms: ['RX 6600', 'Radeon RX 6600'], manufacturer: 'AMD', tier: 'mid-range' },
      { model: 'RX 6500 XT', searchTerms: ['RX 6500 XT', 'Radeon RX 6500 XT'], manufacturer: 'AMD', tier: 'entry' },
      { model: 'RX 6400', searchTerms: ['RX 6400', 'Radeon RX 6400'], manufacturer: 'AMD', tier: 'entry' },

      // Intel Arc (Alchemist)
      { model: 'Arc A770', searchTerms: ['Arc A770', 'Intel Arc A770'], manufacturer: 'Intel', tier: 'upper-mid' },
      { model: 'Arc A750', searchTerms: ['Arc A750', 'Intel Arc A750'], manufacturer: 'Intel', tier: 'mid-range' },
      { model: 'Arc A580', searchTerms: ['Arc A580', 'Intel Arc A580'], manufacturer: 'Intel', tier: 'mid-range' },
      { model: 'Arc A380', searchTerms: ['Arc A380', 'Intel Arc A380'], manufacturer: 'Intel', tier: 'entry' }
    ];
  }

  // Generate Amazon search URL for a GPU model
  generateSearchUrl(model) {
    const searchQuery = model.searchTerms[0].toLowerCase().replace(/\s+/g, '+');
    return `https://www.amazon.com/s?k=${searchQuery}&ref=nb_sb_noss`;
  }

  // Import GPUs for a specific model
  async importModelGpus(modelInfo) {
    const { model, searchTerms, manufacturer, tier } = modelInfo;
    
    Logger.info(`\n🔍 Starting import for ${manufacturer} ${model} (${tier})`);
    Logger.info(`   Search terms: ${searchTerms.join(', ')}`);

    try {
      const searchUrl = this.generateSearchUrl(modelInfo);
      Logger.info(`   Search URL: ${searchUrl}`);

      const page = await this.browser.newPage();
      
      // Set up page with realistic headers
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
      await page.setViewport({ width: 1920, height: 1080 });

      Logger.info(`   🌐 Navigating to search results...`);
      await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 30000 });

      Logger.info(`   📦 Extracting products...`);
      
      // Set the browser for the scraper if it supports it
      if (this.scraper.setBrowser) {
        this.scraper.setBrowser(this.browser);
      }
      
      const products = await this.scraper.extractProducts(page, model);

      Logger.info(`   ✅ Found ${products.length} ${model} products`);

      // Store in database with model info
      if (products.length > 0) {
        const enhancedProducts = products.map(product => {
          // Extract memory information from product title with fallback support
          const memoryInfo = this.extractMemoryFromTitle(product.name || product.title || '', model);
          
          const enhanced = {
            ...product,
            gpuModel: model,
            manufacturer,
            tier,
            searchTerms,
            lastUpdated: new Date(),
            source: 'amazon'
          };
          
          // Add memory object if extracted or using fallback
          if (memoryInfo.size) {
            enhanced.memory = memoryInfo;
            // Log VRAM information for each card with fallback indicator
            const fallbackUsed = !product.name?.match(/\d+\s*GB/i) && this.getStandardVRAM(model);
            Logger.info(`🧠 VRAM: ${model} - ${memoryInfo.size}GB ${memoryInfo.type}${fallbackUsed ? ' (fallback)' : ''}`);
          }
          
          return enhanced;
        });

        // Use model-specific collection (e.g., gpus_rtx_4070, gpus_rx_7900_xtx)
        const collectionName = `gpus_${model.toLowerCase().replace(/\s+/g, '_')}`;
        const collection = this.db.collection(collectionName);

        // Clear existing data for this model and insert new data
        await collection.deleteMany({});
        const result = await collection.insertMany(enhancedProducts);

        Logger.success(`   💾 Saved ${result.insertedCount} products to ${collectionName}`);

        this.results.models[model] = {
          products: result.insertedCount,
          status: 'success',
          collection: collectionName
        };
      } else {
        Logger.warn(`   ⚠️ No products found for ${model}`);
        this.results.models[model] = {
          products: 0,
          status: 'no_products',
          collection: null
        };
      }

      await page.close();

      // Rate limiting - wait between models
      const delay = 5 + Math.random() * 5; // 5-10 seconds
      Logger.info(`   ⏳ Waiting ${delay.toFixed(1)}s before next model...`);
      await new Promise(resolve => setTimeout(resolve, delay * 1000));

      this.results.successful++;

    } catch (error) {
      Logger.error(`   ❌ Failed to import ${model}: ${error.message}`);
      this.results.models[model] = {
        products: 0,
        status: 'error',
        error: error.message
      };
      this.results.failed++;
    }

    this.results.total++;
  }

  // Main import function
  async importAllGpus(options = {}) {
    const {
      manufacturers = ['NVIDIA', 'AMD', 'Intel'], // Which manufacturers to include
      tiers = ['flagship', 'high-end', 'upper-mid', 'mid-range', 'entry'], // Which tiers to include
      maxModels = null, // Limit number of models (for testing)
      startFrom = null // Start from specific model (for resuming)
    } = options;

    Logger.info('🚀 Starting comprehensive GPU import process...\n');

    const allModels = this.getGpuModels();
    
    // Filter models based on options
    let modelsToImport = allModels.filter(model => 
      manufacturers.includes(model.manufacturer) && 
      tiers.includes(model.tier)
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

    Logger.info(`📋 Will import ${modelsToImport.length} GPU models:`);
    modelsToImport.forEach((model, i) => {
      Logger.info(`   ${(i + 1).toString().padStart(2, '0')}. ${model.manufacturer} ${model.model} (${model.tier})`);
    });

    Logger.info('\n⏰ Starting import process...\n');

    // Import each model
    for (const modelInfo of modelsToImport) {
      await this.importModelGpus(modelInfo);
    }

    // Print final summary
    this.printSummary();
  }

  // Print import summary
  printSummary() {
    Logger.info('\n' + '='.repeat(80));
    Logger.info('📊 GPU IMPORT SUMMARY');
    Logger.info('='.repeat(80));

    Logger.info(`📈 Overall Stats:`);
    Logger.info(`   Total Models: ${this.results.total}`);
    Logger.info(`   Successful: ${this.results.successful}`);
    Logger.info(`   Failed: ${this.results.failed}`);

    const totalProducts = Object.values(this.results.models)
      .reduce((sum, model) => sum + (model.products || 0), 0);
    Logger.info(`   Total Products: ${totalProducts}`);

    Logger.info(`\n📦 Model Details:`);
    Object.entries(this.results.models).forEach(([model, info]) => {
      const status = info.status === 'success' ? '✅' : 
                    info.status === 'no_products' ? '⚠️' : '❌';
      Logger.info(`   ${status} ${model.padEnd(20)} - ${info.products} products${info.collection ? ` → ${info.collection}` : ''}`);
      if (info.error) {
        Logger.info(`      Error: ${info.error}`);
      }
    });

    Logger.info('\n🎉 GPU import process completed!');
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  
  // Parse command line arguments
  const options = {
    manufacturers: ['NVIDIA', 'AMD', 'Intel'],
    tiers: ['flagship', 'high-end', 'upper-mid', 'mid-range', 'entry'],
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
    } else if (arg === '--high-end-only') {
      options.tiers = ['flagship', 'high-end'];
    } else if (arg === '--mid-range-only') {
      options.tiers = ['mid-range', 'upper-mid'];
    } else if (arg === '--limit' && i + 1 < args.length) {
      options.maxModels = parseInt(args[i + 1]);
      i++;
    } else if (arg === '--start-from' && i + 1 < args.length) {
      options.startFrom = args[i + 1];
      i++;
    } else if (arg === '--help') {
      console.log(`
GPU Import Script Usage:
========================

node allGpuImporter.js [options]

Options:
  --nvidia-only      Import only NVIDIA GPUs
  --amd-only         Import only AMD GPUs  
  --intel-only       Import only Intel GPUs
  --high-end-only    Import only flagship and high-end GPUs
  --mid-range-only   Import only mid-range and upper-mid GPUs
  --limit N          Import only first N models
  --start-from MODEL Resume from specific model (e.g., "RTX 4070")
  --help             Show this help message

Examples:
  node allGpuImporter.js                    # Import all GPUs
  node allGpuImporter.js --nvidia-only      # Import only NVIDIA GPUs
  node allGpuImporter.js --limit 5          # Import first 5 models
  node allGpuImporter.js --start-from "RTX 4070"  # Resume from RTX 4070
      `);
      process.exit(0);
    }
  }

  const importer = new AllGpuImporter();
  
  try {
    await importer.initialize();
    await importer.importAllGpus(options);
  } catch (error) {
    Logger.error(`💥 Import process failed: ${error.message}`);
    process.exit(1);
  } finally {
    await importer.cleanup();
  }
}

// VRAM fallback lookup table for standard GPU models
AllGpuImporter.prototype.getStandardVRAM = function(gpuModel) {
  const vramTable = {
    // RTX 50 Series
    'RTX 5090': { size: 32, type: 'GDDR7' },
    'RTX 5080': { size: 16, type: 'GDDR7' },
    'RTX 5070 Ti': { size: 16, type: 'GDDR7' },
    'RTX 5070': { size: 12, type: 'GDDR7' },
    'RTX 5060 Ti': { size: 16, type: 'GDDR7' },
    'RTX 5060': { size: 8, type: 'GDDR7' },
    
    // RTX 40 Series
    'RTX 4090': { size: 24, type: 'GDDR6X' },
    'RTX 4080 Super': { size: 16, type: 'GDDR6X' },
    'RTX 4080': { size: 16, type: 'GDDR6X' },
    'RTX 4070 Ti Super': { size: 16, type: 'GDDR6X' },
    'RTX 4070 Ti': { size: 12, type: 'GDDR6X' },
    'RTX 4070 Super': { size: 12, type: 'GDDR6X' },
    'RTX 4070': { size: 12, type: 'GDDR6X' },
    'RTX 4060 Ti': { size: 16, type: 'GDDR6X' },
    'RTX 4060': { size: 8, type: 'GDDR6X' },
    'RTX 4050': { size: 6, type: 'GDDR6' },
    
    // RTX 30 Series
    'RTX 3090 Ti': { size: 24, type: 'GDDR6X' },
    'RTX 3090': { size: 24, type: 'GDDR6X' },
    'RTX 3080 Ti': { size: 12, type: 'GDDR6X' },
    'RTX 3080': { size: 10, type: 'GDDR6X' },
    'RTX 3070 Ti': { size: 8, type: 'GDDR6X' },
    'RTX 3070': { size: 8, type: 'GDDR6' },
    'RTX 3060 Ti': { size: 8, type: 'GDDR6' },
    'RTX 3060': { size: 12, type: 'GDDR6' },
    'RTX 3050': { size: 8, type: 'GDDR6' },
    
    // AMD RX 7000 Series (RDNA 3)
    'RX 7900 XTX': { size: 24, type: 'GDDR6' },
    'RX 7900 XT': { size: 20, type: 'GDDR6' },
    'RX 7900 GRE': { size: 16, type: 'GDDR6' },
    'RX 7800 XT': { size: 16, type: 'GDDR6' },
    'RX 7700 XT': { size: 12, type: 'GDDR6' },
    'RX 7600 XT': { size: 16, type: 'GDDR6' },
    'RX 7600': { size: 8, type: 'GDDR6' },
    
    // AMD RX 6000 Series (RDNA 2)
    'RX 6950 XT': { size: 16, type: 'GDDR6' },
    'RX 6900 XT': { size: 16, type: 'GDDR6' },
    'RX 6800 XT': { size: 16, type: 'GDDR6' },
    'RX 6800': { size: 16, type: 'GDDR6' },
    'RX 6750 XT': { size: 12, type: 'GDDR6' },
    'RX 6700 XT': { size: 12, type: 'GDDR6' },
    'RX 6650 XT': { size: 8, type: 'GDDR6' },
    'RX 6600 XT': { size: 8, type: 'GDDR6' },
    'RX 6600': { size: 8, type: 'GDDR6' },
    'RX 6500 XT': { size: 4, type: 'GDDR6' },
    'RX 6400': { size: 4, type: 'GDDR6' },
    
    // Intel Arc (Alchemist)
    'Arc A770': { size: 16, type: 'GDDR6' },
    'Arc A750': { size: 8, type: 'GDDR6' },
    'Arc A580': { size: 8, type: 'GDDR6' },
    'Arc A380': { size: 6, type: 'GDDR6' }
  };
  
  return vramTable[gpuModel] || null;
};

// Add memory extraction method with fallback support
AllGpuImporter.prototype.extractMemoryFromTitle = function(title, gpuModel) {
  if (!title) return { size: null, type: null };
  
  // First try to extract from title
  const sizeMatch = title.match(/(\d+)\s*GB/i);
  const typeMatch = title.match(/GDDR\d+[A-Z]*/i);
  
  const extracted = {
    size: sizeMatch ? parseInt(sizeMatch[1]) : null,
    type: typeMatch ? typeMatch[0] : null
  };
  
  // If extraction failed or is incomplete, use fallback
  if (!extracted.size || !extracted.type) {
    const fallback = this.getStandardVRAM(gpuModel);
    if (fallback) {
      return {
        size: extracted.size || fallback.size,
        type: extracted.type || fallback.type
      };
    }
  }
  
  return extracted;
};

// Handle graceful shutdown
process.on('SIGINT', async () => {
  Logger.info('\n⏹️  Import process interrupted by user');
  process.exit(0);
});

if (require.main === module) {
  main();
}

module.exports = AllGpuImporter;