const config = require('../config/scrapeConfig');
const Logger = require('./logger');

class CPUProductFilter {
  static shouldExcludeVariant(title, searchCardName) {
    // CPUs don't have the same variant issues as GPUs, but keep the structure
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
    
    // For CPUs, we want to ALLOW desktop processors but EXCLUDE complete systems
    if (this.isCompleteSystem(productData.title)) {
      Logger.debug(`Product excluded: Complete system - ${productData.title.substring(0, 80)}...`);
      return false;
    }
    
    // Validate price range (use wider range for CPUs)
    const price = productData.salePrice || productData.basePrice;
    const minPrice = 50; // CPUs can be cheaper than GPUs
    const maxPrice = 2000; // High-end CPUs can be expensive
    
    if (price < minPrice || price > maxPrice) {
      Logger.debug(`Product excluded: Price $${price} outside valid range ($${minPrice}-$${maxPrice})`);
      return false;
    }
    
    return true;
  }
  
  static isCompleteSystem(title) {
    if (!title) return false;
    
    const titleLower = title.toLowerCase();
    
    // Complete system indicators (but NOT just "desktop processor")
    const systemKeywords = [
      'gaming pc', 'gaming desktop', 'workstation', 
      'prebuilt', 'pre-built', 'gaming system', 'computer system',
      'alienware', 'dell optiplex', 'hp pavilion', 'asus rog desktop',
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
    
    // Check for complete system keywords
    for (const keyword of systemKeywords) {
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
    
    // Patterns that indicate complete systems (not just CPUs)
    const systemPatterns = [
      /\b\d+gb\s+(ram|memory)\b/i,                   // "32GB RAM" 
      /\b\d+tb\s+(ssd|hdd|storage)\b/i,              // "1TB SSD"
      /\bwin\s*\d+\s+(home|pro)\b/i,                 // "Win 11 Home"
      /\bliquid\s+cool(ed|ing)\b/i,                  // "Liquid Cooled"
      /\b(nvidia|amd)\s+(geforce|radeon).+\b/i,      // "NVIDIA GeForce RTX" (indicates complete system)
      /\bmotherboard\s+included\b/i,                 // "Motherboard included"
      /\bready\s+to\s+game\b/i,                      // "Ready to game"
      /\bfully\s+assembled\b/i                       // "Fully assembled"
    ];
    
    for (const pattern of systemPatterns) {
      if (pattern.test(title)) {
        return true;
      }
    }
    
    // Allow standalone processor titles even if they say "desktop processor"
    // This is key - we WANT "Intel Core i9-13900K Desktop Processor"
    if (titleLower.includes('processor') || titleLower.includes('cpu')) {
      // If it's just a processor (not a complete system), allow it
      const isJustProcessor = !systemPatterns.some(pattern => pattern.test(title)) &&
                             !systemKeywords.some(keyword => titleLower.includes(keyword)) &&
                             !laptopKeywords.some(keyword => titleLower.includes(keyword));
      
      if (isJustProcessor) {
        Logger.debug(`Allowing processor: ${title.substring(0, 80)}...`);
        return false; // Don't exclude it
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

module.exports = CPUProductFilter;