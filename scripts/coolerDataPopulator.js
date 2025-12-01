const { connectToDatabase, getDatabase } = require('../config/database');
const puppeteer = require('puppeteer');

const config = require('./config/scrapeConfig');
const Logger = require('./utils/logger');
const DataEnrichmentService = require('./services/dataEnrichmentService');
const DatabaseService = require('./services/databaseService');

const AmazonScraper = require('./scrapers/amazonScraper');
const NeweggScraper = require('./scrapers/neweggScraper');
const BestBuyScraper = require('./scrapers/bestbuyScraper');

class CoolerDataPopulator {
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

  // Extract cooler model for categorization
  extractCoolerModel(searchTerm) {
    const term = searchTerm.toLowerCase();
    
    // Liquid cooler categories
    if (term.includes('liquid') || term.includes('water') || term.includes('aio')) {
      if (term.includes('360mm') || term.includes('360')) return 'liquid_360mm';
      if (term.includes('280mm') || term.includes('280')) return 'liquid_280mm';
      if (term.includes('240mm') || term.includes('240')) return 'liquid_240mm';
      if (term.includes('120mm') || term.includes('120')) return 'liquid_120mm';
      return 'liquid_general';
    }
    
    // Air cooler categories
    if (term.includes('air') || term.includes('tower')) {
      if (term.includes('tower')) return 'air_tower';
      if (term.includes('low profile')) return 'air_low_profile';
      return 'air_general';
    }
    
    // Brand categories
    if (term.includes('noctua')) return 'noctua_coolers';
    if (term.includes('corsair')) return 'corsair_coolers';
    if (term.includes('cooler master')) return 'coolermaster_coolers';
    if (term.includes('be quiet')) return 'bequiet_coolers';
    if (term.includes('arctic')) return 'arctic_coolers';
    if (term.includes('deepcool')) return 'deepcool_coolers';
    
    return 'cpu_coolers';
  }

  // Main cooler population function with duplicate detection
  async populateCoolerData(searchUrl, coolerModel) {
    try {
      Logger.info(`🔍 Starting cooler data population for: ${coolerModel}`);
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
        // Navigate to search page
        await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 60000 });
        Logger.success('✅ Page loaded successfully');

        await scraper.waitForContent(page);
        const coolers = await scraper.extractProducts(page, coolerModel, 'cooler');

