const { extractGPUModel } = require('../purgeAndReorganizeGPUs');
const Logger = require('../utils/logger');

class DatabaseService {
  constructor(database) {
    this.db = database;
  }

  async saveGPUData(gpuData, cardName) {
    try {
      Logger.debug(`Attempting to save ${gpuData.length} GPUs`);
      
      // Log all GPUs being saved for debugging
      this.logAllGPUsBeingSaved(gpuData);
      
      const gpusByModel = this.groupByModel(gpuData, cardName);
      let totalSaved = 0;
      
      for (const [model, gpus] of Object.entries(gpusByModel)) {
        const savedCount = await this.saveToCollection(model, gpus);
        totalSaved += savedCount;
      }
      
      Logger.success(`Total GPUs saved: ${totalSaved}`);
      
    } catch (error) {
      Logger.error('Error saving GPU data:', error);
      throw error;
    }
  }

  groupByModel(gpuData, cardName) {
    const gpusByModel = {};
    
    gpuData.forEach((gpu, index) => {
      const cleanedName = (gpu.name || cardName).replace(/[™®©]/g, '');
      const model = extractGPUModel(cleanedName);
      
      Logger.debug(`GPU ${index + 1} - Name: "${gpu.name}" -> Model: "${model}"`);
      
      if (!gpusByModel[model]) {
        gpusByModel[model] = [];
      }
      gpusByModel[model].push(gpu);
    });

    Logger.debug(`Models found: ${Object.keys(gpusByModel).join(', ')}`);
    return gpusByModel;
  }

  async saveToCollection(model, gpus) {
    const collectionName = `gpus_${model}`;
    Logger.debug(`Saving ${gpus.length} GPUs to ${collectionName}`);
    
    const collection = this.db.collection(collectionName);
    const result = await collection.insertMany(gpus);
    
    // Create indexes for better performance
    await this.createIndexes(collection);
    
    Logger.info(`Saved ${result.insertedCount} GPUs to ${collectionName}`);
    
    // Log sample data for verification
    this.logSampleData(collectionName, gpus[0]);
    
    return result.insertedCount;
  }

  async createIndexes(collection) {
    const indexes = [
      { name: 1 },
      { basePrice: 1 },
      { salePrice: 1 },
      { currentPrice: 1 },
      { partner: 1 },
      { sourceUrl: 1 },
      { isOnSale: 1 }
    ];

    for (const index of indexes) {
      await collection.createIndex(index);
    }
  }

  logSampleData(collectionName, sampleGpu) {
    Logger.debug(`Sample GPU from ${collectionName}:`);
    Logger.debug(`  Name: ${sampleGpu.name}`);
    Logger.debug(`  Base Price: $${sampleGpu.basePrice}`);
    Logger.debug(`  Sale Price: ${sampleGpu.salePrice ? `$${sampleGpu.salePrice}` : 'Not set'}`);
    Logger.debug(`  Is On Sale: ${sampleGpu.isOnSale}`);
    Logger.debug(`  Source: ${sampleGpu.source}`);
    Logger.debug(`  Partner: ${sampleGpu.partner}`);
    Logger.debug(`  Model: ${sampleGpu.model}`);
  }

  logAllGPUsBeingSaved(gpuData) {
    if (gpuData.length === 0) {
      Logger.warn('No GPUs to save');
      return;
    }

    Logger.info('\n📋 ALL GPUS BEING SAVED:');
    Logger.info('=' .repeat(80));
    
    gpuData.forEach((gpu, index) => {
      Logger.info(`\n🎮 GPU ${index + 1}:`);
      Logger.info(`   Title: ${gpu.name}`);
      Logger.info(`   Base Price: ${gpu.basePrice ? `$${gpu.basePrice}` : 'Not set'}`);
      Logger.info(`   Sale Price: ${gpu.salePrice ? `$${gpu.salePrice}` : 'Not set (no discount)'}`);
      Logger.info(`   Current Price: ${gpu.currentPrice ? `$${gpu.currentPrice}` : 'Not set'}`);
      Logger.info(`   On Sale: ${gpu.isOnSale ? 'Yes' : 'No'}`);
      Logger.info(`   Source: ${gpu.source}`);
      Logger.info(`   URL: ${gpu.sourceUrl}`);
      if (gpu.partner) {
        Logger.info(`   Partner: ${gpu.partner}`);
      }
    });
    
    Logger.info('\n' + '=' .repeat(80));
  }

