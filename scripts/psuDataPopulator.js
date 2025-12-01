const { connectToDatabase, getDatabase } = require('../config/database');
const puppeteer = require('puppeteer');

const config = require('./config/scrapeConfig');
const Logger = require('./utils/logger');
const DataEnrichmentService = require('./services/dataEnrichmentService');
const DatabaseService = require('./services/databaseService');

const AmazonScraper = require('./scrapers/amazonScraper');
const NeweggScraper = require('./scrapers/neweggScraper');
const BestBuyScraper = require('./scrapers/bestbuyScraper');

class PSUDataPopulator {
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

  // Extract PSU model and specifications for collection naming
  extractPSUModel(searchTerm) {
    const term = searchTerm.toLowerCase();
    
    // Extract wattage
    const wattageMatch = term.match(/(\d+)w/);
    const wattage = wattageMatch ? wattageMatch[1] : null;
    
    // Extract certification
    let certification = null;
    if (term.includes('80+ titanium')) certification = 'titanium';
    else if (term.includes('80+ platinum')) certification = 'platinum';
    else if (term.includes('80+ gold')) certification = 'gold';
    else if (term.includes('80+ silver')) certification = 'silver';
    else if (term.includes('80+ bronze')) certification = 'bronze';
    else if (term.includes('80+ white')) certification = 'white';
    
    // Extract modularity
    let modularity = null;
    if (term.includes('fully modular')) modularity = 'fully_modular';
    else if (term.includes('semi modular')) modularity = 'semi_modular';
    else if (term.includes('non modular') || term.includes('fixed cable')) modularity = 'non_modular';
    
    // Create collection name
    let collectionName = 'psus';
    if (wattage) collectionName += `_${wattage}w`;
    if (certification) collectionName += `_${certification}`;
    if (modularity) collectionName += `_${modularity}`;
    
    return {
      collectionName,
      wattage: wattage ? parseInt(wattage) : null,
      certification,
      modularity
    };
  }

  // Parse PSU product for specifications
  parsePSUProduct(product, modelInfo) {
    try {
      const name = (product.name || product.title || '').toLowerCase();
      const description = (product.description || '').toLowerCase();
      const fullText = `${name} ${description}`;
      
      // Extract wattage from title/description if not from search
      let wattage = modelInfo.wattage;
      if (!wattage) {
        const wattageMatch = fullText.match(/(\d+)\s*w(?:att)?/i);
        wattage = wattageMatch ? parseInt(wattageMatch[1]) : null;
      }
      
      // Extract efficiency certification
      let certification = modelInfo.certification;
      if (!certification) {
        if (fullText.includes('80+ titanium') || fullText.includes('80 plus titanium')) certification = 'titanium';
        else if (fullText.includes('80+ platinum') || fullText.includes('80 plus platinum')) certification = 'platinum';
        else if (fullText.includes('80+ gold') || fullText.includes('80 plus gold')) certification = 'gold';
        else if (fullText.includes('80+ silver') || fullText.includes('80 plus silver')) certification = 'silver';
        else if (fullText.includes('80+ bronze') || fullText.includes('80 plus bronze')) certification = 'bronze';
        else if (fullText.includes('80+ white') || fullText.includes('80 plus white')) certification = 'white';
      }
      
      // Extract modularity
      let modularity = modelInfo.modularity;
      if (!modularity) {
        if (fullText.includes('fully modular')) modularity = 'fully_modular';
        else if (fullText.includes('semi modular') || fullText.includes('semi-modular')) modularity = 'semi_modular';
        else if (fullText.includes('non modular') || fullText.includes('non-modular') || fullText.includes('fixed cable')) modularity = 'non_modular';
      }
      
      // Extract brand
      const brandMatch = fullText.match(/\b(corsair|evga|seasonic|cooler master|thermaltake|antec|silverstone|fractal design|be quiet|rosewill|asus|msi|gigabyte|xpg|super flower|fsp|chieftec|deepcool|lian li|nzxt|phanteks|cougar|gamemax)\b/i);
      const brand = brandMatch ? brandMatch[1] : null;
      
      // Extract form factor
      let formFactor = 'atx'; // default
      if (fullText.includes('sfx-l')) formFactor = 'sfx-l';
      else if (fullText.includes('sfx')) formFactor = 'sfx';
      else if (fullText.includes('flex atx')) formFactor = 'flex_atx';
      else if (fullText.includes('tfx')) formFactor = 'tfx';
      
      // Extract additional features
      const features = [];
      if (fullText.includes('rgb') || fullText.includes('led')) features.push('rgb');
      if (fullText.includes('fanless') || fullText.includes('passive')) features.push('fanless');
      if (fullText.includes('zero rpm') || fullText.includes('hybrid mode')) features.push('zero_rpm');
      if (fullText.includes('140mm fan')) features.push('140mm_fan');
      if (fullText.includes('sleeve bearing')) features.push('sleeve_bearing');
      if (fullText.includes('fluid dynamic bearing') || fullText.includes('fdb')) features.push('fdb');
      if (fullText.includes('magnetic levitation') || fullText.includes('maglev')) features.push('maglev');
      
      // Extract rail configuration
      let railConfig = 'single_rail'; // default assumption
      if (fullText.includes('dual rail') || fullText.includes('2 rail')) railConfig = 'dual_rail';
      else if (fullText.includes('multi rail') || fullText.includes('multiple rail')) railConfig = 'multi_rail';
      
      // Handle pricing with sale support
      const psuData = {
        name: product.name || product.title,
        brand,
        wattage,
        certification,
        modularity,
        formFactor,
        railConfig,
        features,
        image: product.image || product.imageUrl,
        url: product.url || product.sourceUrl,
        source: product.source || 'amazon',
        description: product.description,
        availability: product.availability || 'in_stock',
        scrapedAt: new Date(),
        category: 'psu'
      };

      // Add price fields with sale support
      if (product.isOnSale && product.basePrice && product.salePrice) {
        // Item is on sale - save both base and sale prices
        psuData.basePrice = parseFloat(product.basePrice);
        psuData.salePrice = parseFloat(product.salePrice);
        psuData.currentPrice = parseFloat(product.salePrice);
        psuData.isOnSale = true;
        psuData.price = parseFloat(product.salePrice); // For backward compatibility
      } else {
        // Regular pricing - save as base price
        const price = product.price || product.currentPrice || product.basePrice;
        if (price) {
          psuData.basePrice = parseFloat(price);
          psuData.currentPrice = parseFloat(price);
          psuData.price = parseFloat(price); // For backward compatibility
          psuData.isOnSale = false;
        }
      }

      return psuData;
    } catch (error) {
      Logger.error('Error parsing PSU product:', error);
      return null;
    }
  }

