const { connectToDatabase, getDatabase } = require('../config/database');
const { spawn } = require('child_process');
const path = require('path');

async function updateAllGPUs() {
  console.log('🚀 Starting bulk GPU price update with improved detection logic...');

  try {
    await connectToDatabase();
    const db = getDatabase();

    // All GPUs now live in the single `gpus` collection. The original per-model
    // grouping is preserved in each doc's `modelCollection` field.
    const modelGroups = (await db.collection('gpus').distinct('modelCollection')).sort();

    const totalCount = await db.collection('gpus').countDocuments({ sourceUrl: { $exists: true, $ne: null } });
    console.log(`📋 Found ${modelGroups.length} GPU model groups (${totalCount} GPUs with source URLs) to update`);

    let totalProcessed = 0;

    if (totalCount > 0) {
      console.log(`\n🔄 Updating the 'gpus' collection (${totalCount} GPUs)...`);

      try {
        // Run the price updater once over the single `gpus` collection
        const result = await runPriceUpdater('gpus');
        totalProcessed += totalCount;
        console.log(`   ✅ Completed 'gpus' collection`);
      } catch (error) {
        console.log(`   ❌ Error updating 'gpus' collection: ${error.message}`);
      }
    }

    console.log(`\n🎉 Bulk update completed!`);
    console.log(`📊 Total GPU model groups: ${modelGroups.length}`);
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