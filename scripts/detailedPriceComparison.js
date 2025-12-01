const { PriceUpdater } = require('./priceUpdater');
const { RiverSearchPriceDetector } = require('./riverSearchPriceDetection');

// Test cases with complete pricing information
const testCases = [
  {
    name: 'MSI Gaming RTX 4070 Super 12G Ventus 3X OC',
    url: 'https://amazon.com/MSI-RTX-4070-12G-3X/dp/B0CSHFM3D5',
    correctPrice: 763.22,
    correctBasePrice: null,
    correctSalePrice: null,
    isOnSale: false
  },
  {
    name: 'GIGABYTE GeForce RTX 4070 Super WINDFORCE OC 12G',
    url: 'https://amazon.com/GIGABYTE-GeForce-WINDFORCE-Graphics-GV-N407SWF3OC-12GD/dp/B0CSJV61BN',
    correctPrice: 869.58,
    correctBasePrice: null,
    correctSalePrice: null,
    isOnSale: false
  },
  {
    name: 'MSI Gaming RTX 4070 Super 12G Ventus 2X OC',
    url: 'https://amazon.com/MSI-RTX-4070-12G-2X/dp/B0CS718XC3',
    correctPrice: 659.63,
    correctBasePrice: 699.99,
    correctSalePrice: 659.63,
    isOnSale: true,
    salePercent: 6
  },
  {
    name: 'MSI Gaming RTX 4070 Super Ventus 2X OC (Renewed)',
    url: 'https://amazon.com/MSI-Gaming-Ventus-Graphics-192-Bit/dp/B0D3J8QL5G',
    correctPrice: null,
    correctBasePrice: null,
    correctSalePrice: null,
    isOnSale: false,
    unavailable: true
  },
  {
    name: 'ASRock Intel Arc A770 Phantom Gaming',
    url: 'https://amazon.com/Graphics-Phantom-256-bit-7680x4320-DisplayPort-Cooling/dp/B0CDM3QK7Q',
    correctPrice: 279.99,
    correctBasePrice: 439.99,
    correctSalePrice: 279.99,
    isOnSale: true,
    salePercent: 36
  },
  {
    name: 'Sparkle Intel Arc A770 ROC Luna OC',
    url: 'https://amazon.com/Sparkle-Intel-2-5-Slot-Backplate-SA770RW-16GOC/dp/B0D1RDHSK7',
    correctPrice: 299.99,
    correctBasePrice: null,
    correctSalePrice: null,
    isOnSale: false
  },
  {
    name: 'GUNNIR Intel Arc A770 Photon 16GB',
    url: 'https://amazon.com/GUNNIR-2400MHz-Graphics-Content-Creation/dp/B0F99PBV9F',
    correctPrice: 330.69,
    correctBasePrice: 369.69,
    correctSalePrice: 330.69,
    isOnSale: true,
    salePercent: 11
  },
  {
    name: 'Sparkle Intel Arc A770 ROC OC Edition',
    url: 'https://amazon.com/Sparkle-Intel-2-5-Slot-Backplate-SA770R-16GOC/dp/B0D1RGP56Y',
    correctPrice: 399.67,
    correctBasePrice: null,
    correctSalePrice: null,
    isOnSale: false
  },
  {
    name: 'Sparkle Intel Arc A770 Titan OC',
    url: 'https://amazon.com/Sparkle-ThermalSync-Cooling-Backplate-SA770T-16GOC/dp/B0CHN7YZX1',
    correctPrice: 369.85,
    correctBasePrice: null,
    correctSalePrice: null,
    isOnSale: false
  },
  {
    name: 'ASRock Challenger SE Intel Arc A770',
    url: 'https://amazon.com/ASRock-Challenger-GDDR6-Express-Video/dp/B0D8VP57MQ',
    correctPrice: 425.29,
    correctBasePrice: null,
    correctSalePrice: null,
    isOnSale: false
  },
  {
    name: 'ASRock Arc A770 Phantom Gaming (Renewed)',
    url: 'https://amazon.com/ASRock-Graphics-Phantom-7680x4320-DisplayPort/dp/B0DTJF34ZF',
    correctPrice: null,
    correctBasePrice: null,
    correctSalePrice: null,
    isOnSale: false,
    unavailable: true
  },
  {
    name: 'ASUS Dual GeForce RTX 4070 EVO OC',
    url: 'https://amazon.com/ASUS-Compatibility-Axial-tech-Technology-Auto-Extreme/dp/B0CQRX9HPK',
    correctPrice: null,
    correctBasePrice: null,
    correctSalePrice: null,
    isOnSale: false,
    unavailable: true
  },
  {
    name: 'MSI Gaming GeForce RTX 4070 Ventus 2X (Renewed)',
    url: 'https://amazon.com/MSI-GeForce-Lovelace-Architecture-Graphics/dp/B0CBQV398S',
    correctPrice: null,
    correctBasePrice: null,
    correctSalePrice: null,
    isOnSale: false,
    unavailable: true
  },
  {
    name: 'ASUS Dual RTX 4070 EVO OC (Renewed)',
    url: 'https://amazon.com/ASUS-Compatibility-Axial-tech-Technology-Auto-Extreme/dp/B0D3JBCBKC',
    correctPrice: null,
    correctBasePrice: null,
    correctSalePrice: null,
    isOnSale: false,
    unavailable: true
  },
  {
    name: 'MSI Gaming GeForce RTX 4070 Ventus 2X 12G OC',
    url: 'https://amazon.com/MSI-GeForce-RTX-4070-12G/dp/B0BZB7DS7Q',
    correctPrice: 800.82,
    correctBasePrice: null,
    correctSalePrice: null,
    isOnSale: false
  },
  {
    name: 'EVGA GeForce RTX 3080 FTW3 Ultra (Renewed)',
    url: 'https://amazon.com/EVGA-GeForce-10G-P5-3897-KL-Technology-Backplate/dp/B09CDX4DKR',
    correctPrice: 459.99,
    correctBasePrice: 987.98,
    correctSalePrice: 459.99,
    isOnSale: true,
    salePercent: 53
  },
  {
    name: 'EVGA GeForce RTX 3080 XC3 Black (Renewed)',
    url: 'https://amazon.com/GeForce-Gaming-10G-P5-3881-KL-Cooling-Renewed/dp/B09PQFX3LM',
    correctPrice: 459.99,
    correctBasePrice: 749.00,
    correctSalePrice: 459.99,
    isOnSale: true,
    salePercent: 39
  },
  {
    name: 'EVGA RTX 3080 XC3 ULTRA GAMING (Renewed)',
    url: 'https://amazon.com/EVGA-10G-P5-3885-KR-GeForce-Cooling-Backplate/dp/B093QJSNHK',
    correctPrice: 469.99,
    correctBasePrice: 1085.00,
    correctSalePrice: 469.99,
    isOnSale: true,
    salePercent: 57
  },
  {
    name: 'MSI Gaming GeForce RTX 3080 Suprim X (Renewed)',
    url: 'https://amazon.com/MSI-GeForce-320-Bit-Architecture-Graphics/dp/B0BMPMWM16',
    correctPrice: 419.97,
    correctBasePrice: 999.00,
    correctSalePrice: 419.97,
    isOnSale: true,
    salePercent: 58
  },
  {
    name: 'GIGABYTE AORUS GeForce RTX 3080 Ti Master 12G',
    url: 'https://amazon.com/GIGABYTE-GeForce-Graphics-GV-N308TAORUS-M-12GD/dp/B083HZG3HK',
    correctPrice: 1549.00,
    correctBasePrice: null,
    correctSalePrice: null,
    isOnSale: false
  },
  {
    name: 'MSI Gaming GeForce RTX 3080 Ventus 3X (Renewed)',
    url: 'https://amazon.com/MSI-GeForce-320-Bit-Architecture-Graphics/dp/B09J1QCT9Y',
    correctPrice: 449.99,
    correctBasePrice: 998.00,
    correctSalePrice: 449.99,
    isOnSale: true,
    salePercent: 55
  },
  {
    name: 'PowerColor Hellhound AMD Radeon RX 6600 XT',
    url: 'https://amazon.com/PowerColor-Hellhound-Radeon-Graphics-Powered/dp/B09BWYTRXQ',
    correctPrice: 549.00,
    correctBasePrice: 1199.00,
    correctSalePrice: 549.00,
    isOnSale: true,
    salePercent: 54
  },
  {
    name: 'XFX Speedster QICK308 Radeon RX 6600 XT (Renewed)',
    url: 'https://amazon.com/XFX-Speedster-QICK308-Graphics-RX-66XT8LBDQ/dp/B0B71DLPF1',
    correctPrice: 239.97,
    correctBasePrice: 339.00,
    correctSalePrice: 239.97,
    isOnSale: true,
    salePercent: 29
  },
  {
    name: 'PowerColor Fighter AMD Radeon RX 6500 XT',
    url: 'https://amazon.com/PowerColor-Fighter-Radeon-Gaming-Graphics/dp/B09PSN3Y63',
    correctPrice: 206.54,
    correctBasePrice: null,
    correctSalePrice: null,
    isOnSale: false
  }
];

