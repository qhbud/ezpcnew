// Load production environment variables
require('dotenv').config({ path: '.env.atlas' });

// Now require the bulk importer which will use the production DB
const BulkRamImporter = require('./bulkRamImporter');
const Logger = require('./utils/logger');

async function runProductionImport() {
  console.log('🚀 Starting RAM import for PRODUCTION database');
  console.log('Database:', process.env.MONGODB_URI ? 'MongoDB Atlas (Cloud)' : 'Unknown');
  console.log('');

  const importer = new BulkRamImporter();

  try {
    // Import only Priority 1 modules (most popular gaming RAM)
    await importer.importRamModules({
      memoryType: ['DDR4', 'DDR5'],
      priority: [1],
      maxModels: null,
      startFrom: null,
      tier: null
    });
    console.log('\n✅ Production import completed!');
  } catch (error) {
    console.error('❌ Production import failed:', error);
    process.exit(1);
  }
}

runProductionImport();
