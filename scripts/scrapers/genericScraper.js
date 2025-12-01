const BaseScraper = require('./baseScraper');

class GenericScraper extends BaseScraper {
  async extractProducts(page, cardName, sourceUrl) {
    return await page.evaluate((cardName, selectors, sourceUrl) => {
      const products = [];
      
      for (const containerSelector of selectors.containers) {
        const items = document.querySelectorAll(containerSelector);
        if (items.length === 0) continue;
        
        items.forEach((item, index) => {
          try {
            const text = item.textContent.toLowerCase();
            const cleanText = text.replace(/[™®©]/g, '');
            const cleanCardName = cardName.toLowerCase();
            
            const isSuperVariant = cleanText.includes('super');
            const isTiVariant = /\b4070\s+ti\b/i.test(cleanText);
            
            if (cleanCardName === 'rtx 4070' && (isSuperVariant || isTiVariant)) {
              // Skip variants
            } else if (cleanText.includes(cleanCardName)) {
              const linkElement = item.querySelector(selectors.link);
              
              let titleElement = null;
              for (const titleSelector of selectors.title) {
                titleElement = item.querySelector(titleSelector);
                if (titleElement) break;
              }
              
              const priceElement = item.querySelector(selectors.price.join(', '));
              const imageElement = item.querySelector(selectors.image);
              
              const title = titleElement?.textContent?.trim() || text.substring(0, 100);
              const productUrl = linkElement?.href || sourceUrl;
              const imageUrl = imageElement?.src || '';
              
              let finalPrice = null;
              if (priceElement && priceElement.textContent.includes('$')) {
                const cleanPrice = priceElement.textContent.replace(/[^0-9.]/g, '');
                if (cleanPrice && cleanPrice !== '0' && cleanPrice.length > 1) {
                  finalPrice = parseFloat(cleanPrice);
                }
              }
              
              console.log(`🔍 Generic Item ${index + 1} Price Debug:`);
              console.log(`   Title: ${title.substring(0, 60)}...`);
              console.log(`   Extracted Price: $${finalPrice}`);
              
              if (finalPrice) {
                console.log(`✅ Generic: Found matching product - Price: $${finalPrice}`);
                products.push({
                  name: title,
                  basePrice: finalPrice,
                  salePrice: null,
                  isOnSale: false,
                  currentPrice: finalPrice,
                  sourceUrl: productUrl,
                  imageUrl: imageUrl,
                  source: new URL(sourceUrl).hostname,
                  scrapedAt: new Date().toISOString()
                });
              }
            }
          } catch (e) {
            // Continue to next item
          }
        });
        
        if (products.length > 0) break;
      }
      
      return products;
    }, cardName, this.selectors, sourceUrl);
  }
}

module.exports = GenericScraper;