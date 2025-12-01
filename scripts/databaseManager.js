const { connectToDatabase, getDatabase } = require('../config/database');
const { ObjectId } = require('mongodb');
const { extractGPUModel } = require('./purgeAndReorganizeGPUs');
require('dotenv').config();

class DatabaseManager {
  constructor() {
    this.db = null;
    this.collections = ['cpus', 'motherboards', 'rams', 'storages', 'psus', 'cases', 'coolers'];
    this.gpuCollections = []; // Will be populated dynamically
  }

  async connect() {
    try {
      await connectToDatabase();
      this.db = getDatabase();
      await this.loadGpuCollections();
      console.log('✅ Connected to MongoDB database');
    } catch (error) {
      console.error('❌ Failed to connect to database:', error);
      throw error;
    }
  }

  // Load GPU collections dynamically
  async loadGpuCollections() {
    try {
      const collections = await this.db.listCollections().toArray();
      this.gpuCollections = collections
        .filter(col => col.name.startsWith('gpus_'))
        .map(col => col.name);
      console.log(`Found ${this.gpuCollections.length} GPU collections:`, this.gpuCollections);
    } catch (error) {
      console.error('Error loading GPU collections:', error);
      this.gpuCollections = [];
    }
  }

  // ===== QUERY OPERATIONS =====

  // Get all items from a collection with optional filters
  async getAllItems(collectionName, filter = {}, sort = {}, limit = 0) {
    try {
      const collection = this.db.collection(collectionName);
      let query = collection.find(filter);
      
      if (Object.keys(sort).length > 0) {
        query = query.sort(sort);
      }
      
      if (limit > 0) {
        query = query.limit(limit);
      }
      
      return await query.toArray();
    } catch (error) {
      console.error(`Error fetching items from ${collectionName}:`, error);
      throw error;
    }
  }

  // Get item by ID
  async getItemById(collectionName, id) {
    try {
      const collection = this.db.collection(collectionName);
      return await collection.findOne({ _id: new ObjectId(id) });
    } catch (error) {
      console.error(`Error fetching item by ID from ${collectionName}:`, error);
      throw error;
    }
  }

  // Search items by text
  async searchItems(collectionName, searchTerm, fields = ['name', 'manufacturer']) {
    try {
      const collection = this.db.collection(collectionName);
      const searchQuery = {
        $or: fields.map(field => ({
          [field]: { $regex: searchTerm, $options: 'i' }
        }))
      };
      return await collection.find(searchQuery).toArray();
    } catch (error) {
      console.error(`Error searching items in ${collectionName}:`, error);
      throw error;
    }
  }

  // Get items by price range
  async getItemsByPriceRange(collectionName, minPrice, maxPrice) {
    try {
      const collection = this.db.collection(collectionName);
      
      // Check if this is a GPU collection (has new price structure)
      const isGPUCollection = collectionName.startsWith('gpus_');
      
      let priceFilter = {};
      
      if (isGPUCollection) {
        // For GPU collections, check multiple price fields
        priceFilter = {
          $or: [
            { currentPrice: { $gte: minPrice || 0 } },
            { basePrice: { $gte: minPrice || 0 } },
            { salePrice: { $gte: minPrice || 0 } }
          ]
        };
        
        if (maxPrice !== undefined) {
          priceFilter = {
            $and: [
              priceFilter,
              {
                $or: [
                  { currentPrice: { $lte: maxPrice } },
                  { basePrice: { $lte: maxPrice } },
                  { salePrice: { $lte: maxPrice } }
                ]
              }
            ]
          };
        }
      } else {
        // For regular collections, use the old price field
        priceFilter = { price: {} };
        if (minPrice !== undefined) priceFilter.price.$gte = minPrice;
        if (maxPrice !== undefined) priceFilter.price.$lte = maxPrice;
      }
      
      return await collection.find(priceFilter).toArray();
    } catch (error) {
      console.error(`Error fetching items by price range from ${collectionName}:`, error);
      throw error;
    }
  }

