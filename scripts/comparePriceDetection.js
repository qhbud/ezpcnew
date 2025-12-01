const { PriceUpdater } = require('./priceUpdater');
const { RiverSearchPriceDetector } = require('./riverSearchPriceDetection');

// Test cases with actual correct prices
const testCases = [
  {
    name: 'MSI Gaming RTX 4070 Super 12G Ventus 3X OC',
    url: 'https://amazon.com/MSI-RTX-4070-12G-3X/dp/B0CSHFM3D5',
    correctPrice: 763.22,
    notes: 'Should find $763.22'
  },
  {
    name: 'GIGABYTE GeForce RTX 4070 Super WINDFORCE OC 12G',
    url: 'https://amazon.com/GIGABYTE-GeForce-WINDFORCE-Graphics-GV-N407SWF3OC-12GD/dp/B0CSJV61BN',
    correctPrice: 869.58,
    notes: 'Should find $869.58'
  },
  {
    name: 'MSI Gaming RTX 4070 Super 12G Ventus 2X OC',
    url: 'https://amazon.com/MSI-RTX-4070-12G-2X/dp/B0CS718XC3',
    correctPrice: 659.63,
    notes: 'Should find $659.63'
  },
  {
    name: 'MSI Gaming RTX 4070 Super Ventus 2X OC (Renewed)',
    url: 'https://amazon.com/MSI-Gaming-Ventus-Graphics-192-Bit/dp/B0D3J8QL5G',
    correctPrice: null,
    notes: 'Should be unavailable'
  },
  {
    name: 'ASRock Intel Arc A770 Phantom Gaming',
    url: 'https://amazon.com/Graphics-Phantom-256-bit-7680x4320-DisplayPort-Cooling/dp/B0CDM3QK7Q',
    correctPrice: 279.99,
    notes: 'Should find $279.99'
  },
  {
    name: 'Sparkle Intel Arc A770 ROC Luna OC',
    url: 'https://amazon.com/Sparkle-Intel-2-5-Slot-Backplate-SA770RW-16GOC/dp/B0D1RDHSK7',
    correctPrice: 299.99,
    notes: 'Should find $299.99'
  },
  {
    name: 'GUNNIR Intel Arc A770 Photon 16GB',
    url: 'https://amazon.com/GUNNIR-2400MHz-Graphics-Content-Creation/dp/B0F99PBV9F',
    correctPrice: 330.69,
    notes: 'Should find $330.69'
  },
  {
    name: 'Sparkle Intel Arc A770 ROC OC Edition',
    url: 'https://amazon.com/Sparkle-Intel-2-5-Slot-Backplate-SA770R-16GOC/dp/B0D1RGP56Y',
    correctPrice: 399.67,
    notes: 'Should find $399.67'
  },
  {
    name: 'Sparkle Intel Arc A770 Titan OC',
    url: 'https://amazon.com/Sparkle-ThermalSync-Cooling-Backplate-SA770T-16GOC/dp/B0CHN7YZX1',
    correctPrice: 369.85,
    notes: 'Should find $369.85'
  },
  {
    name: 'ASRock Challenger SE Intel Arc A770',
    url: 'https://amazon.com/ASRock-Challenger-GDDR6-Express-Video/dp/B0D8VP57MQ',
    correctPrice: 425.29,
    notes: 'Should find $425.29'
  },
  {
    name: 'ASRock Arc A770 Phantom Gaming (Renewed)',
    url: 'https://amazon.com/ASRock-Graphics-Phantom-7680x4320-DisplayPort/dp/B0DTJF34ZF',
    correctPrice: null,
    notes: 'Should be unavailable'
  },
  {
    name: 'ASUS Dual GeForce RTX 4070 EVO OC',
    url: 'https://amazon.com/ASUS-Compatibility-Axial-tech-Technology-Auto-Extreme/dp/B0CQRX9HPK',
    correctPrice: null,
    notes: 'Should be unavailable'
  },
  {
    name: 'MSI Gaming GeForce RTX 4070 Ventus 2X (Renewed)',
    url: 'https://amazon.com/MSI-GeForce-Lovelace-Architecture-Graphics/dp/B0CBQV398S',
    correctPrice: null,
    notes: 'Should be unavailable'
  },
  {
    name: 'ASUS Dual RTX 4070 EVO OC (Renewed)',
    url: 'https://amazon.com/ASUS-Compatibility-Axial-tech-Technology-Auto-Extreme/dp/B0D3JBCBKC',
    correctPrice: null,
    notes: 'Should be unavailable'
  },
  {
    name: 'MSI Gaming GeForce RTX 4070 Ventus 2X 12G OC',
    url: 'https://amazon.com/MSI-GeForce-RTX-4070-12G/dp/B0BZB7DS7Q',
    correctPrice: 800.82,
    notes: 'Should find $800.82'
  },
  {
    name: 'EVGA GeForce RTX 3080 FTW3 Ultra (Renewed)',
    url: 'https://amazon.com/EVGA-GeForce-10G-P5-3897-KL-Technology-Backplate/dp/B09CDX4DKR',
    correctPrice: 459.99,
    notes: 'Should find $459.99'
  },
  {
    name: 'EVGA GeForce RTX 3080 XC3 Black (Renewed)',
    url: 'https://amazon.com/GeForce-Gaming-10G-P5-3881-KL-Cooling-Renewed/dp/B09PQFX3LM',
    correctPrice: 459.99,
    notes: 'Should find $459.99'
  },
  {
    name: 'EVGA RTX 3080 XC3 ULTRA GAMING (Renewed)',
    url: 'https://amazon.com/EVGA-10G-P5-3885-KR-GeForce-Cooling-Backplate/dp/B093QJSNHK',
    correctPrice: 469.99,
    notes: 'Should find $469.99'
  },
  {
    name: 'MSI Gaming GeForce RTX 3080 Suprim X (Renewed)',
    url: 'https://amazon.com/MSI-GeForce-320-Bit-Architecture-Graphics/dp/B0BMPMWM16',
    correctPrice: 419.97,
    notes: 'Should find $419.97'
  },
  {
    name: 'GIGABYTE AORUS GeForce RTX 3080 Ti Master 12G',
    url: 'https://amazon.com/GIGABYTE-GeForce-Graphics-GV-N308TAORUS-M-12GD/dp/B083HZG3HK',
    correctPrice: 1549.00,
    notes: 'Should find $1549.00'
  },
  {
    name: 'MSI Gaming GeForce RTX 3080 Ventus 3X (Renewed)',
    url: 'https://amazon.com/MSI-GeForce-320-Bit-Architecture-Graphics/dp/B09J1QCT9Y',
    correctPrice: 449.99,
    notes: 'Should find $449.99'
  },
  {
    name: 'PowerColor Hellhound AMD Radeon RX 6600 XT',
    url: 'https://amazon.com/PowerColor-Hellhound-Radeon-Graphics-Powered/dp/B09BWYTRXQ',
    correctPrice: 549.00,
    notes: 'Should find $549.00'
  },
  {
    name: 'XFX Speedster QICK308 Radeon RX 6600 XT (Renewed)',
    url: 'https://amazon.com/XFX-Speedster-QICK308-Graphics-RX-66XT8LBDQ/dp/B0B71DLPF1',
    correctPrice: 239.97,
    notes: 'Should find $239.97'
  },
  {
    name: 'PowerColor Fighter AMD Radeon RX 6500 XT',
    url: 'https://amazon.com/PowerColor-Fighter-Radeon-Gaming-Graphics/dp/B09PSN3Y63',
    correctPrice: 206.54,
    notes: 'Should find $206.54'
  }
];

async function runComparison() {
  console.log('🔬 Starting Price Detection Comparison Test\n');
  console.log('=' .repeat(100));

  const updater = new PriceUpdater();
  const riverSearch = new RiverSearchPriceDetector();

  try {
    // Initialize both systems
    await updater.connect();
    await updater.initializeBrowser();
    await riverSearch.initialize();

    const results = [];
    let currentAccurate = 0;
    let riverAccurate = 0;

    for (let i = 0; i < testCases.length; i++) {
      const testCase = testCases[i];
      console.log(`\n[${i + 1}/${testCases.length}] Testing: ${testCase.name}`);
      console.log(`Expected: ${testCase.correctPrice === null ? 'UNAVAILABLE' : `$${testCase.correctPrice}`}`);
      console.log(`Notes: ${testCase.notes}`);

      // Test with current system (Targeted)
      console.log('\n📊 Current System (Targeted):');
      const currentResult = await updater.scrapeAmazonTargeted(testCase.url);
      const currentPrice = currentResult.success ? currentResult.currentPrice : null;
      const currentCorrect = (currentPrice === testCase.correctPrice) ||
                           (Math.abs(currentPrice - testCase.correctPrice) < 0.50);

      console.log(`   Detected: ${currentPrice === null ? 'UNAVAILABLE' : `$${currentPrice}`}`);
      console.log(`   Status: ${currentCorrect ? '✅ CORRECT' : '❌ INCORRECT'}`);

      if (currentCorrect) currentAccurate++;

      // Test with RiverSearch
      console.log('\n🌊 RiverSearch System:');
      const riverResult = await riverSearch.detectPrice(testCase.url);
      const riverPrice = riverResult.success ? riverResult.currentPrice : null;
      const riverCorrect = (riverPrice === testCase.correctPrice) ||
                          (Math.abs(riverPrice - testCase.correctPrice) < 0.50);

      console.log(`   Detected: ${riverPrice === null ? 'UNAVAILABLE' : `$${riverPrice}`}`);
      console.log(`   Status: ${riverCorrect ? '✅ CORRECT' : '❌ INCORRECT'}`);

      if (riverCorrect) riverAccurate++;

      results.push({
        name: testCase.name,
        correctPrice: testCase.correctPrice,
        currentPrice: currentPrice,
        riverPrice: riverPrice,
        currentCorrect: currentCorrect,
        riverCorrect: riverCorrect
      });

      // Small delay between requests
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    // Print summary
    console.log('\n\n' + '='.repeat(100));
    console.log('📊 FINAL RESULTS SUMMARY');
    console.log('='.repeat(100));

    console.log('\n📈 Accuracy Comparison:');
    console.log(`Current System (Targeted): ${currentAccurate}/${testCases.length} correct (${((currentAccurate / testCases.length) * 100).toFixed(1)}%)`);
    console.log(`RiverSearch System:        ${riverAccurate}/${testCases.length} correct (${((riverAccurate / testCases.length) * 100).toFixed(1)}%)`);

    const improvement = riverAccurate - currentAccurate;
    if (improvement > 0) {
      console.log(`\n✅ RiverSearch is MORE accurate by ${improvement} items!`);
    } else if (improvement < 0) {
      console.log(`\n⚠️ Current system is MORE accurate by ${Math.abs(improvement)} items`);
    } else {
      console.log(`\n➡️ Both systems have the same accuracy`);
    }

    // Print detailed comparison table
    console.log('\n\n📋 Detailed Comparison:');
    console.log('─'.repeat(100));
    console.log('Product'.padEnd(40) + 'Correct'.padEnd(12) + 'Current'.padEnd(12) + 'RiverSearch'.padEnd(12) + 'Winner');
    console.log('─'.repeat(100));

    results.forEach(result => {
      const name = result.name.substring(0, 37) + (result.name.length > 37 ? '...' : '');
      const correct = result.correctPrice === null ? 'UNAVAIL' : `$${result.correctPrice}`;
      const current = result.currentPrice === null ? 'UNAVAIL' : `$${result.currentPrice}`;
      const river = result.riverPrice === null ? 'UNAVAIL' : `$${result.riverPrice}`;

      let winner = '';
      if (result.currentCorrect && !result.riverCorrect) winner = 'Current';
      else if (!result.currentCorrect && result.riverCorrect) winner = 'RiverSearch';
      else if (result.currentCorrect && result.riverCorrect) winner = 'Both';
      else winner = 'Neither';

      console.log(
        name.padEnd(40) +
        correct.padEnd(12) +
        current.padEnd(12) +
        river.padEnd(12) +
        winner
      );
    });

    console.log('─'.repeat(100));

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await updater.closeBrowser();
    await riverSearch.close();
    process.exit(0);
  }
}

// Run the comparison
if (require.main === module) {
  runComparison();
}

module.exports = { runComparison };
