const Logger = require('./logger');

class PriceExtractor {
  static extractPrice(element, selector = 'unknown') {
    if (!element || !element.textContent) {
      return null;
    }

    const rawText = element.textContent.trim();
    
    // Only process if contains dollar sign
    if (!rawText.includes('$')) {
      return null;
    }

    // Extract numeric price
    const cleanPrice = rawText.replace(/[^0-9.]/g, '');
    
    if (!cleanPrice || cleanPrice === '0' || cleanPrice.length < 2) {
      return null;
    }

    let price = parseFloat(cleanPrice);
    
    // Handle price duplication issues (like $1699.991699)
    if (price.toString().length > 8) {
      const match = price.toString().match(/^(\d+\.\d{2})/);
      if (match) {
        const corrected = parseFloat(match[1]);
        Logger.debug(`Fixed duplicated price: ${price} → ${corrected}`);
        price = corrected;
      }
    }

    return price;
  }

  static validatePriceRange(price, min = 200, max = 5000) {
    return price >= min && price <= max;
  }

  static extractPriceFromSelectors(document, selectors, description = '') {
    for (const selector of selectors) {
      const elements = document.querySelectorAll(selector);
      for (const element of elements) {
        const price = this.extractPrice(element, selector);
        if (price && this.validatePriceRange(price)) {
          Logger.debug(`${description} price found: $${price} from ${selector}`);
          return {
            price,
            source: {
              selector,
              element: element.tagName + (element.className ? '.' + element.className.split(' ')[0] : ''),
              text: element.textContent.trim()
            }
          };
        }
      }
    }
    return null;
  }

  static detectDiscount(document) {
    const discountPatterns = [
      /\b\d+%\s*off\b/i,
      /\bsave\s*\$\d+/i,
      /\bwas\s*\$[\d,.]+ now\s*\$[\d,.]+\b/i,
      /\blist\s*price:\s*\$[\d,.]+\b/i,
      /\btypical\s*price:\s*\$[\d,.]+\b/i,
      /\b-\d+%\b/,
      /\byou\s+save[:\s]*\$[\d,.]+/i
    ];

    const pageText = document.body?.textContent || '';
    
    for (const pattern of discountPatterns) {
      if (pattern.test(pageText)) {
        Logger.debug(`Discount indicator found: ${pattern.toString()}`);
        return true;
      }
    }

    // Check for strikethrough elements with prices
    const strikethroughElements = document.querySelectorAll('.a-text-strike, .a-price-original, [style*="line-through"]');
    for (const el of strikethroughElements) {
      if (el.textContent.includes('$') && /\$[\d,.]+/.test(el.textContent)) {
        Logger.debug('Amazon strikethrough price found');
        return true;
      }
    }

    return false;
  }
}

module.exports = PriceExtractor;