const { connectToDatabase, getDatabase } = require('../config/database');
const puppeteer = require('puppeteer');

const config = require('./config/scrapeConfig');
const Logger = require('./utils/logger');
const DataEnrichmentService = require('./services/dataEnrichmentService');
const DatabaseService = require('./services/databaseService');

const AmazonScraperSimple = require('./scrapers/amazonScraperSimple');
const NeweggScraper = require('./scrapers/neweggScraper');
const BestBuyScraper = require('./scrapers/bestbuyScraper');

class RamDataPopulator {
  constructor() {
    this.db = null;
    this.browser = null;
    this.databaseService = null;
    this.initializeScrapers();
  }

  initializeScrapers() {
    this.scrapers = {
      amazon: new AmazonScraperSimple('amazon', config.sites.amazon.selectors),
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

  // Extract RAM model and specifications for collection naming
  extractRamModel(searchTerm) {
    const term = searchTerm.toLowerCase();
    
    // DDR5 speeds
    if (term.includes('ddr5-8000') || term.includes('ddr5 8000')) return 'ddr5_8000';
    if (term.includes('ddr5-7600') || term.includes('ddr5 7600')) return 'ddr5_7600';
    if (term.includes('ddr5-7200') || term.includes('ddr5 7200')) return 'ddr5_7200';
    if (term.includes('ddr5-6800') || term.includes('ddr5 6800')) return 'ddr5_6800';
    if (term.includes('ddr5-6400') || term.includes('ddr5 6400')) return 'ddr5_6400';
    if (term.includes('ddr5-6000') || term.includes('ddr5 6000')) return 'ddr5_6000';
    if (term.includes('ddr5-5600') || term.includes('ddr5 5600')) return 'ddr5_5600';
    if (term.includes('ddr5-5200') || term.includes('ddr5 5200')) return 'ddr5_5200';
    if (term.includes('ddr5-4800') || term.includes('ddr5 4800')) return 'ddr5_4800';
    
    // DDR4 speeds
    if (term.includes('ddr4-4000') || term.includes('ddr4 4000')) return 'ddr4_4000';
    if (term.includes('ddr4-3600') || term.includes('ddr4 3600')) return 'ddr4_3600';
    if (term.includes('ddr4-3200') || term.includes('ddr4 3200')) return 'ddr4_3200';
    if (term.includes('ddr4-3000') || term.includes('ddr4 3000')) return 'ddr4_3000';
    if (term.includes('ddr4-2666') || term.includes('ddr4 2666')) return 'ddr4_2666';
    if (term.includes('ddr4-2400') || term.includes('ddr4 2400')) return 'ddr4_2400';
    
    // Generic DDR type fallback
    if (term.includes('ddr5')) return 'ddr5_general';
    if (term.includes('ddr4')) return 'ddr4_general';
    
    // Capacity-based fallback
    if (term.includes('64gb')) return 'ram_64gb';
    if (term.includes('32gb')) return 'ram_32gb';
    if (term.includes('16gb')) return 'ram_16gb';
    if (term.includes('8gb')) return 'ram_8gb';
    
    return 'ram_other';
  }

  // Main RAM population function with duplicate detection
  async populateRamData(searchUrl, ramModel) {
    try {
      Logger.info(`🔍 Starting RAM data population for: ${ramModel}`);
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
        const ramModules = await scraper.extractProducts(page, ramModel, 'ram');

        if (ramModules.length > 0) {
          Logger.info(`📦 Found ${ramModules.length} RAM modules on page`);
          
          // Enrich ALL RAM data regardless of query match
          const enrichedRam = this.enrichRamData(ramModules, ramModel);
          
          // Use unified collection name for all RAM
          const collectionName = 'rams';
          Logger.info(`💾 Saving to unified collection: ${collectionName}`);

          // Save to database with duplicate detection
          const result = await this.databaseService.saveRamWithDuplicateDetection(enrichedRam, collectionName);
          
          Logger.success(`✅ Successfully processed ${ramModules.length} RAM modules`);
          Logger.info(`   New RAM modules saved: ${result.newCount}`);
          Logger.info(`   Duplicates skipped: ${result.duplicateCount}`);
          Logger.info(`   Updated RAM modules: ${result.updatedCount || 0}`);
          
          // Log summary of found RAM
          this.logRamSummary(enrichedRam);
          
          return {
            success: true,
            count: result.newCount,
            duplicates: result.duplicateCount,
            updated: result.updatedCount || 0,
            total: ramModules.length,
            collection: collectionName,
            ram: enrichedRam
          };
          
        } else {
          Logger.warn(`⚠️  No RAM modules found for ${ramModel}`);
          return {
            success: false,
            count: 0,
            message: 'No RAM modules found'
          };
        }

      } finally {
        await page.close();
      }

    } catch (error) {
      Logger.error(`❌ RAM data population failed: ${error.message}`);
      throw error;
    }
  }

  // Enrich RAM data with additional specifications
  enrichRamData(ramModules, ramModel) {
    return ramModules.map(ram => {
      const enrichedRam = { ...ram };
      const title = ram.title || ram.name || '';

      // Add RAM-specific fields
      enrichedRam.category = 'ram';
      enrichedRam.ramGroup = ramModel;
      enrichedRam.createdAt = new Date();
      enrichedRam.updatedAt = new Date();

      // Extract RAM specifications from title
      const specs = this.extractRamSpecs(title);
      enrichedRam.specifications = specs;

      // Determine manufacturer
      if (!enrichedRam.manufacturer) {
        enrichedRam.manufacturer = this.detectManufacturer(title);
      }

      // CRITICAL: Extract memory type (DDR3/DDR4/DDR5) as STRING
      enrichedRam.memoryType = this.extractMemoryType(title);

      // CRITICAL: Extract speed as NUMBER (in MHz)
      const speedValue = this.extractSpeed(title);
      if (speedValue !== null) {
        enrichedRam.speed = speedValue; // Store as number
        enrichedRam.speedMHz = speedValue; // Also save with explicit suffix for clarity
      }

      // CRITICAL: Extract kit size (number of sticks) as NUMBER
      const kitSizeValue = this.extractKitSize(title);
      if (kitSizeValue !== null) {
        enrichedRam.kitSize = kitSizeValue; // Store as number
      }

      // CRITICAL: Extract capacity per stick as NUMBER (in GB)
      const capacityPerStick = this.extractCapacityPerStick(title);
      if (capacityPerStick !== null) {
        enrichedRam.capacity = capacityPerStick; // Store as number (GB per stick)
      }

      // CRITICAL: Calculate total capacity as NUMBER (in GB)
      const totalCapacityValue = this.extractCapacity(title);
      if (totalCapacityValue !== null) {
        enrichedRam.totalCapacity = totalCapacityValue; // Store as number
      } else if (enrichedRam.kitSize && enrichedRam.capacity) {
        // Calculate from kit size and capacity per stick
        enrichedRam.totalCapacity = enrichedRam.kitSize * enrichedRam.capacity;
      }

      // Extract kit configuration as STRING for display (e.g., "2x16GB")
      enrichedRam.kitConfiguration = this.extractKitConfiguration(title);

      // Extract latency/timings
      enrichedRam.latency = this.extractLatency(title);

      // Extract CAS latency as number if available
      const casLatency = this.extractCASLatency(title);
      if (casLatency !== null) {
        enrichedRam.casLatency = casLatency;
      }

      // Add performance tier
      enrichedRam.performanceTier = this.determinePerformanceTier(title);

      // Handle pricing with sale support (same logic as PSU populator)
      if (ram.isOnSale && ram.basePrice && ram.salePrice) {
        // Item is on sale - save both base and sale prices
        enrichedRam.basePrice = parseFloat(ram.basePrice);
        enrichedRam.salePrice = parseFloat(ram.salePrice);
        enrichedRam.currentPrice = parseFloat(ram.salePrice);
        enrichedRam.isOnSale = true;
        enrichedRam.price = parseFloat(ram.salePrice); // For backward compatibility
      } else {
        // Regular pricing - save as base price
        const price = ram.price || ram.currentPrice || ram.basePrice;
        if (price) {
          enrichedRam.basePrice = parseFloat(price);
          enrichedRam.currentPrice = parseFloat(price);
          enrichedRam.price = parseFloat(price); // For backward compatibility
          enrichedRam.isOnSale = false;
        }
      }

      return enrichedRam;
    });
  }

  // Extract RAM specifications from title
  extractRamSpecs(title) {
    const specs = {};
    const titleLower = title.toLowerCase();
    
    // Extract RGB lighting
    specs.rgb = titleLower.includes('rgb') || titleLower.includes('lighting') || 
                titleLower.includes('led') || titleLower.includes('aura') ||
                titleLower.includes('mystic') || titleLower.includes('vengeance rgb');
    
    // Extract heat spreader
    specs.heatSpreader = titleLower.includes('heat spreader') || 
                        titleLower.includes('heatspreader') ||
                        titleLower.includes('heat sink') ||
                        titleLower.includes('aluminum') ||
                        titleLower.includes('cooling');
    
    // Extract overclocking profile support
    if (titleLower.includes('xmp') || titleLower.includes('x.m.p')) {
      specs.overclock = 'XMP';
    } else if (titleLower.includes('expo') || titleLower.includes('e.x.p.o')) {
      specs.overclock = 'EXPO';
    } else if (titleLower.includes('docp') || titleLower.includes('d.o.c.p')) {
      specs.overclock = 'DOCP';
    } else {
      specs.overclock = 'JEDEC';
    }
    
    // Extract voltage
    const voltageMatch = title.match(/(\d+\.\d+)v/i);
    if (voltageMatch) {
      specs.voltage = `${voltageMatch[1]}V`;
    } else {
      // Set defaults based on memory type
      if (titleLower.includes('ddr5')) {
        specs.voltage = '1.1V';
      } else if (titleLower.includes('ddr4')) {
        specs.voltage = '1.2V';
      }
    }
    
    // Extract ECC support
    specs.ecc = titleLower.includes('ecc') || titleLower.includes('error correcting');
    
    // Extract buffered/unbuffered
    if (titleLower.includes('unbuffered') || titleLower.includes('udimm')) {
      specs.buffered = false;
      specs.type = 'UDIMM';
    } else if (titleLower.includes('registered') || titleLower.includes('rdimm')) {
      specs.buffered = true;
      specs.type = 'RDIMM';
    } else if (titleLower.includes('so-dimm') || titleLower.includes('sodimm')) {
      specs.type = 'SO-DIMM';
      specs.formFactor = 'Laptop';
    } else {
      specs.buffered = false;
      specs.type = 'UDIMM';
      specs.formFactor = 'Desktop';
    }
    
    return specs;
  }

  // Detect manufacturer from title
  detectManufacturer(title) {
    const titleLower = title.toLowerCase();
    
    if (titleLower.includes('corsair')) return 'Corsair';
    if (titleLower.includes('g.skill') || titleLower.includes('gskill')) return 'G.Skill';
    if (titleLower.includes('crucial')) return 'Crucial';
    if (titleLower.includes('kingston')) return 'Kingston';
    if (titleLower.includes('teamgroup') || titleLower.includes('team group')) return 'TeamGroup';
    if (titleLower.includes('adata')) return 'ADATA';
    if (titleLower.includes('patriot')) return 'Patriot';
    if (titleLower.includes('mushkin')) return 'Mushkin';
    if (titleLower.includes('pny')) return 'PNY';
    if (titleLower.includes('samsung')) return 'Samsung';
    if (titleLower.includes('sk hynix') || titleLower.includes('hynix')) return 'SK Hynix';
    if (titleLower.includes('micron')) return 'Micron';
    
    return 'Unknown';
  }

  // Extract memory type (DDR4/DDR5)
  extractMemoryType(title) {
    const memoryTypeMatch = title.match(/ddr\s*([3456])/i);
    if (memoryTypeMatch) {
      return `DDR${memoryTypeMatch[1]}`;
    }
    return 'Unknown';
  }

  // Extract speed in MHz (returns numeric value)
  extractSpeed(title) {
    // Look for DDR4-3200, DDR5 5600, 3200MHz, etc.
    const speedMatch = title.match(/ddr[3456][-\s]*(\d{3,5})/i) ||
                      title.match(/(\d{3,5})\s*mhz/i) ||
                      title.match(/pc[3456][-\s]*(\d{3,5})/i) ||
                      title.match(/(\d{3,5})\s*mt\/s/i);

    if (speedMatch) {
      const speed = parseInt(speedMatch[1]);
      // Validate speed is in reasonable range (800-10000 MHz)
      if (speed >= 800 && speed <= 10000) {
        return speed;
      }
    }
    return null;
  }

  // Extract total capacity (returns numeric value in GB)
  extractCapacity(title) {
    // Try to match kit configuration first (e.g., 2x8GB = 16GB total)
    const kitMatch = title.match(/(\d+)\s*x\s*(\d+)\s*gb/i) ||
                    title.match(/(\d+)x(\d+)gb/i);

    if (kitMatch) {
      const stickCount = parseInt(kitMatch[1]);
      const stickSize = parseInt(kitMatch[2]);
      return stickCount * stickSize; // Return total capacity
    }

    // Otherwise just look for total GB
    const capacityMatch = title.match(/(\d+)\s*gb/i);
    if (capacityMatch) {
      return parseInt(capacityMatch[1]);
    }

    return null;
  }

  // Extract kit size (number of sticks)
  extractKitSize(title) {
    const kitMatch = title.match(/(\d+)\s*x\s*(\d+)\s*gb/i) ||
                    title.match(/(\d+)x(\d+)gb/i) ||
                    title.match(/kit\s*of\s*(\d+)/i);

    if (kitMatch) {
      const stickCount = parseInt(kitMatch[1]);
      // Validate reasonable stick count (1-8)
      if (stickCount >= 1 && stickCount <= 8) {
        return stickCount;
      }
    }

    // Default to 1 stick if not specified
    return 1;
  }

  // Extract capacity per stick (in GB)
  extractCapacityPerStick(title) {
    const kitMatch = title.match(/(\d+)\s*x\s*(\d+)\s*gb/i) ||
                    title.match(/(\d+)x(\d+)gb/i);

    if (kitMatch) {
      return parseInt(kitMatch[2]); // Size of each stick
    }

    // If single module, total capacity = per stick capacity
    const capacityMatch = title.match(/(\d+)\s*gb/i);
    if (capacityMatch) {
      return parseInt(capacityMatch[1]);
    }

    return null;
  }

  // Extract kit configuration (e.g., 2x16GB, 4x8GB) - String format for display
  extractKitConfiguration(title) {
    const kitMatch = title.match(/(\d+)\s*x\s*(\d+)\s*gb/i) ||
                    title.match(/(\d+)x(\d+)gb/i) ||
                    title.match(/kit\s*of\s*(\d+).*?(\d+)gb/i);

    if (kitMatch) {
      return `${kitMatch[1]}x${kitMatch[2]}GB`;
    }

    // Single module fallback
    const singleMatch = title.match(/(\d+)\s*gb/i);
    if (singleMatch) {
      return `1x${singleMatch[1]}GB`;
    }

    return 'Unknown';
  }

  // Extract latency/CAS latency (returns string for display)
  extractLatency(title) {
    const latencyMatch = title.match(/c(\d+)/i) ||
                        title.match(/cl(\d+)/i) ||
                        title.match(/cas\s*(\d+)/i) ||
                        title.match(/(\d+)-(\d+)-(\d+)-(\d+)/);

    if (latencyMatch) {
      if (latencyMatch[4]) {
        // Full timing string
        return `${latencyMatch[1]}-${latencyMatch[2]}-${latencyMatch[3]}-${latencyMatch[4]}`;
      } else {
        // Just CAS latency
        return `CL${latencyMatch[1]}`;
      }
    }
    return 'Unknown';
  }

  // Extract CAS latency as number
  extractCASLatency(title) {
    const latencyMatch = title.match(/\bcl\s*(\d+)/i) ||
                        title.match(/\bc(\d+)\b/i) ||
                        title.match(/cas\s*(\d+)/i) ||
                        title.match(/(\d+)-(\d+)-(\d+)-(\d+)/);

    if (latencyMatch) {
      const casValue = parseInt(latencyMatch[1]);
      // Validate CAS latency is in reasonable range (5-50)
      if (casValue >= 5 && casValue <= 50) {
        return casValue;
      }
    }
    return null;
  }

  // Determine performance tier based on specifications
  determinePerformanceTier(title) {
    const titleLower = title.toLowerCase();
    const speedNum = this.extractSpeed(title) || 0;

    // High-end gaming/enthusiast RAM
    if ((titleLower.includes('ddr5') && speedNum >= 6000) ||
        (titleLower.includes('ddr4') && speedNum >= 3600) ||
        titleLower.includes('trident') || titleLower.includes('vengeance pro') ||
        titleLower.includes('dominator') || titleLower.includes('royal')) {
      return 'High-End';
    }

    // Performance gaming RAM
    if ((titleLower.includes('ddr5') && speedNum >= 5200) ||
        (titleLower.includes('ddr4') && speedNum >= 3200) ||
        titleLower.includes('vengeance') || titleLower.includes('ripjaws') ||
        titleLower.includes('fury') || titleLower.includes('ballistix')) {
      return 'Performance';
    }

    // Mainstream RAM
    if ((titleLower.includes('ddr5') && speedNum >= 4800) ||
        (titleLower.includes('ddr4') && speedNum >= 2666)) {
      return 'Mainstream';
    }

    // Entry-level RAM
    return 'Entry-Level';
  }

  // Log summary of found RAM
  logRamSummary(ramModules) {
    Logger.info('\n📊 RAM SUMMARY:');
    Logger.info('='.repeat(60));
    
    const manufacturers = {};
    const memoryTypes = {};
    const speeds = {};
    const capacities = {};
    
    ramModules.forEach(ram => {
      // Count by manufacturer
      const mfg = ram.manufacturer || 'Unknown';
      manufacturers[mfg] = (manufacturers[mfg] || 0) + 1;
      
      // Count by memory type
      const memType = ram.memoryType || 'Unknown';
      memoryTypes[memType] = (memoryTypes[memType] || 0) + 1;
      
      // Count by speed
      const speed = ram.speed || 'Unknown';
      speeds[speed] = (speeds[speed] || 0) + 1;
      
      // Count by capacity
      const capacity = ram.capacity || 'Unknown';
      capacities[capacity] = (capacities[capacity] || 0) + 1;
      
      // Log individual RAM module
      const specs = ram.specifications || {};
      const rgbInfo = specs.rgb ? 'RGB' : 'No RGB';
      const overclockInfo = specs.overclock || 'Unknown';
      const priceInfo = ram.price ? `$${ram.price}` : 'No price';

      // Format speed display
      const speedDisplay = ram.speed ? `${ram.speed}MHz` : 'Unknown Speed';

      // Format kit info
      const kitInfo = ram.kitConfiguration || `${ram.kitSize || 1}x${ram.capacity || '?'}GB`;
      const totalInfo = ram.totalCapacity ? `${ram.totalCapacity}GB total` : '';

      Logger.info(`🏢 ${ram.manufacturer} ${ram.memoryType} ${speedDisplay}:`);
      Logger.info(`   Kit: ${kitInfo} ${totalInfo}`);
      Logger.info(`   Latency: ${ram.latency} - ${overclockInfo} - ${rgbInfo}`);
      Logger.info(`   Price: ${priceInfo}`);
    });
    
    Logger.info('\n📈 By Manufacturer:');
    Object.entries(manufacturers).forEach(([mfg, count]) => {
      Logger.info(`   ${mfg}: ${count} modules`);
    });
    
    Logger.info('\n🔧 By Memory Type:');
    Object.entries(memoryTypes).forEach(([type, count]) => {
      Logger.info(`   ${type}: ${count} modules`);
    });
    
    Logger.info('\n⚡ By Speed:');
    Object.entries(speeds).forEach(([speed, count]) => {
      Logger.info(`   ${speed}: ${count} modules`);
    });
    
    Logger.info('\n💾 By Capacity:');
    Object.entries(capacities).forEach(([capacity, count]) => {
      Logger.info(`   ${capacity}: ${count} modules`);
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

module.exports = { RamDataPopulator };