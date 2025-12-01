const { connectToDatabase, getDatabase } = require('../config/database');
const puppeteer = require('puppeteer');

const config = require('./config/scrapeConfig');
const Logger = require('./utils/logger');
const DataEnrichmentService = require('./services/dataEnrichmentService');
const DatabaseService = require('./services/databaseService');

const AmazonScraper = require('./scrapers/amazonScraper');
const NeweggScraper = require('./scrapers/neweggScraper');
const BestBuyScraper = require('./scrapers/bestbuyScraper');

class CPUDataPopulator {
  constructor() {
    this.db = null;
    this.browser = null;
    this.databaseService = null;
    this.initializeScrapers();
  }

  initializeScrapers() {
    this.scrapers = {
      amazon: new AmazonScraper('amazon', config.sites.amazon.selectors),
      newegg: new NeweggScraper('newegg', config.sites.newegg.selectors),
      bestbuy: new BestBuyScraper('bestbuy', config.sites.bestbuy.selectors)
    };
  }

  async connect() {
    await connectToDatabase();
    this.db = getDatabase();
    this.databaseService = new DatabaseService(this.db);
    Logger.success('Connected to database');
  }

  async initBrowser() {
    this.browser = await puppeteer.launch(config.browser);
    
    // Provide browser instance to scrapers that need it
    if (this.scrapers.amazon.setBrowser) {
      this.scrapers.amazon.setBrowser(this.browser);
    }
    
    Logger.info('Browser initialized');
  }

  // Extract CPU model for collection naming
  extractCPUModel(searchTerm) {
    const term = searchTerm.toLowerCase();

    // Intel Core Ultra patterns (newest)
    if (term.includes('core ultra 9')) return 'intel_core_ultra_9';
    if (term.includes('core ultra 7')) return 'intel_core_ultra_7';
    if (term.includes('core ultra 5')) return 'intel_core_ultra_5';

    // Intel patterns
    if (term.includes('core i9')) return 'intel_core_i9';
    if (term.includes('core i7')) return 'intel_core_i7';
    if (term.includes('core i5')) return 'intel_core_i5';
    if (term.includes('core i3')) return 'intel_core_i3';
    if (term.includes('xeon')) return 'intel_xeon';

    // AMD patterns
    if (term.includes('ryzen 9')) return 'amd_ryzen_9';
    if (term.includes('ryzen 7')) return 'amd_ryzen_7';
    if (term.includes('ryzen 5')) return 'amd_ryzen_5';
    if (term.includes('ryzen 3')) return 'amd_ryzen_3';
    if (term.includes('threadripper')) return 'amd_threadripper';
    if (term.includes('epyc')) return 'amd_epyc';

    // Generic fallback
    if (term.includes('intel')) return 'intel_cpu';
    if (term.includes('amd')) return 'amd_cpu';

    return 'cpu_other';
  }

  // Main CPU population function
  async populateCPUData(searchUrl, cpuModel) {
    try {
      Logger.info(`🔍 Starting CPU data population for: ${cpuModel}`);
      Logger.info(`   Search URL: ${searchUrl}`);

      const url = new URL(searchUrl);
      const hostname = url.hostname.toLowerCase();
      
      let scraper;
      let siteType;
      
      if (hostname.includes('amazon')) {
        scraper = this.scrapers.amazon;
        siteType = 'amazon';
      } else if (hostname.includes('newegg')) {
        scraper = this.scrapers.newegg;
        siteType = 'newegg';
      } else if (hostname.includes('bestbuy')) {
        scraper = this.scrapers.bestbuy;
        siteType = 'bestbuy';
      } else {
        throw new Error(`Unsupported site: ${hostname}`);
      }

      Logger.info(`ℹ️  Detected site type: ${siteType}`);
      Logger.info(`ℹ️  Using ${siteType} scraping strategy...`);

      const page = await this.browser.newPage();
      
      try {
        Logger.info(`ℹ️  Navigating to: ${searchUrl}`);
        await page.goto(searchUrl, { 
          waitUntil: 'networkidle2', 
          timeout: 60000 
        });
        
        Logger.success('✅ Page loaded successfully');

        await scraper.waitForContent(page);
        const cpus = await scraper.extractProducts(page, cpuModel, 'cpu');

        if (cpus.length > 0) {
          // Enrich CPU data with additional information
          const enrichedCPUs = this.enrichCPUData(cpus, cpuModel);
          
          // Create collection name based on CPU model
          const collectionName = `cpus_${this.extractCPUModel(cpuModel)}`;
          Logger.info(`💾 Saving to collection: ${collectionName}`);

          // Save to database
          const result = await this.databaseService.saveCPUs(enrichedCPUs, collectionName);
          
          Logger.success(`✅ Successfully saved ${result.insertedCount} CPUs to ${collectionName}`);
          Logger.info(`   CPUs found: ${cpus.length}`);
          
          // Log summary of found CPUs
          this.logCPUSummary(enrichedCPUs);
          
          return {
            success: true,
            count: result.insertedCount,
            collection: collectionName,
            cpus: enrichedCPUs
          };
          
        } else {
          Logger.warn(`⚠️  No CPUs found for ${cpuModel}`);
          return {
            success: false,
            count: 0,
            message: 'No CPUs found'
          };
        }

      } finally {
        await page.close();
      }

    } catch (error) {
      Logger.error(`❌ CPU data population failed: ${error.message}`);
      throw error;
    }
  }