  // Save CPUs to database
  async saveCPUs(cpuData, collectionName) {
    try {
      Logger.debug(`Attempting to save ${cpuData.length} CPUs to ${collectionName}`);
      
      const collection = this.db.collection(collectionName);
      const result = await collection.insertMany(cpuData);
      
      // Create indexes for better performance
      await this.createComponentIndexes(collection);
      
      Logger.info(`Saved ${result.insertedCount} CPUs to ${collectionName}`);
      
      return result;
      
    } catch (error) {
      Logger.error('Error saving CPU data:', error);
      throw error;
    }
  }

  // Save Motherboards to database
  async saveMotherboards(motherboardData, collectionName) {
    try {
      Logger.debug(`Attempting to save ${motherboardData.length} motherboards to ${collectionName}`);
      
      const collection = this.db.collection(collectionName);
      const result = await collection.insertMany(motherboardData);
      
      // Create indexes for better performance
      await this.createComponentIndexes(collection);
      
      Logger.info(`Saved ${result.insertedCount} motherboards to ${collectionName}`);
      
      return result;
      
    } catch (error) {
      Logger.error('Error saving motherboard data:', error);
      throw error;
    }
  }

  // Save Motherboards with duplicate detection
  async saveMotherboardsWithDuplicateDetection(motherboardData, collectionName) {
    try {
      Logger.debug(`Processing ${motherboardData.length} motherboards with duplicate detection for ${collectionName}`);
      
      const collection = this.db.collection(collectionName);
      
      let newCount = 0;
      let duplicateCount = 0;
      let updatedCount = 0;
      
      for (const motherboard of motherboardData) {
        try {
          // Create a unique identifier based on key fields
          const uniqueIdentifier = this.createMotherboardUniqueId(motherboard);
          
          // Check if motherboard already exists
          const existingMotherboard = await collection.findOne({
            $or: [
              { sourceUrl: motherboard.sourceUrl },
              { 
                title: motherboard.title,
                manufacturer: motherboard.manufacturer,
                chipset: motherboard.chipset,
                socket: motherboard.socket
              }
            ]
          });
          
          if (existingMotherboard) {
            // Update existing motherboard with newer price/availability data
            const updateFields = {
              currentPrice: motherboard.currentPrice || existingMotherboard.currentPrice,
              basePrice: motherboard.basePrice || existingMotherboard.basePrice,
              salePrice: motherboard.salePrice || existingMotherboard.salePrice,
              isOnSale: motherboard.isOnSale !== undefined ? motherboard.isOnSale : existingMotherboard.isOnSale,
              availability: motherboard.availability || existingMotherboard.availability,
              lastUpdated: new Date(),
              updatedAt: new Date()
            };
            
            const updateResult = await collection.updateOne(
              { _id: existingMotherboard._id },
              { $set: updateFields }
            );
            
            if (updateResult.modifiedCount > 0) {
              updatedCount++;
              Logger.debug(`Updated existing motherboard: ${motherboard.title}`);
            } else {
              duplicateCount++;
              Logger.debug(`Duplicate skipped (no changes): ${motherboard.title}`);
            }
          } else {
            // Insert new motherboard
            const insertResult = await collection.insertOne({
              ...motherboard,
              uniqueId: uniqueIdentifier,
              createdAt: new Date(),
              updatedAt: new Date()
            });
            
            if (insertResult.insertedId) {
              newCount++;
              Logger.debug(`Inserted new motherboard: ${motherboard.title}`);
            }
          }
        } catch (itemError) {
          Logger.warn(`Failed to process motherboard: ${motherboard.title || 'Unknown'} - ${itemError.message}`);
          // Continue processing other motherboards
        }
      }
      
      // Create indexes for better performance
      await this.createComponentIndexes(collection);
      
      // Create unique index for duplicate detection
      try {
        await collection.createIndex({ sourceUrl: 1 }, { unique: true, sparse: true });
        await collection.createIndex({ 
          title: 1, 
          manufacturer: 1, 
          chipset: 1, 
          socket: 1 
        }, { unique: false });
      } catch (indexError) {
        // Ignore index errors if already exist
        Logger.debug(`Index creation note: ${indexError.message}`);
      }
      
      Logger.info(`Motherboard processing complete: ${newCount} new, ${duplicateCount} duplicates, ${updatedCount} updated`);
      
      return {
        newCount,
        duplicateCount, 
        updatedCount,
        totalProcessed: motherboardData.length
      };
      
    } catch (error) {
      Logger.error('Error saving motherboard data with duplicate detection:', error);
      throw error;
    }
  }

