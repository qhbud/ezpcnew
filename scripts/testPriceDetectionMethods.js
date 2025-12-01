const puppeteer = require('puppeteer');
const { connectToDatabase, getDatabase } = require('../config/database');

// Test multiple price detection methods and compare accuracy
async function testPriceDetectionMethods() {
  console.log('🧪 Testing comprehensive price detection methods...');

  let browser;
  try {
    await connectToDatabase();
    const db = getDatabase();

    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    // Get test URLs from database (RTX 4070 Super collection since we know some expected prices)
    const testGpus = await db.collection('gpus_rtx_4070_super').find({
      sourceUrl: { $exists: true, $ne: null }
    }).limit(3).toArray();

    console.log(`\n📋 Testing on ${testGpus.length} GPU URLs:`);
    testGpus.forEach((gpu, i) => {
      console.log(`${i + 1}. ${gpu.name.substring(0, 60)}...`);
      console.log(`   Current stored: $${gpu.currentPrice}`);
      console.log(`   URL: ${gpu.sourceUrl}`);
    });

    const results = [];

    for (const gpu of testGpus) {
      console.log(`\n🔍 Testing: ${gpu.name.substring(0, 50)}...`);
      console.log(`📍 URL: ${gpu.sourceUrl}`);

      const page = await browser.newPage();
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');

      try {
        await page.goto(gpu.sourceUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await page.waitForTimeout(3000);

        const methodResults = await page.evaluate(() => {
          console.log('🔍 Running comprehensive price detection test...');

          const results = [];

          // Method 1: Core Price Display (your specific example)
          console.log('\n📍 Method 1: Core Price Display');
          const corePriceSelectors = [
            '#corePriceDisplay_desktop_feature_div .aok-offscreen',
            '#corePriceDisplay_desktop_feature_div span.aok-offscreen',
            '#corePriceDisplay_desktop_feature_div > div.a-section.a-spacing-none.aok-align-center.aok-relative > span.aok-offscreen',
            '[data-feature-name="corePrice"] .a-offscreen'
          ];

          let corePrices = [];
          for (const selector of corePriceSelectors) {
            const elements = document.querySelectorAll(selector);
            console.log(`   ${selector}: ${elements.length} elements`);
            for (let i = 0; i < elements.length; i++) {
              const text = elements[i].textContent.trim();
              const price = parseFloat(text.replace(/[^0-9.]/g, ''));
              if (price >= 100 && price <= 5000) {
                corePrices.push({ price, text, selector, index: i });
                console.log(`     Found: $${price} from "${text}"`);
              }
            }
          }

          results.push({
            method: 'Core Price Display',
            prices: corePrices,
            bestPrice: corePrices.length > 0 ? corePrices[0].price : null
          });

          // Method 2: Buy Box Area
          console.log('\n📍 Method 2: Buy Box Area');
          const buyboxSelectors = [
            '#price_inside_buybox .a-offscreen',
            '#buybox .a-price .a-offscreen',
            '#buybox-inner .a-offscreen'
          ];

          let buyboxPrices = [];
          for (const selector of buyboxSelectors) {
            const elements = document.querySelectorAll(selector);
            console.log(`   ${selector}: ${elements.length} elements`);
            for (let i = 0; i < elements.length; i++) {
              const text = elements[i].textContent.trim();
              const price = parseFloat(text.replace(/[^0-9.]/g, ''));
              if (price >= 100 && price <= 5000) {
                buyboxPrices.push({ price, text, selector, index: i });
                console.log(`     Found: $${price} from "${text}"`);
              }
            }
          }

          results.push({
            method: 'Buy Box Area',
            prices: buyboxPrices,
            bestPrice: buyboxPrices.length > 0 ? buyboxPrices[0].price : null
          });

          // Method 3: Current Price Indicators
          console.log('\n📍 Method 3: Current Price Indicators');
          const currentPriceSelectors = [
            '.a-price-current .a-offscreen',
            '[class*="current"] .a-offscreen',
            '[id*="current"] .a-offscreen'
          ];

          let currentPrices = [];
          for (const selector of currentPriceSelectors) {
            const elements = document.querySelectorAll(selector);
            console.log(`   ${selector}: ${elements.length} elements`);
            for (let i = 0; i < elements.length; i++) {
              const text = elements[i].textContent.trim();
              const price = parseFloat(text.replace(/[^0-9.]/g, ''));
              if (price >= 100 && price <= 5000) {
                currentPrices.push({ price, text, selector, index: i });
                console.log(`     Found: $${price} from "${text}"`);
              }
            }
          }

          results.push({
            method: 'Current Price Indicators',
            prices: currentPrices,
            bestPrice: currentPrices.length > 0 ? currentPrices[0].price : null
          });

          // Method 4: All .aok-offscreen (with location analysis)
          console.log('\n📍 Method 4: All .aok-offscreen (with location analysis)');
          const allAokElements = document.querySelectorAll('.aok-offscreen');
          console.log(`   Found ${allAokElements.length} .aok-offscreen elements`);

          let allAokPrices = [];
          for (let i = 0; i < allAokElements.length; i++) {
            const el = allAokElements[i];
            const text = el.textContent.trim();
            const price = parseFloat(text.replace(/[^0-9.]/g, ''));

            if (price >= 100 && price <= 5000) {
              // Analyze element location/context
              const rect = el.getBoundingClientRect();
              const parentId = el.parentElement?.id || '';
              const parentClass = el.parentElement?.className || '';
              const ancestorIds = [];
              let ancestor = el.parentElement;
              for (let j = 0; j < 3 && ancestor; j++) {
                if (ancestor.id) ancestorIds.push(ancestor.id);
                ancestor = ancestor.parentElement;
              }

              allAokPrices.push({
                price,
                text,
                index: i,
                position: { top: rect.top, left: rect.left },
                parentId,
                parentClass,
                ancestorIds
              });
              console.log(`     [${i}] $${price} from "${text}" (parent: ${parentId || parentClass.substring(0, 30)})`);
            }
          }

          // Sort by position (top-left first, as main prices are usually prominent)
          allAokPrices.sort((a, b) => a.position.top - b.position.top || a.position.left - b.position.left);

          results.push({
            method: 'All .aok-offscreen (position sorted)',
            prices: allAokPrices,
            bestPrice: allAokPrices.length > 0 ? allAokPrices[0].price : null
          });

          // Method 5: Whole + Decimal combinations
          console.log('\n📍 Method 5: Whole + Decimal combinations');
          const wholeElements = document.querySelectorAll('.a-price-whole');
          console.log(`   Found ${wholeElements.length} .a-price-whole elements`);

          let wholePrices = [];
          for (let i = 0; i < wholeElements.length; i++) {
            const wholeEl = wholeElements[i];
            const decimalEl = wholeEl.parentNode?.querySelector('.a-price-decimal, .a-price-fraction');

            const wholeText = wholeEl.textContent.replace(/[^0-9]/g, '');
            const decimalText = decimalEl ? decimalEl.textContent.replace(/[^0-9]/g, '') : '00';

            if (wholeText) {
              const price = parseFloat(`${wholeText}.${decimalText.padEnd(2, '0').substring(0, 2)}`);
              if (price >= 100 && price <= 5000) {
                const isStrikethrough = wholeEl.closest('.a-text-strike') !== null;
                wholePrices.push({
                  price,
                  text: `${wholeEl.textContent}${decimalEl?.textContent || ''}`,
                  index: i,
                  isStrikethrough
                });
                console.log(`     [${i}] $${price} (strike: ${isStrikethrough})`);
              }
            }
          }

          // Filter out strikethrough prices for best price
          const nonStrikePrices = wholePrices.filter(p => !p.isStrikethrough);

          results.push({
            method: 'Whole + Decimal (non-strikethrough)',
            prices: wholePrices,
            bestPrice: nonStrikePrices.length > 0 ? nonStrikePrices[0].price : null
          });

          return results;
        });

        console.log(`\n📊 Results for ${gpu.name.substring(0, 40)}...:`);
        console.log(`   Current stored price: $${gpu.currentPrice}`);

        methodResults.forEach((result, i) => {
          console.log(`\n   ${i + 1}. ${result.method}:`);
          console.log(`      Best price: ${result.bestPrice ? '$' + result.bestPrice : 'None found'}`);
          console.log(`      Total candidates: ${result.prices.length}`);

          if (result.prices.length > 0) {
            console.log(`      Top 3 candidates:`);
            result.prices.slice(0, 3).forEach((price, j) => {
              console.log(`        ${j + 1}. $${price.price} from "${price.text}"`);
            });
          }
        });

        results.push({
          gpu: gpu.name.substring(0, 50),
          currentStored: gpu.currentPrice,
          url: gpu.sourceUrl,
          methods: methodResults
        });

      } catch (error) {
        console.log(`❌ Error testing ${gpu.name}: ${error.message}`);
      }

      await page.close();
    }

    console.log(`\n\n🎯 COMPREHENSIVE ANALYSIS:`);
    console.log('=' .repeat(80));

    // Analyze which method finds the most consistent results
    const methodStats = {};
    results.forEach(result => {
      result.methods.forEach(method => {
        if (!methodStats[method.method]) {
          methodStats[method.method] = {
            foundPrices: 0,
            totalTests: 0,
            avgCandidates: 0,
            prices: []
          };
        }

        methodStats[method.method].totalTests++;
        if (method.bestPrice) {
          methodStats[method.method].foundPrices++;
          methodStats[method.method].prices.push(method.bestPrice);
        }
        methodStats[method.method].avgCandidates += method.prices.length;
      });
    });

    console.log('\n📊 Method Effectiveness:');
    Object.entries(methodStats).forEach(([methodName, stats]) => {
      const successRate = (stats.foundPrices / stats.totalTests * 100).toFixed(1);
      const avgCandidates = (stats.avgCandidates / stats.totalTests).toFixed(1);
      console.log(`\n${methodName}:`);
      console.log(`   Success rate: ${successRate}% (${stats.foundPrices}/${stats.totalTests})`);
      console.log(`   Avg candidates per test: ${avgCandidates}`);
      if (stats.prices.length > 0) {
        console.log(`   Price range: $${Math.min(...stats.prices)} - $${Math.max(...stats.prices)}`);
      }
    });

    console.log('\n🏆 RECOMMENDATIONS:');
    console.log('1. Test Core Price Display method first (your specific example)');
    console.log('2. Use position-based sorting for .aok-offscreen elements');
    console.log('3. Prioritize non-strikethrough whole+decimal combinations');
    console.log('4. Implement fallback hierarchy based on success rates above');

    return results;

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
  testPriceDetectionMethods()
    .then(() => {
      console.log('\n✨ Price detection testing completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Testing failed:', error);
      process.exit(1);
    });
}

module.exports = { testPriceDetectionMethods };