  // Enrich CPU data with additional specifications
  enrichCPUData(cpus, cpuModel) {
    return cpus.map(cpu => {
      const enrichedCPU = { ...cpu };
      
      // Add CPU-specific fields
      enrichedCPU.category = 'cpu';
      enrichedCPU.chipsetGroup = cpuModel;
      enrichedCPU.createdAt = new Date();
      enrichedCPU.updatedAt = new Date();
      
      // Extract CPU specifications from title
      const specs = this.extractCPUSpecs(cpu.title || cpu.name || '');
      enrichedCPU.specifications = specs;
      
      // Determine manufacturer
      if (!enrichedCPU.manufacturer) {
        enrichedCPU.manufacturer = this.detectManufacturer(cpu.title || cpu.name || '');
      }
      
      // Extract socket type
      enrichedCPU.socket = this.extractSocket(cpu.title || cpu.name || '');
      
      // Extract generation
      enrichedCPU.generation = this.extractGeneration(cpu.title || cpu.name || '', enrichedCPU.manufacturer);
      
      // Add performance tier
      enrichedCPU.performanceTier = this.determinePerformanceTier(cpu.title || cpu.name || '');
      
      return enrichedCPU;
    });
  }

  // Extract CPU specifications from title
  extractCPUSpecs(title) {
    const specs = {};
    const titleLower = title.toLowerCase();
    
    // Extract core count
    const coreMatch = title.match(/(\d+)[\s-]core/i);
    if (coreMatch) {
      specs.cores = parseInt(coreMatch[1]);
    }
    
    // Extract thread count  
    const threadMatch = title.match(/(\d+)[\s-]thread/i);
    if (threadMatch) {
      specs.threads = parseInt(threadMatch[1]);
    }
    
    // Extract base clock
    const clockMatch = title.match(/([\d.]+)\s*ghz/i);
    if (clockMatch) {
      specs.baseClock = parseFloat(clockMatch[1]);
    }
    
    // Extract boost clock
    const boostMatch = title.match(/boost.*?([\d.]+)\s*ghz/i) || 
                      title.match(/up to ([\d.]+)\s*ghz/i) ||
                      title.match(/max ([\d.]+)\s*ghz/i);
    if (boostMatch) {
      specs.boostClock = parseFloat(boostMatch[1]);
    }
    
    // Extract cache
    const cacheMatch = title.match(/(\d+)\s*mb.*cache/i);
    if (cacheMatch) {
      specs.cache = `${cacheMatch[1]}MB`;
    }
    
    // Extract TDP
    const tdpMatch = title.match(/(\d+)w\s*tdp/i) || title.match(/(\d+)\s*watt/i);
    if (tdpMatch) {
      specs.tdp = parseInt(tdpMatch[1]);
    }
    
    return specs;
  }

  // Detect manufacturer from title
  detectManufacturer(title) {
    const titleLower = title.toLowerCase();

    if (titleLower.includes('intel') || titleLower.includes('core i') || titleLower.includes('core ultra') || titleLower.includes('xeon')) {
      return 'Intel';
    }
    if (titleLower.includes('amd') || titleLower.includes('ryzen') || titleLower.includes('threadripper')) {
      return 'AMD';
    }

    return 'Unknown';
  }

  // Extract socket type
  extractSocket(title) {
    const sockets = {
      // Intel sockets
      'lga1851': /lga\s*1851/i,
      'lga1700': /lga\s*1700/i,
      'lga1200': /lga\s*1200/i,
      'lga2066': /lga\s*2066/i,
      'lga3647': /lga\s*3647/i,

      // AMD sockets
      'am5': /am5/i,
      'am4': /am4/i,
      'tr4': /tr4/i,
      'strx4': /strx4/i,
      'sp3': /sp3/i
    };

    for (const [socket, pattern] of Object.entries(sockets)) {
      if (pattern.test(title)) {
        return socket.toUpperCase();
      }
    }

    return 'Unknown';
  }

