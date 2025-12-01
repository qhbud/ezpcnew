const { connectToDatabase, getDatabase } = require('../config/database');
const puppeteer = require('puppeteer');

const config = require('./config/scrapeConfig');
const Logger = require('./utils/logger');
const DataEnrichmentService = require('./services/dataEnrichmentService');
const DatabaseService = require('./services/databaseService');

const AmazonScraperSimple = require('./scrapers/amazonScraperSimple');
const NeweggScraper = require('./scrapers/neweggScraper');
const BestBuyScraper = require('./scrapers/bestbuyScraper');

class StorageDataPopulator {
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

  // Extract storage type and capacity from search term
  extractStorageInfo(searchTerm) {
    const term = searchTerm.toLowerCase();

    // Extract capacity
    const capacityMatch = term.match(/(\d+(?:\.\d+)?)\s*(tb|gb)/i);
    let capacity = null;
    let capacityGB = null;

    if (capacityMatch) {
      const size = parseFloat(capacityMatch[1]);
      const unit = capacityMatch[2].toLowerCase();
      capacity = `${capacityMatch[1]}${unit.toUpperCase()}`;
      capacityGB = unit === 'tb' ? size * 1000 : size;
    }

    // Extract storage type - Simplified to HDD, M.2 SSD, or Other SSD
    let storageType = null;
    if (term.includes('hdd') || term.includes('hard drive') || term.includes('harddrive')) {
      storageType = 'HDD';
    }
    else if (term.includes('m.2') || term.includes('m2') || term.includes('nvme')) {
      storageType = 'M.2 SSD';
    }
    else if (term.includes('ssd') || term.includes('2.5') && term.includes('ssd')) {
      storageType = 'Other SSD';
    }

    // Extract interface
    let interfaceType = null;
    if (term.includes('nvme')) interfaceType = 'pcie_nvme';
    else if (term.includes('pcie') || term.includes('pci-e')) interfaceType = 'pcie';
    else if (term.includes('sata')) interfaceType = 'sata';
    else if (term.includes('m.2')) interfaceType = 'm2';

    // Extract form factor
    let formFactor = null;
    if (term.includes('m.2 2280') || term.includes('m2 2280')) formFactor = 'm2_2280';
    else if (term.includes('m.2 2260') || term.includes('m2 2260')) formFactor = 'm2_2260';
    else if (term.includes('m.2 2242') || term.includes('m2 2242')) formFactor = 'm2_2242';
    else if (term.includes('m.2') || term.includes('m2')) formFactor = 'm2_2280'; // default M.2
    else if (term.includes('2.5')) formFactor = '2.5';
    else if (term.includes('3.5')) formFactor = '3.5';

    return {
      capacity,
      capacityGB,
      storageType,
      interfaceType,
      formFactor
    };
  }

