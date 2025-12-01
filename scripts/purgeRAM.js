const { connectToDatabase, getDatabase } = require('../config/database');
const Logger = require('./utils/logger');

class RAMPurger {
  constructor() {
    this.db = null;
  }

  async connect() {
    await connectToDatabase();
    this.db = getDatabase();
    Logger.success('Connected to database');
  }

  async purgeRAM() {
    try {
      const collection = this.db.collection('rams');
      
      // Get count before deletion for verification
      const beforeCount = await collection.countDocuments();
      Logger.info(`📊 Current RAM count: ${beforeCount}`);
      
      if (beforeCount === 0) {
        Logger.info('🤷 No RAM modules found to purge');
        return { success: true, deletedCount: 0, beforeCount: 0 };
      }

      // Confirm deletion
      Logger.warn(`⚠️  About to delete ALL ${beforeCount} RAM modules from database`);
      Logger.info('⏱️  Starting purge in 3 seconds...');
      
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Delete all RAM documents
      const result = await collection.deleteMany({});
      
      // Verify deletion
      const afterCount = await collection.countDocuments();
      
      if (afterCount === 0 && result.deletedCount === beforeCount) {
        Logger.success(`✅ Successfully purged ${result.deletedCount} RAM modules`);
        Logger.info('📊 RAM collection is now empty');
        return { 
          success: true, 
          deletedCount: result.deletedCount, 
          beforeCount,
          afterCount 
        };
      } else {
        Logger.error(`❌ Purge incomplete: ${afterCount} RAM modules remain`);
        return { 
          success: false, 
          deletedCount: result.deletedCount, 
          beforeCount,
          afterCount 
        };
      }
    } catch (error) {
      Logger.error('❌ Error during RAM purge:', error);
      throw error;
    }
  }

  async close() {
    Logger.info('👋 RAM purge completed');
  }
}

// Run if called directly
if (require.main === module) {
  async function main() {
    const purger = new RAMPurger();
    
    try {
      await purger.connect();
      
      Logger.info('🧹 RAM Database Purger');
      Logger.info('====================\n');
      
      const result = await purger.purgeRAM();
      
      if (result.success) {
        Logger.success(`\n✅ RAM purge completed successfully!`);
        Logger.info(`   Deleted: ${result.deletedCount} RAM modules`);
      } else {
        Logger.error(`\n❌ RAM purge failed`);
        process.exit(1);
      }
      
    } catch (error) {
      Logger.error('Script failed:', error);
      process.exit(1);
    } finally {
      await purger.close();
      process.exit(0);
    }
  }
  
  main();
}

module.exports = { RAMPurger };