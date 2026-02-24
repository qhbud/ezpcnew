const { connectToDatabase, getDatabase } = require('../config/database');
const puppeteer = require('puppeteer');

const config = require('./config/scrapeConfig');
const Logger = require('./utils/logger');
const DataEnrichmentService = require('./services/dataEnrichmentService');
const DatabaseService = require('./services/databaseService');

const AmazonScraper = require('./scrapers/amazonScraperSimple');
const NeweggScraper = require('./scrapers/neweggScraper');
const BestBuyScraper = require('./scrapers/bestbuyScraper');

class MotherboardDataPopulator {
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

  // Extract motherboard chipset and socket for collection naming
  extractMotherboardModel(searchTerm) {
    const term = searchTerm.toLowerCase();
    
    // Intel chipsets
    if (term.includes('z790')) return 'intel_z790';
    if (term.includes('z690')) return 'intel_z690';
    if (term.includes('b760')) return 'intel_b760';
    if (term.includes('b660')) return 'intel_b660';
    if (term.includes('h770')) return 'intel_h770';
    if (term.includes('h670')) return 'intel_h670';
    if (term.includes('h610')) return 'intel_h610';
    
    // AMD chipsets
    if (term.includes('x670e')) return 'amd_x670e';
    if (term.includes('x670')) return 'amd_x670';
    if (term.includes('b650e')) return 'amd_b650e';
    if (term.includes('b650')) return 'amd_b650';
    if (term.includes('x570')) return 'amd_x570';
    if (term.includes('b550')) return 'amd_b550';
    if (term.includes('a520')) return 'amd_a520';
    
    // Socket-based fallback
    if (term.includes('lga1700') || term.includes('lga 1700')) return 'intel_lga1700';
    if (term.includes('lga1200') || term.includes('lga 1200')) return 'intel_lga1200';
    if (term.includes('am5')) return 'amd_am5';
    if (term.includes('am4')) return 'amd_am4';
    
    // Generic fallback
    if (term.includes('intel')) return 'intel_motherboard';
    if (term.includes('amd')) return 'amd_motherboard';
    
    return 'motherboard_other';
  }

