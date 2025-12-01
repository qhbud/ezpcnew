const BaseScraper = require('./baseScraper');
const ProductFilter = require('../utils/productFilter');
const RAMProductFilter = require('../utils/ramProductFilter');
const PriceExtractor = require('../utils/priceExtractor');
const Logger = require('../utils/logger');

class NeweggScraper extends BaseScraper {
  async waitForContent(page) {
    await page.waitForSelector(this.selectors.container, { timeout: 10000 });
  }

  async extractProducts(page, cardName, filterType = 'gpu') {
    return await page.evaluate((cardName, selectors, siteType) => {
      const products = [];
      const items = document.querySelectorAll(selectors.container);
      
      items.forEach((item, index) => {
        try {
          const titleElement = item.querySelector(selectors.title);
          const priceElement = item.querySelector(selectors.price);
          const linkElement = item.querySelector(selectors.link);
          const imageElement = item.querySelector(selectors.image);
          
          const title = titleElement?.textContent?.trim() || '';
          const productUrl = linkElement?.href || '';
          const imageUrl = imageElement?.src || '';
          
          // Extract price with validation
          let finalPrice = null;
          if (priceElement && priceElement.textContent.includes('$')) {
            const cleanPrice = priceElement.textContent.replace(/[^0-9.]/g, '');
            if (cleanPrice && cleanPrice !== '0' && cleanPrice.length > 1) {
              finalPrice = parseFloat(cleanPrice);
            }
          }
          
          console.log(`🔍 ${siteType} Item ${index + 1} Price Debug:`);
          console.log(`   Title: ${title.substring(0, 60)}...`);
          console.log(`   Price Element Found: ${priceElement ? 'Yes' : 'No'}`);
          if (priceElement) {
            console.log(`   Raw Price Text: "${priceElement.textContent}"`);
            console.log(`   Extracted Price: $${finalPrice}`);
          }
          
          if (title) {
            const cleanTitle = title.replace(/[™®©]/g, '').toLowerCase();
            const cleanCardName = cardName.toLowerCase();
            
            // Variant filtering
            const isSuperVariant = cleanTitle.includes('super') || cleanTitle.includes('4070 super');
            const isTiVariant = /\b4070\s+ti\b/i.test(cleanTitle);
            
            if (cleanCardName === 'rtx 4070' && (isSuperVariant || isTiVariant)) {
              // Skip variants
            } else if (cleanTitle.includes(cleanCardName) && finalPrice) {
              console.log(`✅ ${siteType}: Found matching product - Price: $${finalPrice}`);
              products.push({
                name: title,
                basePrice: finalPrice,
                salePrice: null,
                isOnSale: false,
                currentPrice: finalPrice,
                sourceUrl: productUrl,
                imageUrl: imageUrl,
                source: siteType.charAt(0).toUpperCase() + siteType.slice(1),
                scrapedAt: new Date().toISOString()
              });
            }
          }
        } catch (e) {
          console.log('Error processing item:', e);
        }
      });
      
      return products;
    }, cardName, this.selectors, this.siteType);
  }
}

module.exports = NeweggScraper;