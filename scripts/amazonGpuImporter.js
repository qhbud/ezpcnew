const { connectToDatabase, getDatabase } = require('../config/database');
const { extractGPUModel } = require('./purgeAndReorganizeGPUs');
const crypto = require('crypto');
const https = require('https');
require('dotenv').config();

// Amazon Product Advertising API Configuration
const AWS_CONFIG = {
  accessKey: process.env.AMAZON_ACCESS_KEY_ID,
  secretKey: process.env.AMAZON_SECRET_ACCESS_KEY,
  associateTag: process.env.AMAZON_ASSOCIATE_TAG,
  region: process.env.AMAZON_REGION || 'us-east-1',
  host: process.env.AMAZON_HOST || 'webservices.amazon.com',
  uri: '/paapi5/searchitems'
};

// GPU Chipset Mapping for organized data collection
const GPU_CHIPSETS = {
  'RTX 4090': {
    searchTerms: ['RTX 4090', 'GeForce RTX 4090'],
    manufacturer: 'NVIDIA',
    architecture: 'Ada Lovelace',
    memorySize: 24,
    memoryType: 'GDDR6X'
  },
  'RTX 4080': {
    searchTerms: ['RTX 4080', 'GeForce RTX 4080'],
    manufacturer: 'NVIDIA', 
    architecture: 'Ada Lovelace',
    memorySize: 16,
    memoryType: 'GDDR6X'
  },
  'RTX 4070 Ti': {
    searchTerms: ['RTX 4070 Ti', 'GeForce RTX 4070 Ti'],
    manufacturer: 'NVIDIA',
    architecture: 'Ada Lovelace', 
    memorySize: 12,
    memoryType: 'GDDR6X'
  },
  'RTX 4070': {
    searchTerms: ['RTX 4070', 'GeForce RTX 4070'],
    manufacturer: 'NVIDIA',
    architecture: 'Ada Lovelace',
    memorySize: 12,
    memoryType: 'GDDR6X'
  },
  'RTX 3080 Ti': {
    searchTerms: ['RTX 3080 Ti', 'GeForce RTX 3080 Ti'],
    manufacturer: 'NVIDIA',
    architecture: 'Ampere',
    memorySize: 12,
    memoryType: 'GDDR6X'
  },
  'RTX 3080': {
    searchTerms: ['RTX 3080', 'GeForce RTX 3080'],
    manufacturer: 'NVIDIA',
    architecture: 'Ampere',
    memorySize: 10,
    memoryType: 'GDDR6X'
  },
  'RX 7900 XTX': {
    searchTerms: ['RX 7900 XTX', 'Radeon RX 7900 XTX'],
    manufacturer: 'AMD',
    architecture: 'RDNA 3',
    memorySize: 24,
    memoryType: 'GDDR6'
  },
  'RX 7900 XT': {
    searchTerms: ['RX 7900 XT', 'Radeon RX 7900 XT'],
    manufacturer: 'AMD',
    architecture: 'RDNA 3',
    memorySize: 20,
    memoryType: 'GDDR6'
  },
  'RTX 5090': {
    searchTerms: ['RTX 5090', 'GeForce RTX 5090'],
    manufacturer: 'NVIDIA',
    architecture: 'Blackwell',
    memorySize: 32,
    memoryType: 'GDDR7'
  },
  'RTX 5080': {
    searchTerms: ['RTX 5080', 'GeForce RTX 5080'],
    manufacturer: 'NVIDIA',
    architecture: 'Blackwell',
    memorySize: 16,
    memoryType: 'GDDR7'
  }
};

class AmazonGpuImporter {
  constructor() {
    this.validateConfig();
  }

  validateConfig() {
    const requiredFields = ['accessKey', 'secretKey', 'associateTag'];
    for (const field of requiredFields) {
      if (!AWS_CONFIG[field]) {
        throw new Error(`Missing required Amazon API configuration: ${field.toUpperCase()}`);
      }
    }
  }

