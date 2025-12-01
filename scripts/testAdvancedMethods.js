const puppeteer = require('puppeteer');
const { connectToDatabase, getDatabase } = require('../config/database');

// Test advanced price detection methods to beat 88.9% accuracy
async function testAdvancedMethods() {
  console.log('🚀 Testing advanced price detection methods to beat 88.9% accuracy...');

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
          console.log(`✅ Found: ${gpu.name.substring(0, 60)}... (Expected: $${testCase.expected})`);
        }
      } catch (error) {
        console.log(`❌ Error finding ${testCase.name}: ${error.message}`);
      }
    }

    console.log(`\n📋 Testing ${gpusToTest.length} GPUs with advanced methods...`);

    // Test each GPU with advanced methods
    for (const testGpu of gpusToTest) {
      console.log(`\n🔍 Testing: ${testGpu.gpu.name.substring(0, 50)}...`);
      console.log(`📍 Expected: $${testGpu.expected}`);

      const page = await browser.newPage();
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');

      try {
        await page.goto(testGpu.url, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await page.waitForTimeout(3000);

        const detectionResults = await page.evaluate(() => {
          const results = {};

          // ADVANCED METHOD 1: Multi-selector hierarchy with exact match preference
          console.log('🔬 Advanced Method 1: Multi-selector hierarchy');
          const hierarchySelectors = [
            // Tier 1: Most specific Amazon price selectors
            '#corePriceDisplay_desktop_feature_div .aok-offscreen',
            '#apex_desktop .a-price:not(.a-text-strike) .a-offscreen',
            '[data-feature-name="corePrice"] .a-offscreen',

            // Tier 2: Buy box specific
            '#price_inside_buybox .a-offscreen',
            '#buybox .a-price:not(.a-text-strike) .a-offscreen',

            // Tier 3: General but filtered
            '.a-price-current .a-offscreen',
            '.a-price:not(.a-text-strike):not(.a-price-original) .a-offscreen'
          ];

          let hierarchyPrices = [];
          for (let tier = 0; tier < hierarchySelectors.length; tier++) {
            const selector = hierarchySelectors[tier];
            const elements = document.querySelectorAll(selector);

            for (const el of elements) {
              const text = el.textContent.trim();
              const price = parseFloat(text.replace(/[^0-9.]/g, ''));
              if (price >= 100 && price <= 5000) {
                hierarchyPrices.push({ price, tier, selector, text });
              }
            }

            // If we found prices in this tier, prefer them
            if (hierarchyPrices.filter(p => p.tier === tier).length > 0) {
              break;
            }
          }

          results.hierarchyMethod = hierarchyPrices.length > 0 ? hierarchyPrices[0].price : null;

          // ADVANCED METHOD 2: Semantic text analysis around price elements
          console.log('🔬 Advanced Method 2: Semantic text analysis');
          const allAokElements = document.querySelectorAll('.aok-offscreen');
          let semanticPrices = [];

          for (const el of allAokElements) {
            const text = el.textContent.trim();
            const price = parseFloat(text.replace(/[^0-9.]/g, ''));

            if (price >= 100 && price <= 5000) {
              let semanticScore = 0;

              // Get surrounding text context (3 levels up)
              let contextText = '';
              let ancestor = el;
              for (let i = 0; i < 3 && ancestor; i++) {
                contextText += ' ' + (ancestor.textContent || '');
                ancestor = ancestor.parentElement;
              }
              contextText = contextText.toLowerCase();

              // Positive semantic indicators
              if (contextText.includes('our price') || contextText.includes('amazon price')) semanticScore += 10;
              if (contextText.includes('current price') || contextText.includes('sale price')) semanticScore += 8;
              if (contextText.includes('special offer') || contextText.includes('deal')) semanticScore += 6;
              if (contextText.includes('buy now') || contextText.includes('add to cart')) semanticScore += 5;
              if (contextText.includes('price') && !contextText.includes('list')) semanticScore += 3;

              // Negative semantic indicators
              if (contextText.includes('list price') || contextText.includes('msrp')) semanticScore -= 8;
              if (contextText.includes('typical price') || contextText.includes('was ')) semanticScore -= 6;
              if (contextText.includes('shipping') || contextText.includes('tax')) semanticScore -= 10;
              if (contextText.includes('import fees') || contextText.includes('handling')) semanticScore -= 8;

              semanticPrices.push({ price, score: semanticScore, context: contextText.substring(0, 100) });
            }
          }

          semanticPrices.sort((a, b) => b.score - a.score);
          results.semanticMethod = semanticPrices.length > 0 ? semanticPrices[0].price : null;

          // ADVANCED METHOD 3: DOM structure analysis (find prices in main content areas)
          console.log('🔬 Advanced Method 3: DOM structure analysis');
          const mainContentSelectors = [
            '#centerCol',
            '#dp-container',
            '#feature-bullets',
            '#apex_desktop',
            '.celwidget'
          ];

          let structuralPrices = [];
          for (const mainSelector of mainContentSelectors) {
            const mainArea = document.querySelector(mainSelector);
            if (mainArea) {
              const priceElements = mainArea.querySelectorAll('.aok-offscreen');

              for (const el of priceElements) {
                const text = el.textContent.trim();
                const price = parseFloat(text.replace(/[^0-9.]/g, ''));

                if (price >= 100 && price <= 5000) {
                  // Calculate depth from main container
                  let depth = 0;
                  let current = el;
                  while (current !== mainArea && current.parentElement) {
                    depth++;
                    current = current.parentElement;
                  }

                  // Prefer shallow depths (closer to main content)
                  const depthScore = Math.max(0, 20 - depth);
                  structuralPrices.push({ price, depth, depthScore, mainContainer: mainSelector });
                }
              }
            }
          }

          structuralPrices.sort((a, b) => b.depthScore - a.depthScore);
          results.structuralMethod = structuralPrices.length > 0 ? structuralPrices[0].price : null;

          // ADVANCED METHOD 4: Price pattern matching with validation
          console.log('🔬 Advanced Method 4: Price pattern matching with validation');
          const allTextNodes = [];
          const walker = document.createTreeWalker(
            document.body,
            NodeFilter.SHOW_TEXT,
            null,
            false
          );

          let node;
          while (node = walker.nextNode()) {
            if (node.textContent.trim()) {
              allTextNodes.push(node);
            }
          }

          let patternPrices = [];
          const pricePatterns = [
            /\$\s*([\d,]+\.[\d]{2})\s*(?:each|per item|current price)?/gi,
            /(?:price|cost):\s*\$\s*([\d,]+\.[\d]{2})/gi,
            /\$\s*([\d,]+\.[\d]{2})\s*(?:\+|with|free)/gi
          ];

          for (const textNode of allTextNodes) {
            const text = textNode.textContent;

            for (const pattern of pricePatterns) {
              const matches = [...text.matchAll(pattern)];

              for (const match of matches) {
                const price = parseFloat(match[1].replace(/,/g, ''));

                if (price >= 100 && price <= 5000) {
                  // Validate by checking if it's not in unwanted contexts
                  const parentText = (textNode.parentElement?.textContent || '').toLowerCase();
                  const isValid = !parentText.includes('shipping') &&
                                 !parentText.includes('tax') &&
                                 !parentText.includes('import') &&
                                 !parentText.includes('handling');

                  if (isValid) {
                    patternPrices.push({ price, pattern: pattern.source, matchText: match[0] });
                  }
                }
              }
            }
          }

          results.patternMethod = patternPrices.length > 0 ? patternPrices[0].price : null;

          // ADVANCED METHOD 5: Machine learning-style feature scoring
          console.log('🔬 Advanced Method 5: ML-style feature scoring');
          const featureElements = document.querySelectorAll('.aok-offscreen');
          let mlPrices = [];

          for (const el of featureElements) {
            const text = el.textContent.trim();
            const price = parseFloat(text.replace(/[^0-9.]/g, ''));

            if (price >= 100 && price <= 5000) {
              let mlScore = 0;

              // Feature 1: Element position (weight: 0.3)
              const rect = el.getBoundingClientRect();
              const positionScore = (rect.top < window.innerHeight * 0.3) ? 10 :
                                   (rect.top < window.innerHeight * 0.6) ? 5 : 0;
              mlScore += positionScore * 0.3;

              // Feature 2: Parent element classes (weight: 0.4)
              const parentClasses = (el.parentElement?.className || '').toLowerCase();
              let classScore = 0;
              if (parentClasses.includes('price')) classScore += 15;
              if (parentClasses.includes('current')) classScore += 20;
              if (parentClasses.includes('buybox')) classScore += 18;
              if (parentClasses.includes('core')) classScore += 25;
              mlScore += classScore * 0.4;

              // Feature 3: Text precision (weight: 0.2)
              const precisionScore = text.includes('.') && text.match(/\.\d{2}/) ? 10 : 0;
              mlScore += precisionScore * 0.2;

              // Feature 4: Context words (weight: 0.1)
              const contextText = (el.closest('[id], [class]')?.textContent || '').toLowerCase();
              let contextScore = 0;
              if (contextText.includes('add to cart')) contextScore += 10;
              if (contextText.includes('buy now')) contextScore += 8;
              if (contextText.includes('our price')) contextScore += 15;
              mlScore += contextScore * 0.1;

              mlPrices.push({ price, mlScore, features: { positionScore, classScore, precisionScore, contextScore } });
            }
          }

          mlPrices.sort((a, b) => b.mlScore - a.mlScore);
          results.mlMethod = mlPrices.length > 0 ? mlPrices[0].price : null;

          // ADVANCED METHOD 6: Ensemble method (combine top methods)
          console.log('🔬 Advanced Method 6: Ensemble method');
          const candidates = [];
          if (results.hierarchyMethod) candidates.push(results.hierarchyMethod);
          if (results.semanticMethod) candidates.push(results.semanticMethod);
          if (results.structuralMethod) candidates.push(results.structuralMethod);

          // Find consensus price (most common price among top methods)
          const priceFreq = {};
          for (const price of candidates) {
            const rounded = Math.round(price * 100) / 100; // Round to nearest cent
            priceFreq[rounded] = (priceFreq[rounded] || 0) + 1;
          }

          const consensusPrice = Object.entries(priceFreq)
            .sort(([,a], [,b]) => b - a) // Sort by frequency
            .map(([price]) => parseFloat(price))[0];

          results.ensembleMethod = consensusPrice || null;

          return results;
        });

        // Calculate accuracy for each advanced method
        const tolerance = 0.5; // Allow $0.50 difference
        const advancedMethods = [
          { name: 'Hierarchy Method', price: detectionResults.hierarchyMethod },
          { name: 'Semantic Analysis', price: detectionResults.semanticMethod },
          { name: 'DOM Structure Analysis', price: detectionResults.structuralMethod },
          { name: 'Pattern Matching', price: detectionResults.patternMethod },
          { name: 'ML-Style Scoring', price: detectionResults.mlMethod },
          { name: 'Ensemble Method', price: detectionResults.ensembleMethod }
        ];

        console.log(`📊 Advanced detection results:`);
        advancedMethods.forEach(method => {
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
    console.log(`\n\n🚀 ADVANCED METHODS ACCURACY ANALYSIS:`);
    console.log('=' .repeat(80));

    const sortedAdvancedMethods = Object.entries(methodResults)
      .map(([name, stats]) => ({
        name,
        accuracy: stats.total > 0 ? (stats.accurate / stats.total * 100) : 0,
        accurate: stats.accurate,
        total: stats.total,
        prices: stats.prices
      }))
      .sort((a, b) => b.accuracy - a.accuracy);

    console.log('\n🏆 Advanced Method Ranking:');
    sortedAdvancedMethods.forEach((method, i) => {
      const accuracyStr = method.accuracy.toFixed(1) + '%';
      const better = method.accuracy > 88.9 ? '🚀 BETTER THAN 88.9%!' :
                     method.accuracy === 88.9 ? '⚖️  Equal to 88.9%' : '📉 Lower than 88.9%';

      console.log(`${i + 1}. ${method.name}: ${accuracyStr} (${method.accurate}/${method.total}) ${better}`);

      if (method.prices.length > 0) {
        console.log(`   Examples:`);
        method.prices.slice(0, 2).forEach(price => {
          const status = price.accurate ? '✅' : '❌';
          console.log(`     ${status} ${price.gpu}... : $${price.detected} (expected $${price.expected})`);
        });
      }
      console.log('');
    });

    const bestMethod = sortedAdvancedMethods[0];
    if (bestMethod && bestMethod.accuracy > 88.9) {
      console.log(`🎉 BREAKTHROUGH! ${bestMethod.name} achieves ${bestMethod.accuracy.toFixed(1)}% accuracy!`);
      console.log(`This beats the previous best of 88.9% by ${(bestMethod.accuracy - 88.9).toFixed(1)} percentage points!`);
    } else {
      console.log(`📊 Current best: ${bestMethod ? bestMethod.accuracy.toFixed(1) + '%' : 'N/A'}`);
      console.log(`Target to beat: 88.9% - Need ${(88.9 - (bestMethod?.accuracy || 0)).toFixed(1)} more percentage points`);
    }

    return sortedAdvancedMethods;

  } catch (error) {
    console.error('❌ Advanced testing failed:', error);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// Run the test
if (require.main === module) {
  testAdvancedMethods()
    .then(() => {
      console.log('\n✨ Advanced method testing completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Advanced testing failed:', error);
      process.exit(1);
    });
}

module.exports = { testAdvancedMethods };