const { extractGPUModel } = require('../purgeAndReorganizeGPUs');
const config = require('../config/scrapeConfig');

class DataEnrichmentService {
  static enrichGPUData(rawData, cardName) {
    return rawData.map(gpu => {
      const cleanedName = gpu.name.replace(/[™®©]/g, '');
      const model = extractGPUModel(cleanedName);
      
      return {
        ...gpu,
        manufacturer: this.determineManufacturer(gpu.name),
        partner: this.extractPartner(gpu.name),
        chipset: cardName,
        model: model,
        createdAt: new Date(),
        updatedAt: new Date()
      };
    });
  }

  static extractPartner(name) {
    for (const partner of config.partners) {
      if (name.toUpperCase().includes(partner.toUpperCase())) {
        return partner;
      }
    }
    return 'Unknown';
  }

  static determineManufacturer(name) {
    const upperName = name.toUpperCase();
    
    if (upperName.includes('RTX') || upperName.includes('GTX') || upperName.includes('GEFORCE')) {
      return 'NVIDIA';
    }
    if (upperName.includes('RX') || upperName.includes('RADEON')) {
      return 'AMD';
    }
    if (upperName.includes('ARC')) {
      return 'Intel';
    }
    
    return 'Unknown';
  }
}

module.exports = DataEnrichmentService;