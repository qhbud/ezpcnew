class RAMProductFilterLenient {
  static matchesSearchCriteria(title, searchTerm) {
    if (!title) return false;
    
    const titleLower = title.toLowerCase();
    
    // Very basic RAM indicators - if it has ANY of these, consider it RAM
    const ramKeywords = [
      'memory', 'ram', 'ddr4', 'ddr5', 'dimm', 
      'gb', 'corsair', 'g.skill', 'crucial', 'kingston',
      'vengeance', 'trident', 'ballistix', 'fury', 'ripjaws'
    ];
    
    // Must contain at least one RAM-related keyword
    return ramKeywords.some(keyword => titleLower.includes(keyword));
  }
  
  static validateProduct(productData) {
    if (!productData) return false;
    
    const title = productData.title || '';
    const titleLower = title.toLowerCase();
    
    // Must have a title
    if (!title || title.length < 5) return false;
    
    // Only exclude VERY obvious non-RAM products (be conservative)
    const hardExcludes = [
      'smartphone', 'tablet', 'phone', 'laptop computer', 
      'desktop computer', 'gaming pc', 'pre-built',
      'monitor', 'keyboard', 'mouse', 'webcam',
      'hard drive', 'ssd drive', 'power supply unit',
      'graphics card', 'video card', 'processor chip'
    ];
    
    // Only exclude if it clearly contains these phrases
    if (hardExcludes.some(keyword => titleLower.includes(keyword))) {
      return false;
    }
    
    // Must contain SOME RAM indicator
    const ramIndicators = [
      /\bddr[345]\b/i,                    // DDR3, DDR4, or DDR5
      /\b(2|4|8|16|32|64|128)gb\b/i,      // Memory capacity
      /\bmemory\b/i,                      // Memory keyword
      /\bram\b/i,                         // RAM keyword
      /\bdimm\b/i,                        // DIMM keyword
      /corsair|crucial|kingston|g\.?skill|teamgroup|adata|patriot|mushkin/i // Known RAM brands
    ];
    
    if (!ramIndicators.some(pattern => pattern.test(title))) {
      return false;
    }
    
    // Very lenient price check - just make sure it's not completely unreasonable
    const price = parseFloat(productData.basePrice || productData.currentPrice || productData.price || 0);
    if (price > 0 && price < 5000) { // RAM could be $5-$5000 for extreme kits
      return true;
    }
    
    // If no price, still allow if it matches RAM patterns
    return price === 0; // Allow products with no price for now
  }
  
  static isDesktopRAM(title) {
    if (!title) return true; // Default to desktop
    
    const titleLower = title.toLowerCase();
    
    // Only exclude if it explicitly mentions laptop form factors
    const laptopKeywords = [
      'so-dimm', 'sodimm', 'laptop memory', 'notebook memory'
    ];
    
    return !laptopKeywords.some(keyword => titleLower.includes(keyword));
  }
  
  static extractRAMSpecs(title) {
    const specs = {};
    const titleLower = title.toLowerCase();
    
    // Extract DDR type
    const ddrMatch = title.match(/ddr([345])/i);
    if (ddrMatch) {
      specs.memoryType = `DDR${ddrMatch[1]}`;
    }
    
    // Extract speed (more patterns)
    const speedMatch = title.match(/(\d{3,4})\s*mhz/i) || 
                      title.match(/ddr[345][-\s]*(\d{3,4})/i) ||
                      title.match(/pc[345][-\s]*(\d{4})/i);
    if (speedMatch) {
      specs.speed = `${speedMatch[1]}MHz`;
    }
    
    // Extract capacity
    const capacityMatch = title.match(/(\d+)\s*gb/i);
    if (capacityMatch) {
      specs.capacity = `${capacityMatch[1]}GB`;
    }
    
    // Extract kit configuration
    const kitMatch = title.match(/(\d+)\s*x\s*(\d+)\s*gb/i) ||
                     title.match(/kit.*?(\d+)\s*x\s*(\d+)/i) ||
                     title.match(/\((\d+)\s*x\s*(\d+)gb\)/i);
    if (kitMatch) {
      specs.kitConfiguration = `${kitMatch[1]}x${kitMatch[2]}GB`;
    } else if (specs.capacity) {
      specs.kitConfiguration = `1x${specs.capacity}`;
    }
    
    // Extract latency (more patterns)
    const latencyMatch = title.match(/\bc(\d+)\b/i) || 
                        title.match(/\bcl(\d+)\b/i) ||
                        title.match(/cas\s*(\d+)/i) ||
                        title.match(/(\d+)-(\d+)-(\d+)-(\d+)/);
    if (latencyMatch) {
      if (latencyMatch[4]) {
        specs.latency = `${latencyMatch[1]}-${latencyMatch[2]}-${latencyMatch[3]}-${latencyMatch[4]}`;
      } else {
        specs.latency = `CL${latencyMatch[1]}`;
      }
    }
    
    // Detect RGB (more patterns)
    specs.rgb = /rgb|led|lighting|aura|mystic|trident.*z|vengeance.*rgb/i.test(title);
    
    // Detect manufacturer (more brands)
    const manufacturers = [
      { pattern: /corsair/i, name: 'Corsair' },
      { pattern: /g\.?skill/i, name: 'G.Skill' },
      { pattern: /crucial/i, name: 'Crucial' },
      { pattern: /kingston/i, name: 'Kingston' },
      { pattern: /teamgroup|team group/i, name: 'TeamGroup' },
      { pattern: /adata/i, name: 'ADATA' },
      { pattern: /patriot/i, name: 'Patriot' },
      { pattern: /mushkin/i, name: 'Mushkin' },
      { pattern: /pny/i, name: 'PNY' },
      { pattern: /samsung/i, name: 'Samsung' },
      { pattern: /sk hynix|hynix/i, name: 'SK Hynix' },
      { pattern: /micron/i, name: 'Micron' }
    ];
    
    for (const mfg of manufacturers) {
      if (mfg.pattern.test(title)) {
        specs.manufacturer = mfg.name;
        break;
      }
    }
    
    return specs;
  }
}

module.exports = RAMProductFilterLenient;