  // Extract CPU generation
  extractGeneration(title, manufacturer) {
    const titleLower = title.toLowerCase();

    if (manufacturer === 'Intel') {
      // Intel Core Ultra generations (Arrow Lake)
      if (titleLower.includes('core ultra') || titleLower.match(/ultra\s*[579]\s*\d{3}/i)) return 'Core Ultra (Arrow Lake)';

      // Intel generations
      if (titleLower.includes('13th gen') || titleLower.match(/i[3579]-13\d{3}/)) return '13th Gen';
      if (titleLower.includes('12th gen') || titleLower.match(/i[3579]-12\d{3}/)) return '12th Gen';
      if (titleLower.includes('11th gen') || titleLower.match(/i[3579]-11\d{3}/)) return '11th Gen';
      if (titleLower.includes('10th gen') || titleLower.match(/i[3579]-10\d{3}/)) return '10th Gen';
    }

    if (manufacturer === 'AMD') {
      // AMD generations
      if (titleLower.includes('7000 series') || titleLower.match(/[357]9\d{2}x/)) return '7000 Series';
      if (titleLower.includes('5000 series') || titleLower.match(/[357]9\d{2}[^x]/)) return '5000 Series';
      if (titleLower.includes('3000 series') || titleLower.match(/[357]9\d{2}[^x]/)) return '3000 Series';
    }

    return 'Unknown';
  }

  // Determine performance tier
  determinePerformanceTier(title) {
    const titleLower = title.toLowerCase();

    // High-end/Enthusiast
    if (titleLower.includes('ultra 9') || titleLower.includes('i9') || titleLower.includes('ryzen 9') ||
        titleLower.includes('threadripper') || titleLower.includes('xeon')) {
      return 'High-End';
    }

    // Mid-high range
    if (titleLower.includes('ultra 7') || titleLower.includes('i7') || titleLower.includes('ryzen 7')) {
      return 'Performance';
    }

    // Mid-range
    if (titleLower.includes('ultra 5') || titleLower.includes('i5') || titleLower.includes('ryzen 5')) {
      return 'Mainstream';
    }

    // Entry-level
    if (titleLower.includes('i3') || titleLower.includes('ryzen 3')) {
      return 'Entry-Level';
    }

    return 'Unknown';
  }

  // Log summary of found CPUs
  logCPUSummary(cpus) {
    Logger.info('\n📊 CPU SUMMARY:');
    Logger.info('=' .repeat(60));
    
    const manufacturers = {};
    const sockets = {};
    const tiers = {};
    
    cpus.forEach(cpu => {
      // Count by manufacturer
      const mfg = cpu.manufacturer || 'Unknown';
      manufacturers[mfg] = (manufacturers[mfg] || 0) + 1;
      
      // Count by socket
      const socket = cpu.socket || 'Unknown';
      sockets[socket] = (sockets[socket] || 0) + 1;
      
      // Count by tier
      const tier = cpu.performanceTier || 'Unknown';
      tiers[tier] = (tiers[tier] || 0) + 1;
      
      // Log individual CPU
      const specs = cpu.specifications || {};
      const coreInfo = specs.cores ? `${specs.cores}C` : '';
      const threadInfo = specs.threads ? `/${specs.threads}T` : '';
      const clockInfo = specs.baseClock ? `@${specs.baseClock}GHz` : '';
      const priceInfo = cpu.price ? `$${cpu.price}` : 'No price';
      
      Logger.info(`💻 ${cpu.manufacturer} ${cpu.performanceTier}: ${coreInfo}${threadInfo} ${clockInfo} - ${priceInfo}`);
    });
    
    Logger.info('\n📈 By Manufacturer:');
    Object.entries(manufacturers).forEach(([mfg, count]) => {
      Logger.info(`   ${mfg}: ${count} CPUs`);
    });
    
    Logger.info('\n🔌 By Socket:');
    Object.entries(sockets).forEach(([socket, count]) => {
      Logger.info(`   ${socket}: ${count} CPUs`);
    });
    
    Logger.info('\n⚡ By Performance Tier:');
    Object.entries(tiers).forEach(([tier, count]) => {
      Logger.info(`   ${tier}: ${count} CPUs`);
    });
    
    Logger.info('=' .repeat(60));
  }

  // Cleanup resources
  async close() {
    if (this.browser) {
      await this.browser.close();
      Logger.info('🚪 Browser closed');
    }
  }
}

module.exports = { CPUDataPopulator };