  // Get items by manufacturer
  async getItemsByManufacturer(collectionName, manufacturer) {
    try {
      const collection = this.db.collection(collectionName);
      return await collection.find({ manufacturer: manufacturer }).toArray();
    } catch (error) {
      console.error(`Error fetching items by manufacturer from ${collectionName}:`, error);
      throw error;
    }
  }

  // ===== STATISTICS OPERATIONS =====

  // Get collection statistics
  async getCollectionStats(collectionName) {
    try {
      const collection = this.db.collection(collectionName);
      const totalCount = await collection.countDocuments();
      const manufacturers = await collection.distinct('manufacturer');
      
      // Check if this is a GPU collection (has new price structure)
      const isGPUCollection = collectionName.startsWith('gpus_');
      
      let priceStats = {};
      
      if (isGPUCollection) {
        // For GPU collections, use currentPrice as the primary price field
        priceStats = await collection.aggregate([
          {
            $group: {
              _id: null,
              avgPrice: { $avg: '$currentPrice' },
              minPrice: { $min: '$currentPrice' },
              maxPrice: { $max: '$currentPrice' },
              totalValue: { $sum: '$currentPrice' }
            }
          }
        ]).toArray();
      } else {
        // For regular collections, use the old price field
        priceStats = await collection.aggregate([
          {
            $group: {
              _id: null,
              avgPrice: { $avg: '$price' },
              minPrice: { $min: '$price' },
              maxPrice: { $max: '$price' },
              totalValue: { $sum: '$price' }
            }
          }
        ]).toArray();
      }

      return {
        collection: collectionName,
        totalItems: totalCount,
        manufacturers: manufacturers,
        priceStats: priceStats[0] || {}
      };
    } catch (error) {
      console.error(`Error getting stats for ${collectionName}:`, error);
      throw error;
    }
  }

  // Get database overview
  async getDatabaseOverview() {
    try {
      const overview = {};
      
      // Get stats for regular collections
      for (const collectionName of this.collections) {
        overview[collectionName] = await this.getCollectionStats(collectionName);
      }
      
      // Get stats for GPU collections
      overview.gpus = {
        collections: {},
        totalGpus: 0,
        models: this.gpuCollections.map(col => col.replace('gpus_', ''))
      };
      
      for (const gpuCollection of this.gpuCollections) {
        const stats = await this.getCollectionStats(gpuCollection);
        overview.gpus.collections[gpuCollection] = stats;
        overview.gpus.totalGpus += stats.totalItems || 0;
      }
      
      return overview;
    } catch (error) {
      console.error('Error getting database overview:', error);
      throw error;
    }
  }

  // ===== UPDATE OPERATIONS =====

  // Update item by ID
  async updateItem(collectionName, id, updateData) {
    try {
      const collection = this.db.collection(collectionName);
      const result = await collection.updateOne(
        { _id: new ObjectId(id) },
        { 
          $set: { 
            ...updateData, 
            updatedAt: new Date() 
          } 
        }
      );
      
      if (result.matchedCount === 0) {
        throw new Error(`Item with ID ${id} not found in ${collectionName}`);
      }
      
      return result;
    } catch (error) {
      console.error(`Error updating item in ${collectionName}:`, error);
      throw error;
    }
  }

  // Update multiple items
  async updateMultipleItems(collectionName, filter, updateData) {
    try {
      const collection = this.db.collection(collectionName);
      const result = await collection.updateMany(
        filter,
        { 
          $set: { 
            ...updateData, 
            updatedAt: new Date() 
          } 
        }
      );
      
      return result;
    } catch (error) {
      console.error(`Error updating multiple items in ${collectionName}:`, error);
      throw error;
    }
  }

  // ===== DELETE OPERATIONS =====

