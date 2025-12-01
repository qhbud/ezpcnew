const { connectToDatabase, getDatabase } = require('../config/database');
const Logger = require('./utils/logger');

class PSUPurger {
  constructor() {
    this.db = null;
  }

  async connect() {
    await connectToDatabase();
    this.db = getDatabase();
    Logger.success('Connected to database');
  }

  async purgePSUs() {
    try {
      Logger.info('Starting PSU purge...');
      
      const collection = this.db.collection('psus');
      
      // Get count before deletion
      const beforeCount = await collection.countDocuments();
      Logger.info(`Found ${beforeCount} PSUs to delete`);
      
      if (beforeCount === 0) {
        Logger.info('No PSUs found in database');
        return { success: true, deletedCount: 0 };
      }
      
      // Delete all PSUs
      const result = await collection.deleteMany({});
      
      Logger.success(`✅ Successfully deleted ${result.deletedCount} PSUs`);
      Logger.info('PSU collection purged while keeping all other collections intact');
      
      return { 
        success: true, 
        deletedCount: result.deletedCount,
        beforeCount: beforeCount
      };
      
    } catch (error) {
      Logger.error('❌ Error purging PSUs:', error);
      throw error;
    }
  }

  async verifyPurge() {
    try {
      const collection = this.db.collection('psus');
      const remainingCount = await collection.countDocuments();
      
      if (remainingCount === 0) {
        Logger.success('✅ Verification passed: PSU collection is empty');
      } else {
        Logger.warn(`⚠️ Verification failed: ${remainingCount} PSUs still remain`);
      }
      
      return remainingCount;
    } catch (error) {
      Logger.error('Error verifying purge:', error);
      throw error;
    }
  }
}

// Run if called directly
async function runPurge() {
  const purger = new PSUPurger();
  
  try {
    Logger.info('PSU Purger');
    Logger.info('===========\n');
    
    await purger.connect();
    
    const result = await purger.purgePSUs();
    
    if (result.success) {
      await purger.verifyPurge();
      Logger.success(`\n🎉 PSU purge completed successfully!`);
      Logger.info(`Deleted: ${result.deletedCount} PSUs`);
    }
    
  } catch (error) {
    Logger.error('Purge failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  runPurge()
    .then(() => {
      Logger.info('\nPurge operation finished');
      process.exit(0);
    })
    .catch((error) => {
      Logger.error('Script failed:', error);
      process.exit(1);
    });
}

module.exports = { PSUPurger };