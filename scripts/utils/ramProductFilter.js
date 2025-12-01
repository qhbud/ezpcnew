class RAMProductFilter {
  static matchesSearchCriteria(title, searchTerm) {
    if (!title || !searchTerm) return false;
    
    const titleLower = title.toLowerCase();
    const searchLower = searchTerm.toLowerCase();
    
    // Check for RAM-specific keywords
    const ramKeywords = [
      'memory', 'ram', 'ddr4', 'ddr5', 'dimm', 'so-dimm',
      'corsair', 'g.skill', 'crucial', 'kingston', 'teamgroup',
      'adata', 'patriot', 'mushkin', 'pny', 'samsung',
      'vengeance', 'trident', 'ballistix', 'fury', 'ripjaws',
      'rgb', 'pro', 'lpx', 'elite', 'gaming'
    ];
    
    // Must contain at least one RAM keyword
    const hasRamKeyword = ramKeywords.some(keyword => titleLower.includes(keyword));
    if (!hasRamKeyword) return false;
    
    // Check for memory capacity indicators
    const hasCapacity = /\b(4|8|16|32|64|128)gb\b/i.test(title);
    if (!hasCapacity) return false;
    
    // Check for DDR type
    const hasDDRType = /ddr[45]/i.test(title);
    if (!hasDDRType) return false;
    
    // If searchTerm is specific, check for it
    if (searchLower.includes('ddr4') || searchLower.includes('ddr5')) {
      const searchDDR = searchLower.includes('ddr5') ? 'ddr5' : 'ddr4';
      if (!titleLower.includes(searchDDR)) return false;
    }
    
    // Check for speed if specified in search
    const speedMatch = searchTerm.match(/(\d{4})/);
    if (speedMatch) {
      const speed = speedMatch[1];
      if (!titleLower.includes(speed)) return false;
    }
    
    // Check for capacity if specified in search
    const capacityMatch = searchTerm.match(/(\d+)gb/i);
    if (capacityMatch) {
      const capacity = capacityMatch[1];
      if (!titleLower.includes(capacity + 'gb')) return false;
    }
    
    return true;
  }
  
  static validateProduct(productData) {
    if (!productData) return false;
    
    const title = productData.title || '';
    const titleLower = title.toLowerCase();
    
    // Must have a title
    if (!title || title.length < 5) return false;
    
    // Exclude obvious non-RAM products (but allow RAM-specific terms)
    const excludeKeywords = [
      'laptop computer', 'gaming pc', 'gaming computer', 
      'computer system', 'pc system', 'workstation', 'tower',
      'motherboard', 'gpu', 'graphics card', 'processor', 'cpu',
      'ssd', 'hard drive', 'hdd', 'power supply', 'psu',
      'case', 'cooler', 'fan', 'keyboard', 'mouse',
      'monitor', 'screen', 'display', 'webcam', 'speaker',
      'cable', 'adapter', 'charger', 'battery',
      'usb stick', 'flash drive', 'external drive',
      'smartphone', 'tablet', 'phone', 'accessory'
    ];
    
    // More restrictive patterns for complete systems (avoid false positives with RAM)
    const systemPatterns = [
      /\b(gaming|laptop)\s+(pc|computer|system)\b/i,         // "gaming pc", "laptop computer" (but not "desktop computer")
      /\bdesktop\s+(pc|system)\b/i,                          // "desktop pc", "desktop system" (but not "desktop computer memory")
      /\bpre-?built\b/i,                                     // "prebuilt" or "pre-built"
      /\b(intel|amd)\s+(core|ryzen).+processor\b/i,         // "Intel Core i7 processor"
      /\b\d+tb\s+(ssd|hdd|storage)\b/i,                     // "1TB SSD"
      /\bwin\s*\d+\s+(home|pro)\b/i,                        // "Win 11 Home"
      /\bcomplete\s+(system|pc|computer)\b/i,               // "complete system"
      /\btower\s+(pc|computer|system)\b/i,                  // "tower pc"
    ];
    
    // Check exclude keywords
    if (excludeKeywords.some(keyword => titleLower.includes(keyword))) {
      return false;
    }
    
    // Check system patterns
    if (systemPatterns.some(pattern => pattern.test(title))) {
      return false;
    }
    
    // Must contain RAM-specific indicators
    const ramIndicators = [
      /\bddr[45]\b/i,           // DDR4 or DDR5
      /\b(4|8|16|32|64|128)gb\b/i,  // Memory capacity
      /\bmemory\b/i,           // Memory keyword
      /\bram\b/i,              // RAM keyword
      /\bdimm\b/i              // DIMM keyword
    ];
    
    if (!ramIndicators.some(pattern => pattern.test(title))) {
      return false;
    }
    
    // Check for valid price (must be reasonable for RAM)
    const price = parseFloat(productData.basePrice || productData.price || 0);
    if (price <= 0 || price > 2000) { // RAM shouldn't cost more than $2000
      return false;
    }
    
    // Reasonable price ranges for different capacities
    if (titleLower.includes('4gb') && price > 100) return false;
    if (titleLower.includes('8gb') && price > 200) return false;
    if (titleLower.includes('16gb') && price > 400) return false;
    if (titleLower.includes('32gb') && price > 800) return false;
    
    return true;
  }
  
  static isDesktopRAM(title) {
    if (!title) return true; // Default to desktop
    
    const titleLower = title.toLowerCase();
    
    // Check for laptop/mobile indicators
    const laptopKeywords = [
      'so-dimm', 'sodimm', 'laptop', 'notebook', 'mobile',
      'small outline', 'small form factor', 'compact'
    ];
    
    return !laptopKeywords.some(keyword => titleLower.includes(keyword));
  }
  
  static extractRAMSpecs(title) {
    const specs = {};
    const titleLower = title.toLowerCase();
    
    // Extract DDR type
    const ddrMatch = title.match(/ddr([45])/i);
    if (ddrMatch) {
      specs.memoryType = `DDR${ddrMatch[1]}`;
    }
    
    // Extract speed
    const speedMatch = title.match(/ddr[45][-\s]*(\d{4})/i) || title.match(/(\d{4})\s*mhz/i);
    if (speedMatch) {
      specs.speed = `${speedMatch[1]}MHz`;
    }
    
    // Extract capacity
    const capacityMatch = title.match(/(\d+)gb/i);
    if (capacityMatch) {
      specs.capacity = `${capacityMatch[1]}GB`;
    }
    
    // Extract kit configuration
    const kitMatch = title.match(/(\d+)\s*x\s*(\d+)gb/i);
    if (kitMatch) {
      specs.kitConfiguration = `${kitMatch[1]}x${kitMatch[2]}GB`;
    } else if (specs.capacity) {
      specs.kitConfiguration = `1x${specs.capacity}`;
    }
    
    // Extract latency
    const latencyMatch = title.match(/c(\d+)/i) || title.match(/cl(\d+)/i);
    if (latencyMatch) {
      specs.latency = `CL${latencyMatch[1]}`;
    }
    
    // Detect RGB
    specs.rgb = /rgb|led|lighting|aura|mystic|trident.*z/i.test(title);
    
    // Detect manufacturer
    const manufacturers = [
      'corsair', 'g.skill', 'crucial', 'kingston', 'teamgroup',
      'adata', 'patriot', 'mushkin', 'pny', 'samsung', 'sk hynix'
    ];
    
    for (const mfg of manufacturers) {
      if (titleLower.includes(mfg)) {
        specs.manufacturer = mfg.charAt(0).toUpperCase() + mfg.slice(1);
        if (mfg === 'g.skill') specs.manufacturer = 'G.Skill';
        break;
      }
    }
    
    return specs;
  }
}

module.exports = RAMProductFilter;