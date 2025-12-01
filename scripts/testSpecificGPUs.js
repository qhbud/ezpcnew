const puppeteer = require('puppeteer');
const { connectToDatabase, getDatabase } = require('../config/database');

// Test specific GPUs with known expected prices
async function testSpecificGPUs() {
  console.log('🧪 Testing specific GPUs with known expected prices...');

  // Your provided test cases with expected prices
  const testCases = [
    {
      name: "GIGABYTE GeForce RTX 4070 Super WINDFORCE OC 12G",
      expected: 845.98,
      collection: "gpus_rtx_4070_super"
    },
    {
      name: "MSI Gaming RTX 4070 Super 12G Ventus 2X OC Graphics Card (NVIDIA RTX 4070 Super, 192-Bit, Extreme Clock: 2520 MHz",
      expected: 499.00,
      collection: "gpus_rtx_4070_super"
    },
    {
      name: "MSI Gaming RTX 4070 Super 12G Ventus 2X OC Graphics Card.*Renewed.*Black",
      expected: 499.00, // Sale price (-9% from $549.00)
      collection: "gpus_rtx_4070_super"
    },
    {
      name: "ASRock Intel Arc A770 Graphics Phantom Gaming 16G OC",
      expected: 279.99, // Sale price (-36% from $439.99)
      collection: "gpus_arc_a770"
    },
    {
      name: "Sparkle Intel Arc A770 ROC Luna OC Edition.*Luna White",
      expected: 299.99,
      collection: "gpus_arc_a770"
    },
    {
      name: "GUNNIR Intel Arc A770 Photon 16GB OC GDDR6.*White",
      expected: 330.69, // Sale price (-11% from $369.69)
      collection: "gpus_arc_a770"
    },
    {
      name: "Sparkle Intel Arc A770 ROC OC Edition.*SA770R-16GOC",
      expected: 399.67,
      collection: "gpus_arc_a770"
    },
    {
      name: "Sparkle Intel Arc A770 Titan OC Edition",
      expected: 369.85,
      collection: "gpus_arc_a770"
    },
    {
      name: "ASUS Dual GeForce RTX.*4070 EVO OC Edition.*Renewed",
      expected: 469.99,
      collection: "gpus_rtx_4070"
    },
    {
      name: "MSI Gaming GeForce RTX 4070 12GB.*Ventus 2X 12G OC",
      expected: 477.22,
      collection: "gpus_rtx_4070"
    }
  ];

  let browser;
  try {
    await connectToDatabase();
    const db = getDatabase();

    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const methodResults = {};
    const gpusToTest = [];

    // Find the actual GPUs in database
    console.log('\n🔍 Finding GPUs in database...');
    for (const testCase of testCases) {
      try {
        const gpu = await db.collection(testCase.collection).findOne({
          name: { $regex: testCase.name, $options: 'i' },
          sourceUrl: { $exists: true, $ne: null }
        });

        if (gpu) {
          gpusToTest.push({
            ...testCase,
            gpu: gpu,
            url: gpu.sourceUrl,
            currentStored: gpu.currentPrice
          });
          console.log(`✅ Found: ${gpu.name.substring(0, 60)}... (Expected: $${testCase.expected}, Stored: $${gpu.currentPrice})`);
        } else {
          console.log(`❌ Not found: ${testCase.name.substring(0, 60)}...`);
        }
      } catch (error) {
        console.log(`❌ Error finding ${testCase.name}: ${error.message}`);
      }
    }

    console.log(`\n📋 Testing ${gpusToTest.length} GPUs with known expected prices...`);

    // Test each GPU
    for (const testGpu of gpusToTest) {
      console.log(`\n🔍 Testing: ${testGpu.gpu.name.substring(0, 50)}...`);
      console.log(`📍 Expected: $${testGpu.expected}, Currently stored: $${testGpu.currentStored}`);

      const page = await browser.newPage();
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');

      try {
        await page.goto(testGpu.url, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await page.waitForTimeout(3000);

        const detectionResults = await page.evaluate(() => {
          const results = {};

          // Method 1: Core Price Display
          const corePriceSelectors = [
            '#corePriceDisplay_desktop_feature_div .aok-offscreen',
            '#corePriceDisplay_desktop_feature_div span.aok-offscreen',
            '#corePriceDisplay_desktop_feature_div > div.a-section.a-spacing-none.aok-align-center.aok-relative > span.aok-offscreen',
            '[data-feature-name="corePrice"] .a-offscreen'
          ];

          let corePrices = [];
          for (const selector of corePriceSelectors) {
            const elements = document.querySelectorAll(selector);
            for (const el of elements) {
              const text = el.textContent.trim();
              const price = parseFloat(text.replace(/[^0-9.]/g, ''));
              if (price >= 100 && price <= 5000) {
                corePrices.push(price);
              }
            }
          }
          results.corePrice = corePrices.length > 0 ? corePrices[0] : null;

          // Method 2: Buy Box Area
          const buyboxSelectors = [
            '#price_inside_buybox .a-offscreen',
            '#buybox .a-price .a-offscreen',
            '#buybox-inner .a-offscreen'
          ];

          let buyboxPrices = [];
          for (const selector of buyboxSelectors) {
            const elements = document.querySelectorAll(selector);
            for (const el of elements) {
              const text = el.textContent.trim();
              const price = parseFloat(text.replace(/[^0-9.]/g, ''));
              if (price >= 100 && price <= 5000) {
                buyboxPrices.push(price);
              }
            }
          }
          results.buyboxPrice = buyboxPrices.length > 0 ? buyboxPrices[0] : null;

          // Method 3: First valid .aok-offscreen
          const allAokElements = document.querySelectorAll('.aok-offscreen');
          let firstValidAok = null;
          for (const el of allAokElements) {
            const text = el.textContent.trim();
            const price = parseFloat(text.replace(/[^0-9.]/g, ''));
            if (price >= 100 && price <= 5000) {
              firstValidAok = price;
              break;
            }
          }
          results.firstAokPrice = firstValidAok;

          // Method 4: Position-sorted .aok-offscreen (top-left first)
          let positionSortedAok = [];
          for (const el of allAokElements) {
            const text = el.textContent.trim();
            const price = parseFloat(text.replace(/[^0-9.]/g, ''));
            if (price >= 100 && price <= 5000) {
              const rect = el.getBoundingClientRect();
              positionSortedAok.push({
                price: price,
                top: rect.top,
                left: rect.left
              });
            }
          }
          positionSortedAok.sort((a, b) => a.top - b.top || a.left - b.left);
          results.positionSortedAokPrice = positionSortedAok.length > 0 ? positionSortedAok[0].price : null;

          // Method 5: First non-strikethrough .a-price-whole
          const wholeElements = document.querySelectorAll('.a-price-whole');
          let firstValidWhole = null;
          for (const wholeEl of wholeElements) {
            if (!wholeEl.closest('.a-text-strike')) {
              const decimalEl = wholeEl.parentNode?.querySelector('.a-price-decimal, .a-price-fraction');
              const wholeText = wholeEl.textContent.replace(/[^0-9]/g, '');
              const decimalText = decimalEl ? decimalEl.textContent.replace(/[^0-9]/g, '') : '00';

              if (wholeText) {
                const price = parseFloat(`${wholeText}.${decimalText.padEnd(2, '0').substring(0, 2)}`);
                if (price >= 100 && price <= 5000) {
                  firstValidWhole = price;
                  break;
                }
              }
            }
          }
          results.wholeDecimalPrice = firstValidWhole;

          // Method 6: Context-scored .aok-offscreen
          let contextScoredAok = [];
          for (const el of allAokElements) {
            const text = el.textContent.trim();
            const price = parseFloat(text.replace(/[^0-9.]/g, ''));
            if (price >= 100 && price <= 5000) {
              let score = 1;
              const parentEl = el.parentElement;
              const parentClasses = (parentEl?.className || '').toLowerCase();
              const parentText = (parentEl?.textContent || '').toLowerCase();

              // Bonuses
              if (parentClasses.includes('price')) score += 3;
              if (parentClasses.includes('current')) score += 5;
              if (parentClasses.includes('buybox')) score += 4;

              // Penalties
              if (parentText.includes('shipping') || parentText.includes('tax') ||
                  parentText.includes('list') || parentText.includes('was')) {
                score -= 3;
              }

              contextScoredAok.push({ price: price, score: score });
            }
          }
          contextScoredAok.sort((a, b) => b.score - a.score);
          results.contextScoredAokPrice = contextScoredAok.length > 0 ? contextScoredAok[0].price : null;

          return results;
        });

        // Calculate accuracy for each method
        const tolerance = 0.5; // Allow $0.50 difference
        const methods = [
          { name: 'Core Price Display', price: detectionResults.corePrice },
          { name: 'Buy Box Area', price: detectionResults.buyboxPrice },
          { name: 'First Valid .aok-offscreen', price: detectionResults.firstAokPrice },
          { name: 'Position-Sorted .aok-offscreen', price: detectionResults.positionSortedAokPrice },
          { name: 'First Non-Strike Whole+Decimal', price: detectionResults.wholeDecimalPrice },
          { name: 'Context-Scored .aok-offscreen', price: detectionResults.contextScoredAokPrice }
        ];

        console.log(`📊 Detection results:`);
        methods.forEach(method => {
          if (method.price !== null) {
            const diff = Math.abs(method.price - testGpu.expected);
            const isAccurate = diff <= tolerance;
            const accuracy = isAccurate ? '✅ ACCURATE' : `❌ Off by $${diff.toFixed(2)}`;
            console.log(`   ${method.name}: $${method.price} ${accuracy}`);

            // Track method performance
            if (!methodResults[method.name]) {
              methodResults[method.name] = { accurate: 0, total: 0, prices: [] };
            }
            methodResults[method.name].total++;
            methodResults[method.name].prices.push({
              detected: method.price,
              expected: testGpu.expected,
              accurate: isAccurate,
              gpu: testGpu.gpu.name.substring(0, 40)
            });
            if (isAccurate) {
              methodResults[method.name].accurate++;
            }
          } else {
            console.log(`   ${method.name}: No price found`);
            if (!methodResults[method.name]) {
              methodResults[method.name] = { accurate: 0, total: 0, prices: [] };
            }
            methodResults[method.name].total++;
          }
        });

      } catch (error) {
        console.log(`❌ Error testing ${testGpu.gpu.name}: ${error.message}`);
      }

      await page.close();
    }

    // Final analysis
    console.log(`\n\n🎯 FINAL ACCURACY ANALYSIS:`);
    console.log('=' .repeat(80));

    const sortedMethods = Object.entries(methodResults)
      .map(([name, stats]) => ({
        name,
        accuracy: stats.total > 0 ? (stats.accurate / stats.total * 100) : 0,
        accurate: stats.accurate,
        total: stats.total,
        prices: stats.prices
      }))
      .sort((a, b) => b.accuracy - a.accuracy);

    console.log('\n📊 Method Ranking by Accuracy:');
    sortedMethods.forEach((method, i) => {
      console.log(`${i + 1}. ${method.name}: ${method.accuracy.toFixed(1)}% (${method.accurate}/${method.total} accurate)`);

      if (method.prices.length > 0) {
        console.log(`   Examples:`);
        method.prices.slice(0, 3).forEach(price => {
          const status = price.accurate ? '✅' : '❌';
          console.log(`     ${status} ${price.gpu}... : $${price.detected} (expected $${price.expected})`);
        });
      }
      console.log('');
    });

    console.log('\n🏆 RECOMMENDED DETECTION ORDER:');
    sortedMethods.filter(m => m.accuracy > 0).forEach((method, i) => {
      console.log(`${i + 1}. ${method.name} (${method.accuracy.toFixed(1)}% accuracy)`);
    });

    return sortedMethods;

  } catch (error) {
    console.error('❌ Testing failed:', error);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// Run the test
if (require.main === module) {
  testSpecificGPUs()
    .then(() => {
      console.log('\n✨ Specific GPU testing completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Testing failed:', error);
      process.exit(1);
    });
}

module.exports = { testSpecificGPUs };