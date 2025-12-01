const { PriceUpdater } = require('./priceUpdater');
const fs = require('fs');

/**
 * This script re-checks products that were skipped during the previous update
 * because RiverSearch couldn't find prices. With the improved logic, these
 * should now be properly marked as unavailable.
 */

async function fixStalePrices() {
  console.log('🔧 Fixing Stale Prices - Re-checking skipped products\n');

  // Read the log file to find skipped products
  const logContent = fs.readFileSync('gpu-price-update-improved.log', 'utf-8');
  const lines = logContent.split('\n');

  const skippedProducts = [];
  let currentProduct = null;
  let currentUrl = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Find product name
    if (line.includes('🔄 Updating price for:')) {
      currentProduct = line.replace('🔄 Updating price for:', '').trim();
    }

    // Find URL
    if (line.includes('🌊 RiverSearch: Analyzing')) {
      const urlMatch = line.match(/https:\/\/[^\s]+/);
      if (urlMatch) {
        currentUrl = urlMatch[0];
      }
    }

    // Find skipped products
    if (line.includes('⚠️ Could not extract price for') && currentProduct && currentUrl) {
      skippedProducts.push({
        name: currentProduct,
        url: currentUrl
      });
      currentProduct = null;
      currentUrl = null;
    }
  }

  console.log(`Found ${skippedProducts.length} skipped products to re-check\n`);

  const updater = new PriceUpdater();

  try {
    await updater.connect();
    await updater.initializeBrowser();

    let updated = 0;
    let errors = 0;

    for (let i = 0; i < skippedProducts.length; i++) {
      const product = skippedProducts[i];
      console.log(`\n[${i + 1}/${skippedProducts.length}] ${product.name.substring(0, 80)}...`);

      try {
        // Find the product in the database
        const db = updater.db;
        const collections = await db.listCollections().toArray();
        let found = false;

        for (const coll of collections) {
          if (!coll.name.startsWith('gpus_')) continue;

          const item = await db.collection(coll.name).findOne({
            name: product.name
          });

          if (item) {
            console.log(`   Found in ${coll.name}`);
            console.log(`   Current: $${item.currentPrice} (updated: ${item.updatedAt})`);

            const result = await updater.updateItemPrice(
              coll.name,
              item._id.toString(),
              item.sourceUrl
            );

            if (result && result.updated) {
              updated++;
              console.log(`   ✅ Updated successfully`);
            }

            found = true;
            break;
          }
        }

        if (!found) {
          console.log(`   ⚠️ Not found in database`);
        }

        // Delay between requests
        if (i < skippedProducts.length - 1) {
          console.log('   ⏳ Waiting 10 seconds...');
          await new Promise(resolve => setTimeout(resolve, 10000));
        }

      } catch (error) {
        console.error(`   ❌ Error: ${error.message}`);
        errors++;
      }
    }

    console.log('\n\n📊 SUMMARY');
    console.log('='.repeat(80));
    console.log(`Total skipped products: ${skippedProducts.length}`);
    console.log(`Successfully updated: ${updated}`);
    console.log(`Errors: ${errors}`);
    console.log('='.repeat(80));

  } catch (error) {
    console.error('❌ Fatal error:', error);
  } finally {
    await updater.closeBrowser();
  }
}

if (require.main === module) {
  fixStalePrices()
    .then(() => {
      console.log('\n✅ Stale price fix complete');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Stale price fix failed:', error);
      process.exit(1);
    });
}

module.exports = { fixStalePrices };
