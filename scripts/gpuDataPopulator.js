const { connectToDatabase, getDatabase } = require('../config/database');
const puppeteer = require('puppeteer');
const readline = require('readline');

const config = require('./config/scrapeConfig');
const Logger = require('./utils/logger');
const DataEnrichmentService = require('./services/dataEnrichmentService');
const DatabaseService = require('./services/databaseService');

const NeweggScraper = require('./scrapers/neweggScraper');
const AmazonScraper = require('./scrapers/amazonScraper');
const BestBuyScraper = require('./scrapers/bestbuyScraper');
const MicrocenterScraper = require('./scrapers/microcenterScraper');
const GenericScraper = require('./scrapers/genericScraper');

class GPUDataPopulator {
  constructor() {
    this.db = null;
    this.browser = null;
    this.databaseService = null;
    this.initializeScrapers();
  }

  initializeScrapers() {
    this.scrapers = {
      newegg: new NeweggScraper('newegg', config.sites.newegg.selectors),
      amazon: new AmazonScraper('amazon', config.sites.amazon.selectors),
      bestbuy: new BestBuyScraper('bestbuy', config.sites.bestbuy.selectors),
      microcenter: new MicrocenterScraper('microcenter', config.sites.microcenter.selectors),
      generic: new GenericScraper('generic', config.sites.generic.selectors)
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

  async closeBrowser() {
    if (this.browser) {
      await this.browser.close();
      Logger.info('Browser closed');
    }
  }

  async populateGPUData(url, cardName) {
    try {
      const fullUrl = this.ensureProtocol(url);
      Logger.info(`Searching for ${cardName} at: ${fullUrl}`);
      
      const page = await this.browser.newPage();
      await page.setUserAgent(config.browser.userAgent);
      
      Logger.info(`Navigating to: ${fullUrl}`);
      
      try {
        await page.goto(fullUrl, { waitUntil: 'networkidle2', timeout: config.browser.timeout });
        Logger.success('Page loaded successfully');
      } catch (error) {
        Logger.warn(`Navigation failed with networkidle2, trying domcontentloaded: ${error.message}`);
        try {
          await page.goto(fullUrl, { waitUntil: 'domcontentloaded', timeout: config.browser.timeout });
          Logger.success('Page loaded with domcontentloaded');
        } catch (fallbackError) {
          Logger.error(`Navigation completely failed: ${fallbackError.message}`);
          throw fallbackError;
        }
      }
      
      const siteType = this.detectSiteType(url);
      Logger.info(`Detected site type: ${siteType}`);
      Logger.info(`Using ${siteType} scraping strategy...`);
      
      let gpuData = [];
      const scraper = this.scrapers[siteType] || this.scrapers.generic;
      
      if (siteType === 'generic') {
        gpuData = await scraper.scrape(page, cardName, fullUrl);
      } else {
        gpuData = await scraper.scrape(page, cardName);
      }
      
      await page.close();
      
      Logger.summary(siteType, gpuData);
      
      if (gpuData.length > 0) {
        const enrichedData = DataEnrichmentService.enrichGPUData(gpuData, cardName);
        await this.databaseService.saveGPUData(enrichedData, cardName);
        Logger.success(`Successfully populated ${gpuData.length} ${cardName} variants`);
      } else {
        Logger.warn(`No GPU data found for ${cardName}`);
      }
      
      return gpuData;
      
    } catch (error) {
      Logger.error(`Error populating GPU data: ${error.message}`);
      throw error;
    }
  }

  ensureProtocol(url) {
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      return `https://${url}`;
    }
    return url;
  }

  detectSiteType(url) {
    for (const [siteType, siteConfig] of Object.entries(config.sites)) {
      if (siteConfig.patterns && siteConfig.patterns.some(pattern => url.includes(pattern))) {
        return siteType;
      }
    }
    return 'generic';
  }
}

// Command line interface
async function runCommandLine(cardName, url) {
  const populator = new GPUDataPopulator();
  
  try {
    Logger.info('GPU Data Populator');
    Logger.info('=====================\n');
    
    await populator.connect();
    await populator.initBrowser();
    
    Logger.info(`Processing: ${cardName} from ${url}`);
    
    try {
      await populator.populateGPUData(url, cardName);
      Logger.success('GPU population completed successfully!');
    } catch (error) {
      Logger.error('Failed to populate data:', error.message);
      process.exit(1);
    }
    
  } catch (error) {
    Logger.error('Error:', error);
    process.exit(1);
  } finally {
    await populator.closeBrowser();
  }
}

// Interactive CLI
async function runInteractiveCLI() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const question = (prompt) => {
    return new Promise((resolve) => {
      rl.question(prompt, resolve);
    });
  };

  const populator = new GPUDataPopulator();
  
  try {
    Logger.info('GPU Data Populator');
    Logger.info('=====================\n');
    
    await populator.connect();
    await populator.initBrowser();
    
    while (true) {
      console.log('\n📝 Enter GPU details (or "quit" to exit):');
      
      const cardName = await question('GPU Card Name (e.g., "RTX 4070", "RX 7800 XT"): ');
      
      if (cardName.toLowerCase() === 'quit') {
        break;
      }
      
      const url = await question('Source URL: ');
      
      if (!url || !cardName) {
        Logger.warn('Both card name and URL are required');
        continue;
      }
      
      try {
        await populator.populateGPUData(url, cardName);
      } catch (error) {
        Logger.error('Failed to populate data:', error.message);
      }
      
      const continueChoice = await question('\n➕ Add another GPU? (y/n): ');
      if (continueChoice.toLowerCase() !== 'y') {
        break;
      }
    }
    
  } catch (error) {
    Logger.error('Error:', error);
  } finally {
    await populator.closeBrowser();
    rl.close();
  }
}

// Run if called directly
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.length >= 2) {
    const cardName = args[0];
    const url = args[1];
    
    Logger.info(`Command line mode: ${cardName} from ${url}`);
    
    runCommandLine(cardName, url)
      .then(() => {
        Logger.success('\nGPU population completed!');
        process.exit(0);
      })
      .catch((error) => {
        Logger.error('Script failed:', error);
        process.exit(1);
      });
  } else {
    Logger.info('No arguments provided, running in interactive mode...');
    Logger.info('Tip: You can also run: node script.js "RTX 4070" "https://amazon.com/..."');
    console.log('');
    
    runInteractiveCLI()
      .then(() => {
        Logger.info('\nGoodbye!');
        process.exit(0);
      })
      .catch((error) => {
        Logger.error('Script failed:', error);
        process.exit(1);
      });
  }
}

module.exports = { GPUDataPopulator };