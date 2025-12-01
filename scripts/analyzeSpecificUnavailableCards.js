const puppeteer = require('puppeteer');

async function analyzeSpecificUnavailableCards() {
  console.log('🔍 ANALYZING THE 2 SPECIFIC CARDS THAT SHOULD BE UNAVAILABLE\n');

  // The exact 2 cards that should show as unavailable
  const specificCards = [
    {
      name: 'MSI Gaming RTX 4070 (Renewed) - SHOULD BE UNAVAILABLE',
      url: 'https://amazon.com/MSI-GeForce-Lovelace-Architecture-Graphics/dp/B0CBQV398S',
      productId: 'B0CBQV398S',
      shouldBeUnavailable: true
    },
    {
      name: 'MSI Gaming RTX 4070 Super Ventus 3X - SHOULD BE UNAVAILABLE',
      url: 'https://amazon.com/MSI-RTX-4070-12G-3X/dp/B0CSHFM3D5',
      productId: 'B0CSHFM3D5',
      shouldBeUnavailable: true
    }
  ];

  // Cards that should be AVAILABLE for comparison
  const availableCards = [
    {
      name: 'GIGABYTE RTX 4070 Super WINDFORCE - SHOULD BE AVAILABLE',
      url: 'https://amazon.com/GIGABYTE-GeForce-WINDFORCE-Graphics-GV-N407SWF3OC-12GD/dp/B0CSJV61BN',
      productId: 'B0CSJV61BN',
      shouldBeUnavailable: false
    },
    {
      name: 'MSI Gaming RTX 4070 (2520 MHz) - SHOULD BE AVAILABLE',
      url: 'https://amazon.com/MSI-GeForce-RTX-4070-12G/dp/B0BZB7DS7Q',
      productId: 'B0BZB7DS7Q',
      shouldBeUnavailable: false
    }
  ];

  const allCards = [...specificCards, ...availableCards];

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    for (const card of allCards) {
      console.log(`\n🔬 ANALYZING: ${card.name}`);
      console.log(`🆔 Product ID: ${card.productId}`);
      console.log(`📋 Expected: ${card.shouldBeUnavailable ? 'UNAVAILABLE' : 'AVAILABLE'}`);
      console.log(`🌐 URL: ${card.url.substring(0, 80)}...`);
      console.log('=' .repeat(80));

      const page = await browser.newPage();
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');

      try {
        await page.goto(card.url, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await page.waitForTimeout(4000);

        const analysis = await page.evaluate(() => {
          const result = {
            availabilitySection: null,
            buyBoxPresent: false,
            primaryButton: null,
            priceElementsFound: [],
            stockMessages: [],
            pageKeywords: []
          };

          // Check availability section specifically
          const availabilityElement = document.querySelector('#availability span, #availability .a-size-medium');
          if (availabilityElement) {
            result.availabilitySection = availabilityElement.textContent.trim();
          }

          // Check buy box presence
          result.buyBoxPresent = !!(
            document.querySelector('#buybox') ||
            document.querySelector('#rightCol') ||
            document.querySelector('#desktop_buybox')
          );

          // Check primary button
          const primaryButton = document.querySelector('#add-to-cart-button, .a-button-primary');
          if (primaryButton) {
            result.primaryButton = primaryButton.textContent.trim();
          }

          // Look for "See All Buying Options" specifically
          const seeAllButton = document.querySelector('a[href*="offer-listing"], a[data-action="see-all-buying-options"]');
          if (seeAllButton) {
            result.primaryButton = 'See All Buying Options (detected)';
          }

          // Check for price elements
          const priceSelectors = ['#priceValue', '#attach-base-product-price', '.a-offscreen'];
          for (const selector of priceSelectors) {
            const elements = document.querySelectorAll(selector);
            for (const element of elements) {
              const text = element.textContent.trim();
              const price = parseFloat(text.replace(/[^0-9.]/g, ''));
              if (price >= 100 && price <= 5000) {
                result.priceElementsFound.push({
                  selector: selector,
                  price: price,
                  text: text
                });
              }
            }
          }

          // Check specific stock-related text
          const stockKeywords = [
            'currently unavailable',
            'out of stock',
            'sold out',
            'temporarily unavailable',
            'see all buying options'
          ];

          const bodyText = document.body.textContent.toLowerCase();
          for (const keyword of stockKeywords) {
            if (bodyText.includes(keyword.toLowerCase())) {
              result.pageKeywords.push(keyword);
            }
          }

          return result;
        });

        console.log(`\n📊 DETAILED ANALYSIS RESULTS:`);
        console.log(`🛒 Buy Box Present: ${analysis.buyBoxPresent ? '✅ YES' : '❌ NO'}`);
        console.log(`📍 Availability Section: "${analysis.availabilitySection || 'Not found'}"`);
        console.log(`🔘 Primary Button: "${analysis.primaryButton || 'Not found'}"`);

        if (analysis.priceElementsFound.length > 0) {
          console.log(`💰 Price Elements Found: ${analysis.priceElementsFound.length}`);
          analysis.priceElementsFound.slice(0, 3).forEach((price, i) => {
            console.log(`   ${i + 1}. ${price.selector}: $${price.price}`);
          });
        } else {
          console.log(`💰 Price Elements Found: NONE`);
        }

        if (analysis.pageKeywords.length > 0) {
          console.log(`⚠️ Stock Keywords Found: ${analysis.pageKeywords.join(', ')}`);
        } else {
          console.log(`⚠️ Stock Keywords Found: NONE`);
        }

        // Determine actual status
        const hasUnavailableKeywords = analysis.pageKeywords.length > 0;
        const hasSeeAllBuyingOptions = analysis.primaryButton && analysis.primaryButton.toLowerCase().includes('see all buying');
        const hasCurrentlyUnavailable = analysis.availabilitySection && analysis.availabilitySection.toLowerCase().includes('currently unavailable');

        const actuallyUnavailable = hasUnavailableKeywords || hasSeeAllBuyingOptions || hasCurrentlyUnavailable;

        console.log(`\n🎯 ACTUAL STATUS: ${actuallyUnavailable ? '❌ UNAVAILABLE' : '✅ AVAILABLE'}`);
        console.log(`🎯 EXPECTED STATUS: ${card.shouldBeUnavailable ? '❌ UNAVAILABLE' : '✅ AVAILABLE'}`);
        console.log(`📊 MATCH: ${actuallyUnavailable === card.shouldBeUnavailable ? '✅ CORRECT' : '❌ MISMATCH'}`);

        if (actuallyUnavailable !== card.shouldBeUnavailable) {
          console.log(`⚠️ MISMATCH DETECTED - Need to adjust detection logic!`);
        }

      } catch (error) {
        console.log(`💥 ERROR: ${error.message}`);
      }

      await page.close();
      await new Promise(resolve => setTimeout(resolve, 3000));
    }

  } catch (error) {
    console.error('❌ Analysis failed:', error);
  } finally {
    if (browser) {
      await browser.close();
    }
  }

  console.log('\n\n🎯 REFINEMENT STRATEGY RECOMMENDATIONS:');
  console.log('Based on the analysis above, we need to identify the exact patterns');
  console.log('that distinguish the 2 unavailable cards from the 6 available ones.');

  process.exit(0);
}

analyzeSpecificUnavailableCards().catch(console.error);