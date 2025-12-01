const { connectToDatabase, getDatabase } = require('../config/database');

async function checkPSUFields() {
  try {
    await connectToDatabase();
    const db = getDatabase();
    const collection = db.collection('psus');
    
    // Get a sample PSU to see all available fields
    const samplePSU = await collection.findOne({});
    
    if (samplePSU) {
      console.log('Sample PSU document structure:');
      console.log(JSON.stringify(samplePSU, null, 2));
      console.log('\n=== Available price-related fields ===');
      
      // List all fields that might contain price info
      const priceFields = Object.keys(samplePSU).filter(key => 
        key.toLowerCase().includes('price') || 
        key.toLowerCase().includes('cost') ||
        key.toLowerCase().includes('sale')
      );
      
      console.log('Price-related fields found:', priceFields);
      
      // Check a few more PSUs to see price field variations
      const morePSUs = await collection.find({}).limit(5).toArray();
      console.log('\n=== Price fields in first 5 PSUs ===');
      morePSUs.forEach((psu, index) => {
        console.log(`\nPSU ${index + 1}: ${psu.name?.substring(0, 50)}...`);
        priceFields.forEach(field => {
          console.log(`  ${field}: ${psu[field]}`);
        });
        // Also check for any price property we might have missed
        if (psu.price) console.log(`  price: ${psu.price}`);
        if (psu.currentPrice) console.log(`  currentPrice: ${psu.currentPrice}`);
      });
      
    } else {
      console.log('No PSUs found in database');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkPSUFields();