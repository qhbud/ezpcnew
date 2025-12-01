const config = require('../config/scrapeConfig');
const Logger = require('./logger');

class PSUProductFilter {
  static matchesSearchCriteria(title, searchTerm) {
    if (!title) return false;
    
    const cleanTitle = title.replace(/[™®©]/g, '').toLowerCase();
    
    // For PSUs, we want to save ALL valid power supplies regardless of search criteria
    // This gives users a comprehensive selection to choose from
    Logger.debug(`PSU Filter - Checking if "${title.substring(0, 80)}..." is a valid power supply`);
    
    // Check if this is a power supply
    if (!this.isPowerSupply(cleanTitle)) {
      Logger.debug(`Not a power supply: ${title.substring(0, 80)}...`);
      return false;
    }
    
    // If it's a power supply, include it regardless of search criteria
    Logger.debug(`Valid power supply found: ${title.substring(0, 80)}...`);
    return true;
  }
  
  static parseSearchTerm(searchTerm) {
    const parts = {
      wattage: null,
      certification: null,
      modularity: null
    };
    
    // Extract wattage (e.g., "500w", "1000w")
    const wattageMatch = searchTerm.match(/(\d+)w/);
    if (wattageMatch) {
      parts.wattage = parseInt(wattageMatch[1]);
    }
    
    // Extract certification
    if (searchTerm.includes('titanium')) parts.certification = 'titanium';
    else if (searchTerm.includes('platinum')) parts.certification = 'platinum';
    else if (searchTerm.includes('gold')) parts.certification = 'gold';
    else if (searchTerm.includes('silver')) parts.certification = 'silver';
    else if (searchTerm.includes('bronze')) parts.certification = 'bronze';
    else if (searchTerm.includes('white')) parts.certification = 'white';
    
    // Extract modularity
    if (searchTerm.includes('fully_modular') || searchTerm.includes('fully')) parts.modularity = 'fully_modular';
    else if (searchTerm.includes('semi_modular') || searchTerm.includes('semi')) parts.modularity = 'semi_modular';
    else if (searchTerm.includes('non_modular') || searchTerm.includes('non')) parts.modularity = 'non_modular';
    
    return parts;
  }
  
  static extractPSUSpecs(title) {
    const specs = {
      wattage: null,
      certification: null,
      modularity: null
    };
    
    // Extract wattage
    const wattageMatch = title.match(/(\d+)\s*w(?:att)?/i);
    if (wattageMatch) {
      specs.wattage = parseInt(wattageMatch[1]);
    }
    
    // Extract certification
    if (title.includes('80+ titanium') || title.includes('80 plus titanium')) specs.certification = 'titanium';
    else if (title.includes('80+ platinum') || title.includes('80 plus platinum')) specs.certification = 'platinum';
    else if (title.includes('80+ gold') || title.includes('80 plus gold')) specs.certification = 'gold';
    else if (title.includes('80+ silver') || title.includes('80 plus silver')) specs.certification = 'silver';
    else if (title.includes('80+ bronze') || title.includes('80 plus bronze')) specs.certification = 'bronze';
    else if (title.includes('80+ white') || title.includes('80 plus white')) specs.certification = 'white';
    
    // Extract modularity
    if (title.includes('fully modular')) specs.modularity = 'fully_modular';
    else if (title.includes('semi modular') || title.includes('semi-modular')) specs.modularity = 'semi_modular';
    else if (title.includes('non modular') || title.includes('non-modular') || title.includes('fixed cable')) specs.modularity = 'non_modular';
    
    return specs;
  }
  
  static isPowerSupply(title) {
    const psuKeywords = [
      'power supply', 'psu', 'power unit', 'atx power', 'sfx power',
      'modular power', 'power 80', '80 plus', '80+', 'watt power',
      'watts power', 'w power supply', 'w psu', 'watt psu',
      'bronze certified', 'gold certified', 'platinum certified', 'titanium certified',
      'atx 12v', 'eps 12v', 'pcie power', 'sata power', 'molex power',
      'efficiency certified', 'active pfc', 'power supplies'
    ];
    
    // Also check for wattage patterns that indicate PSUs
    const wattagePatterns = [
      /\d+w\s+(power|psu|supply|atx|sfx)/i,     // "500W power", "650W PSU", etc.
      /\d+\s*watt\s+(power|psu|supply)/i,       // "500 watt power supply"
      /(power|psu)\s+\d+w/i,                    // "power 500W", "PSU 650W"
      /80\s*plus\s*(bronze|silver|gold|platinum|titanium)/i,  // 80+ certifications
      /(bronze|silver|gold|platinum|titanium)\s*certified/i   // certification mentions
    ];
    
    // Check keywords
    const hasKeyword = psuKeywords.some(keyword => title.includes(keyword));
    
    // Check wattage patterns
    const hasWattagePattern = wattagePatterns.some(pattern => pattern.test(title));
    
    return hasKeyword || hasWattagePattern;
  }
  
  static wattageMatches(searchWattage, titleWattage) {
    // Allow some tolerance for wattage matching
    const tolerance = 50; // 50W tolerance
    return Math.abs(searchWattage - titleWattage) <= tolerance;
  }
  
  static certificationMatches(searchCert, titleCert) {
    return searchCert === titleCert;
  }
  
  static modularityMatches(searchMod, titleMod) {
    return searchMod === titleMod;
  }

  static validateProduct(productData) {
    // Must have a title
    if (!productData.title) {
      Logger.debug('PSU excluded: No title');
      return false;
    }
    
    // Price is preferred but not required for PSUs
    // Users can still click through to see current pricing on Amazon
    const hasPrice = productData.basePrice || productData.salePrice;
    if (!hasPrice) {
      Logger.debug('PSU note: No price found, but including anyway for user reference');
    }
    
    // Exclude desktops, laptops, and pre-built systems
    if (this.isDesktopOrLaptop(productData.title)) {
      Logger.debug(`PSU excluded: Desktop/Laptop system - ${productData.title.substring(0, 80)}...`);
      return false;
    }
    
    // PSU-specific validation: Check for minimum wattage to exclude accessories
    const title = productData.title.toLowerCase();
    const wattageMatch = title.match(/(\d+)\s*w(?:att)?/i);
    if (wattageMatch) {
      const wattage = parseInt(wattageMatch[1]);
      if (wattage < 200) {
        Logger.debug(`PSU excluded: Wattage too low (${wattage}W) - likely accessory`);
        return false;
      }
    }
    
    // Validate price range only if price is available
    const price = productData.salePrice || productData.basePrice;
    if (price && (price < 30 || price > 1000)) {
      Logger.debug(`PSU excluded: Price $${price} outside valid range ($30-$1000)`);
      return false;
    }
    
    return true;
  }
  
  static isDesktopOrLaptop(title) {
    if (!title) return false;
    
    const titleLower = title.toLowerCase();
    
    // Desktop/PC indicators
    const desktopKeywords = [
      'desktop', ' pc ', 'computer', 'tower', 'system',
      'gaming desktop', 'gaming pc', 'workstation', 
      'prebuilt', 'pre-built', 'gaming system',
      'alienware', 'dell', 'hp pavilion', 'asus rog desktop',
      'msi gaming desktop', 'cyberpowerpc', 'ibuypower'
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

module.exports = PSUProductFilter;