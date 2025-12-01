const puppeteer = require('puppeteer');

async function analyzeProblemCards() {
  console.log('🔍 ANALYZING SPECIFIC PROBLEM CARDS\n');

  const problemCards = [
    {
      name: 'GIGABYTE AORUS RX 6900 XT Master (should be unavailable)',
      url: 'https://amazon.com/GIGABYTE-MAX-Covered-GV-R69XTAORUS-M-16GD-REV2-0/dp/B09QHW1BZV',
      productId: 'B09QHW1BZV',
      storedPrice: 2819.00,
      issue: 'Should be unavailable but shows $2819'
    },
    {
      name: 'EVGA RTX 3080 XC3 Black (sale detection issue)',
      url: 'https://amazon.com/GeForce-Gaming-10G-P5-3881-KL-Cooling-Renewed/dp/B09PQFX3LM',
      productId: 'B09PQFX3LM',
      storedPrice: 449.99,
      issue: 'Should detect sale -40% $449.99 → $749.00'
    },
    {
      name: 'MSI RTX 5060 Shadow 2X (price detection issue)',
      url: 'https://amazon.com/RTX-5060-8G-2X-Performance/dp/B0F4LP8VH5',
      productId: 'B0F4LP8VH5',
      storedPrice: 319.00,
      issue: 'Should be unavailable/no price listed'
    },
    {
      name: 'MSI RTX 5060 Gaming Trio (sale detection issue)',
      url: 'https://amazon.com/Gaming-Graphics-128-bit-Extreme-Performance/dp/B0F4M8S2C4',
      productId: 'B0F4M8S2C4',
      storedPrice: 329.00,
      issue: 'Should detect sale -22% $329.00 → $419.99'
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
            salePriceElements: [],
            strikethroughPrices: [],
            unavailabilityKeywords: [],
            saleIndicators: []
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

          // Enhanced price element detection
          const priceSelectors = [
            '#priceValue',
            '#attach-base-product-price',
            '#twister-plus-price-data-price',
            '.a-offscreen',
            '.aok-offscreen',
            'span.a-price-whole',
            '.a-price .a-offscreen',
            '#corePriceDisplay_desktop_feature_div .a-offscreen',
            '#corePrice_feature_div .a-offscreen'
          ];

          for (const selector of priceSelectors) {
            const elements = document.querySelectorAll(selector);
            for (const element of elements) {
              const text = element.textContent ? element.textContent.trim() : '';
              const value = element.value || text;
              const price = parseFloat(value.replace(/[^0-9.]/g, ''));

              if (price >= 100 && price <= 5000) {
                result.priceElements.push({
                  selector: selector,
                  price: price,
                  text: text,
                  value: value,
                  parentContext: element.parentElement?.textContent?.substring(0, 100) || ''
                });
              }
            }
          }

          // Enhanced sale/strikethrough detection
          const strikethroughSelectors = [
            '.a-price.a-text-strike .a-offscreen',
            '.a-price-original .a-offscreen',
            '[data-a-strike="true"] .a-offscreen',
            '.a-text-strike',
            '.a-price-basis-strikethrough',
            '.a-text-price .a-text-strike'
          ];

          for (const selector of strikethroughSelectors) {
            const elements = document.querySelectorAll(selector);
            for (const element of elements) {
              const priceText = element.textContent.trim();
              const price = parseFloat(priceText.replace(/[^0-9.]/g, ''));
              if (price >= 100 && price <= 5000) {
                result.strikethroughPrices.push({
                  selector: selector,
                  price: price,
                  text: priceText,
                  parentContext: element.parentElement?.textContent?.substring(0, 100) || ''
                });
              }
            }
          }

          // Sale indicators
          const saleIndicatorSelectors = [
            '.a-badge-text',
            '.a-size-mini .a-color-price',
            '[data-a-color="price"]',
            '.savingsPercentage',
            '.a-color-price'
          ];

          for (const selector of saleIndicatorSelectors) {
            const elements = document.querySelectorAll(selector);
            for (const element of elements) {
              const text = element.textContent.trim();
              if (text.includes('%') || text.includes('Save') || text.includes('List Price')) {
                result.saleIndicators.push({
                  selector: selector,
                  text: text,
                  parentContext: element.parentElement?.textContent?.substring(0, 100) || ''
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
          const sortedPrices = analysis.priceElements.sort((a, b) => a.price - b.price);

          sortedPrices.slice(0, 5).forEach((price, i) => {
            console.log(`   ${i + 1}. ${price.selector}: $${price.price} ("${price.text || price.value}")`);
          });
        } else {
          console.log(`💰 NO PRICE ELEMENTS FOUND`);
        }

        if (analysis.strikethroughPrices.length > 0) {
          console.log(`\n💸 STRIKETHROUGH/ORIGINAL PRICES (${analysis.strikethroughPrices.length}):`);
          analysis.strikethroughPrices.forEach((price, i) => {
            console.log(`   ${i + 1}. ${price.selector}: $${price.price} ("${price.text}")`);
          });
        }

        if (analysis.saleIndicators.length > 0) {
          console.log(`\n🏷️ SALE INDICATORS (${analysis.saleIndicators.length}):`);
          analysis.saleIndicators.slice(0, 3).forEach((indicator, i) => {
            console.log(`   ${i + 1}. ${indicator.selector}: "${indicator.text}"`);
          });
        }

        // Determine what should be done
        const isUnavailable = analysis.unavailabilityKeywords.length > 0 ||
                             (!analysis.addToCartPresent && analysis.primaryButton &&
                              analysis.primaryButton.toLowerCase().includes('see all buying'));

        console.log(`\n🎯 RECOMMENDED STATUS: ${isUnavailable ? '❌ UNAVAILABLE' : '✅ AVAILABLE'}`);

        if (analysis.strikethroughPrices.length > 0 && analysis.priceElements.length > 0) {
          const currentPrice = analysis.priceElements[0]?.price;
          const originalPrice = analysis.strikethroughPrices[0]?.price;
          if (originalPrice > currentPrice) {
            console.log(`🏷️ SALE DETECTED: Was $${originalPrice} → Now $${currentPrice}`);
          }
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

  console.log('\n\n🎯 ANALYSIS COMPLETE - Ready to improve logic');
  process.exit(0);
}

analyzeProblemCards().catch(console.error);