async function runDetailedComparison() {
  console.log('📋 DETAILED PRICE COMPARISON REPORT\n');
  console.log('='.repeat(120));

  const updater = new PriceUpdater();
  const riverSearch = new RiverSearchPriceDetector();

  try {
    await updater.connect();
    await updater.initializeBrowser();
    await riverSearch.initialize();

    const results = [];

    for (let i = 0; i < testCases.length; i++) {
      const testCase = testCases[i];
      console.log(`\n[${i + 1}/${testCases.length}] ${testCase.name}`);

      // Test with current system
      const currentResult = await updater.scrapeAmazonTargeted(testCase.url);

      // Test with RiverSearch
      const riverResult = await riverSearch.detectPrice(testCase.url);

      results.push({
        name: testCase.name,
        correctPrice: testCase.correctPrice,
        correctBasePrice: testCase.correctBasePrice,
        correctSalePrice: testCase.correctSalePrice,
        isOnSale: testCase.isOnSale,
        salePercent: testCase.salePercent,
        unavailable: testCase.unavailable,
        currentPrice: currentResult.currentPrice,
        currentBasePrice: currentResult.basePrice,
        currentSalePrice: currentResult.salePrice,
        currentIsOnSale: currentResult.isOnSale,
        riverPrice: riverResult.currentPrice,
        riverBasePrice: riverResult.basePrice,
        riverSalePrice: riverResult.salePrice,
        riverIsOnSale: riverResult.isOnSale
      });

      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    // Print detailed report
    console.log('\n\n' + '='.repeat(120));
    console.log('📊 DETAILED COMPARISON REPORT');
    console.log('='.repeat(120));

    results.forEach((result, index) => {
      console.log(`\n${index + 1}. ${result.name}`);
      console.log('-'.repeat(120));

      if (result.unavailable) {
        console.log('   CORRECT:          UNAVAILABLE');
        console.log(`   Targeted:         ${result.currentPrice === null ? 'UNAVAILABLE ✅' : `$${result.currentPrice} ❌`}`);
        console.log(`   RiverSearch:      ${result.riverPrice === null ? 'UNAVAILABLE ✅' : `$${result.riverPrice} ❌`}`);
      } else {
        console.log(`   CORRECT PRICE:    $${result.correctPrice}`);
        if (result.isOnSale) {
          console.log(`   CORRECT BASE:     $${result.correctBasePrice}`);
          console.log(`   CORRECT SALE:     $${result.correctSalePrice} (${result.salePercent}% off)`);
        }

        console.log('');
        console.log('   TARGETED SYSTEM:');
        if (result.currentPrice === null) {
          console.log('      Status:        UNAVAILABLE ❌');
        } else {
          const priceMatch = Math.abs(result.currentPrice - result.correctPrice) < 0.50;
          console.log(`      Price:         $${result.currentPrice} ${priceMatch ? '✅' : '❌'}`);
          if (result.currentIsOnSale) {
            console.log(`      Base Price:    $${result.currentBasePrice}`);
            console.log(`      Sale Price:    $${result.currentSalePrice}`);
          }
        }

        console.log('');
        console.log('   RIVERSEARCH SYSTEM:');
        if (result.riverPrice === null) {
          console.log('      Status:        UNAVAILABLE ❌');
        } else {
          const priceMatch = Math.abs(result.riverPrice - result.correctPrice) < 0.50;
          console.log(`      Price:         $${result.riverPrice} ${priceMatch ? '✅' : '❌'}`);
          if (result.riverIsOnSale) {
            console.log(`      Base Price:    $${result.riverBasePrice}`);
            console.log(`      Sale Price:    $${result.riverSalePrice}`);
          }
        }
      }
    });

    console.log('\n\n' + '='.repeat(120));
    console.log('📈 SUMMARY STATISTICS');
    console.log('='.repeat(120));

    let targetedCorrect = 0;
    let riverCorrect = 0;
    let targetedSaleDetection = 0;
    let riverSaleDetection = 0;
    let salesCount = 0;

    results.forEach(result => {
      const targetedMatch = result.unavailable
        ? result.currentPrice === null
        : (result.currentPrice !== null && Math.abs(result.currentPrice - result.correctPrice) < 0.50);

      const riverMatch = result.unavailable
        ? result.riverPrice === null
        : (result.riverPrice !== null && Math.abs(result.riverPrice - result.correctPrice) < 0.50);

      if (targetedMatch) targetedCorrect++;
      if (riverMatch) riverCorrect++;

      if (result.isOnSale) {
        salesCount++;
        if (result.currentIsOnSale) targetedSaleDetection++;
        if (result.riverIsOnSale) riverSaleDetection++;
      }
    });

    console.log(`\nPrice Detection Accuracy:`);
    console.log(`   Targeted System:   ${targetedCorrect}/${results.length} (${((targetedCorrect / results.length) * 100).toFixed(1)}%)`);
    console.log(`   RiverSearch:       ${riverCorrect}/${results.length} (${((riverCorrect / results.length) * 100).toFixed(1)}%)`);

    console.log(`\nSale Detection Accuracy:`);
    console.log(`   Targeted System:   ${targetedSaleDetection}/${salesCount} sales detected (${((targetedSaleDetection / salesCount) * 100).toFixed(1)}%)`);
    console.log(`   RiverSearch:       ${riverSaleDetection}/${salesCount} sales detected (${((riverSaleDetection / salesCount) * 100).toFixed(1)}%)`);

    console.log('\n' + '='.repeat(120));

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await updater.closeBrowser();
    await riverSearch.close();
    process.exit(0);
  }
}

if (require.main === module) {
  runDetailedComparison();
}

module.exports = { runDetailedComparison };