  // Delete item by ID
  async deleteItem(collectionName, id) {
    try {
      const collection = this.db.collection(collectionName);
      const result = await collection.deleteOne({ _id: new ObjectId(id) });
      
      if (result.deletedCount === 0) {
        throw new Error(`Item with ID ${id} not found in ${collectionName}`);
      }
      
      return result;
    } catch (error) {
      console.error(`Error deleting item from ${collectionName}:`, error);
      throw error;
    }
  }

  // Delete multiple items
  async deleteMultipleItems(collectionName, filter) {
    try {
      const collection = this.db.collection(collectionName);
      const result = await collection.deleteMany(filter);
      return result;
    } catch (error) {
      console.error(`Error deleting multiple items from ${collectionName}:`, error);
      throw error;
    }
  }

  // ===== COMPATIBILITY OPERATIONS =====

  // Get compatible motherboards for a CPU
  async getCompatibleMotherboards(cpuSocket) {
    try {
      const collection = this.db.collection('motherboards');
      return await collection.find({ socket: cpuSocket }).toArray();
    } catch (error) {
      console.error('Error getting compatible motherboards:', error);
      throw error;
    }
  }

  // Get compatible RAM for a motherboard
  async getCompatibleRAM(motherboardMemoryType) {
    try {
      const collection = this.db.collection('rams');
      return await collection.find({ memoryType: { $in: motherboardMemoryType } }).toArray();
    } catch (error) {
      console.error('Error getting compatible RAM:', error);
      throw error;
    }
  }

  // Get recommended PSU for total power consumption
  async getRecommendedPSU(totalPower) {
    try {
      const collection = this.db.collection('psus');
      const recommendedWattage = totalPower * 1.2; // 20% headroom
      return await collection.find({ 
        wattage: { $gte: recommendedWattage } 
      }).sort({ wattage: 1 }).limit(5).toArray();
    } catch (error) {
      console.error('Error getting recommended PSU:', error);
      throw error;
    }
  }

  // ===== BULK OPERATIONS =====

  // Bulk insert items
  async bulkInsert(collectionName, items) {
    try {
      const collection = this.db.collection(collectionName);
      const itemsWithTimestamps = items.map(item => ({
        ...item,
        createdAt: new Date(),
        updatedAt: new Date()
      }));
      
      const result = await collection.insertMany(itemsWithTimestamps);
      return result;
    } catch (error) {
      console.error(`Error bulk inserting items into ${collectionName}:`, error);
      throw error;
    }
  }

  // Export collection to JSON
  async exportCollection(collectionName, filter = {}) {
    try {
      const collection = this.db.collection(collectionName);
      const items = await collection.find(filter).toArray();
      return items;
    } catch (error) {
      console.error(`Error exporting collection ${collectionName}:`, error);
      throw error;
    }
  }

  // Import collection from JSON
  async importCollection(collectionName, items, clearExisting = false) {
    try {
      const collection = this.db.collection(collectionName);
      
      if (clearExisting) {
        await collection.deleteMany({});
        console.log(`Cleared existing data from ${collectionName}`);
      }
      
      const result = await this.bulkInsert(collectionName, items);
      return result;
    } catch (error) {
      console.error(`Error importing collection ${collectionName}:`, error);
      throw error;
    }
  }

  // ===== UTILITY OPERATIONS =====

  // Check if collection exists
  async collectionExists(collectionName) {
    try {
      const collections = await this.db.listCollections().toArray();
      return collections.some(col => col.name === collectionName);
    } catch (error) {
      console.error('Error checking collection existence:', error);
      throw error;
    }
  }

  // Get collection indexes
  async getCollectionIndexes(collectionName) {
    try {
      const collection = this.db.collection(collectionName);
      return await collection.indexes();
    } catch (error) {
      console.error(`Error getting indexes for ${collectionName}:`, error);
      throw error;
    }
  }

  // Create index
  async createIndex(collectionName, indexSpec, options = {}) {
    try {
      const collection = this.db.collection(collectionName);
      return await collection.createIndex(indexSpec, options);
    } catch (error) {
      console.error(`Error creating index for ${collectionName}:`, error);
      throw error;
    }
  }

