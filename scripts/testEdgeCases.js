const { RiverSearchPriceDetector } = require('./riverSearchPriceDetection');

// Edge case products that show prices but should be unavailable
const edgeCaseProducts = [
  {
    name: 'MSI Gaming RTX 4070 Super Ventus 2X OC (Renewed)',
    url: 'https://amazon.com/MSI-Gaming-Ventus-Graphics-192-Bit/dp/B0D3J8QL5G',
    expectedAvailable: false,
    notes: 'Shows $549.99 price but no buy option'
  },
  {
    name: 'ASUS Dual GeForce RTX 4070 EVO OC',
    url: 'https://amazon.com/ASUS-Compatibility-Axial-tech-Technology-Auto-Extreme/dp/B0CQRX9HPK',
    expectedAvailable: false,
    notes: 'Shows $499.00 price but unavailable'
  },
  {
    name: 'GIGABYTE AORUS Radeon RX 6900 XT Master',
    url: 'https://amazon.com/GIGABYTE-AORUS-Radeon-Graphics-GV-R69XTAORUS/dp/B09CLKVV72',
    expectedAvailable: false,
    notes: 'Shows $986.95 price but unavailable'
  }
];

async function testEdgeCases() {
  console.log('🔬 Testing Edge Cases - Products with Prices but Unavailable\n');
  console.log('='.repeat(100));

  const riverSearch = new RiverSearchPriceDetector();

  try {
    await riverSearch.initialize();

    for (let i = 0; i < edgeCaseProducts.length; i++) {
      const product = edgeCaseProducts[i];
      console.log(`\n[${i + 1}/3] ${product.name}`);
      console.log(`URL: ${product.url}`);
      console.log(`Expected: UNAVAILABLE (${product.notes})`);
      console.log('');

      // Test with current RiverSearch
      const result = await riverSearch.detectPrice(product.url);

      console.log('📊 CURRENT RIVERSEARCH RESULT:');
      console.log(`   Success: ${result.success}`);
      console.log(`   Available: ${result.isAvailable}`);
      console.log(`   Current Price: ${result.currentPrice ? `$${result.currentPrice}` : 'null'}`);
      console.log(`   Base Price: ${result.basePrice ? `$${result.basePrice}` : 'null'}`);
      console.log(`   Sale Price: ${result.salePrice ? `$${result.salePrice}` : 'null'}`);
      console.log(`   On Sale: ${result.isOnSale}`);
      console.log(`   Unavailability Reason: ${result.unavailabilityReason || 'null'}`);

      if (result.debugInfo && result.debugInfo.length > 0) {
        console.log(`\n   Debug Info:`);
        result.debugInfo.forEach(info => console.log(`      - ${info}`));
      }

      // Validation
      console.log(`\n   ✓ Validation:`);
      const isCorrect = !result.isAvailable || result.currentPrice === null;
      if (isCorrect) {
        console.log(`      ✅ CORRECT - Detected as unavailable`);
      } else {
        console.log(`      ❌ INCORRECT - Reported price $${result.currentPrice} but should be unavailable`);
        console.log(`      🐛 BUG: Product shows price but has no buy option`);
      }

      console.log('\n' + '='.repeat(100));

      // Wait between requests
      if (i < edgeCaseProducts.length - 1) {
        console.log('⏳ Waiting 15 seconds before next product...\n');
        await new Promise(resolve => setTimeout(resolve, 15000));
      }
    }

    console.log('\n\n📊 EDGE CASE TEST SUMMARY');
    console.log('='.repeat(100));
    console.log('These products show prices on the page but should be marked as UNAVAILABLE');
    console.log('because there is no "Add to Cart" button or buy option available.');
    console.log('');
    console.log('The improved logic should check:');
    console.log('  1. Presence of "Add to Cart" button');
    console.log('  2. Availability messaging in buybox');
    console.log('  3. Whether price is from main product or third-party seller');
    console.log('='.repeat(100));

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await riverSearch.close();
    console.log('\n✅ Edge case test complete');
    process.exit(0);
  }
}

if (require.main === module) {
  testEdgeCases();
}

module.exports = { testEdgeCases };
