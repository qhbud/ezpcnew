const puppeteer = require('puppeteer');
const colors = require('colors');

/**
 * RiverSearch Price Detection
 * Advanced price detection system that uses multiple strategies
 * to accurately find prices on Amazon product pages
 */

class RiverSearchPriceDetector {
  constructor() {
    this.browser = null;
    this.page = null;
  }

  async initialize() {
    this.browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu'
      ]
    });
    this.page = await this.browser.newPage();

    // Set user agent to avoid detection (same as priceUpdater)
    await this.page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    // Set viewport
    await this.page.setViewport({ width: 1920, height: 1080 });

    console.log('✅ Browser initialized');
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
    }
  }

  async cleanup() {
    // Alias for close() - used by the price updater script
    await this.close();
  }

  /**
   * Reinitialize browser after system sleep/wake or connection loss
   */
  async reinitialize() {
    console.log('⚠️  Browser connection lost, reinitializing...'.yellow);

    try {
      // Close existing browser if it exists
      if (this.browser) {
        try {
          await this.browser.close();
        } catch (e) {
          // Ignore errors when closing broken browser
        }
      }

      // Reinitialize
      await this.initialize();
      console.log('✅ Browser reinitialized successfully'.green);
    } catch (error) {
      console.log('❌ Failed to reinitialize browser:'.red, error.message);
      throw error;
    }
  }

  /**
   * Helper function to add random human-like delay
   */
  async randomDelay(min, max) {
    const delay = Math.floor(Math.random() * (max - min + 1)) + min;
    await this.page.waitForTimeout(delay);
  }

  /**
   * RiverSearch Price Detection Algorithm with Retry Logic
   * Focuses on finding the actual displayed price using visual hierarchy
   */
  async detectPrice(url, retryCount = 0) {
    const maxRetries = 2;

    try {
      console.log(`\n🌊 RiverSearch: Analyzing ${url}${retryCount > 0 ? ` (Retry ${retryCount}/${maxRetries})` : ''}`);

      // Longer timeout and more patient navigation
      await this.page.goto(url, {
        waitUntil: ['domcontentloaded', 'networkidle2'],
        timeout: 120000  // Increased from 60s to 120s
      });

      // Check for and dismiss any Amazon popups/modals
      try {
        // Wait a bit for any modals to appear
        await this.randomDelay(1000, 2000);

        // Try multiple common selectors for "Continue Shopping" and similar buttons
        const buttonSelectors = [
          'input[name="continueShopping"]',
          'button[name="continueShopping"]',
          'a[data-csa-c-content-id="continue_shopping"]',
          '#nav-cart-flyout-continue-shopping',
          'input[aria-labelledby="attachSiNoCoverage-announce"]', // "No thanks" for warranties
          '#attachSiNoCoverage', // Alternative warranty decline
          'input[value="No thanks"]',
          'button.a-button-close' // Generic close button for modals
        ];

        let buttonClicked = false;

        // First, try specific selectors
        for (const selector of buttonSelectors) {
          try {
            const button = await this.page.$(selector);
            if (button) {
              const isVisible = await this.page.evaluate(el => {
                const rect = el.getBoundingClientRect();
                return rect.width > 0 && rect.height > 0;
              }, button);

              if (isVisible) {
                console.log(`🛒 Found button with selector: ${selector}, clicking...`.cyan);
                await button.click();
                await this.randomDelay(2000, 3000); // Wait for navigation after click
                console.log('✅ Clicked button successfully'.green);
                buttonClicked = true;
                break;
              }
            }
          } catch (e) {
            // Try next selector
            continue;
          }
        }

        // If no specific selector worked, search for buttons by text content
        if (!buttonClicked) {
          try {
            const continueButton = await this.page.evaluateHandle(() => {
              const buttons = Array.from(document.querySelectorAll('button, input[type="submit"], a'));
              return buttons.find(btn => {
                const text = btn.textContent || btn.value || '';
                return text.toLowerCase().includes('continue shopping') ||
                       text.toLowerCase().includes('continue') && text.toLowerCase().includes('shop');
              });
            });

            if (continueButton && continueButton.asElement()) {
              const isVisible = await this.page.evaluate(el => {
                const rect = el.getBoundingClientRect();
                return rect.width > 0 && rect.height > 0;
              }, continueButton);

              if (isVisible) {
                console.log(`🛒 Found "Continue shopping" button by text, clicking...`.cyan);
                await continueButton.asElement().click();
                await this.randomDelay(2000, 3000);
                console.log('✅ Clicked button successfully'.green);
                buttonClicked = true;
              }
            }
          } catch (e) {
            // Continue if text search fails
          }
        }

        if (!buttonClicked) {
          console.log('ℹ️  No popup buttons found'.gray);
        }
      } catch (e) {
        // Error handling popups, continue anyway
        console.log('ℹ️  Error checking for popups, continuing...'.gray);
      }

      // Wait for dynamic content to load with random delay
      await this.randomDelay(3000, 5000);  // Increased from 2s to 3-5s random

      // Simulate human behavior - scroll down a bit
      await this.page.evaluate(() => {
        window.scrollBy(0, 150);
      });

      await this.randomDelay(1000, 2000);  // Random delay instead of fixed 500ms

      // Scroll up slightly (human behavior)
      await this.page.evaluate(() => {
        window.scrollBy(0, -50);
      });

      await this.randomDelay(500, 1000);

      // Wait for price elements to be present with longer timeout
      try {
        await this.page.waitForSelector('.a-price, #corePriceDisplay_desktop_feature_div, #apex_desktop', {
          timeout: 15000  // Increased from 10s to 15s
        });
      } catch (e) {
        console.log('⚠️ Price elements not found, continuing anyway...');

        // Save debug screenshot to help diagnose the issue
        try {
          const timestamp = Date.now();
          const debugPath = `./debug_screenshots/price_not_found_${timestamp}.png`;
          await this.page.screenshot({ path: debugPath, fullPage: false });
          console.log(`📸 Debug screenshot saved: ${debugPath}`.gray);
        } catch (screenshotError) {
          // Ignore screenshot errors
        }
      }

      // Additional wait for JavaScript execution with random delay
      await this.randomDelay(2500, 4000);  // Increased from 2s to 2.5-4s random

      const result = await this.page.evaluate(() => {
        const results = {
          success: false,
          currentPrice: null,
          basePrice: null,
          salePrice: null,
          isOnSale: false,
          detectionMethod: 'RiverSearch',
          isAvailable: true,
          unavailabilityReason: null,
          imageUrl: null,
          debugInfo: []
        };

        // Extract product image
        const imageSelectors = [
          '#landingImage',
          '#imgBlkFront',
          '#main-image',
          '.a-dynamic-image'
        ];

        for (const selector of imageSelectors) {
          const img = document.querySelector(selector);
          if (img && img.src) {
            results.imageUrl = img.src;
            results.debugInfo.push(`Found image via ${selector}`);
            break;
          }
        }

        // Helper function to extract numeric price
        function extractPrice(text) {
          if (!text) return null;

          // Filter out unit prices (e.g., "$2,156.22 / kg", "($1,833.33/100 g)")
          // These are not product prices
          const lowerText = text.toLowerCase();
          const unitPricePatterns = [
            '/kg', '/ kg',
            '/g', '/ g',
            '/100g', '/ 100g', '/ 100 g',
            '/oz', '/ oz',
            '/lb', '/ lb',
            '/count', '/ count',
            'per kg', 'per g', 'per 100g', 'per oz', 'per lb', 'per count'
          ];

          for (const pattern of unitPricePatterns) {
            if (lowerText.includes(pattern)) {
              return null; // This is a unit price, not a product price
            }
          }

          const cleaned = text.replace(/[^0-9.]/g, '');
          const price = parseFloat(cleaned);
          return (price && price >= 5 && price <= 15000) ? price : null;
        }

        // STRATEGY 1: Look for the main price display area (corePriceDisplay)
        const corePriceDisplay = document.getElementById('corePriceDisplay_desktop_feature_div');
        if (corePriceDisplay) {
          results.debugInfo.push('Found corePriceDisplay area');

          // Try multiple methods to get the price
          // Method 1a: .a-price-whole + .a-price-fraction
          const priceWhole = corePriceDisplay.querySelector('.a-price-whole');
          const priceFraction = corePriceDisplay.querySelector('.a-price-fraction');

          if (priceWhole) {
            const wholeText = priceWhole.textContent.trim().replace(/[^0-9]/g, '');
            const fractionText = priceFraction ? priceFraction.textContent.trim().replace(/[^0-9]/g, '') : '00';
            const fullPrice = `${wholeText}.${fractionText}`;
            const price = extractPrice(fullPrice);

            if (price) {
              results.currentPrice = price;
              results.basePrice = price;
              results.success = true;
              results.debugInfo.push(`Found price via corePriceDisplay whole+fraction: $${price}`);

              // Check for strikethrough/list price to determine if on sale
              // Look for list price elements but filter out unit prices
              const listPriceElements = corePriceDisplay.querySelectorAll('.a-price.a-text-price .a-offscreen, .a-text-strike, span:has(> .a-text-strike)');

              for (const listPriceElement of listPriceElements) {
                const originalPriceText = listPriceElement.textContent;
                const originalPrice = extractPrice(originalPriceText);

                // Only consider it a sale if:
                // 1. The price was extracted successfully (not a unit price)
                // 2. The original price is higher than current price
                // 3. The difference is reasonable (not more than 50% off to avoid unit price confusion)
                if (originalPrice && originalPrice > price && originalPrice < price * 2) {
                  results.basePrice = originalPrice;
                  results.salePrice = price;
                  results.isOnSale = true;
                  results.debugInfo.push(`Sale detected: was $${originalPrice}, now $${price}`);
                  break;
                }
              }
              return results;
            }
          }

          // Method 1b: Look for .a-offscreen price
          const offscreenPrice = corePriceDisplay.querySelector('.a-price .a-offscreen');
          if (offscreenPrice) {
            const price = extractPrice(offscreenPrice.textContent);
            if (price) {
              results.currentPrice = price;
              results.basePrice = price;
              results.success = true;
              results.debugInfo.push(`Found price via corePriceDisplay offscreen: $${price}`);
              return results;
            }
          }
        }

        // STRATEGY 2: Look for buybox price
        const buyboxPrice = document.querySelector('#apex_desktop .a-price-whole, #buybox .a-price-whole');
        if (buyboxPrice) {
          const buyboxFraction = buyboxPrice.parentElement.querySelector('.a-price-fraction');
          const wholeText = buyboxPrice.textContent.trim();
          const fractionText = buyboxFraction ? buyboxFraction.textContent.trim().replace('.', '') : '00';
          const fullPrice = `${wholeText}.${fractionText}`;
          const price = extractPrice(fullPrice);

          if (price) {
            results.currentPrice = price;
            results.basePrice = price;
            results.success = true;
            results.debugInfo.push(`Found price via buybox: $${price}`);
            return results;
          }
        }

        // STRATEGY 3: Look for price in structured data (JSON-LD)
        const jsonLdScripts = document.querySelectorAll('script[type="application/ld+json"]');
        for (const script of jsonLdScripts) {
          try {
            const data = JSON.parse(script.textContent);
            if (data.offers && data.offers.price) {
              const price = parseFloat(data.offers.price);
              if (price && price >= 5 && price <= 15000) {
                results.currentPrice = price;
                results.basePrice = price;
                results.success = true;
                results.debugInfo.push(`Found price via JSON-LD: $${price}`);
                return results;
              }
            }
          } catch (e) {
            // Skip invalid JSON
          }
        }

        // STRATEGY 4: Look for hidden price inputs
        const hiddenPriceSelectors = [
          '#attach-base-product-price',
          'input[name="displayPrice"]',
          'input[id*="price"]'
        ];

        for (const selector of hiddenPriceSelectors) {
          const element = document.querySelector(selector);
          if (element && element.value) {
            const price = extractPrice(element.value);
            if (price) {
              results.currentPrice = price;
              results.basePrice = price;
              results.success = true;
              results.debugInfo.push(`Found price via hidden input ${selector}: $${price}`);
              return results;
            }
          }
        }

        // STRATEGY 5: Look for any .a-price element in the main content
        const allPrices = document.querySelectorAll('.a-price');
        const validPrices = [];

        for (const priceElement of allPrices) {
          // Skip if in carousel or sponsored section
          let parent = priceElement.parentElement;
          let isInCarousel = false;

          while (parent && parent !== document.body) {
            const className = parent.className || '';
            const id = parent.id || '';
            if (className.includes('carousel') ||
                className.includes('sponsored') ||
                id.includes('CardInstance')) {
              isInCarousel = true;
              break;
            }
            parent = parent.parentElement;
          }

          if (isInCarousel) continue;

          const wholeElement = priceElement.querySelector('.a-price-whole');
          const fractionElement = priceElement.querySelector('.a-price-fraction');

          if (wholeElement) {
            const wholeText = wholeElement.textContent.trim();
            const fractionText = fractionElement ? fractionElement.textContent.trim().replace('.', '') : '00';
            const fullPrice = `${wholeText}.${fractionText}`;
            const price = extractPrice(fullPrice);

            if (price) {
              validPrices.push(price);
            }
          }
        }

        // Use the first valid price found
        if (validPrices.length > 0) {
          results.currentPrice = validPrices[0];
          results.basePrice = validPrices[0];
          results.success = true;
          results.debugInfo.push(`Found price via .a-price scan: $${validPrices[0]}`);

          // IMPORTANT: Verify the product is actually purchasable
          // Check for Add to Cart button or buy options
          const addToCartButton = document.querySelector('#add-to-cart-button, input[name="submit.add-to-cart"], #buy-now-button');
          const addToCartText = addToCartButton ? addToCartButton.textContent.toLowerCase() : '';

          // Check if button exists and is not disabled
          const isAddToCartDisabled = addToCartButton ? addToCartButton.disabled || addToCartButton.getAttribute('disabled') !== null : true;

          // Check for availability messages
          const availabilitySection = document.getElementById('availability') || document.querySelector('#availability_feature_div');
          const availText = availabilitySection ? availabilitySection.textContent.toLowerCase() : '';
          const isUnavailableMsg = availText.includes('currently unavailable') || availText.includes('unavailable');

          results.debugInfo.push(`Add to Cart button: ${addToCartButton ? 'Found' : 'Not found'}`);
          results.debugInfo.push(`Button disabled: ${isAddToCartDisabled}`);
          results.debugInfo.push(`Unavailable message: ${isUnavailableMsg ? 'Yes' : 'No'}`);

          // If no working buy button OR unavailable message, mark as unavailable despite finding price
          if (!addToCartButton || isAddToCartDisabled || isUnavailableMsg) {
            results.debugInfo.push(`⚠️ Price found but no buy option - marking as unavailable`);
            results.isAvailable = false;
            results.unavailabilityReason = 'No purchase option available';
            results.currentPrice = null;
            results.basePrice = null;
            results.success = true;
            return results;
          }

          return results;
        }

        // If we reach here, no price was found - check if product is truly unavailable
        // Only mark as unavailable if we find specific unavailability indicators in the buybox area
        const availabilitySection = document.getElementById('availability') ||
                                    document.getElementById('outOfStock') ||
                                    document.querySelector('#availability_feature_div');

        if (availabilitySection) {
          const availText = availabilitySection.textContent.toLowerCase();
          if (availText.includes('currently unavailable') ||
              availText.includes('out of stock') ||
              availText.includes('unavailable')) {
            results.isAvailable = false;
            results.unavailabilityReason = 'Product unavailable';
            results.success = true;
            results.debugInfo.push('Product is unavailable - no price and unavailability indicator found');
            return results;
          }
        }

        // Check for "Currently unavailable" in the product title area or main buybox
        const buyboxArea = document.getElementById('apex_desktop') ||
                          document.getElementById('buybox') ||
                          document.getElementById('centerCol');

        if (buyboxArea) {
          const buyboxText = buyboxArea.textContent;
          // Look for the specific unavailability message near where price should be
          if (buyboxText.includes('Currently unavailable')) {
            // Double-check we're not in a carousel or recommendation
            const unavailableElement = Array.from(buyboxArea.querySelectorAll('*')).find(el =>
              el.textContent.includes('Currently unavailable') &&
              !el.closest('[class*="carousel"]') &&
              !el.closest('[id*="CardInstance"]')
            );

            if (unavailableElement) {
              results.isAvailable = false;
              results.unavailabilityReason = 'Currently unavailable';
              results.success = true;
              results.debugInfo.push('Product is unavailable - unavailability message in buybox');
              return results;
            }
          }
        }

        // FINAL CHECK: If no price found, check for buy button availability
        // If there's no buy button either, product is likely unavailable
        const addToCartButton = document.querySelector('#add-to-cart-button, input[name="submit.add-to-cart"], #buy-now-button');
        const isAddToCartDisabled = addToCartButton ? (addToCartButton.disabled || addToCartButton.getAttribute('disabled') !== null) : true;

        results.debugInfo.push(`Final check - Add to Cart button: ${addToCartButton ? 'Found' : 'Not found'}`);
        results.debugInfo.push(`Final check - Button disabled: ${isAddToCartDisabled}`);

        // If no price AND (no buy button OR button is disabled), mark as unavailable
        if (!addToCartButton || isAddToCartDisabled) {
          results.isAvailable = false;
          results.unavailabilityReason = 'No price found and no purchase option available';
          results.success = true;
          results.debugInfo.push('Product marked as unavailable - no price and no buy button');
          return results;
        }

        // No price found and no clear unavailability indicator
        results.debugInfo.push('No price found with any strategy and no clear unavailability indicator');
        return results;
      });

      return result;

    } catch (error) {
      console.error(`❌ RiverSearch error: ${error.message}`);

      // Check if this is a browser connection error (system sleep/wake)
      const connectionErrors = [
        'Requesting main frame too early',
        'Navigating frame was detached',
        'Session closed',
        'Target closed',
        'Protocol error',
        'Connection closed'
      ];

      const isBrowserConnectionError = connectionErrors.some(err =>
        error.message.includes(err)
      );

      if (isBrowserConnectionError) {
        console.log('🔄 Detected browser connection loss, attempting to recover...'.yellow);

        try {
          // Reinitialize the browser
          await this.reinitialize();

          // Retry immediately after reinitializing (don't count against retry limit)
          console.log('🔄 Retrying after browser reinitialization...'.cyan);
          return this.detectPrice(url, retryCount);
        } catch (reinitError) {
          console.error('❌ Failed to recover from browser connection loss:'.red, reinitError.message);
          // Fall through to normal retry logic
        }
      }

      // Retry logic with exponential backoff
      if (retryCount < maxRetries) {
        const waitTime = Math.pow(2, retryCount) * 3000; // 3s, 6s, 12s
        console.log(`⏳ Waiting ${waitTime / 1000}s before retry...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));

        // Retry the request
        return this.detectPrice(url, retryCount + 1);
      }

      // Max retries reached, return error
      return {
        success: false,
        currentPrice: null,
        error: error.message,
        detectionMethod: 'RiverSearch',
        isAvailable: true,
        unavailabilityReason: null,
        debugInfo: [`Error after ${maxRetries} retries: ${error.message}`]
      };
    }
  }
}

module.exports = { RiverSearchPriceDetector };
