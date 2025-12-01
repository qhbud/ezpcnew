const puppeteer = require('puppeteer');

async function analyzeSpecific4080Issues() {
  console.log('🔍 ANALYZING SPECIFIC RTX 4080 ISSUES\n');

  // The specific cards that need investigation
  const problemCards = [
    {
      name: 'GIGABYTE RTX 4080 WINDFORCE V2 (should find correct price)',
      url: 'https://amazon.com/GIGABYTE-GeForce-WINDFORCE-Graphics-GV-N408SWF3V2-16GD/dp/B0CSK2GHR8',
      productId: 'B0CSK2GHR8',
      storedPrice: 859.00,
      issue: 'Find correct price'
    },
    {
      name: 'GIGABYTE RTX 4080 Eagle OC (should find correct price)',
      url: 'https://amazon.com/Gigabyte-Graphics-WINDFORCE-GV-N4080EAGLE-OC-16GD/dp/B0BLT4ZMGL',
      productId: 'B0BLT4ZMGL',
      storedPrice: 1199.00,
      issue: 'Find correct price'
    },
    {
      name: 'PNY RTX 4080 Super XLR8 Verto (should be unavailable)',
      url: 'https://amazon.com/PNY-GeForce-VertoTM-Overclocked-Graphics/dp/B0D36QHQBX',
      productId: 'B0D36QHQBX',
      storedPrice: 689.00,
      issue: 'Should be unavailable'
    }
  ];

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    for (const card of problemCards) {
      console.log(`\n🔬 ANALYZING: ${card.name}`);
      console.log(`🆔 Product ID: ${card.productId}`);
      console.log(`💰 Stored Price: $${card.storedPrice}`);
      console.log(`🔧 Issue: ${card.issue}`);
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
            addToCartPresent: false,
            priceElements: [],
            unavailabilityKeywords: [],
            stockMessages: []
          };

          // Check availability section
          const availabilityElement = document.querySelector('#availability span, #availability .a-size-medium');
          if (availabilityElement) {
            result.availabilitySection = availabilityElement.textContent.trim();
          }

          // Check buy box and buttons
          result.buyBoxPresent = !!(
            document.querySelector('#buybox') ||
            document.querySelector('#rightCol') ||
            document.querySelector('#desktop_buybox')
          );

          const addToCartButton = document.querySelector('#add-to-cart-button, input[name="submit.add-to-cart"]');
          result.addToCartPresent = !!addToCartButton;

          const primaryButton = document.querySelector('#add-to-cart-button, .a-button-primary, [data-action="see-all-buying-options"]');
          if (primaryButton) {
            result.primaryButton = primaryButton.textContent.trim();
          }

          // Check for price elements
          const priceSelectors = [
            '#priceValue',
            '#attach-base-product-price',
            '#twister-plus-price-data-price',
            '.a-offscreen',
            '.aok-offscreen',
            'span.a-price-whole'
          ];

          for (const selector of priceSelectors) {
            const elements = document.querySelectorAll(selector);
            for (const element of elements) {
              const text = element.textContent.trim();
              const value = element.value || text;
              const price = parseFloat(value.replace(/[^0-9.]/g, ''));

              if (price >= 100 && price <= 5000) {
                result.priceElements.push({
                  selector: selector,
                  price: price,
                  text: text,
                  value: value
                });
              }
            }
          }

          // Check for unavailability keywords
          const bodyText = document.body.textContent.toLowerCase();
          const unavailabilityKeywords = [
            'currently unavailable',
            'out of stock',
            'sold out',
            'temporarily unavailable',
            'see all buying options'
          ];

          for (const keyword of unavailabilityKeywords) {
            if (bodyText.includes(keyword.toLowerCase())) {
              result.unavailabilityKeywords.push(keyword);
            }
          }

          return result;
        });

        console.log(`\n📊 DETAILED ANALYSIS:`);
        console.log(`🛒 Buy Box Present: ${analysis.buyBoxPresent ? '✅ YES' : '❌ NO'}`);
        console.log(`🛒 Add to Cart Present: ${analysis.addToCartPresent ? '✅ YES' : '❌ NO'}`);
        console.log(`📍 Availability Section: "${analysis.availabilitySection || 'Not found'}"`);
        console.log(`🔘 Primary Button: "${analysis.primaryButton || 'Not found'}"`);

        if (analysis.unavailabilityKeywords.length > 0) {
          console.log(`⚠️ Unavailability Keywords: ${analysis.unavailabilityKeywords.join(', ')}`);
        } else {
          console.log(`✅ No unavailability keywords found`);
        }

        if (analysis.priceElements.length > 0) {
          console.log(`\n💰 PRICE ELEMENTS FOUND (${analysis.priceElements.length}):`);
          // Sort by price to find most reasonable one
          const sortedPrices = analysis.priceElements.sort((a, b) => a.price - b.price);

          sortedPrices.slice(0, 5).forEach((price, i) => {
            console.log(`   ${i + 1}. ${price.selector}: $${price.price} ("${price.text || price.value}")`);
          });

          // Find the most likely correct price
          const likelyPrice = sortedPrices.find(p =>
            p.selector === '#attach-base-product-price' ||
            p.selector === '#priceValue' ||
            p.selector === '#twister-plus-price-data-price'
          ) || sortedPrices[0];

          console.log(`\n🎯 MOST LIKELY CORRECT PRICE: $${likelyPrice.price} (from ${likelyPrice.selector})`);
        } else {
          console.log(`💰 NO PRICE ELEMENTS FOUND`);
        }

        // Determine status
        const isUnavailable = analysis.unavailabilityKeywords.length > 0 ||
                             (!analysis.addToCartPresent && analysis.primaryButton &&
                              analysis.primaryButton.toLowerCase().includes('see all buying'));

        console.log(`\n🎯 RECOMMENDED STATUS: ${isUnavailable ? '❌ UNAVAILABLE' : '✅ AVAILABLE'}`);

        if (card.issue === 'Should be unavailable' && !isUnavailable) {
          console.log(`⚠️ MISMATCH: Expected unavailable but appears available`);
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

  console.log('\n\n🎯 RECOMMENDED FIXES:');
  console.log('1. Add B0D36QHQBX to specific unavailable products list');
  console.log('2. Check if GIGABYTE cards have correct price detection');
  console.log('3. Update logic to handle these specific product IDs');

  process.exit(0);
}

analyzeSpecific4080Issues().catch(console.error);