const { connectToDatabase, getDatabase } = require('../config/database');

async function setupDatabase() {
  try {
    console.log('Setting up PC Parts Database...');
    
    // Connect to database
    await connectToDatabase();
    const db = getDatabase();
    
    // Create collections
    const collections = [
      'cpus',
      'motherboards', 
      'gpus',
      'rams',
      'storages',
      'psus',
      'cases',
      'coolers'
    ];
    
    for (const collectionName of collections) {
      try {
        await db.createCollection(collectionName);
        console.log(`✓ Created collection: ${collectionName}`);
      } catch (error) {
        if (error.code === 48) { // Collection already exists
          console.log(`✓ Collection already exists: ${collectionName}`);
        } else {
          console.error(`✗ Error creating collection ${collectionName}:`, error.message);
        }
      }
    }
    
    // Create indexes for better performance
    console.log('\nCreating indexes...');
    
    // CPU indexes
    const cpuCollection = db.collection('cpus');
    await cpuCollection.createIndex({ manufacturer: 1 });
    await cpuCollection.createIndex({ socket: 1 });
    await cpuCollection.createIndex({ price: 1 });
    await cpuCollection.createIndex({ performanceScore: -1 });
    
    // Motherboard indexes
    const motherboardCollection = db.collection('motherboards');
    await motherboardCollection.createIndex({ manufacturer: 1 });
    await motherboardCollection.createIndex({ chipset: 1 });
    await motherboardCollection.createIndex({ socket: 1 });
    await motherboardCollection.createIndex({ formFactor: 1 });
    await motherboardCollection.createIndex({ price: 1 });
    
    // GPU indexes
    const gpuCollection = db.collection('gpus');
    await gpuCollection.createIndex({ manufacturer: 1 });
    await gpuCollection.createIndex({ chipset: 1 });
    await gpuCollection.createIndex({ price: 1 });
    await gpuCollection.createIndex({ performanceScore: -1 });
    
    // RAM indexes
    const ramCollection = db.collection('rams');
    await ramCollection.createIndex({ manufacturer: 1 });
    await ramCollection.createIndex({ memoryType: 1 });
    await ramCollection.createIndex({ speed: 1 });
    await ramCollection.createIndex({ price: 1 });
    
    // Storage indexes
    const storageCollection = db.collection('storages');
    await storageCollection.createIndex({ manufacturer: 1 });
    await storageCollection.createIndex({ type: 1 });
    await storageCollection.createIndex({ capacity: 1 });
    await storageCollection.createIndex({ price: 1 });
    
    // PSU indexes
    const psuCollection = db.collection('psus');
    await psuCollection.createIndex({ manufacturer: 1 });
    await psuCollection.createIndex({ wattage: 1 });
    await psuCollection.createIndex({ efficiency: 1 });
    await psuCollection.createIndex({ price: 1 });
    
    // Case indexes
    const caseCollection = db.collection('cases');
    await caseCollection.createIndex({ manufacturer: 1 });
    await caseCollection.createIndex({ formFactor: 1 });
    await caseCollection.createIndex({ price: 1 });
    
    // Cooler indexes
    const coolerCollection = db.collection('coolers');
    await coolerCollection.createIndex({ manufacturer: 1 });
    await coolerCollection.createIndex({ type: 1 });
    await coolerCollection.createIndex({ socket: 1 });
    await coolerCollection.createIndex({ price: 1 });
    
    console.log('✓ All indexes created successfully');
    
    // Create text search indexes for better search functionality
    console.log('\nCreating text search indexes...');
    
    for (const collectionName of collections) {
      const collection = db.collection(collectionName);
      try {
        await collection.createIndex({ 
          name: "text", 
          manufacturer: "text", 
          brand: "text" 
        });
        console.log(`✓ Text index created for: ${collectionName}`);
      } catch (error) {
        console.log(`✓ Text index already exists for: ${collectionName}`);
      }
    }
    
    console.log('\n🎉 Database setup completed successfully!');
    console.log('\nCollections created:');
    collections.forEach(collection => console.log(`  - ${collection}`));
    
    console.log('\nNext steps:');
    console.log('1. Run "npm run seed-data" to populate with sample data');
    console.log('2. Start building your PC parts database!');
    
  } catch (error) {
    console.error('❌ Database setup failed:', error);
    process.exit(1);
  }
}

// Run setup if called directly
if (require.main === module) {
  setupDatabase();
}

module.exports = { setupDatabase };
