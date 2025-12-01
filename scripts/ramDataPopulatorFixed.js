const { connectToDatabase, getDatabase } = require('../config/database');
const puppeteer = require('puppeteer');

const config = require('./config/scrapeConfig');
const Logger = require('./utils/logger');
const DatabaseService = require('./services/databaseService');
const RAMProductFilterLenient = require('./utils/ramProductFilterLenient');

class RamDataPopulatorFixed {
  constructor() {
    this.db = null;
    this.browser = null;
    this.databaseService = null;
  }

  async connect() {
    await connectToDatabase();
    this.db = getDatabase();
    this.databaseService = new DatabaseService(this.db);
    Logger.success('Connected to database');
  }

  async initBrowser() {
    this.browser = await puppeteer.launch({
      headless: false, // Set to false for debugging
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor'
      ]
    });
    
    Logger.info('Browser initialized');
  }

  // Extract RAM model and specifications for collection naming
  extractRamModel(searchTerm) {
    const term = searchTerm.toLowerCase();
    
    // DDR5 speeds
    if (term.includes('ddr5-8000') || term.includes('ddr5 8000')) return 'ddr5_8000';
    if (term.includes('ddr5-7600') || term.includes('ddr5 7600')) return 'ddr5_7600';
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
    
    // Generic DDR type fallback
    if (term.includes('ddr5')) return 'ddr5_general';
    if (term.includes('ddr4')) return 'ddr4_general';
    
    return 'ram_general';
  }

  // Scrape RAM from Amazon search results directly
  async scrapeRamFromAmazon(searchUrl, ramModel) {
    try {
      Logger.info(`🔍 Scraping RAM from Amazon: ${ramModel}`);
      Logger.info(`   Search URL: ${searchUrl}`);

      const page = await this.browser.newPage();
      
      try {
        // Navigate to search page
        await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 60000 });
        Logger.success('✅ Page loaded successfully');

        // Wait for search results
        await page.waitForSelector('[data-component-type="s-search-result"]', { timeout: 10000 });
        
        // Extract all RAM products from search results
        const ramProducts = await page.evaluate(() => {
          const products = [];
          const items = document.querySelectorAll('[data-component-type="s-search-result"]');
          
          items.forEach((item, index) => {
            try {
              const titleElement = item.querySelector('h2 a span, h2 span, .s-size-mini span');
              const priceElement = item.querySelector('.a-price-whole, .a-price .a-offscreen');
              const linkElement = item.querySelector('h2 a');
              const imageElement = item.querySelector('img');
              
              const title = titleElement?.textContent?.trim() || '';
              const priceText = priceElement?.textContent || '';
              const productUrl = linkElement?.href || '';
              const imageUrl = imageElement?.src || '';
              
              // Extract price
              let finalPrice = null;
              if (priceText) {
                const priceMatch = priceText.match(/[\d,]+\.?\d*/);
                if (priceMatch) {
                  finalPrice = parseFloat(priceMatch[0].replace(/,/g, ''));
                }
              }
              
              if (title && title.length > 10) {
                // Fix URL - make it unique for each product
                let finalUrl = productUrl;
                if (!finalUrl || finalUrl === '') {
                  finalUrl = `https://amazon.com/product-${index}-${Date.now()}`;
                } else if (!finalUrl.startsWith('http')) {
                  if (finalUrl.startsWith('/')) {
                    finalUrl = `https://amazon.com${finalUrl}`;
                  } else {
                    finalUrl = `https://amazon.com/${finalUrl}`;
                  }
                }
                
                console.log(`Found product ${index + 1}: ${title.substring(0, 60)}... Price: $${finalPrice || 'N/A'} URL: ${finalUrl.substring(0, 50)}...`);
                
                products.push({
                  name: title,
                  title: title,
                  basePrice: finalPrice,
                  currentPrice: finalPrice,
                  price: finalPrice,
                  sourceUrl: finalUrl,
                  imageUrl: imageUrl,
                  source: 'Amazon',
                  scrapedAt: new Date().toISOString()
                });
              }
            } catch (e) {
              console.log(`Error processing item ${index + 1}:`, e.message);
            }
          });
          
          return products;
        });

        Logger.info(`📦 Found ${ramProducts.length} products on page`);
        
        // Filter products using lenient RAM filter
        const validRamProducts = ramProducts.filter(product => {
          const isValid = RAMProductFilterLenient.validateProduct(product);
          const matchesSearch = RAMProductFilterLenient.matchesSearchCriteria(product.title, ramModel);
          
          if (isValid && matchesSearch) {
            Logger.info(`✅ Valid RAM: ${product.title.substring(0, 60)}...`);
            return true;
          } else {
            Logger.debug(`❌ Filtered out: ${product.title.substring(0, 60)}... (Valid: ${isValid}, Matches: ${matchesSearch})`);
            return false;
          }
        });
        
        Logger.info(`✅ ${validRamProducts.length} valid RAM products after filtering`);
        
        if (validRamProducts.length > 0) {
          // Enrich RAM data
          const enrichedRam = this.enrichRamData(validRamProducts, ramModel);
          
          // Save to database
          const collectionName = 'rams';
          const result = await this.databaseService.saveRamWithDuplicateDetection(enrichedRam, collectionName);
          
          Logger.success(`✅ Successfully processed ${validRamProducts.length} RAM modules`);
          Logger.info(`   New RAM modules saved: ${result.newCount}`);
          Logger.info(`   Duplicates skipped: ${result.duplicateCount}`);
          Logger.info(`   Updated RAM modules: ${result.updatedCount || 0}`);
          
          return {
            success: true,
            count: result.newCount,
            duplicates: result.duplicateCount,
            updated: result.updatedCount || 0,
            total: validRamProducts.length,
            ram: enrichedRam
          };
        } else {
          Logger.warn(`⚠️  No valid RAM products found for ${ramModel}`);
          return {
            success: false,
            count: 0,
            message: 'No valid RAM products found'
          };
        }

      } finally {
        await page.close();
      }

    } catch (error) {
      Logger.error(`❌ RAM scraping failed: ${error.message}`);
      throw error;
    }
  }

  // Enrich RAM data with specifications
  enrichRamData(ramModules, ramModel) {
    return ramModules.map(ram => {
      const enrichedRam = { ...ram };
      
      // Add RAM-specific fields
      enrichedRam.category = 'ram';
      enrichedRam.ramGroup = ramModel;
      enrichedRam.createdAt = new Date();
      enrichedRam.updatedAt = new Date();
      
      // Extract RAM specifications from title using our lenient filter
      const specs = RAMProductFilterLenient.extractRAMSpecs(ram.title || ram.name || '');
      
      // Add extracted specs to the RAM object
      if (specs.memoryType) enrichedRam.memoryType = specs.memoryType;
      if (specs.speed) enrichedRam.speed = specs.speed;
      if (specs.capacity) enrichedRam.capacity = specs.capacity;
      if (specs.kitConfiguration) enrichedRam.kitConfiguration = specs.kitConfiguration;
      if (specs.latency) enrichedRam.latency = specs.latency;
      if (specs.manufacturer) enrichedRam.manufacturer = specs.manufacturer;
      
      // Additional specifications object
      enrichedRam.specifications = {
        rgb: specs.rgb || false,
        heatSpreader: /heat.?spreader|aluminum|cooling/i.test(ram.title || ''),
        overclock: /xmp|expo|docp/i.test(ram.title || '') ? 'XMP' : 'JEDEC',
        voltage: specs.memoryType === 'DDR5' ? '1.1V' : '1.2V',
        ecc: /ecc|error.?correcting/i.test(ram.title || ''),
        formFactor: /so-?dimm|laptop|notebook/i.test(ram.title || '') ? 'SO-DIMM' : 'DIMM'
      };
      
      // Determine performance tier
      enrichedRam.performanceTier = this.determinePerformanceTier(ram.title || '');
      
      return enrichedRam;
    });
  }

  // Determine performance tier based on specifications
  determinePerformanceTier(title) {
    const titleLower = title.toLowerCase();
    const speedMatch = title.match(/(\d{4})/);
    const speed = speedMatch ? parseInt(speedMatch[1]) : 0;
    
    // High-end gaming/enthusiast RAM
    if ((titleLower.includes('ddr5') && speed >= 6000) ||
        (titleLower.includes('ddr4') && speed >= 3600) ||
        titleLower.includes('trident') || titleLower.includes('dominator') ||
        titleLower.includes('royal') || titleLower.includes('gamer')) {
      return 'High-End';
    }
    
    // Performance gaming RAM
    if ((titleLower.includes('ddr5') && speed >= 5200) ||
        (titleLower.includes('ddr4') && speed >= 3200) ||
        titleLower.includes('vengeance') || titleLower.includes('ripjaws') ||
        titleLower.includes('fury') || titleLower.includes('ballistix')) {
      return 'Performance';
    }
    
    // Mainstream RAM
    if ((titleLower.includes('ddr5') && speed >= 4800) ||
        (titleLower.includes('ddr4') && speed >= 2666)) {
      return 'Mainstream';
    }
    
    // Entry-level RAM
    return 'Entry-Level';
  }

  // Cleanup resources
  async close() {
    if (this.browser) {
      await this.browser.close();
      Logger.info('🚪 Browser closed');
    }
  }
}

module.exports = { RamDataPopulatorFixed };