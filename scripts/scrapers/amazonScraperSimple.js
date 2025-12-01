const BaseScraper = require('./baseScraper');

class AmazonScraperSimple extends BaseScraper {
  async waitForContent(page) {
    try {
      await page.waitForSelector('[data-component-type="s-search-result"], div[data-asin]', {
        timeout: 10000
      });
    } catch (error) {
      console.log('⚠️  Timeout waiting for Amazon results, continuing anyway...');
    }
  }

  async extractProducts(page, searchTerm, category = 'product') {
    return await page.evaluate((searchTerm, category) => {
      const products = [];

      // Amazon search result selectors
      const containerSelectors = [
        '[data-component-type="s-search-result"]',
        'div[data-asin]:not([data-asin=""])',
        '.s-result-item[data-asin]'
      ];

      let allItems = [];
      for (const selector of containerSelectors) {
        const items = document.querySelectorAll(selector);
        if (items.length > 0) {
          allItems = Array.from(items);
          console.log(`✅ Found ${items.length} items with selector: ${selector}`);
          break;
        }
      }

      if (allItems.length === 0) {
        console.log('❌ No product containers found on page');
        return products;
      }

      allItems.forEach((item, index) => {
        try {
          // Extract title
          let title = '';
          const titleSelectors = [
            'h2 span.a-text-normal',
            'h2 a span',
            'h2 span',
            '.a-size-base-plus',
            '.a-size-medium'
          ];

          for (const selector of titleSelectors) {
            const titleEl = item.querySelector(selector);
            if (titleEl && titleEl.textContent.trim()) {
              title = titleEl.textContent.trim();
              break;
            }
          }

          if (!title) {
            return; // Skip if no title
          }

          // Extract price
          let finalPrice = null;
          const priceSelectors = [
            '.a-price .a-offscreen',
            '.a-price-whole',
            'span.a-price span[aria-hidden="true"]',
            '.a-price span.a-offscreen'
          ];

          for (const selector of priceSelectors) {
            const priceEl = item.querySelector(selector);
            if (priceEl) {
              const priceText = priceEl.textContent || priceEl.getAttribute('aria-label') || '';
              const cleanPrice = priceText.replace(/[^0-9.]/g, '');
              if (cleanPrice && cleanPrice.length > 0) {
                const price = parseFloat(cleanPrice);
                if (price > 0 && price < 10000) {
                  finalPrice = price;
                  break;
                }
              }
            }
          }

          // Extract URL
          let productUrl = '';
          const linkEl = item.querySelector('h2 a, a.a-link-normal[href*="/dp/"]');
          if (linkEl) {
            productUrl = linkEl.href || '';
          }

          // Extract image
          let imageUrl = '';
          const imageEl = item.querySelector('img.s-image, img[data-image-latency]');
          if (imageEl) {
            imageUrl = imageEl.src || imageEl.getAttribute('data-src') || '';
          }

          // Extract ASIN
          let asin = item.getAttribute('data-asin') || '';

          console.log(`📦 Item ${index + 1}: ${title.substring(0, 50)}... | Price: ${finalPrice ? `$${finalPrice}` : 'N/A'}`);

          // Only add products with valid price
          if (title && finalPrice && finalPrice > 0) {
            products.push({
              name: title,
              title: title,
              basePrice: finalPrice,
              salePrice: null,
              isOnSale: false,
              currentPrice: finalPrice,
              price: finalPrice,
              sourceUrl: productUrl,
              productUrl: productUrl,
              imageUrl: imageUrl,
              asin: asin,
              source: 'Amazon',
              scrapedAt: new Date().toISOString()
            });
          }
        } catch (e) {
          console.log(`❌ Error processing item ${index + 1}:`, e.message);
        }
      });

      console.log(`✅ Extracted ${products.length} products from ${allItems.length} items`);
      return products;
    }, searchTerm, category);
  }
}

module.exports = AmazonScraperSimple;