  // Main motherboard population function with duplicate detection
  async populateMotherboardData(searchUrl, motherboardModel) {
    try {
      Logger.info(`🔍 Starting motherboard data population for: ${motherboardModel}`);
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
        const motherboards = await scraper.extractProducts(page, motherboardModel, 'motherboard');

        if (motherboards.length > 0) {
          Logger.info(`📦 Found ${motherboards.length} motherboards on page`);
          
          // Enrich ALL motherboard data regardless of query match
          const enrichedMotherboards = this.enrichMotherboardData(motherboards, motherboardModel);
          
          // Use unified collection name for all motherboards
          const collectionName = 'motherboards';
          Logger.info(`💾 Saving to unified collection: ${collectionName}`);

          // Save to database with duplicate detection
          const result = await this.databaseService.saveMotherboardsWithDuplicateDetection(enrichedMotherboards, collectionName);
          
          Logger.success(`✅ Successfully processed ${motherboards.length} motherboards`);
          Logger.info(`   New motherboards saved: ${result.newCount}`);
          Logger.info(`   Duplicates skipped: ${result.duplicateCount}`);
          Logger.info(`   Updated motherboards: ${result.updatedCount || 0}`);
          
          // Log summary of found motherboards
          this.logMotherboardSummary(enrichedMotherboards);
          
          return {
            success: true,
            count: result.newCount,
            duplicates: result.duplicateCount,
            updated: result.updatedCount || 0,
            total: motherboards.length,
            collection: collectionName,
            motherboards: enrichedMotherboards
          };
          
        } else {
          Logger.warn(`⚠️  No motherboards found for ${motherboardModel}`);
          return {
            success: false,
            count: 0,
            message: 'No motherboards found'
          };
        }

      } finally {
        await page.close();
      }

    } catch (error) {
      Logger.error(`❌ Motherboard data population failed: ${error.message}`);
      throw error;
    }
  }

  // Enrich motherboard data with additional specifications
  enrichMotherboardData(motherboards, motherboardModel) {
    return motherboards.map(motherboard => {
      const enrichedMotherboard = { ...motherboard };
      
      // Add motherboard-specific fields
      enrichedMotherboard.category = 'motherboard';
      enrichedMotherboard.chipsetGroup = motherboardModel;
      enrichedMotherboard.createdAt = new Date();
      enrichedMotherboard.updatedAt = new Date();
      
      // Extract motherboard specifications from title
      const specs = this.extractMotherboardSpecs(motherboard.title || motherboard.name || '');
      enrichedMotherboard.specifications = specs;
      
      // Determine manufacturer
      if (!enrichedMotherboard.manufacturer) {
        enrichedMotherboard.manufacturer = this.detectManufacturer(motherboard.title || motherboard.name || '');
      }
      
      // Extract socket type
      enrichedMotherboard.socket = this.extractSocket(motherboard.title || motherboard.name || '');
      
      // Extract chipset
      enrichedMotherboard.chipset = this.extractChipset(motherboard.title || motherboard.name || '');
      
      // Extract form factor
      enrichedMotherboard.formFactor = this.extractFormFactor(motherboard.title || motherboard.name || '');
      
      // Add performance tier
      enrichedMotherboard.performanceTier = this.determinePerformanceTier(motherboard.title || motherboard.name || '');
      
      // Handle pricing with sale support (same logic as PSU and RAM populators)
      if (motherboard.isOnSale && motherboard.basePrice && motherboard.salePrice) {
        // Item is on sale - save both base and sale prices
        enrichedMotherboard.basePrice = parseFloat(motherboard.basePrice);
        enrichedMotherboard.salePrice = parseFloat(motherboard.salePrice);
        enrichedMotherboard.currentPrice = parseFloat(motherboard.salePrice);
        enrichedMotherboard.isOnSale = true;
        enrichedMotherboard.price = parseFloat(motherboard.salePrice); // For backward compatibility
      } else {
        // Regular pricing - save as base price
        const price = motherboard.price || motherboard.currentPrice || motherboard.basePrice;
        if (price) {
          enrichedMotherboard.basePrice = parseFloat(price);
          enrichedMotherboard.currentPrice = parseFloat(price);
          enrichedMotherboard.price = parseFloat(price); // For backward compatibility
          enrichedMotherboard.isOnSale = false;
        }
      }
      
      return enrichedMotherboard;
    });
  }

  // Extract motherboard specifications from title
  extractMotherboardSpecs(title) {
    const specs = {};
    const titleLower = title.toLowerCase();
    
    // Extract CPU chipset compatibility (what CPUs this motherboard supports)
    specs.supportedCpuChipsets = this.extractSupportedCpuChipsets(title);
    
    // Extract RAM/Memory specifications
    const ramSpecs = this.extractRamSpecs(title);
    Object.assign(specs, ramSpecs);
    
    // Extract WiFi support
    if (titleLower.includes('wifi') || titleLower.includes('wi-fi')) {
      specs.wifi = true;
      
      // Extract WiFi version
      const wifiMatch = title.match(/wi-?fi\s*([6e7])/i);
      if (wifiMatch) {
        specs.wifiVersion = `WiFi ${wifiMatch[1]}`;
      }
    } else {
      specs.wifi = false;
    }
    
    // Extract Bluetooth support
    specs.bluetooth = titleLower.includes('bluetooth') || titleLower.includes('bt');
    
    // Extract PCIe support
    if (titleLower.includes('pcie 5.0') || titleLower.includes('pci-e 5.0')) {
      specs.pcieVersion = 'PCIe 5.0';
    } else if (titleLower.includes('pcie 4.0') || titleLower.includes('pci-e 4.0')) {
      specs.pcieVersion = 'PCIe 4.0';
    } else if (titleLower.includes('pcie 3.0') || titleLower.includes('pci-e 3.0')) {
      specs.pcieVersion = 'PCIe 3.0';
    }
    
    return specs;
  }

  // Extract supported CPU chipsets/generations
  extractSupportedCpuChipsets(title) {
    const titleLower = title.toLowerCase();
    const supportedChipsets = [];
    
    // Intel CPU support based on chipset
    if (titleLower.includes('z790') || titleLower.includes('b760') || titleLower.includes('h770')) {
      supportedChipsets.push('Intel 13th Gen', 'Intel 12th Gen');
    } else if (titleLower.includes('z690') || titleLower.includes('b660') || titleLower.includes('h670') || titleLower.includes('h610')) {
      supportedChipsets.push('Intel 12th Gen', 'Intel 11th Gen');
    } else if (titleLower.includes('z590') || titleLower.includes('b560') || titleLower.includes('h570')) {
      supportedChipsets.push('Intel 11th Gen', 'Intel 10th Gen');
    }
    
    // AMD CPU support based on chipset
    if (titleLower.includes('x670') || titleLower.includes('b650') || titleLower.includes('a620')) {
      supportedChipsets.push('AMD Ryzen 7000 Series', 'AMD Ryzen 8000 Series');
    } else if (titleLower.includes('x570') || titleLower.includes('b550') || titleLower.includes('a520')) {
      supportedChipsets.push('AMD Ryzen 5000 Series', 'AMD Ryzen 3000 Series', 'AMD Ryzen 2000 Series');
    } else if (titleLower.includes('x470') || titleLower.includes('b450')) {
      supportedChipsets.push('AMD Ryzen 3000 Series', 'AMD Ryzen 2000 Series', 'AMD Ryzen 1000 Series');
    }
    
    // Socket-based fallback
    if (supportedChipsets.length === 0) {
      if (titleLower.includes('lga1700') || titleLower.includes('lga 1700')) {
        supportedChipsets.push('Intel 13th Gen', 'Intel 12th Gen');
      } else if (titleLower.includes('lga1200') || titleLower.includes('lga 1200')) {
        supportedChipsets.push('Intel 11th Gen', 'Intel 10th Gen');
      } else if (titleLower.includes('am5')) {
        supportedChipsets.push('AMD Ryzen 7000 Series', 'AMD Ryzen 8000 Series');
      } else if (titleLower.includes('am4')) {
        supportedChipsets.push('AMD Ryzen 5000 Series', 'AMD Ryzen 3000 Series');
      }
    }
    
    return supportedChipsets;
  }

  // Extract detailed RAM specifications
  extractRamSpecs(title) {
    const ramSpecs = {};
    const titleLower = title.toLowerCase();
    
    // Extract memory type (DDR4/DDR5)
    const memoryTypeMatch = title.match(/ddr([45])/i);
    if (memoryTypeMatch) {
      ramSpecs.memoryType = `DDR${memoryTypeMatch[1]}`;
      ramSpecs.ramType = `DDR${memoryTypeMatch[1]}`;  // Also save as ramType for clarity
    } else {
      // Infer from chipset if not explicitly stated
      if (titleLower.includes('z790') || titleLower.includes('b760') || titleLower.includes('h770') ||
          titleLower.includes('x670') || titleLower.includes('b650')) {
        ramSpecs.memoryType = 'DDR5';
        ramSpecs.ramType = 'DDR5';
      } else if (titleLower.includes('z690') || titleLower.includes('b660') ||
                 titleLower.includes('x570') || titleLower.includes('b550')) {
        ramSpecs.memoryType = 'DDR4/DDR5'; // Some support both
        ramSpecs.ramType = 'DDR4/DDR5';
      } else {
        ramSpecs.memoryType = 'DDR4';
        ramSpecs.ramType = 'DDR4';
      }
    }
    
    // Extract max memory capacity
    const maxMemMatch = title.match(/(\d+)gb\s*max/i) || 
                       title.match(/up\s*to\s*(\d+)gb/i) ||
                       title.match(/supports?\s*(\d+)gb/i);
    if (maxMemMatch) {
      ramSpecs.maxMemory = `${maxMemMatch[1]}GB`;
    } else {
      // Set reasonable defaults based on chipset
      if (titleLower.includes('z790') || titleLower.includes('z690') || 
          titleLower.includes('x670') || titleLower.includes('x570')) {
        ramSpecs.maxMemory = '128GB';
      } else {
        ramSpecs.maxMemory = '64GB';
      }
    }
    
    // Extract memory slots
    const slotsMatch = title.match(/(\d+)\s*x\s*dimm/i) || 
                      title.match(/(\d+)\s*dimm\s*slots/i) ||
                      title.match(/(\d+)\s*memory\s*slots/i) ||
                      title.match(/(\d+)\s*slots/i);
    if (slotsMatch) {
      ramSpecs.memorySlots = parseInt(slotsMatch[1]);
    } else {
      // Default based on form factor
      if (titleLower.includes('mini itx') || titleLower.includes('mini-itx')) {
        ramSpecs.memorySlots = 2;
      } else if (titleLower.includes('micro atx') || titleLower.includes('matx')) {
        ramSpecs.memorySlots = 4;
      } else {
        ramSpecs.memorySlots = 4; // Standard ATX
      }
    }
    
    // Extract memory speed support
    const speedMatch = title.match(/ddr[45][-\s]*(\d+)/i) ||
                      title.match(/(\d+)\s*mhz/i);
    if (speedMatch) {
      ramSpecs.maxMemorySpeed = `${speedMatch[1]}MHz`;
    } else if (ramSpecs.ramType === 'DDR5') {
      ramSpecs.maxMemorySpeed = '5600MHz'; // Common DDR5 speed
    } else if (ramSpecs.ramType === 'DDR4') {
      ramSpecs.maxMemorySpeed = '3200MHz'; // Common DDR4 speed
    }
    
    // Extract memory channels
    if (titleLower.includes('dual channel') || titleLower.includes('2-channel')) {
      ramSpecs.memoryChannels = 2;
    } else if (titleLower.includes('quad channel') || titleLower.includes('4-channel')) {
      ramSpecs.memoryChannels = 4;
    } else {
      ramSpecs.memoryChannels = 2; // Most consumer motherboards are dual-channel
    }
    
    return ramSpecs;
  }

  // Detect manufacturer from title
  detectManufacturer(title) {
    const titleLower = title.toLowerCase();
    
    if (titleLower.includes('asus')) return 'ASUS';
    if (titleLower.includes('msi')) return 'MSI';
    if (titleLower.includes('gigabyte')) return 'Gigabyte';
    if (titleLower.includes('asrock')) return 'ASRock';
    if (titleLower.includes('evga')) return 'EVGA';
    if (titleLower.includes('biostar')) return 'Biostar';
    
    return 'Unknown';
  }

  // Extract socket type
  extractSocket(title) {
    const sockets = {
      // Intel sockets
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

  // Extract chipset
  extractChipset(title) {
    const chipsets = {
      // Intel chipsets
      'z790': /z790/i,
      'z690': /z690/i,
      'b760': /b760/i,
      'b660': /b660/i,
      'h770': /h770/i,
      'h670': /h670/i,
      'h610': /h610/i,
      
      // AMD chipsets
      'x670e': /x670e/i,
      'x670': /x670/i,
      'b650e': /b650e/i,
      'b650': /b650/i,
      'x570': /x570/i,
      'b550': /b550/i,
      'a520': /a520/i
    };
    
    for (const [chipset, pattern] of Object.entries(chipsets)) {
      if (pattern.test(title)) {
        return chipset.toUpperCase();
      }
    }
    
    return 'Unknown';
  }

  // Extract form factor
  extractFormFactor(title) {
    const titleLower = title.toLowerCase();
    
    if (titleLower.includes('e-atx') || titleLower.includes('eatx')) return 'E-ATX';
    if (titleLower.includes('atx') && !titleLower.includes('micro')) return 'ATX';
    if (titleLower.includes('micro atx') || titleLower.includes('matx') || titleLower.includes('m-atx')) return 'Micro-ATX';
    if (titleLower.includes('mini itx') || titleLower.includes('mini-itx')) return 'Mini-ITX';
    
    return 'Unknown';
  }

  // Determine performance tier
  determinePerformanceTier(title) {
    const titleLower = title.toLowerCase();
    
    // High-end/Enthusiast chipsets
    if (titleLower.includes('z790') || titleLower.includes('z690') || 
        titleLower.includes('x670') || titleLower.includes('x570')) {
      return 'High-End';
    }
    
    // Performance chipsets
    if (titleLower.includes('b760') || titleLower.includes('b660') ||
        titleLower.includes('b650') || titleLower.includes('b550')) {
      return 'Performance';
    }
    
    // Mainstream chipsets
    if (titleLower.includes('h770') || titleLower.includes('h670') ||
        titleLower.includes('a520')) {
      return 'Mainstream';
    }
    
    // Entry-level chipsets
    if (titleLower.includes('h610')) {
      return 'Entry-Level';
    }
    
    return 'Unknown';
  }

  // Log summary of found motherboards
  logMotherboardSummary(motherboards) {
    Logger.info('\n📊 MOTHERBOARD SUMMARY:');
    Logger.info('='.repeat(60));
    
    const manufacturers = {};
    const sockets = {};
    const chipsets = {};
    const formFactors = {};
    
    motherboards.forEach(motherboard => {
      // Count by manufacturer
      const mfg = motherboard.manufacturer || 'Unknown';
      manufacturers[mfg] = (manufacturers[mfg] || 0) + 1;
      
      // Count by socket
      const socket = motherboard.socket || 'Unknown';
      sockets[socket] = (sockets[socket] || 0) + 1;
      
      // Count by chipset
      const chipset = motherboard.chipset || 'Unknown';
      chipsets[chipset] = (chipsets[chipset] || 0) + 1;
      
      // Count by form factor
      const formFactor = motherboard.formFactor || 'Unknown';
      formFactors[formFactor] = (formFactors[formFactor] || 0) + 1;
      
      // Log individual motherboard
      const specs = motherboard.specifications || {};
      const wifiInfo = specs.wifi ? 'WiFi' : 'No WiFi';
      const ramInfo = specs.ramType || specs.memoryType || 'Unknown RAM';
      const cpuSupportInfo = specs.supportedCpuChipsets ? specs.supportedCpuChipsets.join(', ') : 'Unknown CPUs';
      const priceInfo = motherboard.price ? `$${motherboard.price}` : 'No price';
      
      Logger.info(`🏢 ${motherboard.manufacturer} ${motherboard.formFactor} ${motherboard.chipset}:`);
      Logger.info(`   RAM: ${ramInfo} (${specs.memorySlots || 'Unknown'} slots, ${specs.maxMemory || 'Unknown'} max)`);
      Logger.info(`   CPU Support: ${cpuSupportInfo}`);
      Logger.info(`   Features: ${wifiInfo} - ${priceInfo}`);
    });
    
    Logger.info('\n📈 By Manufacturer:');
    Object.entries(manufacturers).forEach(([mfg, count]) => {
      Logger.info(`   ${mfg}: ${count} motherboards`);
    });
    
    Logger.info('\n🔌 By Socket:');
    Object.entries(sockets).forEach(([socket, count]) => {
      Logger.info(`   ${socket}: ${count} motherboards`);
    });
    
    Logger.info('\n🖥️  By Chipset:');
    Object.entries(chipsets).forEach(([chipset, count]) => {
      Logger.info(`   ${chipset}: ${count} motherboards`);
    });
    
    Logger.info('\n📐 By Form Factor:');
    Object.entries(formFactors).forEach(([formFactor, count]) => {
      Logger.info(`   ${formFactor}: ${count} motherboards`);
    });
    
    Logger.info('='.repeat(60));
  }

  // Cleanup resources
  async close() {
    if (this.browser) {
      await this.browser.close();
      Logger.info('🚪 Browser closed');
    }
  }
}

module.exports = { MotherboardDataPopulator };