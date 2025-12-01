const { RiverSearchPriceDetector } = require('./riverSearchPriceDetection');

const testProducts = [
  {
    name: 'ASRock Intel Arc A770 Phantom Gaming',
    url: 'https://amazon.com/Graphics-Phantom-256-bit-7680x4320-DisplayPort-Cooling/dp/B0CDM3QK7Q',
    expectedPrice: 279.99,
    expectedSale: true,
    expectedBasePrice: 439.99
  },
  {
    name: 'Sparkle Intel Arc A770 ROC OC Edition',
    url: 'https://amazon.com/Sparkle-Intel-2-5-Slot-Backplate-SA770R-16GOC/dp/B0D1RGP56Y',
    expectedPrice: 399.67,
    expectedSale: false
  }
];

async function testTwoProducts() {
  console.log('🔬 Testing RiverSearch on Two Specific Products\n');
  console.log('='.repeat(80));

  const riverSearch = new RiverSearchPriceDetector();

  try {
    await riverSearch.initialize();

    for (let i = 0; i < testProducts.length; i++) {
      const product = testProducts[i];
      console.log(`\n[${i + 1}/2] ${product.name}`);
      console.log(`URL: ${product.url}`);
      console.log(`Expected: $${product.expectedPrice}${product.expectedSale ? ` (was $${product.expectedBasePrice})` : ''}`);
      console.log('');

      const result = await riverSearch.detectPrice(product.url);

      console.log('📊 RESULT:');
      console.log(`   Success: ${result.success}`);
      console.log(`   Available: ${result.isAvailable}`);
      console.log(`   Current Price: ${result.currentPrice ? `$${result.currentPrice}` : 'null'}`);
      console.log(`   Base Price: ${result.basePrice ? `$${result.basePrice}` : 'null'}`);
      console.log(`   Sale Price: ${result.salePrice ? `$${result.salePrice}` : 'null'}`);
      console.log(`   On Sale: ${result.isOnSale}`);

      if (result.debugInfo && result.debugInfo.length > 0) {
        console.log(`\n   Debug Info:`);
        result.debugInfo.forEach(info => console.log(`      - ${info}`));
      }

      if (result.error) {
        console.log(`   Error: ${result.error}`);
      }

      // Validation
      console.log(`\n   ✓ Validation:`);
      const priceMatch = result.currentPrice && Math.abs(result.currentPrice - product.expectedPrice) < 0.50;
      console.log(`      Price Match: ${priceMatch ? '✅ CORRECT' : '❌ INCORRECT'}`);

      if (product.expectedSale) {
        const saleDetected = result.isOnSale && result.salePrice && result.basePrice;
        console.log(`      Sale Detected: ${saleDetected ? '✅ CORRECT' : '❌ INCORRECT'}`);
      }

      console.log('\n' + '='.repeat(80));

      // Wait between requests with longer delay to avoid blocking
      if (i < testProducts.length - 1) {
        console.log('Waiting 10 seconds before next product to avoid rate limiting...\n');
        await new Promise(resolve => setTimeout(resolve, 10000));
      }
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await riverSearch.close();
    console.log('\n✅ Test complete');
  }
}

if (require.main === module) {
  testTwoProducts();
}

module.exports = { testTwoProducts };
