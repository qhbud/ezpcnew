const puppeteer = require('puppeteer');
const { connectToDatabase, getDatabase } = require('../config/database');

async function comprehensiveTestCardAnalysis() {
  console.log('🔍 COMPREHENSIVE TEST CARD ANALYSIS - Finding exact price locations...\n');

  // All test cards with expected prices
  const testCards = [
    {
      name: "GIGABYTE GeForce RTX 4070 Super WINDFORCE OC 12G",
      expected: 845.98,
      collection: "gpus_rtx_4070_super"
    },
    {
      name: "MSI Gaming RTX 4070 Super 12G Ventus 2X OC Graphics Card (NVIDIA RTX",
      expected: 499.00,
      collection: "gpus_rtx_4070_super"
    },
    {
      name: "ASRock Intel Arc A770 Graphics Phantom Gaming 16G OC",
      expected: 279.99,
      collection: "gpus_arc_a770"
    },
    {
      name: "Sparkle Intel Arc A770 ROC Luna OC Edition",
      expected: 299.99,
      collection: "gpus_arc_a770"
    },
    {
      name: "GUNNIR Intel Arc A770 Photon 16GB OC GDDR6",
      expected: 330.69,
      collection: "gpus_arc_a770"
    },
    {
      name: "Sparkle Intel Arc A770 ROC OC Edition",
      expected: 399.67,
      collection: "gpus_arc_a770"
    },
    {
      name: "Sparkle Intel Arc A770 Titan OC Edition",
      expected: 369.85,
      collection: "gpus_arc_a770"
    },
    {
      name: "ASUS Dual GeForce RTX™ 4070 EVO OC Edition",
      expected: 469.99,
      collection: "gpus_rtx_4070"
    },
    {
      name: "MSI Gaming GeForce RTX 4070 12GB GDRR6X",
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

    const cardsToAnalyze = [];

    // Find all test cards in database
    console.log('🔍 Finding test cards in database...');
    for (const testCard of testCards) {
      try {
        const gpu = await db.collection(testCard.collection).findOne({
          name: { $regex: testCard.name, $options: 'i' },
          sourceUrl: { $exists: true, $ne: null }
        });

        if (gpu) {
          cardsToAnalyze.push({
            ...testCard,
            gpu: gpu,
            url: gpu.sourceUrl
          });
          console.log(`✅ Found: ${gpu.name.substring(0, 50)}... (Expected: $${testCard.expected})`);
        }
      } catch (error) {
        console.log(`❌ Error finding ${testCard.name}: ${error.message}`);
      }
    }

    console.log(`\n📋 Analyzing ${cardsToAnalyze.length} test cards...\n`);

    // Analyze each card
    for (const card of cardsToAnalyze) {
      console.log(`\n🔬 ANALYZING: ${card.gpu.name.substring(0, 60)}...`);
      console.log(`🎯 Expected Price: $${card.expected}`);
      console.log(`🌐 URL: ${card.url}`);
      console.log('=' .repeat(80));

      const page = await browser.newPage();
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');

      try {
        await page.goto(card.url, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await page.waitForTimeout(4000);

        const analysisResults = await page.evaluate((expectedPrice) => {
          const results = {
            expectedPrice: expectedPrice,
            exactMatches: [],
            nearMatches: [],
            allPricesFound: [],
            hiddenInputs: [],
            jsonElements: [],
            offscreenElements: []
          };

          console.log(`🔍 Searching entire page for price: $${expectedPrice}`);

          // Format expected price for searching
          const priceStr = expectedPrice.toString();
          const priceVariants = [
            priceStr,                    // "477.22"
            `$${priceStr}`,             // "$477.22"
            priceStr.replace('.', ''),   // "47722"
            Math.floor(expectedPrice).toString(), // "477"
            `${Math.floor(expectedPrice)}`        // "477"
          ];

          // METHOD 1: Search all text content for exact price
          console.log('📍 METHOD 1: Exact price text search');
          const walker = document.createTreeWalker(
            document.body,
            NodeFilter.SHOW_TEXT,
            null,
            false
          );

          let textNode;
          while (textNode = walker.nextNode()) {
            const text = textNode.textContent.trim();

            for (const variant of priceVariants) {
              if (text.includes(variant)) {
                const element = textNode.parentElement;
                results.exactMatches.push({
                  method: 'Text Content',
                  text: text,
                  variant: variant,
                  tagName: element?.tagName,
                  className: element?.className,
                  id: element?.id,
                  innerHTML: element?.innerHTML?.substring(0, 200)
                });
              }
            }
          }

          // METHOD 2: Hidden input field search
          console.log('📍 METHOD 2: Hidden input field search');
          const allInputs = document.querySelectorAll('input[type="hidden"], input');
          for (const input of allInputs) {
            if (input.value) {
              const value = input.value;
              for (const variant of priceVariants) {
                if (value.includes(variant)) {
                  results.hiddenInputs.push({
                    id: input.id,
                    name: input.name,
                    value: input.value,
                    type: input.type,
                    className: input.className,
                    matchedVariant: variant
                  });
                }
              }
            }
          }

          // METHOD 3: JSON data search
          console.log('📍 METHOD 3: JSON data search');
          const scriptTags = document.querySelectorAll('script');
          for (const script of scriptTags) {
            const content = script.textContent || '';
            if (content.length > 0) {
              for (const variant of priceVariants) {
                if (content.includes(variant)) {
                  results.jsonElements.push({
                    content: content.substring(0, 500),
                    matchedVariant: variant,
                    scriptType: script.type || 'text/javascript'
                  });
                }
              }
            }
          }

          // METHOD 4: All offscreen elements
          console.log('📍 METHOD 4: Offscreen elements search');
          const offscreenElements = document.querySelectorAll('.aok-offscreen, .a-offscreen');
          for (const element of offscreenElements) {
            const text = element.textContent.trim();
            const price = parseFloat(text.replace(/[^0-9.]/g, ''));

            if (price >= 100 && price <= 5000) {
              const diff = Math.abs(price - expectedPrice);
              results.offscreenElements.push({
                text: text,
                price: price,
                diff: diff,
                isExactMatch: diff < 0.01,
                className: element.className,
                parentId: element.parentElement?.id,
                parentClasses: element.parentElement?.className
              });
            }
          }

          // METHOD 5: Comprehensive price search (all numbers)
          console.log('📍 METHOD 5: All price patterns');
          const allElements = document.querySelectorAll('*');
          for (const element of allElements) {
            const text = element.textContent || '';
            const priceRegex = /\$?[\d,]+\.?\d*/g;
            const matches = text.match(priceRegex);

            if (matches) {
              for (const match of matches) {
                const price = parseFloat(match.replace(/[^0-9.]/g, ''));
                if (price >= 100 && price <= 5000) {
                  const diff = Math.abs(price - expectedPrice);
                  if (diff <= 50) { // Within $50 of expected
                    results.allPricesFound.push({
                      price: price,
                      text: match,
                      diff: diff,
                      isExactMatch: diff < 0.01,
                      isCloseMatch: diff <= 1.0,
                      element: element.tagName,
                      className: element.className,
                      id: element.id
                    });
                  }
                }
              }
            }
          }

          // Sort results by accuracy
          results.allPricesFound.sort((a, b) => a.diff - b.diff);
          results.offscreenElements.sort((a, b) => a.diff - b.diff);

          console.log(`📊 Found ${results.exactMatches.length} exact text matches`);
          console.log(`📊 Found ${results.hiddenInputs.length} hidden input matches`);
          console.log(`📊 Found ${results.jsonElements.length} JSON matches`);
          console.log(`📊 Found ${results.offscreenElements.length} offscreen elements`);
          console.log(`📊 Found ${results.allPricesFound.length} price candidates`);

          return results;
        }, card.expected);

        // Display results
        console.log(`\n📊 ANALYSIS RESULTS:`);

        if (analysisResults.exactMatches.length > 0) {
          console.log(`\n🎯 EXACT TEXT MATCHES (${analysisResults.exactMatches.length}):`);
          analysisResults.exactMatches.slice(0, 5).forEach((match, i) => {
            console.log(`  ${i + 1}. ${match.tagName}.${match.className || 'no-class'}`);
            console.log(`     Text: "${match.text.substring(0, 100)}..."`);
            console.log(`     Matched: "${match.variant}"`);
          });
        }

        if (analysisResults.hiddenInputs.length > 0) {
          console.log(`\n🔒 HIDDEN INPUT MATCHES (${analysisResults.hiddenInputs.length}):`);
          analysisResults.hiddenInputs.forEach((input, i) => {
            console.log(`  ${i + 1}. ID: ${input.id}, Name: ${input.name}`);
            console.log(`     Value: ${input.value}`);
            console.log(`     Matched: "${input.matchedVariant}"`);
          });
        }

        if (analysisResults.offscreenElements.length > 0) {
          console.log(`\n👻 OFFSCREEN ELEMENTS (closest matches):`);
          analysisResults.offscreenElements.slice(0, 5).forEach((elem, i) => {
            const status = elem.isExactMatch ? '🎯 EXACT' : elem.diff <= 1.0 ? '✅ CLOSE' : '⚠️ DISTANT';
            console.log(`  ${i + 1}. ${status} $${elem.price} (diff: $${elem.diff.toFixed(2)})`);
            console.log(`     Text: "${elem.text}"`);
            console.log(`     Parent: ${elem.parentId || 'no-id'}.${elem.parentClasses || 'no-class'}`);
          });
        }

        if (analysisResults.allPricesFound.length > 0) {
          console.log(`\n💰 ALL PRICE CANDIDATES (closest first):`);
          analysisResults.allPricesFound.slice(0, 10).forEach((price, i) => {
            const status = price.isExactMatch ? '🎯 EXACT' : price.isCloseMatch ? '✅ CLOSE' : '⚠️ DISTANT';
            console.log(`  ${i + 1}. ${status} $${price.price} (diff: $${price.diff.toFixed(2)})`);
            console.log(`     Text: "${price.text}" in ${price.element}.${price.className || 'no-class'}`);
          });
        }

        if (analysisResults.jsonElements.length > 0) {
          console.log(`\n📋 JSON/SCRIPT MATCHES (${analysisResults.jsonElements.length}):`);
          analysisResults.jsonElements.slice(0, 3).forEach((json, i) => {
            console.log(`  ${i + 1}. Type: ${json.scriptType}`);
            console.log(`     Content: "${json.content.substring(0, 200)}..."`);
            console.log(`     Matched: "${json.matchedVariant}"`);
          });
        }

      } catch (error) {
        console.log(`❌ Error analyzing ${card.gpu.name}: ${error.message}`);
      }

      await page.close();
    }

    console.log('\n\n🎯 COMPREHENSIVE ANALYSIS COMPLETE');
    console.log('=' .repeat(80));
    console.log('This analysis shows exactly where each price is located on each page.');

  } catch (error) {
    console.error('❌ Analysis failed:', error);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// Run the analysis
if (require.main === module) {
  comprehensiveTestCardAnalysis()
    .then(() => {
      console.log('\n✨ Comprehensive test card analysis completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Analysis failed:', error);
      process.exit(1);
    });
}

module.exports = { comprehensiveTestCardAnalysis };