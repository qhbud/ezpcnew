const { PriceUpdater } = require('./priceUpdater');
const { RiverSearchPriceDetector } = require('./riverSearchPriceDetection');

const testProducts = [
  {
    name: 'ASRock Intel Arc A770 Phantom Gaming (Renewed)',
    url: 'https://amazon.com/ASRock-Graphics-Phantom-7680x4320-DisplayPort/dp/B0DTJF34ZF',
    expectedAvailable: false
  },
  {
    name: 'MSI Gaming GeForce RTX 4070 Ventus 2X (Renewed)',
    url: 'https://amazon.com/MSI-GeForce-Lovelace-Architecture-Graphics/dp/B0CBQV398S',
    expectedAvailable: false
  },
  {
    name: 'ASUS Dual RTX 4070 EVO OC (Renewed)',
    url: 'https://amazon.com/ASUS-Compatibility-Axial-tech-Technology-Auto-Extreme/dp/B0D3JBCBKC',
    expectedAvailable: false
  }
];

async function testThreeProducts() {
  console.log('🔬 Testing Both Systems on Three Specific Products\n');
  console.log('='.repeat(100));

  const updater = new PriceUpdater();
  const riverSearch = new RiverSearchPriceDetector();

  try {
    await updater.connect();
    await updater.initializeBrowser();
    await riverSearch.initialize();

    for (let i = 0; i < testProducts.length; i++) {
      const product = testProducts[i];
      console.log(`\n[${i + 1}/3] ${product.name}`);
      console.log(`URL: ${product.url}`);
      console.log(`Expected: ${product.expectedAvailable ? 'AVAILABLE' : 'UNAVAILABLE'}`);
      console.log('');

      // Test with Targeted System
      console.log('🎯 TARGETED SYSTEM:');
      const targetedResult = await updater.scrapeAmazonTargeted(product.url);
      console.log(`   Success: ${targetedResult.success}`);
      console.log(`   Available: ${targetedResult.isAvailable}`);
      console.log(`   Current Price: ${targetedResult.currentPrice ? `$${targetedResult.currentPrice}` : 'null'}`);
      if (targetedResult.basePrice && targetedResult.salePrice) {
        console.log(`   Base Price: $${targetedResult.basePrice}`);
        console.log(`   Sale Price: $${targetedResult.salePrice}`);
        console.log(`   On Sale: ${targetedResult.isOnSale}`);
      }

      // Wait 10 seconds before RiverSearch
      console.log('\n   Waiting 10 seconds before RiverSearch...');
      await new Promise(resolve => setTimeout(resolve, 10000));

      // Test with RiverSearch
      console.log('\n🌊 RIVERSEARCH SYSTEM:');
      const riverResult = await riverSearch.detectPrice(product.url);
      console.log(`   Success: ${riverResult.success}`);
      console.log(`   Available: ${riverResult.isAvailable}`);
      console.log(`   Current Price: ${riverResult.currentPrice ? `$${riverResult.currentPrice}` : 'null'}`);
      if (riverResult.basePrice && riverResult.salePrice) {
        console.log(`   Base Price: $${riverResult.basePrice}`);
        console.log(`   Sale Price: $${riverResult.salePrice}`);
        console.log(`   On Sale: ${riverResult.isOnSale}`);
      }

      if (riverResult.debugInfo && riverResult.debugInfo.length > 0) {
        console.log(`\n   RiverSearch Debug Info:`);
        riverResult.debugInfo.forEach(info => console.log(`      - ${info}`));
      }

      // Comparison
      console.log(`\n📊 COMPARISON:`);

      if (!product.expectedAvailable) {
        // Product should be unavailable
        const targetedCorrect = targetedResult.currentPrice === null || !targetedResult.isAvailable;
        const riverCorrect = riverResult.currentPrice === null || !riverResult.isAvailable;

        console.log(`   Targeted: ${targetedCorrect ? '✅ Correctly detected unavailable' : '❌ False positive (reported price)'}`);
        console.log(`   RiverSearch: ${riverCorrect ? '✅ Correctly detected unavailable' : '❌ False positive (reported price)'}`);
      } else {
        // Product should be available
        const targetedCorrect = targetedResult.currentPrice !== null;
        const riverCorrect = riverResult.currentPrice !== null;

        console.log(`   Targeted: ${targetedCorrect ? '✅ Found price' : '❌ Failed to find price'}`);
        console.log(`   RiverSearch: ${riverCorrect ? '✅ Found price' : '❌ Failed to find price'}`);
      }

      console.log('\n' + '='.repeat(100));

      // Wait 15 seconds before next product
      if (i < testProducts.length - 1) {
        console.log('\nWaiting 15 seconds before next product to avoid rate limiting...\n');
        await new Promise(resolve => setTimeout(resolve, 15000));
      }
    }

    console.log('\n\n📊 FINAL SUMMARY');
    console.log('='.repeat(100));
    console.log('All three products are expected to be UNAVAILABLE (Renewed products)');
    console.log('Both systems should detect them as unavailable without false price detections.');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await updater.closeBrowser();
    await riverSearch.close();
    console.log('\n✅ Test complete');
    process.exit(0);
  }
}

if (require.main === module) {
  testThreeProducts();
}

module.exports = { testThreeProducts };
