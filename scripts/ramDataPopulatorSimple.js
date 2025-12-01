const { connectToDatabase, getDatabase } = require('../config/database');
const puppeteer = require('puppeteer');

const Logger = require('./utils/logger');
const RAMProductFilterLenient = require('./utils/ramProductFilterLenient');

class RamDataPopulatorSimple {
  constructor() {
    this.db = null;
    this.browser = null;
  }

  async connect() {
    await connectToDatabase();
    this.db = getDatabase();
    Logger.success('Connected to database');
  }

  async initBrowser() {
    this.browser = await puppeteer.launch({
      headless: false,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor'
      ]
    });
    
    Logger.info('Browser initialized');
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
                console.log(`Found product ${index + 1}: ${title.substring(0, 60)}... Price: $${finalPrice || 'N/A'}`);
                
                products.push({
                  name: title,
                  title: title,
                  basePrice: finalPrice,
                  currentPrice: finalPrice,
                  price: finalPrice,
                  sourceUrl: productUrl.startsWith('http') ? productUrl : `https://amazon.com${productUrl}`,
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
          
          // Save to database with SIMPLE duplicate detection
          const result = await this.saveRamSimple(enrichedRam);
          
          Logger.success(`✅ Successfully processed ${validRamProducts.length} RAM modules`);
          Logger.info(`   New RAM modules saved: ${result.newCount}`);
          Logger.info(`   Duplicates skipped: ${result.duplicateCount}`);
          
          return {
            success: true,
            count: result.newCount,
            duplicates: result.duplicateCount,
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

  // Simple save method - only check URL for duplicates
  async saveRamSimple(ramData) {
    const collection = this.db.collection('rams');
    let newCount = 0;
    let duplicateCount = 0;
    
    for (const ram of ramData) {
      try {
        // Only check for duplicate by sourceUrl (much simpler)
        const existingRam = await collection.findOne({ sourceUrl: ram.sourceUrl });
        
        if (existingRam) {
          duplicateCount++;
          Logger.debug(`Duplicate skipped: ${ram.title}`);
        } else {
          // Insert new RAM
          await collection.insertOne({
            ...ram,
            createdAt: new Date(),
            updatedAt: new Date()
          });
          
          newCount++;
          Logger.debug(`Inserted new RAM: ${ram.title}`);
        }
      } catch (itemError) {
        Logger.warn(`Failed to save RAM: ${ram.title || 'Unknown'} - ${itemError.message}`);
      }
    }
    
    return { newCount, duplicateCount };
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

module.exports = { RamDataPopulatorSimple };