  // Generate AWS Signature Version 4
  generateSignature(method, uri, query, headers, payload) {
    const algorithm = 'AWS4-HMAC-SHA256';
    const service = 'ProductAdvertisingAPI';
    const region = AWS_CONFIG.region;
    const accessKey = AWS_CONFIG.accessKey;
    const secretKey = AWS_CONFIG.secretKey;
    
    const date = new Date();
    const dateString = date.toISOString().split('T')[0].replace(/-/g, '');
    const timeString = date.toISOString().replace(/[:-]|\.\d{3}/g, '');
    
    // Create canonical request
    const canonicalHeaders = Object.keys(headers)
      .sort()
      .map(key => `${key.toLowerCase()}:${headers[key]}\n`)
      .join('');
    
    const signedHeaders = Object.keys(headers)
      .sort()
      .map(key => key.toLowerCase())
      .join(';');
    
    const canonicalRequest = [
      method,
      uri,
      query,
      canonicalHeaders,
      signedHeaders,
      crypto.createHash('sha256').update(payload).digest('hex')
    ].join('\n');
    
    // Create string to sign
    const credentialScope = `${dateString}/${region}/${service}/aws4_request`;
    const stringToSign = [
      algorithm,
      timeString,
      credentialScope,
      crypto.createHash('sha256').update(canonicalRequest).digest('hex')
    ].join('\n');
    
    // Calculate signature
    const kDate = crypto.createHmac('sha256', `AWS4${secretKey}`).update(dateString).digest();
    const kRegion = crypto.createHmac('sha256', kDate).update(region).digest();
    const kService = crypto.createHmac('sha256', kRegion).update(service).digest();
    const kSigning = crypto.createHmac('sha256', kService).update('aws4_request').digest();
    const signature = crypto.createHmac('sha256', kSigning).update(stringToSign).digest('hex');
    
    return {
      authorization: `${algorithm} Credential=${accessKey}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`,
      timestamp: timeString
    };
  }

  // Search for GPUs by chipset
  async searchGpusByChipset(chipset, chipsetInfo) {
    const payload = {
      Keywords: chipsetInfo.searchTerms[0],
      SearchIndex: 'Electronics',
      ItemCount: 10,
      Marketplace: 'www.amazon.com',
      PartnerTag: AWS_CONFIG.associateTag,
      PartnerType: 'Associates',
      Resources: [
        'ItemInfo.Title',
        'ItemInfo.Features',
        'Offers.Listings.Price',
        'Images.Primary.Medium',
        'ItemInfo.ProductInfo'
      ]
    };

    const payloadString = JSON.stringify(payload);
    
    const headers = {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Encoding': 'amz-1.0',
      'Host': AWS_CONFIG.host,
      'X-Amz-Target': 'com.amazon.paapi5.v1.ProductAdvertisingAPIv1.SearchItems'
    };

    const { authorization, timestamp } = this.generateSignature(
      'POST',
      AWS_CONFIG.uri,
      '',
      headers,
      payloadString
    );

    headers['Authorization'] = authorization;
    headers['X-Amz-Date'] = timestamp;

    return new Promise((resolve, reject) => {
      const options = {
        hostname: AWS_CONFIG.host,
        path: AWS_CONFIG.uri,
        method: 'POST',
        headers: headers
      };

      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => {
          try {
            const response = JSON.parse(data);
            if (response.Errors) {
              reject(new Error(`Amazon API Error: ${response.Errors[0].Message}`));
            } else {
              resolve(this.processAmazonResponse(response, chipset, chipsetInfo));
            }
          } catch (error) {
            reject(error);
          }
        });
      });