  // Save RAM with duplicate detection
  async saveRamWithDuplicateDetection(ramData, collectionName) {
    try {
      Logger.debug(`Processing ${ramData.length} RAM modules with duplicate detection for ${collectionName}`);
      
      const collection = this.db.collection(collectionName);
      
      let newCount = 0;
      let duplicateCount = 0;
      let updatedCount = 0;
      
      for (const ram of ramData) {
        try {
          // Create a unique identifier based on key fields
          const uniqueIdentifier = this.createRamUniqueId(ram);
          
          // Check if RAM already exists (ONLY by URL - much simpler)
          const existingRam = await collection.findOne({
            sourceUrl: ram.sourceUrl
          });
          
          if (existingRam) {
            // Only update price if we have a newer/better price
            if (ram.currentPrice && ram.currentPrice !== existingRam.currentPrice) {
              const updateResult = await collection.updateOne(
                { _id: existingRam._id },
                { 
                  $set: { 
                    currentPrice: ram.currentPrice,
                    basePrice: ram.basePrice || existingRam.basePrice,
                    lastUpdated: new Date(),
                    updatedAt: new Date()
                  }
                }
              );
              
              if (updateResult.modifiedCount > 0) {
                updatedCount++;
                Logger.debug(`Updated existing RAM price: ${ram.title}`);
              } else {
                duplicateCount++;
                Logger.debug(`Duplicate (no price change): ${ram.title}`);
              }
            } else {
              duplicateCount++;
              Logger.debug(`Duplicate RAM skipped: ${ram.title}`);
            }
          } else {
            // Insert new RAM - this is what we want to happen most of the time
            try {
              const insertResult = await collection.insertOne({
                ...ram,
                uniqueId: uniqueIdentifier,
                createdAt: new Date(),
                updatedAt: new Date()
              });
              
              if (insertResult.insertedId) {
                newCount++;
                Logger.debug(`✅ Inserted new RAM: ${ram.title}`);
              } else {
                Logger.warn(`❌ Failed to insert RAM (no ID returned): ${ram.title}`);
              }
            } catch (insertError) {
              Logger.error(`❌ Insert failed for RAM: ${ram.title} - ${insertError.message}`);
              throw insertError;
            }
          }
        } catch (itemError) {
          Logger.warn(`Failed to process RAM: ${ram.title || 'Unknown'} - ${itemError.message}`);
          // Continue processing other RAM modules
        }
      }
      
      // Create indexes for better performance
      await this.createComponentIndexes(collection);
      
      // Create unique index for duplicate detection
      try {
        await collection.createIndex({ sourceUrl: 1 }, { unique: true, sparse: true });
        await collection.createIndex({ 
          title: 1, 
          manufacturer: 1, 
          memoryType: 1, 
          speed: 1,
          capacity: 1
        }, { unique: false });
      } catch (indexError) {
        // Ignore index errors if already exist
        Logger.debug(`Index creation note: ${indexError.message}`);
      }
      
      Logger.info(`RAM processing complete: ${newCount} new, ${duplicateCount} duplicates, ${updatedCount} updated`);
      
      return {
        newCount,
        duplicateCount, 
        updatedCount,
        totalProcessed: ramData.length
      };
      
    } catch (error) {
      Logger.error('Error saving RAM data with duplicate detection:', error);
      throw error;
    }
  }

  // Create unique identifier for RAM
  createRamUniqueId(ram) {
    const keyFields = [
      ram.title?.toLowerCase().trim() || '',
      ram.manufacturer?.toLowerCase().trim() || '',
      ram.memoryType?.toLowerCase().trim() || '',
      String(ram.speed || '').toLowerCase().trim() || '',
      String(ram.capacity || '').toLowerCase().trim() || '',
      ram.kitConfiguration?.toLowerCase().trim() || ''
    ];

    return keyFields.join('|').replace(/\s+/g, ' ');
  }

  // Create unique identifier for motherboard
  createMotherboardUniqueId(motherboard) {
    const keyFields = [
      motherboard.title?.toLowerCase().trim() || '',
      motherboard.manufacturer?.toLowerCase().trim() || '',
      motherboard.chipset?.toLowerCase().trim() || '',
      motherboard.socket?.toLowerCase().trim() || '',
      motherboard.formFactor?.toLowerCase().trim() || ''
    ];
    
    return keyFields.join('|').replace(/\s+/g, ' ');
  }

  // Save coolers with duplicate detection
  async saveCoolersWithDuplicateDetection(coolerData, collectionName) {
    try {
      Logger.info(`Starting to save ${coolerData.length} coolers to ${collectionName}`);
      
      const collection = this.db.collection(collectionName);
      let newCount = 0;
      let duplicateCount = 0;
      let updatedCount = 0;
      
      // Create indexes for better performance
      try {
        await collection.createIndex({ 
          title: 1, 
          manufacturer: 1, 
          coolerType: 1, 
          radiatorSize: 1
        }, { unique: false });
      } catch (indexError) {
        // Ignore index errors if already exist
        Logger.debug(`Index creation note: ${indexError.message}`);
      }
      
      for (const cooler of coolerData) {
        try {
          // Create unique identifier based on key cooler properties
          const uniqueId = this.createCoolerUniqueId(cooler);
          
          // Check for duplicates
          const existingCooler = await collection.findOne({ uniqueId });
          
          if (existingCooler) {
            // Update existing cooler if price has changed
            const priceChanged = existingCooler.currentPrice !== cooler.currentPrice ||
                               existingCooler.isOnSale !== cooler.isOnSale;
                               
            if (priceChanged) {
              await collection.updateOne(
                { uniqueId },
                { 
                  $set: { 
                    ...cooler, 
                    uniqueId,
                    updatedAt: new Date() 
                  } 
                }
              );
              updatedCount++;
              Logger.debug(`Updated cooler: ${cooler.title}`);
            } else {
              duplicateCount++;
              Logger.debug(`Duplicate skipped: ${cooler.title}`);
            }
          } else {
            // Insert new cooler
            await collection.insertOne({
              ...cooler,
              uniqueId,
              createdAt: new Date(),
              updatedAt: new Date()
            });
            
            newCount++;
            Logger.debug(`✅ Inserted cooler: ${cooler.title}`);
          }
        } catch (itemError) {
          Logger.warn(`Failed to save cooler: ${cooler.title || 'Unknown'} - ${itemError.message}`);
        }
      }
      
      Logger.info(`Cooler processing complete: ${newCount} new, ${duplicateCount} duplicates, ${updatedCount} updated`);
      
      return {
        newCount,
        duplicateCount, 
        updatedCount,
        totalProcessed: coolerData.length
      };
      
    } catch (error) {
      Logger.error('Error saving cooler data with duplicate detection:', error);
      throw error;
    }
  }

  // Create unique identifier for cooler
  createCoolerUniqueId(cooler) {
    const keyFields = [
      cooler.title?.toLowerCase().trim() || '',
      cooler.manufacturer?.toLowerCase().trim() || '',
      cooler.coolerType?.toLowerCase().trim() || '',
      cooler.radiatorSize?.toLowerCase().trim() || '',
      cooler.fanSize?.toLowerCase().trim() || ''
    ];
    
    return keyFields.join('|').replace(/\s+/g, ' ');
  }

  // Create indexes for components (CPUs, Motherboards, etc.)
  async createComponentIndexes(collection) {
    const indexes = [
      { name: 1 },
      { title: 1 },
      { basePrice: 1 },
      { salePrice: 1 },
      { currentPrice: 1 },
      { sourceUrl: 1 },
      { isOnSale: 1 },
      { manufacturer: 1 },
      { category: 1 }
    ];

    for (const index of indexes) {
      try {
        await collection.createIndex(index);
      } catch (error) {
        // Ignore duplicate index errors
        if (!error.message.includes('already exists')) {
          Logger.warn(`Failed to create index: ${error.message}`);
        }
      }
    }
  }
}

module.exports = DatabaseService;