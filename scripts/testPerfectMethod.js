const puppeteer = require('puppeteer');
const { connectToDatabase, getDatabase } = require('../config/database');

// Test the perfect detection method based on comprehensive analysis
async function testPerfectMethod() {
  console.log('🎯 Testing PERFECT detection method based on comprehensive analysis...');

  // Your test cases with expected prices
  const testCases = [
    {
      name: "GIGABYTE GeForce RTX 4070 Super WINDFORCE OC 12G",
      expected: 845.98,
      collection: "gpus_rtx_4070_super"
    },
    {
      name: "MSI Gaming RTX 4070 Super 12G Ventus 2X OC Graphics Card.*Renewed.*Black",
      expected: 499.00,
      collection: "gpus_rtx_4070_super"
    },
    {
      name: "ASRock Intel Arc A770 Graphics Phantom Gaming 16G OC",
      expected: 279.99,
      collection: "gpus_arc_a770"
    },
    {
      name: "Sparkle Intel Arc A770 ROC Luna OC Edition.*Luna White",
      expected: 299.99,
      collection: "gpus_arc_a770"
    },
    {
      name: "GUNNIR Intel Arc A770 Photon 16GB OC GDDR6.*White",
      expected: 330.69,
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
          console.log(`✅ Found: ${gpu.name.substring(0, 60)}... (Expected: $${testCase.expected})`);
        }
      } catch (error) {
        console.log(`❌ Error finding ${testCase.name}: ${error.message}`);
      }
    }

    console.log(`\n📋 Testing ${gpusToTest.length} GPUs with PERFECT method...`);

    let accurateCount = 0;
    const tolerance = 0.5;
    const results = [];

    // Test each GPU with the perfect method
    for (const testGpu of gpusToTest) {
      console.log(`\n🔍 Testing: ${testGpu.gpu.name.substring(0, 50)}...`);
      console.log(`📍 Expected: $${testGpu.expected}`);

      const page = await browser.newPage();
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');

      try {
        await page.goto(testGpu.url, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await page.waitForTimeout(4000);

        // Import the perfect scraper and test it
        const perfectPrice = await page.evaluate(() => {
          console.log('🎯 PERFECT PRICE DETECTION - Based on comprehensive analysis');

          let finalPrice = null;
          let priceSource = null;

          // STRATEGY 1: Hidden Input Fields (100% Reliable)
          console.log('📍 Strategy 1: Hidden input fields (highest reliability)');
          const hiddenInputSelectors = [
            '#twister-plus-price-data-price',                    // value="845.98"
            '#attach-base-product-price',                        // value="845.98"
            '#items\\[0\\.base\\]\\[customerVisiblePrice\\]\\[amount\\]', // value="845.98"
            'input[name*="customerVisiblePrice"][name*="amount"]', // Fallback pattern
            'input[id*="price-data-price"]'                      // Fallback pattern
          ];

          for (const selector of hiddenInputSelectors) {
            try {
              const element = document.querySelector(selector);
              if (element && element.value) {
                const price = parseFloat(element.value);
                if (price >= 100 && price <= 5000) {
                  finalPrice = price;
                  priceSource = `Hidden Input: ${selector}`;
                  console.log(`🎯 FOUND via hidden input: $${price} (${selector})`);
                  break;
                }
              }
            } catch (e) {
              // CSS selector might be complex, continue
            }
          }

          // STRATEGY 2: JSON Data (Very Reliable)
          if (!finalPrice) {
            console.log('📍 Strategy 2: JSON price data');
            const jsonSelectors = [
              '#twisterPlusWWDesktop .twister-plus-buying-options-price-data',
              '.twister-plus-buying-options-price-data',
              '[class*="price-data"]'
            ];

            for (const selector of jsonSelectors) {
              const elements = document.querySelectorAll(selector);
              for (const element of elements) {
                try {
                  const jsonText = element.textContent || element.innerHTML;
                  if (jsonText && jsonText.includes('priceAmount')) {
                    const jsonData = JSON.parse(jsonText);

                    // Look for priceAmount in various structures
                    const extractPrice = (obj) => {
                      if (typeof obj === 'object' && obj !== null) {
                        if (obj.priceAmount) return obj.priceAmount;
                        if (obj.price) return obj.price;

                        // Recursively search
                        for (const key in obj) {
                          const result = extractPrice(obj[key]);
                          if (result) return result;
                        }
                      }
                      return null;
                    };

                    const price = extractPrice(jsonData);
                    if (price && price >= 100 && price <= 5000) {
                      finalPrice = price;
                      priceSource = `JSON Data: ${selector}`;
                      console.log(`🎯 FOUND via JSON: $${price} (priceAmount: ${price})`);
                      break;
                    }
                  }
                } catch (e) {
                  // Not valid JSON, continue
                }
              }
              if (finalPrice) break;
            }
          }

          // STRATEGY 3: Specific High-Priority .aok-offscreen/.a-offscreen Elements
          if (!finalPrice) {
            console.log('📍 Strategy 3: High-priority offscreen elements');
            const prioritySelectors = [
              // Tier 1: Core price displays (proven most accurate)
              '#corePrice_feature_div .a-offscreen',
              '#corePriceDisplay_desktop_feature_div .aok-offscreen',
              '#tp_price_block_total_price_ww .a-offscreen',
              '#tp-tool-tip-subtotal-price-value .a-offscreen',

              // Tier 2: Buy box areas
              '#buybox .a-price:not(.a-text-strike) .a-offscreen',
              '#price_inside_buybox .a-offscreen',

              // Tier 3: Core price feature variations
              '[data-feature-name="corePrice"] .a-offscreen',
              '#apex_offerDisplay_desktop .a-offscreen'
            ];

            for (const selector of prioritySelectors) {
              const elements = document.querySelectorAll(selector);
              console.log(`   ${selector}: ${elements.length} elements`);

              for (const element of elements) {
                const text = element.textContent.trim();
                const price = parseFloat(text.replace(/[^0-9.]/g, ''));

                if (price >= 100 && price <= 5000) {
                  finalPrice = price;
                  priceSource = `Priority Offscreen: ${selector}`;
                  console.log(`🎯 FOUND via priority offscreen: $${price} from "${text}"`);
                  break;
                }
              }
              if (finalPrice) break;
            }
          }

          console.log(`🎯 PERFECT DETECTION RESULT: $${finalPrice} (${priceSource})`);
          return { price: finalPrice, source: priceSource };
        });

        if (perfectPrice.price !== null) {
          const diff = Math.abs(perfectPrice.price - testGpu.expected);
          const isAccurate = diff <= tolerance;
          const accuracy = isAccurate ? '✅ ACCURATE' : `❌ Off by $${diff.toFixed(2)}`;

          console.log(`🎯 PERFECT METHOD: $${perfectPrice.price} ${accuracy}`);
          console.log(`🔧 Source: ${perfectPrice.source}`);

          results.push({
            gpu: testGpu.gpu.name.substring(0, 50),
            expected: testGpu.expected,
            detected: perfectPrice.price,
            accurate: isAccurate,
            source: perfectPrice.source
          });

          if (isAccurate) {
            accurateCount++;
          }
        } else {
          console.log(`🎯 PERFECT METHOD: No price found ❌`);
          results.push({
            gpu: testGpu.gpu.name.substring(0, 50),
            expected: testGpu.expected,
            detected: null,
            accurate: false,
            source: 'No price found'
          });
        }

      } catch (error) {
        console.log(`❌ Error testing ${testGpu.gpu.name}: ${error.message}`);
        results.push({
          gpu: testGpu.gpu.name.substring(0, 50),
          expected: testGpu.expected,
          detected: null,
          accurate: false,
          source: `Error: ${error.message}`
        });
      }

      await page.close();
    }

    // Final analysis
    const totalTests = gpusToTest.length;
    const accuracyPercentage = (accurateCount / totalTests) * 100;

    console.log(`\n\n🚀 PERFECT METHOD RESULTS:`);
    console.log('=' .repeat(80));
    console.log(`🎯 Accuracy: ${accuracyPercentage.toFixed(1)}% (${accurateCount}/${totalTests})`);

    console.log('\n📊 Detailed Results:');
    results.forEach((result, i) => {
      const status = result.accurate ? '✅' : '❌';
      const detectedStr = result.detected ? `$${result.detected}` : 'Not found';
      console.log(`${i + 1}. ${status} ${result.gpu}...`);
      console.log(`   Expected: $${result.expected} | Detected: ${detectedStr}`);
      console.log(`   Source: ${result.source}`);
    });

    if (accuracyPercentage > 88.9) {
      console.log(`\n🎉 🎉 🎉 BREAKTHROUGH! 🎉 🎉 🎉`);
      console.log(`Perfect method achieves ${accuracyPercentage.toFixed(1)}% accuracy!`);
      console.log(`This BEATS the previous best of 88.9% by ${(accuracyPercentage - 88.9).toFixed(1)} percentage points!`);
      console.log(`🏆 NEW RECORD: ${accuracyPercentage.toFixed(1)}% accuracy!`);
    } else if (accuracyPercentage === 100.0) {
      console.log(`\n🏆 🏆 🏆 PERFECT SCORE! 🏆 🏆 🏆`);
      console.log(`Perfect method achieves 100% accuracy!`);
    } else if (accuracyPercentage >= 88.9) {
      console.log(`\n⚖️  Perfect method ties with previous best at ${accuracyPercentage.toFixed(1)}%`);
    } else {
      console.log(`\n📉 Perfect method: ${accuracyPercentage.toFixed(1)}% (need ${(88.9 - accuracyPercentage).toFixed(1)} more points)`);
    }

    return { accuracy: accuracyPercentage, results };

  } catch (error) {
    console.error('❌ Perfect testing failed:', error);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// Run the test
if (require.main === module) {
  testPerfectMethod()
    .then(() => {
      console.log('\n✨ Perfect method testing completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Perfect testing failed:', error);
      process.exit(1);
    });
}

module.exports = { testPerfectMethod };