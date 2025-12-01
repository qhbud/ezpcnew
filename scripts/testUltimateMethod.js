const puppeteer = require('puppeteer');
const { connectToDatabase, getDatabase } = require('../config/database');

// Test the ultimate hybrid method to beat 88.9% accuracy
async function testUltimateMethod() {
  console.log('🎯 Testing ULTIMATE hybrid method to beat 88.9% accuracy...');

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

    console.log(`\n📋 Testing ${gpusToTest.length} GPUs with ULTIMATE method...`);

    let accurateCount = 0;
    const tolerance = 0.5;

    // Test each GPU with the ultimate method
    for (const testGpu of gpusToTest) {
      console.log(`\n🔍 Testing: ${testGpu.gpu.name.substring(0, 50)}...`);
      console.log(`📍 Expected: $${testGpu.expected}`);

      const page = await browser.newPage();
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');

      try {
        await page.goto(testGpu.url, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await page.waitForTimeout(3000);

        const ultimatePrice = await page.evaluate(() => {
          console.log('🎯 ULTIMATE PRICE DETECTION ALGORITHM');

          // STAGE 1: Collect all price candidates with metadata
          const candidates = [];

          // Candidate source 1: Core price display (proven 88.9% accuracy)
          const coreSelectors = [
            '#corePriceDisplay_desktop_feature_div .aok-offscreen',
            '#corePriceDisplay_desktop_feature_div span.aok-offscreen',
            '[data-feature-name="corePrice"] .a-offscreen'
          ];

          for (const selector of coreSelectors) {
            const elements = document.querySelectorAll(selector);
            for (const el of elements) {
              const text = el.textContent.trim();
              const price = parseFloat(text.replace(/[^0-9.]/g, ''));
              if (price >= 100 && price <= 5000) {
                candidates.push({
                  price,
                  text,
                  source: 'core_price',
                  confidence: 0.95,
                  element: el
                });
              }
            }
          }

          // Candidate source 2: Buy box with validation
          const buyboxSelectors = [
            '#price_inside_buybox .a-offscreen',
            '#buybox .a-price:not(.a-text-strike) .a-offscreen'
          ];

          for (const selector of buyboxSelectors) {
            const elements = document.querySelectorAll(selector);
            for (const el of elements) {
              const text = el.textContent.trim();
              const price = parseFloat(text.replace(/[^0-9.]/g, ''));
              if (price >= 100 && price <= 5000) {
                candidates.push({
                  price,
                  text,
                  source: 'buybox',
                  confidence: 0.85,
                  element: el
                });
              }
            }
          }

          // Candidate source 3: High-confidence .aok-offscreen with strict filtering
          const allAokElements = document.querySelectorAll('.aok-offscreen');
          for (const el of allAokElements) {
            const text = el.textContent.trim();
            const price = parseFloat(text.replace(/[^0-9.]/g, ''));

            if (price >= 100 && price <= 5000) {
              // Strict validation
              const parentText = (el.parentElement?.textContent || '').toLowerCase();
              const grandParentText = (el.parentElement?.parentElement?.textContent || '').toLowerCase();

              // Immediate disqualifiers
              const badKeywords = ['shipping', 'tax', 'import', 'handling', 'fee', 'deposit'];
              const hasBadKeyword = badKeywords.some(keyword =>
                parentText.includes(keyword) || grandParentText.includes(keyword)
              );

              if (!hasBadKeyword) {
                // Calculate confidence based on context
                let confidence = 0.7;

                const parentClasses = (el.parentElement?.className || '').toLowerCase();

                // Boost confidence for good indicators
                if (parentClasses.includes('price') && !parentClasses.includes('original')) confidence += 0.15;
                if (parentText.includes('our price') || parentText.includes('amazon price')) confidence += 0.2;
                if (parentText.includes('current') && !parentText.includes('list')) confidence += 0.1;

                // Reduce confidence for questionable contexts
                if (parentText.includes('list') || parentText.includes('msrp')) confidence -= 0.3;
                if (parentText.includes('was') || parentText.includes('typical')) confidence -= 0.25;

                // Only include if confidence is still reasonable
                if (confidence > 0.5) {
                  candidates.push({
                    price,
                    text,
                    source: 'filtered_aok',
                    confidence,
                    element: el
                  });
                }
              }
            }
          }

          console.log(`Collected ${candidates.length} price candidates`);

          if (candidates.length === 0) {
            console.log('❌ No valid candidates found');
            return null;
          }

          // STAGE 2: Advanced candidate evaluation
          const evaluatedCandidates = candidates.map(candidate => {
            let score = candidate.confidence * 100;

            // PRECISION BONUS: Prefer prices with exact cents
            const hasExactCents = candidate.text.includes('.') && candidate.text.match(/\.\d{2}/);
            if (hasExactCents) {
              score += 10;
              console.log(`Precision bonus for ${candidate.price}: +10 (exact cents)`);
            }

            // UNIQUENESS BONUS: If this price appears multiple times from different sources, it's more likely correct
            const samePrice = candidates.filter(c => Math.abs(c.price - candidate.price) < 0.02);
            if (samePrice.length > 1) {
              score += 15;
              console.log(`Consensus bonus for ${candidate.price}: +15 (appears ${samePrice.length} times)`);
            }

            // POSITION BONUS: Prices in top half of page are more likely main prices
            try {
              const rect = candidate.element.getBoundingClientRect();
              if (rect.top < window.innerHeight * 0.4) {
                score += 8;
                console.log(`Position bonus for ${candidate.price}: +8 (top of page)`);
              }
            } catch (e) {}

            // SOURCE-SPECIFIC BONUSES
            if (candidate.source === 'core_price') {
              score += 20; // Core price display is most reliable
              console.log(`Source bonus for ${candidate.price}: +20 (core price)`);
            } else if (candidate.source === 'buybox') {
              score += 15; // Buy box is very reliable
              console.log(`Source bonus for ${candidate.price}: +15 (buybox)`);
            }

            return { ...candidate, finalScore: score };
          });

          // STAGE 3: Final selection with edge case handling
          evaluatedCandidates.sort((a, b) => b.finalScore - a.finalScore);

          console.log('🏆 Final candidate ranking:');
          evaluatedCandidates.slice(0, 5).forEach((candidate, i) => {
            console.log(`  ${i + 1}. $${candidate.price} (${candidate.source}, score: ${candidate.finalScore.toFixed(1)})`);
          });

          const winner = evaluatedCandidates[0];

          // EDGE CASE DETECTION: If the top candidate seems suspicious, apply additional validation
          if (winner) {
            const secondPlace = evaluatedCandidates[1];

            // If second place is very close in score, check for anomalies
            if (secondPlace && Math.abs(winner.finalScore - secondPlace.finalScore) < 10) {
              console.log(`Close competition detected: ${winner.price} vs ${secondPlace.price}`);

              // Check if winner price is suspiciously different from second place
              const priceDiff = Math.abs(winner.price - secondPlace.price);
              const relativeDiff = priceDiff / Math.min(winner.price, secondPlace.price);

              if (relativeDiff > 0.5) { // More than 50% difference
                console.log(`Large price difference detected (${(relativeDiff * 100).toFixed(1)}%), checking context...`);

                // In case of large differences, prefer the one with better source
                if (secondPlace.source === 'core_price' && winner.source !== 'core_price') {
                  console.log(`Switching to second place due to better source reliability`);
                  return secondPlace.price;
                }
              }
            }

            console.log(`🎯 ULTIMATE SELECTION: $${winner.price} (${winner.source}, score: ${winner.finalScore.toFixed(1)})`);
            return winner.price;
          }

          return null;
        });

        if (ultimatePrice !== null) {
          const diff = Math.abs(ultimatePrice - testGpu.expected);
          const isAccurate = diff <= tolerance;
          const accuracy = isAccurate ? '✅ ACCURATE' : `❌ Off by $${diff.toFixed(2)}`;

          console.log(`🎯 ULTIMATE METHOD: $${ultimatePrice} ${accuracy}`);

          if (isAccurate) {
            accurateCount++;
          }
        } else {
          console.log(`🎯 ULTIMATE METHOD: No price found ❌`);
        }

      } catch (error) {
        console.log(`❌ Error testing ${testGpu.gpu.name}: ${error.message}`);
      }

      await page.close();
    }

    // Final analysis
    const totalTests = gpusToTest.length;
    const accuracyPercentage = (accurateCount / totalTests) * 100;

    console.log(`\n\n🚀 ULTIMATE METHOD RESULTS:`);
    console.log('=' .repeat(60));
    console.log(`Accuracy: ${accuracyPercentage.toFixed(1)}% (${accurateCount}/${totalTests})`);

    if (accuracyPercentage > 88.9) {
      console.log(`🎉 BREAKTHROUGH! Ultimate method beats 88.9% by ${(accuracyPercentage - 88.9).toFixed(1)} percentage points!`);
      console.log(`🏆 NEW RECORD: ${accuracyPercentage.toFixed(1)}% accuracy!`);
    } else if (accuracyPercentage === 88.9) {
      console.log(`⚖️  Ultimate method ties with previous best at 88.9%`);
    } else {
      console.log(`📉 Ultimate method: ${accuracyPercentage.toFixed(1)}% (need ${(88.9 - accuracyPercentage).toFixed(1)} more points)`);
    }

    return accuracyPercentage;

  } catch (error) {
    console.error('❌ Ultimate testing failed:', error);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// Run the test
if (require.main === module) {
  testUltimateMethod()
    .then(() => {
      console.log('\n✨ Ultimate method testing completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Ultimate testing failed:', error);
      process.exit(1);
    });
}

module.exports = { testUltimateMethod };