  // Parse storage product for specifications
  parseStorageProduct(product, searchInfo) {
    try {
      const originalName = product.name || product.title || '';
      const name = originalName.toLowerCase();
      const description = (product.description || '').toLowerCase();
      const fullText = `${name} ${description}`;

      // Validate product name - reject if it's just a brand name or too short
      const brandOnlyPattern = /^(samsung|kingston|crucial|wd|western\s+digital|seagate|corsair|pny|patriot|mushkin|adata|gigabyte|msi|teamgroup|team|silicon\s+power|inland|sk\s+hynix|intel|micron|sabrent|lexar|verbatim|transcend|toshiba|hitachi|maxtor|sandisk|six|acer)$/i;
      if (brandOnlyPattern.test(originalName.trim())) {
        Logger.warn(`   Skipping product with incomplete name: "${originalName}"`);
        return null;
      }

      // Reject products with names that are too short (likely incomplete)
      if (originalName.trim().length < 10) {
        Logger.warn(`   Skipping product with too short name: "${originalName}"`);
        return null;
      }

      // Extract capacity from title/description
      let capacity = searchInfo.capacity;
      let capacityGB = searchInfo.capacityGB;

      if (!capacity) {
        const capacityMatch = fullText.match(/(\d+(?:\.\d+)?)\s*(tb|gb)/i);
        if (capacityMatch) {
          const size = parseFloat(capacityMatch[1]);
          const unit = capacityMatch[2].toLowerCase();
          capacity = `${capacityMatch[1]}${unit.toUpperCase()}`;
          capacityGB = unit === 'tb' ? size * 1000 : size;
        }
      }

      // Extract form factor FIRST (needed for storage type detection)
      let formFactor = searchInfo.formFactor;
      if (!formFactor) {
        if (fullText.includes('m.2 2280') || fullText.includes('m2 2280')) formFactor = 'm2_2280';
        else if (fullText.includes('m.2 2260') || fullText.includes('m2 2260')) formFactor = 'm2_2260';
        else if (fullText.includes('m.2 2242') || fullText.includes('m2 2242')) formFactor = 'm2_2242';
        else if (fullText.includes('m.2') || fullText.includes('m2')) formFactor = 'm2_2280';
        else if (fullText.includes('2.5"') || fullText.includes('2.5 inch')) formFactor = '2.5';
        else if (fullText.includes('3.5"') || fullText.includes('3.5 inch')) formFactor = '3.5';
      }

      // Extract interface FIRST (needed for storage type detection)
      let interfaceType = searchInfo.interfaceType;
      if (!interfaceType) {
        if (fullText.includes('nvme')) interfaceType = 'pcie_nvme';
        else if (fullText.includes('pcie 4.0') || fullText.includes('pci-e 4.0') || fullText.includes('gen 4')) interfaceType = 'pcie_4.0';
        else if (fullText.includes('pcie 3.0') || fullText.includes('pci-e 3.0') || fullText.includes('gen 3')) interfaceType = 'pcie_3.0';
        else if (fullText.includes('pcie') || fullText.includes('pci-e')) interfaceType = 'pcie';
        else if (fullText.includes('sata iii') || fullText.includes('sata 3')) interfaceType = 'sata_3';
        else if (fullText.includes('sata')) interfaceType = 'sata';
      }

      // Extract storage type - Simplified to HDD, M.2 SSD, or SATA SSD
      let storageType = null;

      // IMPORTANT: Check for SSD indicators FIRST before HDD
      // This prevents "Solid State Hard Drive" from being classified as HDD

      // Check if it's an M.2 SSD (includes both NVMe and SATA M.2)
      if (fullText.includes('m.2') || fullText.includes('m2') || fullText.includes('nvme')) {
        storageType = 'M.2 SSD';
      }
      // Check if it's a SATA SSD (2.5" SATA, etc.)
      else if ((fullText.includes('ssd') || fullText.includes('solid state')) &&
               (interfaceType === 'sata' || interfaceType === 'sata_3' || fullText.includes('sata'))) {
        storageType = 'SATA SSD';
      }
      // Check if it's any other SSD
      else if (fullText.includes('ssd') || fullText.includes('solid state')) {
        storageType = 'Other SSD';
      }
      // Check if it's a traditional hard drive (HDD)
      else if (fullText.includes('hdd') || fullText.includes('hard drive') || fullText.includes('harddrive') || fullText.includes(' rpm')) {
        storageType = 'HDD';
      }
      // Default fallback based on form factor
      else if (formFactor === '3.5' || formFactor === '2.5') {
        storageType = 'HDD';
      }
      else {
        storageType = 'SATA SSD'; // Default to SATA SSD if unclear
      }

      // Extract brand - improved to handle variations like "WD_BLACK", "wd black", etc.
      let brand = null;

      // Check for WD variants first (WD_BLACK, WD BLACK, WD_BLUE, etc.)
      if (/\bwd[_\s]?black\b/i.test(fullText)) brand = 'WD Black';
      else if (/\bwd[_\s]?blue\b/i.test(fullText)) brand = 'WD Blue';
      else if (/\bwd[_\s]?red\b/i.test(fullText)) brand = 'WD Red';
      else if (/\bwd[_\s]?green\b/i.test(fullText)) brand = 'WD Green';
      else if (/\bwestern\s+digital\b/i.test(fullText)) brand = 'Western Digital';
      else if (/\bwd\b/i.test(fullText)) brand = 'WD';
      // Check for other brands
      else {
        const brandMatch = fullText.match(/\b(samsung|seagate|crucial|kingston|sandisk|corsair|pny|patriot|mushkin|adata|gigabyte|acer|msi|teamgroup|team|silicon power|inland|sk hynix|intel|micron|sabrent|lexar|verbatim|transcend|toshiba|hitachi|maxtor|six)\b/i);
        brand = brandMatch ? brandMatch[1] : null;
      }

      // Capitalize brand name properly
      if (brand) {
        brand = brand.charAt(0).toUpperCase() + brand.slice(1).toLowerCase();
        // Fix specific brand capitalizations
        if (brand.toLowerCase() === 'wd') brand = 'WD';
        else if (brand.toLowerCase() === 'samsung') brand = 'Samsung';
        else if (brand.toLowerCase() === 'seagate') brand = 'Seagate';
        else if (brand.toLowerCase() === 'crucial') brand = 'Crucial';
        else if (brand.toLowerCase() === 'kingston') brand = 'Kingston';
        else if (brand.toLowerCase() === 'sandisk') brand = 'SanDisk';
        else if (brand.toLowerCase() === 'corsair') brand = 'Corsair';
        else if (brand.toLowerCase() === 'adata') brand = 'ADATA';
        else if (brand.toLowerCase() === 'msi') brand = 'MSI';
        else if (brand.toLowerCase() === 'sk hynix') brand = 'SK Hynix';
        else if (brand.toLowerCase() === 'intel') brand = 'Intel';
        else if (brand.toLowerCase() === 'lexar') brand = 'Lexar';
      }

      // Extract read/write speeds if available
      const readSpeedMatch = fullText.match(/read[:\s]+(\d+)\s*mb\/s/i);
      const writeSpeedMatch = fullText.match(/write[:\s]+(\d+)\s*mb\/s/i);
      const readSpeed = readSpeedMatch ? parseInt(readSpeedMatch[1]) : null;
      const writeSpeed = writeSpeedMatch ? parseInt(writeSpeedMatch[1]) : null;

      // Extract RPM for HDDs
      const rpmMatch = fullText.match(/(\d+)\s*rpm/i);
      const rpm = rpmMatch ? parseInt(rpmMatch[1]) : null;

      // Extract cache
      const cacheMatch = fullText.match(/(\d+)\s*mb\s*cache/i);
      const cache = cacheMatch ? parseInt(cacheMatch[1]) : null;

      // Extract NAND type (for SSDs)
      let nandType = null;
      if (fullText.includes('tlc')) nandType = 'TLC';
      else if (fullText.includes('mlc')) nandType = 'MLC';
      else if (fullText.includes('slc')) nandType = 'SLC';
      else if (fullText.includes('qlc')) nandType = 'QLC';
      else if (fullText.includes('3d nand')) nandType = '3D_NAND';

      // Handle pricing with sale support
      const storageData = {
        name: product.name || product.title,
        manufacturer: brand,
        capacity,
        capacityGB,
        storageType,
        interfaceType: interfaceType,
        formFactor,
        readSpeed,
        writeSpeed,
        rpm,
        cache,
        nandType,
        image: product.image || product.imageUrl,
        url: product.url || product.sourceUrl,
        source: product.source || 'amazon',
        description: product.description,
        availability: product.availability || 'in_stock',
        scrapedAt: new Date(),
        category: 'storage'
      };

      // Add price fields with sale support
      if (product.isOnSale && product.basePrice && product.salePrice) {
        storageData.basePrice = parseFloat(product.basePrice);
        storageData.salePrice = parseFloat(product.salePrice);
        storageData.currentPrice = parseFloat(product.salePrice);
        storageData.isOnSale = true;
        storageData.price = parseFloat(product.salePrice);
      } else {
        const price = product.price || product.currentPrice || product.basePrice;
        if (price) {
          storageData.basePrice = parseFloat(price);
          storageData.currentPrice = parseFloat(price);
          storageData.price = parseFloat(price);
          storageData.isOnSale = false;
        }
      }

      return storageData;
    } catch (error) {
      Logger.error('Error parsing storage product:', error);
      return null;
    }
  }

  // Scrape storage from Amazon or other sources
  async populateStorageData(searchUrl, storageModel) {
    try {
      Logger.info(`🔍 Starting storage data population for: ${storageModel}`);
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
        Logger.error(`   Unsupported site: ${hostname}`);
        return { success: false, error: 'Unsupported site' };
      }

      Logger.info(`   Using ${siteType} scraper...`);

      const page = await this.browser.newPage();
      let storageProducts = [];

      try {
        Logger.info('   Navigating to URL...');
        await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 60000 });
        Logger.success('   Page loaded successfully');

        await scraper.waitForContent(page);
        Logger.info('   Extracting products from page...');
        storageProducts = await scraper.extractProducts(page, storageModel, 'storage');

        Logger.success(`   Found ${storageProducts.length} storage products`);

      } catch (error) {
        Logger.error(`   Error during page scraping: ${error.message}`);
        await page.close();
        return { success: false, error: error.message };
      }

      await page.close();

      if (!storageProducts || storageProducts.length === 0) {
        Logger.warn('   No storage products found');
        return { success: false, count: 0 };
      }

      // Extract search info for enrichment
      const searchInfo = this.extractStorageInfo(storageModel);

      // Parse and save to database
      let newCount = 0;
      let duplicateCount = 0;
      let updatedCount = 0;
      const collection = this.db.collection('storages');

      for (const product of storageProducts) {
        try {
          const parsedStorage = this.parseStorageProduct(product, searchInfo);

          if (!parsedStorage || !parsedStorage.name) {
            continue;
          }

          // Check for duplicates based on URL
          const existing = await collection.findOne({ url: parsedStorage.url });

          if (existing) {
            // Update price if different
            if (existing.currentPrice !== parsedStorage.currentPrice) {
              await collection.updateOne(
                { _id: existing._id },
                {
                  $set: {
                    currentPrice: parsedStorage.currentPrice,
                    basePrice: parsedStorage.basePrice,
                    salePrice: parsedStorage.salePrice,
                    isOnSale: parsedStorage.isOnSale,
                    price: parsedStorage.price,
                    availability: parsedStorage.availability,
                    scrapedAt: new Date()
                  }
                }
              );
              updatedCount++;
            } else {
              duplicateCount++;
            }
          } else {
            // Insert new storage
            await collection.insertOne(parsedStorage);
            newCount++;
          }

        } catch (error) {
          Logger.error(`   Error processing storage: ${error.message}`);
          continue;
        }
      }

      Logger.success(`✅ Storage import complete: ${newCount} new, ${duplicateCount} duplicates, ${updatedCount} updated`);

      return {
        success: true,
        count: newCount,
        duplicates: duplicateCount,
        updated: updatedCount
      };

    } catch (error) {
      Logger.error(`Error scraping storage from Amazon: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
      Logger.info('Browser closed');
    }
  }
}

module.exports = { StorageDataPopulator };
