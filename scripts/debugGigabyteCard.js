const puppeteer = require('puppeteer');

async function debugGigabyteCard() {
  console.log('🔍 DEBUGGING GIGABYTE CARD SPECIFICALLY\n');

  const cardUrl = 'https://amazon.com/GIGABYTE-MAX-Covered-GV-R69XTAORUS-M-16GD-REV2-0/dp/B09QHW1BZV';

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');

    await page.goto(cardUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(4000);

    const analysis = await page.evaluate(() => {
      const result = {
        productId: '',
        addToCartButton: null,
        primaryButton: null,
        primaryButtonText: '',
        currentlyUnavailableText: false,
        seeAllBuyingText: false,
        submitFeedbackButton: false,
        buyBoxPresent: false,
        availabilitySection: null,
        bodyText: '',
        priceElements: [],
        debug: []
      };

      // Get product ID
      const currentUrl = window.location.href;
      const productIdMatch = currentUrl.match(/\/dp\/([A-Z0-9]{10})/);
      result.productId = productIdMatch ? productIdMatch[1] : '';

      // Body text analysis
      const bodyText = document.body.textContent.toLowerCase();
      result.bodyText = bodyText.substring(0, 500) + '...';
      result.currentlyUnavailableText = bodyText.includes('currently unavailable');
      result.seeAllBuyingText = bodyText.includes('see all buying options');

      // Button analysis
      const addToCartButton = document.querySelector('#add-to-cart-button, input[name="submit.add-to-cart"]');
      result.addToCartButton = !!addToCartButton;

      const primaryButton = document.querySelector('#add-to-cart-button, .a-button-primary, [data-action="see-all-buying-options"]');
      if (primaryButton) {
        result.primaryButtonText = primaryButton.textContent.trim();
      }

      result.submitFeedbackButton = result.primaryButtonText.toLowerCase().includes('submit feedback');

      // Buy box
      result.buyBoxPresent = !!(
        document.querySelector('#buybox') ||
        document.querySelector('#rightCol') ||
        document.querySelector('#desktop_buybox')
      );

      // Availability section
      const availabilityElement = document.querySelector('#availability span, #availability .a-size-medium');
      if (availabilityElement) {
        result.availabilitySection = availabilityElement.textContent.trim();
      }

      // Price elements (checking if any are found)
      const priceSelectors = [
        '#attach-base-product-price',
        '#twister-plus-price-data-price',
        '.a-offscreen',
        '.aok-offscreen'
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
              value: value
            });
          }
        }
      }

      // Debug info
      result.debug.push(`Product ID: ${result.productId}`);
      result.debug.push(`Add to Cart: ${result.addToCartButton}`);
      result.debug.push(`Primary Button: "${result.primaryButtonText}"`);
      result.debug.push(`Currently Unavailable: ${result.currentlyUnavailableText}`);
      result.debug.push(`See All Buying: ${result.seeAllBuyingText}`);
      result.debug.push(`Submit Feedback: ${result.submitFeedbackButton}`);
      result.debug.push(`Price Elements: ${result.priceElements.length}`);

      return result;
    });

    console.log('📊 DETAILED DEBUG ANALYSIS:');
    console.log('=' .repeat(50));
    console.log(`🆔 Product ID: ${analysis.productId}`);
    console.log(`🛒 Add to Cart Button: ${analysis.addToCartButton ? '✅ Present' : '❌ Missing'}`);
    console.log(`🔘 Primary Button Text: "${analysis.primaryButtonText || 'Not found'}"`);
    console.log(`📍 Submit Feedback Button: ${analysis.submitFeedbackButton ? '✅ Found' : '❌ Not Found'}`);
    console.log(`⚠️ Currently Unavailable Text: ${analysis.currentlyUnavailableText ? '✅ Found' : '❌ Not Found'}`);
    console.log(`🛍️ See All Buying Text: ${analysis.seeAllBuyingText ? '✅ Found' : '❌ Not Found'}`);
    console.log(`🛒 Buy Box Present: ${analysis.buyBoxPresent ? '✅ Yes' : '❌ No'}`);
    console.log(`📍 Availability Section: "${analysis.availabilitySection || 'Not found'}"`);
    console.log(`💰 Price Elements Found: ${analysis.priceElements.length}`);

    if (analysis.priceElements.length > 0) {
      console.log(`\\n💰 PRICE ELEMENTS (First 3):`);
      analysis.priceElements.slice(0, 3).forEach((price, i) => {
        console.log(`   ${i + 1}. ${price.selector}: $${price.price} ("${price.text || price.value}")`);
      });
    }

    console.log(`\\n🔍 DEBUG INFO:`);
    analysis.debug.forEach(info => {
      console.log(`   • ${info}`);
    });

    // Determine what should happen
    console.log(`\\n🎯 EXPECTED BEHAVIOR ANALYSIS:`);

    if (analysis.currentlyUnavailableText) {
      console.log(`✅ METHOD 1 SHOULD TRIGGER: Currently unavailable text found`);
    }

    if (!analysis.addToCartButton && analysis.seeAllBuyingText) {
      console.log(`✅ METHOD 2 SHOULD TRIGGER: No Add to Cart + See All Buying`);
    }

    if (!analysis.addToCartButton && analysis.submitFeedbackButton) {
      console.log(`✅ METHOD 3 SHOULD TRIGGER: Submit Feedback + No Add to Cart`);
    }

    if (!analysis.addToCartButton && !analysis.primaryButtonText) {
      console.log(`✅ METHOD 4 SHOULD TRIGGER: No buttons found`);
    }

    const shouldBeUnavailable = analysis.currentlyUnavailableText ||
                               (!analysis.addToCartButton && analysis.seeAllBuyingText) ||
                               (!analysis.addToCartButton && analysis.submitFeedbackButton) ||
                               (!analysis.addToCartButton && !analysis.primaryButtonText);

    console.log(`\\n🎯 FINAL DETERMINATION: Product should be ${shouldBeUnavailable ? '❌ UNAVAILABLE' : '✅ AVAILABLE'}`);

  } catch (error) {
    console.error('❌ Debug failed:', error);
  } finally {
    if (browser) {
      await browser.close();
    }
  }

  process.exit(0);
}

debugGigabyteCard().catch(console.error);