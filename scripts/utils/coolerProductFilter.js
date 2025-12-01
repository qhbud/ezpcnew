class CoolerProductFilter {
  static matchesSearchCriteria(title, searchTerm) {
    if (!title || !searchTerm) return false;
    
    const titleLower = title.toLowerCase();
    const searchLower = searchTerm.toLowerCase();
    
    // Check for CPU cooler-specific keywords
    const coolerKeywords = [
      'cooler', 'cooling', 'fan', 'heatsink', 'heat sink', 
      'liquid', 'water', 'aio', 'radiator', 'pump',
      'cpu cooler', 'processor cooler', 'thermal',
      'noctua', 'corsair', 'cooler master', 'be quiet',
      'arctic', 'deepcool', 'scythe', 'thermalright',
      'evga', 'nzxt', 'thermaltake', 'fractal design'
    ];
    
    // Must contain at least one cooler keyword
    const hasCoolerKeyword = coolerKeywords.some(keyword => titleLower.includes(keyword));
    if (!hasCoolerKeyword) return false;
    
    // Check for CPU-related terms
    const cpuKeywords = ['cpu', 'processor', 'intel', 'amd', 'ryzen', 'core', 'lga', 'am4', 'am5'];
    const hasCpuKeyword = cpuKeywords.some(keyword => titleLower.includes(keyword));
    if (!hasCpuKeyword) return false;
    
    // If search term is specific, check for it
    if (searchLower.includes('liquid') || searchLower.includes('water') || searchLower.includes('aio')) {
      const hasLiquid = titleLower.includes('liquid') || titleLower.includes('water') || 
                       titleLower.includes('aio') || titleLower.includes('all-in-one') || 
                       titleLower.includes('radiator');
      if (!hasLiquid) return false;
    }
    
    if (searchLower.includes('air') || searchLower.includes('tower')) {
      const hasAir = titleLower.includes('air') || titleLower.includes('tower') || 
                    titleLower.includes('heatsink') || titleLower.includes('heat sink') ||
                    (titleLower.includes('fan') && !titleLower.includes('liquid'));
      if (!hasAir) return false;
    }
    
    return true;
  }
  
  static validateProduct(productData) {
    if (!productData) return false;
    
    const title = productData.title || '';
    const titleLower = title.toLowerCase();
    
    // Must have a title
    if (!title || title.length < 5) return false;
    
    // Exclude obvious non-cooler products
    const excludeKeywords = [
      'laptop cooler', 'laptop cooling pad', 'notebook cooler',
      'graphics card', 'gpu cooler', 'vga cooler',
      'case fan', 'chassis fan', 'exhaust fan', 'intake fan',
      'hard drive cooler', 'ssd cooler', 'nvme cooler',
      'router cooler', 'modem cooler', 'phone cooler',
      'gaming chair', 'desk fan', 'room cooler',
      'water bottle', 'drink cooler', 'beverage cooler',
      'car cooler', 'portable cooler', 'ice cooler',
      'thermal paste only', 'thermal compound only',
      'mounting kit only', 'bracket only', 'screws only'
    ];
    
    if (excludeKeywords.some(keyword => titleLower.includes(keyword))) {
      return false;
    }
    
    // Must contain CPU cooler-specific indicators
    const coolerIndicators = [
      /cpu\s*(cooler|cooling|fan)/i,
      /processor\s*(cooler|cooling|fan)/i,
      /(liquid|water|aio)\s*(cooler|cooling)/i,
      /(air|tower)\s*(cooler|cooling)/i,
      /heatsink/i,
      /heat\s*sink/i,
      /radiator.*\d+mm/i, // Radiator with size (120mm, 240mm, etc.)
      /(lga|am4|am5).*cooler/i, // Socket compatibility
      /cooler.*(lga|am4|am5)/i
    ];
    
    if (!coolerIndicators.some(pattern => pattern.test(title))) {
      return false;
    }
    
    // Check for valid price (must be reasonable for CPU coolers)
    const price = parseFloat(productData.basePrice || productData.currentPrice || productData.price || 0);
    if (price > 0 && (price < 10 || price > 1000)) { // CPU coolers typically $10-$1000
      return false;
    }
    
    return true;
  }
  
  static extractCoolerSpecs(title) {
    const specs = {};
    const titleLower = title.toLowerCase();
    
    // Determine cooler type
    if (titleLower.includes('liquid') || titleLower.includes('water') || 
        titleLower.includes('aio') || titleLower.includes('all-in-one') ||
        titleLower.includes('radiator')) {
      specs.coolerType = 'Liquid';
      specs.isAIO = true;
    } else if (titleLower.includes('air') || titleLower.includes('tower') || 
               titleLower.includes('heatsink') || titleLower.includes('heat sink')) {
      specs.coolerType = 'Air';
      specs.isAIO = false;
    } else {
      // Default based on other indicators
      if (titleLower.includes('fan') && !titleLower.includes('liquid')) {
        specs.coolerType = 'Air';
        specs.isAIO = false;
      } else {
        specs.coolerType = 'Unknown';
        specs.isAIO = false;
      }
    }
    
    // Extract radiator size (for liquid coolers)
    const radiatorMatch = title.match(/(\d+)mm.*radiator|radiator.*(\d+)mm/i);
    if (radiatorMatch) {
      const size = radiatorMatch[1] || radiatorMatch[2];
      specs.radiatorSize = `${size}mm`;
    }
    
    // Extract tower height (for air coolers)
    const heightMatch = title.match(/(\d+)mm.*height|height.*(\d+)mm|(\d+)cm.*tall/i);
    if (heightMatch) {
      const height = heightMatch[1] || heightMatch[2] || (parseInt(heightMatch[3]) * 10);
      specs.height = `${height}mm`;
    }
    
    // Extract fan size
    const fanSizeMatch = title.match(/(\d+)mm.*fan|fan.*(\d+)mm/i);
    if (fanSizeMatch) {
      specs.fanSize = `${fanSizeMatch[1] || fanSizeMatch[2]}mm`;
    }
    
    // Extract socket compatibility
    const sockets = [];
    const socketPatterns = [
      /lga\s*(\d+)/gi,
      /am[45]/gi,
      /tr4/gi,
      /strx4/gi,
      /1366|1151|1150|1155|1200|1700/g
    ];
    
    socketPatterns.forEach(pattern => {
      const matches = title.match(pattern);
      if (matches) {
        matches.forEach(match => {
          const socket = match.toUpperCase().replace(/\s+/g, '');
          if (!sockets.includes(socket)) {
            sockets.push(socket);
          }
        });
      }
    });
    
    if (sockets.length > 0) {
      specs.socketCompatibility = sockets;
    }
    
    // Extract RGB lighting
    specs.rgb = /rgb|led|lighting|aura|mystic|chroma/i.test(title);
    
    // Extract noise level
    const noiseMatch = title.match(/(\d+(?:\.\d+)?)\s*db/i);
    if (noiseMatch) {
      specs.noiseLevel = `${noiseMatch[1]}dB`;
    }
    
    // Extract TDP rating
    const tdpMatch = title.match(/(\d+)w|(\d+)\s*watt/i);
    if (tdpMatch) {
      specs.tdpRating = `${tdpMatch[1] || tdpMatch[2]}W`;
    }
    
    // Detect manufacturer
    const manufacturers = [
      { pattern: /noctua/i, name: 'Noctua' },
      { pattern: /corsair/i, name: 'Corsair' },
      { pattern: /cooler\s*master|coolermaster/i, name: 'Cooler Master' },
      { pattern: /be\s*quiet|bequiet/i, name: 'be quiet!' },
      { pattern: /arctic/i, name: 'Arctic' },
      { pattern: /deepcool/i, name: 'DeepCool' },
      { pattern: /scythe/i, name: 'Scythe' },
      { pattern: /thermalright/i, name: 'Thermalright' },
      { pattern: /nzxt/i, name: 'NZXT' },
      { pattern: /thermaltake/i, name: 'Thermaltake' },
      { pattern: /fractal\s*design/i, name: 'Fractal Design' },
      { pattern: /evga/i, name: 'EVGA' },
      { pattern: /asus/i, name: 'ASUS' },
      { pattern: /msi/i, name: 'MSI' }
    ];
    
    for (const mfg of manufacturers) {
      if (mfg.pattern.test(title)) {
        specs.manufacturer = mfg.name;
        break;
      }
    }
    
    return specs;
  }
  
  static determineCoolerTier(title, specs) {
    const titleLower = title.toLowerCase();
    const price = parseFloat(title.match(/\$(\d+(?:\.\d+)?)/)?.[1] || 0);
    
    // High-end coolers
    if (specs.coolerType === 'Liquid' && (
        (specs.radiatorSize && parseInt(specs.radiatorSize) >= 280) ||
        price >= 150 ||
        titleLower.includes('premium') ||
        titleLower.includes('pro') ||
        titleLower.includes('elite') ||
        (specs.manufacturer === 'Noctua' && titleLower.includes('d15'))
    )) {
      return 'High-End';
    }
    
    // Performance coolers
    if ((specs.coolerType === 'Liquid' && specs.radiatorSize && parseInt(specs.radiatorSize) >= 240) ||
        (specs.coolerType === 'Air' && (price >= 80 || specs.manufacturer === 'Noctua')) ||
        titleLower.includes('gaming') ||
        titleLower.includes('performance')) {
      return 'Performance';
    }
    
    // Budget/Entry coolers
    if (price > 0 && price <= 30) {
      return 'Budget';
    }
    
    // Mainstream
    return 'Mainstream';
  }
}

module.exports = CoolerProductFilter;