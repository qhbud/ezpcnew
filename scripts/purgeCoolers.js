const { connectToDatabase, getDatabase } = require('../config/database');
const Logger = require('./utils/logger');

class CoolerPurger {
  constructor() {
    this.db = null;
  }

  async connect() {
    await connectToDatabase();
    this.db = getDatabase();
    Logger.success('Connected to database');
  }

  async purgeCoolers() {
    try {
      Logger.info('🗑️  Starting cooler purge process...');

      const collection = this.db.collection('coolers');
      
      // Count existing coolers
      const beforeCount = await collection.countDocuments();
      Logger.info(`📊 Found ${beforeCount} existing coolers`);

      if (beforeCount === 0) {
        Logger.info('ℹ️  No coolers found to purge');
        return { success: true, deletedCount: 0 };
      }

      // Delete all coolers
      const result = await collection.deleteMany({});
      
      Logger.success(`✅ Successfully purged ${result.deletedCount} coolers`);
      Logger.info(`📊 Verification: ${await collection.countDocuments()} coolers remaining`);

      return {
        success: true,
        deletedCount: result.deletedCount,
        beforeCount,
        afterCount: await collection.countDocuments()
      };

    } catch (error) {
      Logger.error(`❌ Cooler purge failed: ${error.message}`);
      throw error;
    }
  }

  async close() {
    // Database connection will be closed by the application
    Logger.info('🚪 Cooler purger completed');
  }
}

// CLI interface
async function main() {
  const purger = new CoolerPurger();
  
  try {
    await purger.connect();
    
    // Confirm purge operation
    Logger.warn('⚠️  This will delete ALL coolers from the database!');
    Logger.info('🔄 Starting purge in 3 seconds...');
    
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    const result = await purger.purgeCoolers();
    
    if (result.success) {
      Logger.success(`🎉 Cooler purge completed successfully!`);
      Logger.info(`📈 Summary: ${result.deletedCount} coolers deleted`);
    }
    
  } catch (error) {
    Logger.error(`💥 Purge process failed: ${error.message}`);
    process.exit(1);
  } finally {
    await purger.close();
  }
}

if (require.main === module) {
  main();
}

module.exports = CoolerPurger;