        if (coolers.length > 0) {
          Logger.info(`📦 Found ${coolers.length} coolers on page`);
          
          // Enrich ALL cooler data regardless of query match
          const enrichedCoolers = this.enrichCoolerData(coolers, coolerModel);
          
          // Use unified collection name for all coolers
          const collectionName = 'coolers';
          Logger.info(`💾 Saving to unified collection: ${collectionName}`);
          
          const result = await this.databaseService.saveCoolersWithDuplicateDetection(enrichedCoolers, collectionName);
          
          Logger.success(`✅ Successfully processed ${coolers.length} coolers`);
          Logger.info(`   New coolers saved: ${result.newCount}`);
          Logger.info(`   Duplicates skipped: ${result.duplicateCount}`);
          Logger.info(`   Updated coolers: ${result.updatedCount || 0}`);
          
          // Log summary of found coolers
          this.logCoolerSummary(enrichedCoolers);
          
          return {
            success: true,
            count: result.newCount,
            duplicates: result.duplicateCount,
            updated: result.updatedCount || 0,
            total: coolers.length,
            collection: collectionName,
            coolers: enrichedCoolers
          };
          
        } else {
          Logger.warn(`⚠️  No coolers found for ${coolerModel}`);
          return {
            success: false,
            count: 0,
            message: 'No coolers found'
          };
        }

      } finally {
        await page.close();
      }

    } catch (error) {
      Logger.error(`❌ Cooler data population failed: ${error.message}`);
      throw error;
    }
  }

  // Enrich cooler data with additional specifications
  enrichCoolerData(coolers, coolerModel) {
    return coolers.map(cooler => {
      const enrichedCooler = { ...cooler };
      
      // Add cooler-specific fields
      enrichedCooler.category = 'cooler';
      enrichedCooler.coolerGroup = coolerModel;
      enrichedCooler.createdAt = new Date();
      enrichedCooler.updatedAt = new Date();
      
      // Handle pricing with sale support (same logic as PSU and RAM populators)
      if (cooler.isOnSale && cooler.basePrice && cooler.salePrice) {
        // Item is on sale - save both base and sale prices
        enrichedCooler.basePrice = parseFloat(cooler.basePrice);
        enrichedCooler.salePrice = parseFloat(cooler.salePrice);
        enrichedCooler.currentPrice = parseFloat(cooler.salePrice);
        enrichedCooler.isOnSale = true;
        enrichedCooler.price = parseFloat(cooler.salePrice); // For backward compatibility
      } else {
        // Regular pricing - save as base price
        const price = cooler.price || cooler.currentPrice || cooler.basePrice;
        if (price) {
          enrichedCooler.basePrice = parseFloat(price);
          enrichedCooler.currentPrice = parseFloat(price);
          enrichedCooler.price = parseFloat(price); // For backward compatibility
          enrichedCooler.isOnSale = false;
        }
      }
      
      // Extract cooler specifications from title
      const specs = this.extractCoolerSpecs(cooler.title || cooler.name || '');
      
      // Add extracted specs to the cooler object
      if (specs.coolerType) enrichedCooler.coolerType = specs.coolerType;
      if (specs.manufacturer) enrichedCooler.manufacturer = specs.manufacturer;
      if (specs.radiatorSize) enrichedCooler.radiatorSize = specs.radiatorSize;
      if (specs.height) enrichedCooler.height = specs.height;
      if (specs.fanSize) enrichedCooler.fanSize = specs.fanSize;
      if (specs.noiseLevel) enrichedCooler.noiseLevel = specs.noiseLevel;
      if (specs.tdpRating) enrichedCooler.tdpRating = specs.tdpRating;
      
      // Socket compatibility
      if (specs.socketCompatibility && specs.socketCompatibility.length > 0) {
        enrichedCooler.socketCompatibility = specs.socketCompatibility;
      }
      
      // Additional specifications object
      enrichedCooler.specifications = {
        isAIO: specs.isAIO || false,
        rgb: specs.rgb || false,
        socketCompatibility: specs.socketCompatibility || [],
        coolerType: specs.coolerType || 'Unknown',
        radiatorSize: specs.radiatorSize || null,
        fanConfiguration: specs.fanConfiguration || null
      };
      
      // Determine performance tier
      enrichedCooler.performanceTier = this.determineCoolerTier(cooler.title || '', specs);
      
      return enrichedCooler;
    });
  }

  // Extract cooler specifications from title
  extractCoolerSpecs(title) {
    const specs = {};
    const titleLower = title.toLowerCase();
    
    // Determine cooler type
    if (titleLower.includes('aio') || titleLower.includes('liquid') || titleLower.includes('water')) {
      specs.coolerType = 'AIO Liquid';
      specs.isAIO = true;
      
      // Extract radiator size for AIO coolers
      const radiatorMatch = title.match(/(120|140|240|280|360)mm/i);
      if (radiatorMatch) {
        specs.radiatorSize = `${radiatorMatch[1]}mm`;
      }
    } else {
      specs.coolerType = 'Air';
      specs.isAIO = false;
      
      // Extract height for air coolers
      const heightMatch = title.match(/(\d+)mm.*height|height.*(\d+)mm/i);
      if (heightMatch) {
        specs.height = `${heightMatch[1] || heightMatch[2]}mm`;
      }
    }
    
    // Extract manufacturer
    const manufacturers = [
      'noctua', 'corsair', 'cooler master', 'be quiet', 'arctic', 'deepcool',
      'thermaltake', 'fractal design', 'scythe', 'zalman', 'cryorig', 'asus',
      'msi', 'evga', 'antec', 'silverstone', 'phanteks', 'ekwb'
    ];
    
    for (const mfg of manufacturers) {
      if (titleLower.includes(mfg)) {
        specs.manufacturer = mfg.split(' ').map(word => 
          word.charAt(0).toUpperCase() + word.slice(1)
        ).join(' ');
        break;
      }
    }
    
    // Extract fan size
    const fanMatch = title.match(/(\d+)mm.*fan|fan.*(\d+)mm/i);
    if (fanMatch) {
      specs.fanSize = `${fanMatch[1] || fanMatch[2]}mm`;
    }
    
    // Extract TDP rating
    const tdpMatch = title.match(/(\d+)w|(\d+)\s*watt/i);
    if (tdpMatch) {
      specs.tdpRating = `${tdpMatch[1] || tdpMatch[2]}W`;
    }
    
    // Detect RGB
    specs.rgb = /rgb|led|lighting|aura|mystic|chroma/i.test(title);
    
    // Socket compatibility (common sockets)
    const sockets = [];
    if (/lga\s*1700|1700/i.test(title)) sockets.push('LGA1700');
    if (/lga\s*1200|1200/i.test(title)) sockets.push('LGA1200');
    if (/lga\s*115[0-1x]|115[0-1x]/i.test(title)) sockets.push('LGA115x');
    if (/am5/i.test(title)) sockets.push('AM5');
    if (/am4/i.test(title)) sockets.push('AM4');
    if (/am3/i.test(title)) sockets.push('AM3+');
    
    if (sockets.length > 0) {
      specs.socketCompatibility = sockets;
    }
    
    return specs;
  }

  // Determine performance tier based on cooler specs
  determineCoolerTier(title, specs) {
    const titleLower = title.toLowerCase();
    
    // High-end liquid coolers
    if (specs.isAIO) {
      if (specs.radiatorSize === '360mm' || specs.radiatorSize === '280mm') {
        return 'High-End';
      }
      if (specs.radiatorSize === '240mm') {
        return 'Performance';
      }
      return 'Mainstream';
    }
    
    // High-end air coolers
    if (titleLower.includes('noctua nh-d') || titleLower.includes('be quiet dark rock pro') ||
        titleLower.includes('scythe fuma') || titleLower.includes('thermalright')) {
      return 'High-End';
    }
    
    // Performance air coolers
    if (titleLower.includes('tower') || titleLower.includes('dual fan') ||
        titleLower.includes('6 heat') || titleLower.includes('cooler master')) {
      return 'Performance';
    }
    
    // Entry-level
    if (titleLower.includes('low profile') || titleLower.includes('slim') ||
        titleLower.includes('stock') || titleLower.includes('basic')) {
      return 'Entry-Level';
    }
    
    return 'Mainstream';
  }

  // Log summary of found coolers
  logCoolerSummary(coolers) {
    Logger.info('\n📊 COOLER SUMMARY:');
    Logger.info('='.repeat(60));
    
    const manufacturers = {};
    const types = {};
    const tiers = {};
    
    coolers.forEach(cooler => {
      // Count by manufacturer
      const mfg = cooler.manufacturer || 'Unknown';
      manufacturers[mfg] = (manufacturers[mfg] || 0) + 1;
      
      // Count by type
      const type = cooler.coolerType || 'Unknown';
      types[type] = (types[type] || 0) + 1;
      
      // Count by performance tier
      const tier = cooler.performanceTier || 'Unknown';
      tiers[tier] = (tiers[tier] || 0) + 1;
      
      // Log individual cooler
      const specs = cooler.specifications || {};
      const priceInfo = cooler.price ? `$${cooler.price}` : 'No price';
      const saleInfo = cooler.isOnSale ? ` (was $${cooler.basePrice})` : '';
      
      Logger.info(`🌡️  ${cooler.manufacturer || 'Unknown'} ${cooler.coolerType || 'Unknown'}:`);
      Logger.info(`   ${cooler.title?.substring(0, 80)}...`);
      Logger.info(`   Type: ${specs.coolerType} | Sockets: ${(specs.socketCompatibility || []).join(', ') || 'Unknown'}`);
      Logger.info(`   Price: ${priceInfo}${saleInfo}`);
    });
    
    Logger.info('\n📈 By Manufacturer:');
    Object.entries(manufacturers).forEach(([mfg, count]) => {
      Logger.info(`   ${mfg}: ${count} coolers`);
    });
    
    Logger.info('\n🌡️  By Type:');
    Object.entries(types).forEach(([type, count]) => {
      Logger.info(`   ${type}: ${count} coolers`);
    });
    
    Logger.info('\n🏆 By Performance Tier:');
    Object.entries(tiers).forEach(([tier, count]) => {
      Logger.info(`   ${tier}: ${count} coolers`);
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

module.exports = { CoolerDataPopulator };