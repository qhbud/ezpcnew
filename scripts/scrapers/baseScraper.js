const Logger = require('../utils/logger');
const PriceExtractor = require('../utils/priceExtractor');
const ProductFilter = require('../utils/productFilter');

class BaseScraper {
  constructor(siteType, selectors) {
    this.siteType = siteType;
    this.selectors = selectors;
  }

  async scrape(page, cardName) {
    try {
      Logger.scraping(this.siteType, 'Starting scrape...');
      
      await this.waitForContent(page);
      const products = await this.extractProducts(page, cardName);
      
      Logger.scraping(this.siteType, `Found ${products.length} matching products`);
      return products;
      
    } catch (error) {
      Logger.error(`Error scraping ${this.siteType}: ${error.message}`);
      return [];
    }
  }

  async waitForContent(page) {
    // Override in subclasses
    await page.waitForTimeout(2000);
  }

  async extractProducts(page, cardName) {
    // Override in subclasses
    throw new Error('extractProducts must be implemented by subclass');
  }

  createProductData(title, price, productUrl, imageUrl, source) {
    const productData = {
      name: title,
      basePrice: price,
      salePrice: null,
      isOnSale: false,
      currentPrice: price,
      sourceUrl: productUrl,
      imageUrl: imageUrl,
      source: source,
      scrapedAt: new Date().toISOString()
    };

    return ProductFilter.normalizeProductData(productData);
  }

  logPriceDebug(index, title, priceElement, extractedPrice) {
    const debugData = {
      title,
      priceElementFound: Boolean(priceElement),
      rawPriceText: priceElement?.textContent?.trim() || '',
      containsDollar: priceElement?.textContent?.includes('$') || false,
      extractedPrice,
      elementClasses: priceElement?.className || ''
    };
    
    Logger.priceDebug(index, this.siteType, debugData);
  }
}

module.exports = BaseScraper;