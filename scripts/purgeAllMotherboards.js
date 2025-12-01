const { connectToDatabase, getDatabase } = require('../config/database');
const Logger = require('./utils/logger');

class MotherboardPurger {
  constructor() {
    this.db = null;
  }

  async connect() {
    await connectToDatabase();
    this.db = getDatabase();
    Logger.success('Connected to database');
  }

  async purgeAllMotherboards() {
    try {
      Logger.info('🔍 Starting motherboard purge process...');
      
      let totalPurged = 0;
      
      // 1. Drop the unified motherboards collection
      try {
        const unifiedResult = await this.db.collection('motherboards').deleteMany({});
        Logger.info(`🗑️  Purged unified motherboards collection: ${unifiedResult.deletedCount} documents`);
        totalPurged += unifiedResult.deletedCount;
      } catch (error) {
        Logger.debug('Unified motherboards collection did not exist or was empty');
      }
      
      // 2. Find and drop all motherboard-specific collections
      const collections = await this.db.listCollections({ name: /^motherboards_/ }).toArray();
      
      if (collections.length > 0) {
        Logger.info(`🔍 Found ${collections.length} motherboard collections to purge:`);
        
        for (const collection of collections) {
          try {
            const count = await this.db.collection(collection.name).countDocuments();
            await this.db.collection(collection.name).drop();
            Logger.info(`🗑️  Dropped collection: ${collection.name} (${count} documents)`);
            totalPurged += count;
          } catch (error) {
            Logger.warn(`Failed to drop collection ${collection.name}: ${error.message}`);
          }
        }
      } else {
        Logger.info('ℹ️  No motherboard-specific collections found');
      }
      
      // 3. Summary
      Logger.info('='.repeat(60));
      Logger.success(`✅ Motherboard purge completed!`);
      Logger.info(`📊 Total motherboards purged: ${totalPurged}`);
      Logger.info(`🔧 Collections processed: ${collections.length + 1}`);
      Logger.info('='.repeat(60));
      
      Logger.info('💡 Note: GPU and CPU collections were left untouched');
      
    } catch (error) {
      Logger.error(`❌ Error during motherboard purge: ${error.message}`);
      throw error;
    }
  }
}

// CLI interface
async function main() {
  const purger = new MotherboardPurger();
  
  try {
    await purger.connect();
    await purger.purgeAllMotherboards();
  } catch (error) {
    Logger.error(`💥 Purge process failed: ${error.message}`);
    process.exit(1);
  }
  
  process.exit(0);
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  Logger.info('\n⏹️  Purge process interrupted by user');
  process.exit(0);
});

if (require.main === module) {
  main();
}

module.exports = MotherboardPurger;