  // Scrape PSUs from Amazon using the proper scraper
  async scrapePSUsFromAmazon(searchUrl, psuModel) {
    try {
      Logger.info(`🔍 Scraping PSUs from Amazon: ${psuModel}`);
      Logger.info(`   Search URL: ${searchUrl}`);

      // Create page and navigate to URL (like the GPU scraper does)
      const page = await this.browser.newPage();
      let psuProducts = [];
      
      try {
        await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 60000 });
        
        // Use the existing Amazon scraper with page object
        const amazonScraper = this.scrapers.amazon;
        psuProducts = await amazonScraper.scrape(page, psuModel, 'psu');
        
        await page.close();
        
        if (!psuProducts || psuProducts.length === 0) {
          Logger.warn('   No PSU products found from Amazon scraper');
          return { success: false, count: 0, duplicates: 0, total: 0 };
        }
        
      } catch (pageError) {
        await page.close();
        throw pageError;
      }

      Logger.info(`   Found ${psuProducts.length} PSU products from Amazon scraper`);

      // Parse and enrich PSU data 
      const modelInfo = this.extractPSUModel(psuModel);
      const parsedProducts = psuProducts
        .map(product => this.parsePSUProduct(product, modelInfo))
        .filter(product => product !== null);

      if (parsedProducts.length === 0) {
        Logger.warn(`   No valid PSU products after parsing`);
        return { success: false, count: 0, duplicates: 0, total: 0 };
      }

      Logger.info(`   Parsed ${parsedProducts.length} valid PSU products`);

      // Store in database
      const result = await this.savePSUsSimple(parsedProducts);

      Logger.success(`   ✅ PSU data stored: ${result.newCount} new, ${result.duplicateCount} duplicates, ${result.updatedCount} updated`);

      return {
        success: true,
        count: result.newCount,
        duplicates: result.duplicateCount,
        updated: result.updatedCount,
        total: parsedProducts.length
      };
      
    } catch (error) {
      Logger.error(`❌ Error scraping PSUs from Amazon for ${psuModel}:`, error);
      return { success: false, count: 0, duplicates: 0, updated: 0, error: error.message };
    }
  }

  async savePSUsSimple(psuData) {
    const collection = this.db.collection('psus');
    let newCount = 0;
    let duplicateCount = 0;
    let updatedCount = 0;
    
    for (const psu of psuData) {
      try {
        // Check for duplicate by name and source
        const existingPSU = await collection.findOne({ 
          name: psu.name,
          source: psu.source 
        });
        
        if (existingPSU) {
          // Update existing PSU with new data
          await collection.updateOne(
            { _id: existingPSU._id },
            { 
              $set: {
                ...psu,
                updatedAt: new Date()
              }
            }
          );
          updatedCount++;
          Logger.debug(`Updated PSU: ${psu.name}`);
        } else {
          // Insert new PSU
          await collection.insertOne({
            ...psu,
            createdAt: new Date(),
            updatedAt: new Date()
          });
          newCount++;
          Logger.debug(`Added new PSU: ${psu.name}`);
        }
      } catch (error) {
        Logger.error(`Error saving PSU ${psu.name}:`, error);
      }
    }
    
    Logger.info(`PSU save summary: ${newCount} new, ${duplicateCount} duplicates, ${updatedCount} updated`);
    return { newCount, duplicateCount, updatedCount };
  }

  determineSite(url) {
    if (url.includes('amazon.com')) return 'amazon';
    if (url.includes('newegg.com')) return 'newegg';
    if (url.includes('bestbuy.com')) return 'bestbuy';
    throw new Error(`Unsupported site: ${url}`);
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
      Logger.info('Browser closed');
    }
  }
}

module.exports = { PSUDataPopulator };