#!/usr/bin/env node

const { AmazonGpuImporter } = require('./amazonGpuImporter');

/**
 * GPU Import Runner
 * 
 * This script provides a simple interface to run the Amazon GPU importer
 * with proper error handling and logging.
 */

async function main() {
  console.log('🚀 Starting GPU Import Process...\n');
  
  try {
    // Create importer instance
    const importer = new AmazonGpuImporter();
    
    // Run the import organized by chipset
    await importer.importGpusByChipset();
    
    console.log('\n✅ GPU import process completed successfully!');
    
  } catch (error) {
    console.error('\n❌ GPU import process failed:');
    
    if (error.message.includes('Missing required Amazon API configuration')) {
      console.error('Please configure your Amazon API credentials in the .env file:');
      console.error('- AMAZON_ACCESS_KEY_ID');
      console.error('- AMAZON_SECRET_ACCESS_KEY');
      console.error('- AMAZON_ASSOCIATE_TAG');
    } else if (error.message.includes('Amazon API Error')) {
      console.error('Amazon API returned an error. Please check:');
      console.error('- Your API credentials are correct');
      console.error('- You have not exceeded rate limits');
      console.error('- Your Associate account is active');
    } else if (error.message.includes('Database')) {
      console.error('Database connection failed. Please ensure:');
      console.error('- MongoDB is running');
      console.error('- Database connection string is correct');
    } else {
      console.error('Unexpected error:', error.message);
    }
    
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n⏹️  Import process interrupted by user');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n⏹️  Import process terminated');
  process.exit(0);
});

// Run the main function
if (require.main === module) {
  main();
}