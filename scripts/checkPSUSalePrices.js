const { connectToDatabase, getDatabase } = require('../config/database');

async function checkPSUSalePrices() {
  try {
    await connectToDatabase();
    const db = getDatabase();
    const collection = db.collection('psus');
    
    const total = await collection.countDocuments();
    console.log(`Total PSUs: ${total}\n`);
    
    // Find PSUs with different price structures
    const withPrice = await collection.countDocuments({ price: { $exists: true, $ne: null } });
    const withBasePrice = await collection.countDocuments({ basePrice: { $exists: true, $ne: null } });
    const withSalePrice = await collection.countDocuments({ salePrice: { $exists: true, $ne: null } });
    const withCurrentPrice = await collection.countDocuments({ currentPrice: { $exists: true, $ne: null } });
    const onSale = await collection.countDocuments({ isOnSale: true });
    
    console.log('=== Price Field Statistics ===');
    console.log(`PSUs with 'price': ${withPrice}`);
    console.log(`PSUs with 'basePrice': ${withBasePrice}`);
    console.log(`PSUs with 'salePrice': ${withSalePrice}`);
    console.log(`PSUs with 'currentPrice': ${withCurrentPrice}`);
    console.log(`PSUs marked as 'isOnSale': ${onSale}`);
    
    // Show a few examples of each price structure
    console.log('\n=== Examples ===');
    
    const priceOnly = await collection.findOne({ price: { $exists: true }, basePrice: { $exists: false } });
    if (priceOnly) {
      console.log('\nPrice-only PSU:');
      console.log(`  Name: ${priceOnly.name?.substring(0, 60)}...`);
      console.log(`  price: $${priceOnly.price}`);
    }
    
    const withSale = await collection.findOne({ isOnSale: true });
    if (withSale) {
      console.log('\nPSU on sale:');
      console.log(`  Name: ${withSale.name?.substring(0, 60)}...`);
      console.log(`  basePrice: $${withSale.basePrice || 'N/A'}`);
      console.log(`  salePrice: $${withSale.salePrice || 'N/A'}`);
      console.log(`  price: $${withSale.price || 'N/A'}`);
      console.log(`  isOnSale: ${withSale.isOnSale}`);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkPSUSalePrices();