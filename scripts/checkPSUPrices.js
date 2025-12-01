const { connectToDatabase, getDatabase } = require('../config/database');

async function printPSUPrices() {
  try {
    await connectToDatabase();
    const db = getDatabase();
    const collection = db.collection('psus');
    
    const psus = await collection.find({}).toArray();
    console.log(`Found ${psus.length} PSUs in database:\n`);
    
    psus.forEach((psu, index) => {
      console.log(`${index + 1}. ${psu.name || 'Unknown PSU'}`);
      console.log(`   Base Price: ${psu.basePrice ? '$' + psu.basePrice : 'N/A'}`);
      console.log(`   Sale Price: ${psu.salePrice ? '$' + psu.salePrice : 'N/A'}`);
      console.log(`   Current Price: ${psu.currentPrice ? '$' + psu.currentPrice : 'N/A'}`);
      console.log(`   Is On Sale: ${psu.isOnSale || false}`);
      console.log(`   Source: ${psu.source || 'Unknown'}`);
      console.log(`   URL: ${psu.url || psu.sourceUrl || 'N/A'}`);
      console.log('');
    });
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

printPSUPrices();