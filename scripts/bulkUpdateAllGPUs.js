const { connectToDatabase, getDatabase } = require('../config/database');
const { spawn } = require('child_process');
const path = require('path');

async function updateAllGPUs() {
  console.log('🚀 Starting bulk GPU price update with improved detection logic...');

  try {
    await connectToDatabase();
    const db = getDatabase();

    const collections = await db.listCollections().toArray();
    const gpuCollections = collections
      .filter(col => col.name.startsWith('gpus_'))
      .map(col => col.name)
      .sort();

    console.log(`📋 Found ${gpuCollections.length} GPU collections to update`);

    let totalUpdated = 0;
    let totalProcessed = 0;

    for (const collectionName of gpuCollections) {
      const count = await db.collection(collectionName).countDocuments({ sourceUrl: { $exists: true, $ne: null } });
      if (count > 0) {
        console.log(`\n🔄 Updating ${collectionName} (${count} GPUs)...`);

        try {
          // Run the price updater for this collection
          const result = await runPriceUpdater(collectionName);
          totalProcessed += count;
          console.log(`   ✅ Completed ${collectionName}`);
        } catch (error) {
          console.log(`   ❌ Error updating ${collectionName}: ${error.message}`);
        }
      }
    }

    console.log(`\n🎉 Bulk update completed!`);
    console.log(`📊 Total collections processed: ${gpuCollections.length}`);
    console.log(`📊 Total GPUs processed: ${totalProcessed}`);

  } catch (error) {
    console.error('❌ Bulk update failed:', error);
    process.exit(1);
  }
}

function runPriceUpdater(collectionName) {
  return new Promise((resolve, reject) => {
    const priceUpdaterPath = path.join(__dirname, 'priceUpdater.js');
    const child = spawn('node', [priceUpdaterPath, 'update-all', collectionName], {
      stdio: 'pipe'
    });

    let output = '';
    let errorOutput = '';

    child.stdout.on('data', (data) => {
      const text = data.toString();
      output += text;
      // Show real-time progress for important updates
      if (text.includes('💰 Price updated') || text.includes('✅ Updated')) {
        process.stdout.write(text);
      }
    });

    child.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve(output);
      } else {
        reject(new Error(`Process exited with code ${code}: ${errorOutput}`));
      }
    });

    child.on('error', (error) => {
      reject(error);
    });
  });
}

// Run if called directly
if (require.main === module) {
  updateAllGPUs().then(() => {
    console.log('\n✨ All GPU prices updated successfully!');
    process.exit(0);
  }).catch((error) => {
    console.error('\n💥 Bulk update failed:', error);
    process.exit(1);
  });
}

module.exports = { updateAllGPUs };