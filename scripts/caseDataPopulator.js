const { connectToDatabase, getDatabase } = require('../config/database');
const puppeteer = require('puppeteer');

const config = require('./config/scrapeConfig');
const Logger = require('./utils/logger');
const DatabaseService = require('./services/databaseService');

const AmazonScraperSimple = require('./scrapers/amazonScraperSimple');

class CaseDataPopulator {
  constructor() {
    this.db = null;
    this.browser = null;
    this.databaseService = null;
    this.initializeScrapers();
  }

  initializeScrapers() {
    this.scrapers = {
      amazon: new AmazonScraperSimple('amazon', config.sites.amazon.selectors)
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

  /**
   * Extract form factor from product name
   */
  extractFormFactor(text) {
    const textLower = text.toLowerCase();
    const formFactors = [];

    if (textLower.includes('e-atx') || textLower.includes('eatx') || textLower.includes('extended atx')) {
      formFactors.push('E-ATX');
    }
    if (textLower.includes('atx') && !textLower.includes('matx') && !textLower.includes('m-atx') && !formFactors.includes('E-ATX')) {
      formFactors.push('ATX');
    }
    if (textLower.includes('matx') || textLower.includes('m-atx') || textLower.includes('micro atx') || textLower.includes('micro-atx')) {
      formFactors.push('mATX');
    }
    if (textLower.includes('mini-itx') || textLower.includes('mini itx') || textLower.includes('itx')) {
      formFactors.push('ITX');
    }

    return formFactors.length > 0 ? formFactors : ['ATX']; // Default to ATX
  }

  /**
   * Extract color from product name
   */
  extractColor(text) {
    const textLower = text.toLowerCase();
    const colors = [];

    if (textLower.includes('black')) colors.push('Black');
    if (textLower.includes('white')) colors.push('White');
    if (textLower.includes('gray') || textLower.includes('grey')) colors.push('Gray');
    if (textLower.includes('red')) colors.push('Red');
    if (textLower.includes('blue')) colors.push('Blue');
    if (textLower.includes('silver')) colors.push('Silver');
    if (textLower.includes('pink')) colors.push('Pink');
    if (textLower.includes('purple')) colors.push('Purple');

    return colors.length > 0 ? colors : ['Black']; // Default to Black
  }

  /**
   * Detect RGB support from product name
   */
  hasRGBSupport(text) {
    const textLower = text.toLowerCase();
    return textLower.includes('rgb') ||
           textLower.includes('argb') ||
           textLower.includes('a-rgb') ||
           textLower.includes('lighting') ||
           textLower.includes('led');
  }

  /**
   * Extract manufacturer from product name
   */
  extractManufacturer(title) {
    const manufacturers = [
      'NZXT', 'Corsair', 'Fractal Design', 'Lian Li', 'Cooler Master',
      'Thermaltake', 'Phanteks', 'be quiet!', 'Silverstone', 'ASUS',
      'MSI', 'Antec', 'Deepcool', 'DeepCool', 'InWin', 'Rosewill', 'Montech',
      'Cougar', 'Aerocool', 'Jonsbo', 'SilverStone'
    ];

    for (const manufacturer of manufacturers) {
      if (title.toLowerCase().includes(manufacturer.toLowerCase())) {
        return manufacturer;
      }
    }

    // Try to extract from first word
    const firstWord = title.split(' ')[0];
    return firstWord || 'Generic';
  }

  /**
   * Parse case product and enrich with specifications
   */
  parseCaseProduct(product) {
    try {
      const originalName = product.name || product.title || '';
      const name = originalName.toLowerCase();

      // Validate product name
      const brandOnlyPattern = /^(nzxt|corsair|fractal|lian\s+li|cooler\s+master|thermaltake|phanteks|be\s+quiet|silverstone|asus|msi|antec|deepcool|inwin|rosewill|montech|cougar|aerocool|jonsbo)$/i;
      if (brandOnlyPattern.test(originalName.trim())) {
        Logger.warn(`   Skipping product with incomplete name: "${originalName}"`);
        return null;
      }

      // Reject products with names that are too short
      if (originalName.trim().length < 10) {
        Logger.warn(`   Skipping product with too short name: "${originalName}"`);
        return null;
      }

      // Skip if doesn't appear to be a case
      if (!name.includes('case') && !name.includes('chassis') && !name.includes('tower')) {
        Logger.warn(`   Skipping non-case product: "${originalName}"`);
        return null;
      }

      // Extract specifications
      const formFactor = this.extractFormFactor(originalName);
      const color = this.extractColor(originalName);
      const hasRGB = this.hasRGBSupport(originalName);
      const manufacturer = this.extractManufacturer(originalName);

      // Check for tempered glass
      const hasWindow = name.includes('glass') ||
                       name.includes('window') ||
                       name.includes('tempered') ||
                       name.includes('tg');

      // Prepare case document
      const caseDoc = {
        name: originalName,
        title: originalName,
        manufacturer: manufacturer,
        brand: manufacturer,
        formFactor: formFactor,
        motherboardSupport: formFactor, // Same as form factor
        specifications: {
          color: color,
          hasRGB: hasRGB,
          window: hasWindow
        },
        features: [],
        price: product.price,
        currentPrice: product.price,
        basePrice: product.price,
        imageUrl: product.imageUrl,
        sourceUrl: product.sourceUrl || product.productUrl,
        source: product.source || 'Amazon',
        createdAt: new Date(),
        updatedAt: new Date(),
        priceHistory: [{
          price: product.price,
          date: new Date(),
          source: product.sourceUrl || product.productUrl
        }]
      };

      // Add features
      if (hasRGB) {
        caseDoc.features.push('RGB Lighting');
      }
      if (hasWindow) {
        caseDoc.features.push('Tempered Glass');
      }
      if (name.includes('mesh')) {
        caseDoc.features.push('Mesh Front Panel');
      }
      if (name.includes('usb-c') || name.includes('usbc')) {
        caseDoc.features.push('USB-C');
      }

      return caseDoc;

    } catch (error) {
      Logger.error(`Error parsing case product: ${error.message}`);
      return null;
    }
  }

  /**
   * Main method to populate case data from a URL
   */
  async populateCaseData(url, searchTerm) {
    try {
      Logger.info(`Scraping: ${url}`);

      const scraper = this.scrapers.amazon;
      const page = await this.browser.newPage();

      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
      await page.setViewport({ width: 1920, height: 1080 });

      // Navigate to page
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
      await scraper.waitForContent(page);

      // Extract products
      const products = await scraper.extractProducts(page, searchTerm, 'case');
      await page.close();

      if (!products || products.length === 0) {
        Logger.warn(`No products found for: ${searchTerm}`);
        return { success: false, count: 0, duplicates: 0, updated: 0 };
      }

      Logger.info(`Found ${products.length} raw products`);

      let newCount = 0;
      let duplicateCount = 0;
      let updatedCount = 0;

      const collection = this.db.collection('cases');

      for (const product of products) {
        const parsedCase = this.parseCaseProduct(product);

        if (!parsedCase) {
          continue;
        }

        // Check for duplicates
        const existing = await collection.findOne({
          $or: [
            { name: parsedCase.name },
            { sourceUrl: parsedCase.sourceUrl }
          ]
        });

        if (existing) {
          // Update price history
          await collection.updateOne(
            { _id: existing._id },
            {
              $set: {
                price: parsedCase.price,
                currentPrice: parsedCase.price,
                updatedAt: new Date()
              },
              $push: {
                priceHistory: {
                  price: parsedCase.price,
                  date: new Date(),
                  source: parsedCase.sourceUrl
                }
              }
            }
          );
          duplicateCount++;
          Logger.info(`   Updated: ${parsedCase.name.substring(0, 60)}...`);
        } else {
          // Insert new case
          await collection.insertOne(parsedCase);
          newCount++;
          Logger.success(`   Added: ${parsedCase.name.substring(0, 60)}...`);
          Logger.info(`      Form Factor: ${parsedCase.formFactor.join(', ')} | Color: ${parsedCase.specifications.color.join(', ')} | RGB: ${parsedCase.specifications.hasRGB ? 'Yes' : 'No'} | $${parsedCase.price}`);
        }
      }

      return {
        success: true,
        count: newCount,
        duplicates: duplicateCount,
        updated: updatedCount
      };

    } catch (error) {
      Logger.error(`Error populating case data: ${error.message}`);
      return { success: false, count: 0, duplicates: 0, updated: 0, error: error.message };
    }
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
      Logger.info('Browser closed');
    }
  }
}

module.exports = { CaseDataPopulator };