      req.on('error', reject);
      req.write(payloadString);
      req.end();
    });
  }

  // Process Amazon API response and format for database
  processAmazonResponse(response, chipset, chipsetInfo) {
    const items = response.SearchResult?.Items || [];
    const gpus = [];

    for (const item of items) {
      try {
        const gpu = this.formatGpuData(item, chipset, chipsetInfo);
        if (gpu) {
          gpus.push(gpu);
        }
      } catch (error) {
        console.warn(`Skipping item due to formatting error: ${error.message}`);
      }
    }

    return gpus;
  }

  // Format individual GPU data for database insertion
  formatGpuData(item, chipset, chipsetInfo) {
    const title = item.ItemInfo?.Title?.DisplayValue || '';
    const features = item.ItemInfo?.Features?.DisplayValues || [];
    const price = item.Offers?.Listings?.[0]?.Price?.Amount || 0;
    const imageUrl = item.Images?.Primary?.Medium?.URL || '';

    // Extract partner brand from title
    const partner = this.extractPartner(title);
    
    // Extract memory info from title/features
    const memoryInfo = this.extractMemoryInfo(title, features, chipsetInfo);
    
    // Extract core specifications (estimated based on chipset)
    const coreSpecs = this.getCoreSpecsByChipset(chipset);

    const now = new Date();

    // Log VRAM information for each card
    console.log(`🧠 VRAM: ${chipset} (${title.substring(0, 50)}...) - ${memoryInfo.size}GB ${memoryInfo.type} memory`);

    return {
      name: title,
      manufacturer: chipsetInfo.manufacturer,
      partner: partner,
      chipset: chipset,
      architecture: chipsetInfo.architecture,
      memory: {
        size: memoryInfo.size,
        type: memoryInfo.type,
        speed: memoryInfo.speed || this.getDefaultMemorySpeed(chipsetInfo.memoryType),
        busWidth: this.getBusWidth(chipset),
        bandwidth: this.calculateBandwidth(memoryInfo.speed || this.getDefaultMemorySpeed(chipsetInfo.memoryType), this.getBusWidth(chipset))
      },
      core: coreSpecs,
      power: this.getPowerSpecs(chipset),
      dimensions: this.getDefaultDimensions(),
      cooling: this.extractCoolingInfo(title, features),
      outputs: this.getDefaultOutputs(),
      features: this.extractFeatures(features, chipsetInfo.manufacturer),
      price: price / 100, // Amazon returns price in cents
      releaseDate: this.getReleaseDate(chipset),
      performanceScore: this.getPerformanceScore(chipset),
      imageUrl: imageUrl,
      specifications: this.getSpecifications(chipset),
      compatibility: this.getCompatibility(),
      chipsetGroup: chipset, // For organizing by chipset
      createdAt: now,
      updatedAt: now,
      source: 'Amazon Product Advertising API',
      asin: item.ASIN
    };
  }

  // Extract partner/brand from GPU title
  extractPartner(title) {
    const partners = ['ASUS', 'MSI', 'Gigabyte', 'EVGA', 'Zotac', 'Palit', 'Gainward', 'PNY', 'Inno3D'];
    const upperTitle = title.toUpperCase();
    
    for (const partner of partners) {
      if (upperTitle.includes(partner.toUpperCase())) {
        return partner;
      }
    }
    return 'Unknown';
  }

  // Extract memory information from title and features
  extractMemoryInfo(title, features, chipsetInfo) {
    const memorySize = chipsetInfo.memorySize;
    const memoryType = chipsetInfo.memoryType;
    
    // Try to extract speed from title/features
    let speed = null;
    const speedRegex = /(\d+)\s*(?:MT\/s|MHz|Gbps)/i;
    const titleMatch = title.match(speedRegex);
    if (titleMatch) {
      speed = parseInt(titleMatch[1]);
    }

    return {
      size: memorySize,
      type: memoryType,
      speed: speed
    };
  }

  // Get core specifications by chipset
  getCoreSpecsByChipset(chipset) {
    const coreSpecs = {
      'RTX 4090': { baseClock: 2235, boostClock: 2520, shaders: 16384, rtCores: 128, tensorCores: 512 },
      'RTX 4080': { baseClock: 2205, boostClock: 2505, shaders: 9728, rtCores: 76, tensorCores: 304 },
      'RTX 4070 Ti': { baseClock: 2310, boostClock: 2610, shaders: 7680, rtCores: 60, tensorCores: 240 },
      'RTX 4070': { baseClock: 1920, boostClock: 2475, shaders: 5888, rtCores: 46, tensorCores: 184 },
      'RTX 3080 Ti': { baseClock: 1365, boostClock: 1665, shaders: 10240, rtCores: 80, tensorCores: 320 },
      'RTX 3080': { baseClock: 1440, boostClock: 1710, shaders: 8704, rtCores: 68, tensorCores: 272 },
      'RX 7900 XTX': { baseClock: 1855, boostClock: 2500, shaders: 6144, rtCores: 96, computeUnits: 96 },
      'RX 7900 XT': { baseClock: 1500, boostClock: 2400, shaders: 5376, rtCores: 84, computeUnits: 84 }
    };

    return coreSpecs[chipset] || { baseClock: 0, boostClock: 0, shaders: 0, rtCores: 0, tensorCores: 0, computeUnits: 0 };
  }

  // Additional helper methods for GPU specifications
  getBusWidth(chipset) {
    const busWidths = {
      'RTX 4090': 384, 'RTX 4080': 256, 'RTX 4070 Ti': 192, 'RTX 4070': 192,
      'RTX 3080 Ti': 384, 'RTX 3080': 320,
      'RX 7900 XTX': 384, 'RX 7900 XT': 320
    };
    return busWidths[chipset] || 256;
  }

  getDefaultMemorySpeed(memoryType) {
    return memoryType === 'GDDR6X' ? 21000 : 18000;
  }

  calculateBandwidth(speed, busWidth) {
    return Math.round((speed * busWidth) / 8 / 1000);
  }

  getPowerSpecs(chipset) {
    const powerSpecs = {
      'RTX 5090': { tdp: 575, recommendedPsu: 1000, powerConnectors: ['16-pin'] },
      'RTX 4090': { tdp: 450, recommendedPsu: 850, powerConnectors: ['16-pin'] },
      'RTX 4080': { tdp: 320, recommendedPsu: 750, powerConnectors: ['16-pin'] },
      'RTX 4070 Ti': { tdp: 285, recommendedPsu: 700, powerConnectors: ['16-pin'] },
      'RTX 4070': { tdp: 200, recommendedPsu: 650, powerConnectors: ['8-pin'] },
      'RTX 3080 Ti': { tdp: 350, recommendedPsu: 750, powerConnectors: ['8-pin', '8-pin'] },
      'RTX 3080': { tdp: 320, recommendedPsu: 750, powerConnectors: ['8-pin', '8-pin'] },
      'RX 7900 XTX': { tdp: 355, recommendedPsu: 800, powerConnectors: ['8-pin', '8-pin'] },
      'RX 7900 XT': { tdp: 300, recommendedPsu: 750, powerConnectors: ['8-pin', '8-pin'] }
    };
    return powerSpecs[chipset] || { tdp: 250, recommendedPsu: 650, powerConnectors: ['8-pin'] };
  }

  getDefaultDimensions() {
    return { length: 300, width: 130, height: 50, slots: 2 };
  }

  extractCoolingInfo(title, features) {
    const hasRGB = /rgb/i.test(title + ' ' + features.join(' '));
    return { type: 'Air', fans: 2, fanSize: [90, 90], rgb: hasRGB };
  }

  getDefaultOutputs() {
    return [
      { type: 'HDMI', version: 'HDMI 2.1', count: 2 },
      { type: 'DisplayPort', version: 'DP 1.4a', count: 3 }
    ];
  }

  extractFeatures(features, manufacturer) {
    const baseFeatures = manufacturer === 'NVIDIA' ? 
      ['Ray tracing', 'DLSS'] : ['Ray tracing', 'FSR'];
    
    // Add features based on description
    const featureText = features.join(' ').toLowerCase();
    if (featureText.includes('rgb')) baseFeatures.push('RGB Lighting');
    if (featureText.includes('overclock')) baseFeatures.push('Overclocked');
    
    return baseFeatures;
  }

  getReleaseDate(chipset) {
    const releaseDates = {
      'RTX 4090': new Date('2022-10-12'),
      'RTX 4080': new Date('2022-11-16'),
      'RTX 4070 Ti': new Date('2023-01-05'),
      'RTX 4070': new Date('2023-04-13'),
      'RTX 3080 Ti': new Date('2021-06-03'),
      'RTX 3080': new Date('2020-09-17'),
      'RX 7900 XTX': new Date('2022-12-13'),
      'RX 7900 XT': new Date('2022-12-13')
    };
    return releaseDates[chipset] || new Date();
  }

  getPerformanceScore(chipset) {
    const scores = {
      'RTX 4090': 100, 'RTX 4080': 85, 'RTX 4070 Ti': 75, 'RTX 4070': 65,
      'RTX 3080 Ti': 80, 'RTX 3080': 75,
      'RX 7900 XTX': 90, 'RX 7900 XT': 80
    };
    return scores[chipset] || 50;
  }

  getSpecifications(chipset) {
    const isNvidia = chipset.startsWith('RTX');
    return {
      lithography: isNvidia && chipset.startsWith('RTX 4') ? '4nm' : 
                   isNvidia ? '8nm' : '5nm',
      pcieVersion: 'PCIe 4.0',
      encoding: ['H.264', 'H.265', 'AV1'],
      decoding: ['H.264', 'H.265', 'AV1']
    };
  }

  getCompatibility() {
    return {
      motherboards: ['PCIe 4.0', 'PCIe 3.0'],
      psus: ['650W+'],
      cases: ['Mid Tower', 'Full Tower']
    };
  }

  // Main import function
  async importGpusByChipset() {
    try {
      console.log('🔌 Starting Amazon GPU import organized by chipset...');
      
      // Connect to database
      await connectToDatabase();
      const db = getDatabase();
      
      const allGpus = [];
      const chipsetResults = {};

      // Process each chipset
      for (const [chipset, chipsetInfo] of Object.entries(GPU_CHIPSETS)) {
        console.log(`\n🔍 Searching for ${chipset} GPUs...`);
        
        try {
          const gpus = await this.searchGpusByChipset(chipset, chipsetInfo);
          chipsetResults[chipset] = gpus.length;
          allGpus.push(...gpus);
          
          console.log(`✓ Found ${gpus.length} ${chipset} GPUs`);
          
          // Add delay to respect API rate limits (5 seconds between requests)
          await new Promise(resolve => setTimeout(resolve, 5000));
          
        } catch (error) {
          console.error(`✗ Error fetching ${chipset}: ${error.message}`);
          chipsetResults[chipset] = 0;
        }
      }

      // Insert into database organized by GPU model
      if (allGpus.length > 0) {
        console.log(`\n💾 Inserting ${allGpus.length} GPUs into database...`);
        
        // Group GPUs by model for insertion into model-specific collections
        const gpusByModel = {};
        allGpus.forEach(gpu => {
          const model = extractGPUModel(gpu.chipset || gpu.name);
          if (!gpusByModel[model]) {
            gpusByModel[model] = [];
          }
          gpusByModel[model].push(gpu);
        });
        
        let totalInserted = 0;
        for (const [model, gpus] of Object.entries(gpusByModel)) {
          const collectionName = `gpus_${model}`;
          console.log(`  Inserting ${gpus.length} GPUs into ${collectionName}...`);
          
          const result = await db.collection(collectionName).insertMany(gpus);
          totalInserted += result.insertedCount;
          
          // Create indexes for performance
          await db.collection(collectionName).createIndex({ name: 1 });
          await db.collection(collectionName).createIndex({ price: 1 });
          await db.collection(collectionName).createIndex({ partner: 1 });
        }
        
        console.log(`✓ Successfully inserted ${totalInserted} GPUs across ${Object.keys(gpusByModel).length} model collections`);

        // Display results by chipset
        console.log('\n📊 Import Summary by Chipset:');
        for (const [chipset, count] of Object.entries(chipsetResults)) {
          console.log(`  ${chipset}: ${count} GPUs`);
        }
        
        console.log('\n🎉 GPU import completed successfully!');
      } else {
        console.log('❌ No GPUs found to import');
      }

    } catch (error) {
      console.error('❌ GPU import failed:', error.message);
      throw error;
    }
  }
}

// Run import if called directly
if (require.main === module) {
  const importer = new AmazonGpuImporter();
  importer.importGpusByChipset()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Import failed:', error);
      process.exit(1);
    });
}

module.exports = { AmazonGpuImporter };