const { connectToDatabase, getDatabase } = require('../config/database');
const { DatabaseManager } = require('./databaseManager');

async function addSampleGPUs() {
  try {
    console.log('🔌 Connecting to database...');
    const dbManager = new DatabaseManager();
    await dbManager.connect();

    console.log('📦 Adding sample GPUs to demonstrate new structure...\n');

    const sampleGPUs = [
      // RTX 4090s
      {
        name: 'ASUS TUF Gaming GeForce RTX 4090',
        manufacturer: 'NVIDIA',
        partner: 'ASUS',
        chipset: 'RTX 4090',
        architecture: 'Ada Lovelace',
        memory: { size: 24, type: 'GDDR6X' },
        price: 1599.99,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: 'MSI Gaming X Trio GeForce RTX 4090',
        manufacturer: 'NVIDIA', 
        partner: 'MSI',
        chipset: 'RTX 4090',
        architecture: 'Ada Lovelace',
        memory: { size: 24, type: 'GDDR6X' },
        price: 1649.99,
        createdAt: new Date(),
        updatedAt: new Date()
      },

      // RTX 3080 Ti
      {
        name: 'EVGA GeForce RTX 3080 Ti FTW3',
        manufacturer: 'NVIDIA',
        partner: 'EVGA', 
        chipset: 'RTX 3080 Ti',
        architecture: 'Ampere',
        memory: { size: 12, type: 'GDDR6X' },
        price: 899.99,
        createdAt: new Date(),
        updatedAt: new Date()
      },

      // RTX 2070
      {
        name: 'Gigabyte GeForce RTX 2070 Windforce',
        manufacturer: 'NVIDIA',
        partner: 'Gigabyte',
        chipset: 'RTX 2070', 
        architecture: 'Turing',
        memory: { size: 8, type: 'GDDR6' },
        price: 399.99,
        createdAt: new Date(),
        updatedAt: new Date()
      },

      // AMD 7900 XTX
      {
        name: 'Sapphire Radeon RX 7900 XTX Nitro+',
        manufacturer: 'AMD',
        partner: 'Sapphire',
        chipset: 'RX 7900 XTX',
        architecture: 'RDNA 3',
        memory: { size: 24, type: 'GDDR6' },
        price: 999.99,
        createdAt: new Date(),
        updatedAt: new Date()
      },

      // AMD 6800 XT
      {
        name: 'PowerColor Red Devil RX 6800 XT',
        manufacturer: 'AMD',
        partner: 'PowerColor',
        chipset: 'RX 6800 XT',
        architecture: 'RDNA 2', 
        memory: { size: 16, type: 'GDDR6' },
        price: 649.99,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    console.log('➕ Adding GPUs to model-specific collections...\n');

    for (const gpu of sampleGPUs) {
      try {
        const result = await dbManager.addGPU(gpu);
        console.log(`✅ Added ${gpu.name} to collection for ${gpu.chipset}`);
      } catch (error) {
        console.error(`❌ Failed to add ${gpu.name}:`, error.message);
      }
    }

    console.log('\n📊 Database overview after adding sample GPUs:');
    await dbManager.loadGpuCollections(); // Refresh GPU collections
    const overview = await dbManager.getDatabaseOverview();
    
    console.log('\nGPU Collections:');
    for (const [collectionName, stats] of Object.entries(overview.gpus.collections)) {
      console.log(`  ${collectionName}: ${stats.totalItems} GPUs`);
    }

    console.log(`\nTotal GPUs across all collections: ${overview.gpus.totalGpus}`);
    console.log('Available GPU models:', overview.gpus.models.join(', '));

    console.log('\n🔍 Testing search across all GPU collections...');
    const rtxResults = await dbManager.searchGPUs('RTX');
    const amdResults = await dbManager.searchGPUs('RX');
    
    console.log(`Found ${rtxResults.length} RTX GPUs`);
    console.log(`Found ${amdResults.length} AMD RX GPUs`);

    console.log('\n✅ Sample GPU addition completed!');

  } catch (error) {
    console.error('❌ Error adding sample GPUs:', error);
  }
}

if (require.main === module) {
  addSampleGPUs()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('Script failed:', error);
      process.exit(1);
    });
}

module.exports = { addSampleGPUs };