  // ===== EXAMPLE USAGE METHODS =====

  // ===== GPU-SPECIFIC OPERATIONS =====

  // Get all GPUs across all model collections
  async getAllGPUs(filter = {}, sort = {}, limit = 0) {
    const allGpus = [];
    
    for (const gpuCollection of this.gpuCollections) {
      const gpus = await this.getAllItems(gpuCollection, filter, sort, limit);
      allGpus.push(...gpus);
    }
    
    if (Object.keys(sort).length > 0) {
      allGpus.sort((a, b) => {
        for (const [field, order] of Object.entries(sort)) {
          if (a[field] < b[field]) return order === 1 ? -1 : 1;
          if (a[field] > b[field]) return order === 1 ? 1 : -1;
        }
        return 0;
      });
    }
    
    return limit > 0 ? allGpus.slice(0, limit) : allGpus;
  }

  // Get GPUs by model
  async getGPUsByModel(model) {
    const collectionName = `gpus_${model.toLowerCase().replace(/\s+/g, '_')}`;
    if (!this.gpuCollections.includes(collectionName)) {
      return [];
    }
    return await this.getAllItems(collectionName);
  }

  // Add GPU to appropriate collection
  async addGPU(gpu) {
    const model = extractGPUModel(gpu.chipset || gpu.name);
    const collectionName = `gpus_${model}`;
    
    if (!this.gpuCollections.includes(collectionName)) {
      this.gpuCollections.push(collectionName);
    }
    
    // Log VRAM information when storing GPU
    if (gpu.memory && gpu.memory.size) {
      console.log(`💾 Stored ${gpu.chipset || 'Unknown'} with ${gpu.memory.size}GB ${gpu.memory.type || 'Unknown'} VRAM to ${collectionName}`);
    }
    
    return await this.bulkInsert(collectionName, [gpu]);
  }

  // Search GPUs across all model collections
  async searchGPUs(searchTerm, fields = ['name', 'manufacturer', 'partner']) {
    const allResults = [];
    
    for (const gpuCollection of this.gpuCollections) {
      const results = await this.searchItems(gpuCollection, searchTerm, fields);
      allResults.push(...results);
    }
    
    return allResults;
  }



  // Example: Get all Intel CPUs
  async getIntelCPUs() {
    return await this.getItemsByManufacturer('cpus', 'Intel');
  }

  // Example: Search for RTX graphics cards
  async searchRTXGPUs() {
    return await this.searchGPUs('RTX', ['name', 'chipset']);
  }

  // Example: Update all prices by percentage
  async updatePricesByPercentage(collectionName, percentageChange) {
    const multiplier = 1 + (percentageChange / 100);
    return await this.updateMultipleItems(
      collectionName,
      {},
      { price: { $multiply: ['$price', multiplier] } }
    );
  }
}

// Example usage and testing
async function exampleUsage() {
  const dbManager = new DatabaseManager();
  
  try {
    await dbManager.connect();
    
    // Get database overview
    console.log('\n📊 Database Overview:');
    const overview = await dbManager.getDatabaseOverview();
    console.log(JSON.stringify(overview, null, 2));
    
    // Search for RTX GPUs
    console.log('\n🔍 Searching for RTX GPUs:');
    const rtxGpus = await dbManager.searchRTXGPUs();
    console.log(`Found ${rtxGpus.length} RTX GPUs`);
    

    
    // Get Intel CPUs
    console.log('\n🖥️ Getting Intel CPUs:');
    const intelCpus = await dbManager.getIntelCPUs();
    console.log(`Found ${intelCpus.length} Intel CPUs`);
    
  } catch (error) {
    console.error('Example usage failed:', error);
  }
}

// Run example if called directly
if (require.main === module) {
  exampleUsage()
    .then(() => {
      console.log('\n✅ Database manager example completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Database manager example failed:', error);
      process.exit(1);
    });
}

module.exports = { DatabaseManager };
