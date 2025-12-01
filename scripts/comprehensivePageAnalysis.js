const puppeteer = require('puppeteer');
const { connectToDatabase, getDatabase } = require('../config/database');

// Comprehensive page analysis to find EXACTLY where correct prices are stored
async function comprehensivePageAnalysis() {
  console.log('🔍 COMPREHENSIVE PAGE ANALYSIS - Finding exact price locations...');

  // Focus on the problematic GPUs where we know the exact expected prices
  const problematicCases = [
    {
      name: "GIGABYTE GeForce RTX 4070 Super WINDFORCE OC 12G",
      expected: 845.98,
      collection: "gpus_rtx_4070_super",
      issue: "Currently detecting $845 instead of $845.98"
    },
    {
      name: "Sparkle Intel Arc A770 ROC OC Edition.*SA770R-16GOC",
      expected: 399.67,
      collection: "gpus_arc_a770",
      issue: "Missing the exact cents .67"
    },
    {
      name: "MSI Gaming GeForce RTX 4070 12GB.*Ventus 2X 12G OC",
      expected: 477.22,
      collection: "gpus_rtx_4070",
      issue: "Currently showing wrong price entirely"
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

    const gpusToAnalyze = [];

    // Find the GPUs in database
    console.log('\n🔍 Finding problematic GPUs...');
    for (const testCase of problematicCases) {
      try {
        const gpu = await db.collection(testCase.collection).findOne({
          name: { $regex: testCase.name, $options: 'i' },
          sourceUrl: { $exists: true, $ne: null }
        });

        if (gpu) {
          gpusToAnalyze.push({
            ...testCase,
            gpu: gpu,
            url: gpu.sourceUrl
          });
          console.log(`✅ Found: ${gpu.name.substring(0, 50)}...`);
          console.log(`   Expected: $${testCase.expected} | Issue: ${testCase.issue}`);
        }
      } catch (error) {
        console.log(`❌ Error finding ${testCase.name}: ${error.message}`);
      }
    }

    // Analyze each problematic GPU page in detail
    for (const gpu of gpusToAnalyze) {
      console.log(`\n\n🔬 DEEP ANALYSIS: ${gpu.gpu.name.substring(0, 50)}...`);
      console.log(`🎯 Looking for: $${gpu.expected}`);
      console.log(`🌐 URL: ${gpu.url}`);
      console.log('=' .repeat(80));

      const page = await browser.newPage();
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');

      try {
        await page.goto(gpu.url, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await page.waitForTimeout(4000); // Extra time for dynamic content

        const analysisResults = await page.evaluate((expectedPrice) => {
          const results = {
            expectedPrice: expectedPrice,
            foundLocations: [],
            allPricesFound: [],
            htmlStructure: [],
            jsonData: [],
            scriptData: []
          };

          console.log(`🔍 Searching entire page for price: $${expectedPrice}`);

          // METHOD 1: Exhaustive text search for the exact price
          console.log('\n📍 METHOD 1: Exhaustive text content search');
          const priceStr = expectedPrice.toString();
          const formattedPrices = [
            priceStr,                    // "845.98"
            `$${priceStr}`,             // "$845.98"
            `${priceStr.replace('.', ',')}`, // "845,98" (European format)
            priceStr.replace('.', ''),   // "84598" (no decimal)
            `USD ${priceStr}`,          // "USD 845.98"
            `${Math.floor(expectedPrice)}.${(expectedPrice % 1).toFixed(2).substring(2)}` // Ensure proper decimal format
          ];

          console.log(`Searching for price variants: ${formattedPrices.join(', ')}`);

          // Search all text nodes
          const walker = document.createTreeWalker(
            document.body,
            NodeFilter.SHOW_TEXT,
            null,
            false
          );

          let textNode;
          while (textNode = walker.nextNode()) {
            const text = textNode.textContent.trim();

            for (const priceVariant of formattedPrices) {
              if (text.includes(priceVariant)) {
                const element = textNode.parentElement;
                results.foundLocations.push({
                  method: 'Text Content Search',
                  price: priceVariant,
                  text: text,
                  tagName: element?.tagName,
                  className: element?.className,
                  id: element?.id,
                  xpath: getXPath(element),
                  innerHTML: element?.innerHTML?.substring(0, 200)
                });
                console.log(`🎯 FOUND "${priceVariant}" in text: "${text.substring(0, 100)}..."`);
              }
            }
          }

          // METHOD 2: All elements containing price patterns
          console.log('\n📍 METHOD 2: Element attribute and content search');
          const allElements = document.querySelectorAll('*');

          for (const element of allElements) {
            // Check element text content
            const textContent = element.textContent || '';
            const innerHTML = element.innerHTML || '';
            const outerHTML = element.outerHTML || '';

            // Check for price in various formats
            const pricePattern = new RegExp(`\\$?${priceStr.replace('.', '\\.')}`, 'g');

            if (pricePattern.test(textContent) || pricePattern.test(innerHTML) || pricePattern.test(outerHTML)) {
              results.foundLocations.push({
                method: 'Element Content Search',
                price: expectedPrice,
                tagName: element.tagName,
                className: element.className,
                id: element.id,
                xpath: getXPath(element),
                textContent: textContent.substring(0, 150),
                innerHTML: innerHTML.substring(0, 200)
              });
              console.log(`🎯 FOUND in ${element.tagName}: "${textContent.substring(0, 100)}..."`);
            }

            // Check element attributes
            for (const attr of element.attributes || []) {
              if (attr.value && attr.value.includes(priceStr)) {
                results.foundLocations.push({
                  method: 'Element Attribute Search',
                  price: expectedPrice,
                  attributeName: attr.name,
                  attributeValue: attr.value,
                  tagName: element.tagName,
                  xpath: getXPath(element)
                });
                console.log(`🎯 FOUND in attribute ${attr.name}="${attr.value}"`);
              }
            }
          }

          // METHOD 3: JSON/LD and structured data search
          console.log('\n📍 METHOD 3: JSON-LD and structured data search');
          const scriptTags = document.querySelectorAll('script[type="application/ld+json"], script[type="application/json"]');

          for (const script of scriptTags) {
            try {
              const jsonData = JSON.parse(script.textContent);
              const jsonStr = JSON.stringify(jsonData);

              if (jsonStr.includes(priceStr)) {
                results.jsonData.push({
                  method: 'JSON-LD Data',
                  price: expectedPrice,
                  jsonContent: jsonStr.substring(0, 500),
                  scriptContent: script.textContent.substring(0, 300)
                });
                console.log(`🎯 FOUND in JSON-LD: ${jsonStr.substring(0, 200)}...`);
              }
            } catch (e) {
              // Not valid JSON, skip
            }
          }

          // METHOD 4: All script tags search
          console.log('\n📍 METHOD 4: JavaScript variables and script search');
          const allScripts = document.querySelectorAll('script');

          for (const script of allScripts) {
            const scriptContent = script.textContent || '';

            if (scriptContent.includes(priceStr)) {
              results.scriptData.push({
                method: 'Script Content',
                price: expectedPrice,
                scriptContent: scriptContent.substring(0, 500),
                hasDataLayer: scriptContent.includes('dataLayer'),
                hasPrice: true
              });
              console.log(`🎯 FOUND in script: ${scriptContent.substring(0, 200)}...`);
            }
          }

          // METHOD 5: Data attributes and hidden content
          console.log('\n📍 METHOD 5: Data attributes and hidden elements');
          const elementsWithData = document.querySelectorAll('[data-price], [data-cost], [data-amount], [data-value]');

          for (const element of elementsWithData) {
            const dataAttrs = {};
            for (const attr of element.attributes) {
              if (attr.name.startsWith('data-')) {
                dataAttrs[attr.name] = attr.value;
                if (attr.value.includes(priceStr)) {
                  results.foundLocations.push({
                    method: 'Data Attribute Search',
                    price: expectedPrice,
                    attributeName: attr.name,
                    attributeValue: attr.value,
                    xpath: getXPath(element)
                  });
                  console.log(`🎯 FOUND in data attribute ${attr.name}="${attr.value}"`);
                }
              }
            }
          }

          // METHOD 6: CSS content and pseudo-elements
          console.log('\n📍 METHOD 6: CSS content search');
          const computedStyles = [];
          for (const element of document.querySelectorAll('*')) {
            try {
              const computed = window.getComputedStyle(element);
              const content = computed.getPropertyValue('content');
              if (content && content !== 'none' && content.includes(priceStr)) {
                results.foundLocations.push({
                  method: 'CSS Content',
                  price: expectedPrice,
                  cssContent: content,
                  xpath: getXPath(element)
                });
                console.log(`🎯 FOUND in CSS content: ${content}`);
              }
            } catch (e) {
              // Skip elements that can't be styled
            }
          }

          // Helper function to get XPath
          function getXPath(element) {
            if (!element) return '';
            if (element.id) return `id("${element.id}")`;
            if (element === document.body) return '/html/body';

            let ix = 0;
            const siblings = element.parentNode ? element.parentNode.childNodes : [];
            for (let i = 0; i < siblings.length; i++) {
              const sibling = siblings[i];
              if (sibling === element) {
                const tagName = element.tagName ? element.tagName.toLowerCase() : 'text()';
                return getXPath(element.parentNode) + '/' + tagName + '[' + (ix + 1) + ']';
              }
              if (sibling.nodeType === 1 && sibling.tagName === element.tagName) {
                ix++;
              }
            }
          }

          // Collect ALL prices found on page for comparison
          const allPriceElements = document.querySelectorAll('*');
          const priceRegex = /\$?[\d,]+\.?\d*/g;

          for (const element of allPriceElements) {
            const text = element.textContent || '';
            const matches = text.match(priceRegex);

            if (matches) {
              for (const match of matches) {
                const price = parseFloat(match.replace(/[^0-9.]/g, ''));
                if (price >= 100 && price <= 5000) {
                  results.allPricesFound.push({
                    price: price,
                    text: match,
                    element: element.tagName,
                    className: element.className,
                    id: element.id,
                    isExactMatch: Math.abs(price - expectedPrice) < 0.01
                  });
                }
              }
            }
          }

          console.log(`\n📊 Analysis complete. Found ${results.foundLocations.length} exact matches for $${expectedPrice}`);
          console.log(`📊 Found ${results.allPricesFound.length} total prices on page`);

          return results;
        }, gpu.expected);

        // Display results
        console.log(`\n\n📊 ANALYSIS RESULTS for $${gpu.expected}:`);
        console.log(`🎯 Exact matches found: ${analysisResults.foundLocations.length}`);

        if (analysisResults.foundLocations.length > 0) {
          console.log('\n🎉 EXACT PRICE LOCATIONS FOUND:');
          analysisResults.foundLocations.forEach((location, i) => {
            console.log(`\n${i + 1}. ${location.method}:`);
            console.log(`   💰 Price: ${location.price}`);
            if (location.xpath) console.log(`   🗺️  XPath: ${location.xpath}`);
            if (location.tagName) console.log(`   🏷️  Tag: ${location.tagName}`);
            if (location.className) console.log(`   📦 Class: ${location.className}`);
            if (location.id) console.log(`   🆔 ID: ${location.id}`);
            if (location.text) console.log(`   📝 Text: "${location.text.substring(0, 100)}..."`);
            if (location.innerHTML) console.log(`   🔍 HTML: "${location.innerHTML.substring(0, 150)}..."`);
            if (location.attributeName) console.log(`   🔧 Attribute: ${location.attributeName}="${location.attributeValue}"`);
          });
        } else {
          console.log('\n❌ No exact matches found. Analyzing nearby prices...');

          // Show closest prices
          const closeMatches = analysisResults.allPricesFound
            .filter(p => Math.abs(p.price - gpu.expected) < 50)
            .sort((a, b) => Math.abs(a.price - gpu.expected) - Math.abs(b.price - gpu.expected))
            .slice(0, 5);

          if (closeMatches.length > 0) {
            console.log('\n🔍 Closest price matches:');
            closeMatches.forEach((match, i) => {
              const diff = Math.abs(match.price - gpu.expected);
              console.log(`   ${i + 1}. $${match.price} (off by $${diff.toFixed(2)}) - ${match.element}.${match.className}`);
            });
          }
        }

        // Show JSON/Script data if found
        if (analysisResults.jsonData.length > 0) {
          console.log('\n📋 JSON DATA containing price:');
          analysisResults.jsonData.forEach((data, i) => {
            console.log(`   ${i + 1}. ${data.method}: ${data.jsonContent.substring(0, 200)}...`);
          });
        }

        if (analysisResults.scriptData.length > 0) {
          console.log('\n💻 SCRIPT DATA containing price:');
          analysisResults.scriptData.forEach((data, i) => {
            console.log(`   ${i + 1}. Found in script: ${data.scriptContent.substring(0, 200)}...`);
          });
        }

      } catch (error) {
        console.log(`❌ Error analyzing ${gpu.gpu.name}: ${error.message}`);
      }

      await page.close();
    }

    console.log('\n\n🎯 COMPREHENSIVE ANALYSIS COMPLETE');
    console.log('=' .repeat(80));
    console.log('Next step: Use the exact XPaths and selectors found above to create');
    console.log('a new detection method that targets the precise price locations.');

  } catch (error) {
    console.error('❌ Comprehensive analysis failed:', error);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// Run the analysis
if (require.main === module) {
  comprehensivePageAnalysis()
    .then(() => {
      console.log('\n✨ Comprehensive page analysis completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Analysis failed:', error);
      process.exit(1);
    });
}

module.exports = { comprehensivePageAnalysis };