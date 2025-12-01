const config = require('../config/scrapeConfig');
const Logger = require('./logger');

class ProductFilter {
  static shouldExcludeVariant(title, searchCardName) {
    const cleanTitle = title.replace(/[™®©]/g, '').toLowerCase();
    const cleanSearchName = searchCardName.toLowerCase();
    
    // Skip if searching for base model but found variant
    if (cleanSearchName === 'rtx 4070') {
      const isSuperVariant = config.filtering.excludeVariants.super.some(pattern => 
        cleanTitle.includes(pattern)
      );
      
      const isTiVariant = config.filtering.excludeVariants.ti.some(pattern => {
        if (typeof pattern === 'string') {
          return cleanTitle.includes(pattern);
        }
        return pattern.test(cleanTitle);
      });
      
      if (isSuperVariant || isTiVariant) {
        const variant = isSuperVariant ? 'Super' : 'Ti';
        Logger.debug(`Excluded ${variant} variant: ${title.substring(0, 80)}...`);
        return true;
      }
    }
    
    return false;
  }

  static matchesSearchCriteria(title, searchCardName) {
    if (!title) return false;
    
    const cleanTitle = title.replace(/[™®©]/g, '').toLowerCase();
    const cleanSearchName = searchCardName.toLowerCase();
    
    // Check if title contains the search term
    if (!cleanTitle.includes(cleanSearchName)) {
      Logger.debug(`Title doesn't match "${searchCardName}": ${title.substring(0, 80)}...`);
      return false;
    }
    
    // Check for variant exclusions
    if (this.shouldExcludeVariant(title, searchCardName)) {
      return false;
    }
    
    return true;
  }

  static validateProduct(productData) {
    // Must have a title
    if (!productData.title) {
      Logger.debug('Product excluded: No title');
      return false;
    }
    
    // Must have at least a base price
    if (!productData.basePrice && !productData.salePrice) {
      Logger.debug('Product excluded: No valid price found');
      return false;
    }
    
    // Exclude desktops, laptops, and pre-built systems
    if (this.isDesktopOrLaptop(productData.title)) {
      Logger.debug(`Product excluded: Desktop/Laptop system - ${productData.title.substring(0, 80)}...`);
      return false;
    }
    
    // Validate price range
    const price = productData.salePrice || productData.basePrice;
    if (price < config.filtering.priceRange.min || price > config.filtering.priceRange.max) {
      Logger.debug(`Product excluded: Price $${price} outside valid range`);
      return false;
    }
    
    return true;
  }
  
  static isDesktopOrLaptop(title) {
    if (!title) return false;
    
    const titleLower = title.toLowerCase();
    
    // Desktop/PC indicators
    const desktopKeywords = [
      'desktop', 'pc', 'computer', 'tower', 'system',
      'gaming desktop', 'gaming pc', 'workstation', 
      'prebuilt', 'pre-built', 'gaming system',
      'alienware', 'dell', 'hp pavilion', 'asus rog desktop',
      'msi gaming desktop', 'cyberpowerpc', 'ibuypower',
      'origin pc', 'maingear'
    ];
    
    // Laptop indicators  
    const laptopKeywords = [
      'laptop', 'notebook', 'gaming laptop', 'ultrabook',
      'thinkpad', 'macbook', 'chromebook', 'surface laptop',
      'asus rog laptop', 'msi gaming laptop', 'alienware laptop',
      'razer blade', 'hp omen', 'lenovo legion'
    ];
    
    // Check for desktop keywords
    for (const keyword of desktopKeywords) {
      if (titleLower.includes(keyword)) {
        return true;
      }
    }
    
    // Check for laptop keywords
    for (const keyword of laptopKeywords) {
      if (titleLower.includes(keyword)) {
        return true;
      }
    }
    
    // Additional patterns for complete systems
    const systemPatterns = [
      /\b(intel|amd)\s+(core|ryzen).+processor\b/i,  // "Intel Core i7 processor"
      /\b\d+gb\s+(ram|memory)\b/i,                   // "32GB RAM" 
      /\b\d+tb\s+(ssd|hdd|storage)\b/i,              // "1TB SSD"
      /\bwin\s*\d+\s+(home|pro)\b/i,                 // "Win 11 Home"
      /\bliquid\s+cool(ed|ing)\b/i,                  // "Liquid Cooled"
    ];
    
    for (const pattern of systemPatterns) {
      if (pattern.test(title)) {
        return true;
      }
    }
    
    return false;
  }

  static normalizeProductData(rawData) {
    return {
      name: rawData.name || rawData.title,
      basePrice: rawData.basePrice,
      salePrice: rawData.salePrice || null,
      isOnSale: Boolean(rawData.salePrice && rawData.basePrice > rawData.salePrice),
      currentPrice: rawData.salePrice || rawData.basePrice,
      sourceUrl: rawData.sourceUrl || rawData.url,
      imageUrl: rawData.imageUrl,
      source: rawData.source,
      scrapedAt: new Date().toISOString()
    };
  }
}

module.exports = ProductFilter;