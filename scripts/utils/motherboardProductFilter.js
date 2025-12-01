const config = require('../config/scrapeConfig');
const Logger = require('./logger');

class MotherboardProductFilter {
  static shouldExcludeVariant(title, searchCardName) {
    // Motherboards don't have the same variant issues as GPUs
    return false;
  }

  static matchesSearchCriteria(title, searchCardName) {
    if (!title) return false;
    
    // MODIFIED: Save ALL valid motherboards regardless of search term match
    // This allows us to collect any motherboard found on the search page
    const cleanTitle = title.replace(/[™®©]/g, '').toLowerCase();
    
    // Basic motherboard validation - must contain motherboard-related terms
    const motherboardTerms = [
      'motherboard', 'mobo', 'mainboard', 'atx', 'micro-atx', 'mini-itx',
      'am4', 'am5', 'lga1700', 'lga1200', 'lga1151', 'socket',
      'chipset', 'b550', 'b650', 'x570', 'x670', 'z690', 'z790', 'b760'
    ];
    
    const hasMotherboardTerm = motherboardTerms.some(term => cleanTitle.includes(term));
    
    if (!hasMotherboardTerm) {
      Logger.debug(`Not a motherboard (no motherboard terms found): ${title.substring(0, 80)}...`);
      return false;
    }
    
    // Log that we're accepting this motherboard even if it doesn't match search term
    const cleanSearchName = searchCardName.toLowerCase();
    if (!cleanTitle.includes(cleanSearchName)) {
      Logger.debug(`Motherboard doesn't match "${searchCardName}" but saving anyway: ${title.substring(0, 60)}...`);
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
    
    // Exclude complete systems and non-motherboard items
    if (this.isNotMotherboard(productData.title)) {
      Logger.debug(`Product excluded: Not a motherboard - ${productData.title.substring(0, 80)}...`);
      return false;
    }
    
    // Validate price range for motherboards
    const price = productData.salePrice || productData.basePrice;
    const minPrice = 40; // Entry-level motherboards
    const maxPrice = 1500; // High-end workstation motherboards
    
    if (price < minPrice || price > maxPrice) {
      Logger.debug(`Product excluded: Price $${price} outside valid range ($${minPrice}-$${maxPrice})`);
      return false;
    }
    
    return true;
  }
  
  static isNotMotherboard(title) {
    if (!title) return true;
    
    const titleLower = title.toLowerCase();
    
    // Complete system indicators
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
    
    // Non-motherboard component keywords
    const nonMotherboardKeywords = [
      'cpu', 'processor', 'graphics card', 'video card',
      'ram', 'memory stick', 'ssd', 'hard drive', 'hdd',
      'power supply', 'psu', 'case', 'tower',
      'monitor', 'keyboard', 'mouse', 'headset',
      'cable', 'adapter', 'cooler', 'fan'
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
    
    // Check for non-motherboard components
    for (const keyword of nonMotherboardKeywords) {
      if (titleLower.includes(keyword)) {
        return true;
      }
    }
    
    // Patterns that indicate complete systems or non-motherboards
    const nonMotherboardPatterns = [
      /\b\d+gb\s+(ram|memory)\b/i,                   // "32GB RAM" 
      /\b\d+tb\s+(ssd|hdd|storage)\b/i,              // "1TB SSD"
      /\bwin\s*\d+\s+(home|pro)\b/i,                 // "Win 11 Home"
      /\bliquid\s+cool(ed|ing)\b/i,                  // "Liquid Cooled"
      /\bready\s+to\s+game\b/i,                      // "Ready to game"
      /\bfully\s+assembled\b/i,                      // "Fully assembled"
      /\bcombination\s+kit\b/i,                      // "Combination kit"
      /\bbundle\s+pack\b/i                           // "Bundle pack"
    ];
    
    for (const pattern of nonMotherboardPatterns) {
      if (pattern.test(title)) {
        return true;
      }
    }
    
    // Must contain motherboard-specific terms
    const motherboardTerms = [
      'motherboard', 'mainboard', 'mobo', 
      'atx', 'micro atx', 'mini itx', 'e-atx',
      'socket', 'chipset', 'lga', 'am4', 'am5'
    ];
    
    const hasMotherboardTerm = motherboardTerms.some(term => titleLower.includes(term));
    
    if (!hasMotherboardTerm) {
      Logger.debug(`Missing motherboard terms: ${title.substring(0, 80)}...`);
      return true; // Exclude if no motherboard terms
    }
    
    return false; // It's a valid motherboard
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

module.exports = MotherboardProductFilter;