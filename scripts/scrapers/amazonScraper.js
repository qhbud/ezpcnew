async function scrapePrice(page, url) {
  try {
    console.log(`🔍 Scraping: ${url}`);

    await page.goto(url, {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });

    // Wait for dynamic content
    await page.waitForTimeout(3000);

    const result = await page.evaluate(() => {
      console.log('🎯 PERFECT PRICE DETECTION - Based on comprehensive analysis');

      let finalPrice = null;
      let priceSource = null;

      // STRATEGY 1: Hidden Input Fields (100% Reliable)
      console.log('📍 Strategy 1: Hidden input fields (highest reliability)');
      const hiddenInputSelectors = [
        '#twister-plus-price-data-price',                    // value="845.98"
        '#attach-base-product-price',                        // value="845.98"
        '#items\\[0\\.base\\]\\[customerVisiblePrice\\]\\[amount\\]', // value="845.98"
        'input[name*="customerVisiblePrice"][name*="amount"]', // Fallback pattern
        'input[id*="price-data-price"]'                      // Fallback pattern
      ];

      for (const selector of hiddenInputSelectors) {
        try {
          const element = document.querySelector(selector);
          if (element && element.value) {
            const price = parseFloat(element.value);
            if (price >= 100 && price <= 5000) {
              finalPrice = price;
              priceSource = `Hidden Input: ${selector}`;
              console.log(`🎯 FOUND via hidden input: $${price} (${selector})`);
              break;
            }
          }
        } catch (e) {
          // CSS selector might be complex, continue
        }
      }

      // STRATEGY 2: JSON Data (Very Reliable)
      if (!finalPrice) {
        console.log('📍 Strategy 2: JSON price data');
        const jsonSelectors = [
          '#twisterPlusWWDesktop .twister-plus-buying-options-price-data',
          '.twister-plus-buying-options-price-data',
          '[class*="price-data"]'
        ];

        for (const selector of jsonSelectors) {
          const elements = document.querySelectorAll(selector);
          for (const element of elements) {
            try {
              const jsonText = element.textContent || element.innerHTML;
              if (jsonText && jsonText.includes('priceAmount')) {
                const jsonData = JSON.parse(jsonText);

                // Look for priceAmount in various structures
                const extractPrice = (obj) => {
                  if (typeof obj === 'object' && obj !== null) {
                    if (obj.priceAmount) return obj.priceAmount;
                    if (obj.price) return obj.price;

                    // Recursively search
                    for (const key in obj) {
                      const result = extractPrice(obj[key]);
                      if (result) return result;
                    }
                  }
                  return null;
                };

                const price = extractPrice(jsonData);
                if (price && price >= 100 && price <= 5000) {
                  finalPrice = price;
                  priceSource = `JSON Data: ${selector}`;
                  console.log(`🎯 FOUND via JSON: $${price} (priceAmount: ${price})`);
                  break;
                }
              }
            } catch (e) {
              // Not valid JSON, continue
            }
          }
          if (finalPrice) break;
        }
      }

      // STRATEGY 3: Specific High-Priority .aok-offscreen/.a-offscreen Elements
      if (!finalPrice) {
        console.log('📍 Strategy 3: High-priority offscreen elements');
        const prioritySelectors = [
          // Tier 1: Core price displays (proven most accurate)
          '#corePrice_feature_div .a-offscreen',
          '#corePriceDisplay_desktop_feature_div .aok-offscreen',
          '#tp_price_block_total_price_ww .a-offscreen',
          '#tp-tool-tip-subtotal-price-value .a-offscreen',

          // Tier 2: Buy box areas
          '#buybox .a-price:not(.a-text-strike) .a-offscreen',
          '#price_inside_buybox .a-offscreen',

          // Tier 3: Core price feature variations
          '[data-feature-name="corePrice"] .a-offscreen',
          '#apex_offerDisplay_desktop .a-offscreen'
        ];

        for (const selector of prioritySelectors) {
          const elements = document.querySelectorAll(selector);
          console.log(`   ${selector}: ${elements.length} elements`);

          for (const element of elements) {
            const text = element.textContent.trim();
            const price = parseFloat(text.replace(/[^0-9.]/g, ''));

            if (price >= 100 && price <= 5000) {
              // Additional validation: check it's not in shipping/tax context
              const parentText = (element.parentElement?.textContent || '').toLowerCase();
              const badKeywords = ['shipping', 'tax', 'import', 'handling', 'fee'];
              const hasBadContext = badKeywords.some(keyword => parentText.includes(keyword));

              if (!hasBadContext) {
                finalPrice = price;
                priceSource = `Priority Offscreen: ${selector}`;
                console.log(`🎯 FOUND via priority offscreen: $${price} from "${text}"`);
                break;
              }
            }
          }
          if (finalPrice) break;
        }
      }

      // STRATEGY 4: Enhanced Core Price with variations (High Reliability)
      if (!finalPrice) {
        console.log('📍 Strategy 4: Enhanced core price variations');
        const enhancedCoreSelectors = [
          '#corePrice_feature_div .a-offscreen',
          '#corePriceDisplay_desktop_feature_div .aok-offscreen',
          '#tp_price_block_total_price_ww .a-offscreen',
          '#priceblock_ourprice .a-offscreen',
          '#priceblock_dealprice .a-offscreen',
          '#apex_offerDisplay_desktop .a-offscreen',
          '.a-price.a-price-current .a-offscreen'
        ];

        for (const selector of enhancedCoreSelectors) {
          const elements = document.querySelectorAll(selector);
          for (const element of elements) {
            const text = element.textContent.trim();
            const price = parseFloat(text.replace(/[^0-9.]/g, ''));

            if (price >= 100 && price <= 5000) {
              // Additional validation: check it's not in shipping/tax context
              const parentText = (element.parentElement?.textContent || '').toLowerCase();
              const badKeywords = ['shipping', 'tax', 'import', 'handling', 'fee', 'list price', 'was'];
              const hasBadContext = badKeywords.some(keyword => parentText.includes(keyword));

              if (!hasBadContext) {
                finalPrice = price;
                priceSource = `Enhanced Core Price: ${selector}`;
                console.log(`🎯 FOUND via enhanced core: $${price} from "${text}"`);
                break;
              }
            }
          }
          if (finalPrice) break;
        }
      }

      // STRATEGY 5: Data Attribute Search (Backup)
      if (!finalPrice) {
        console.log('📍 Strategy 5: Data attributes');
        const dataElements = document.querySelectorAll('[data-price], [data-amount], [data-cost], [data-value]');

        for (const element of dataElements) {
          for (const attr of element.attributes) {
            if (attr.name.startsWith('data-') && attr.value) {
              const price = parseFloat(attr.value.replace(/[^0-9.]/g, ''));
              if (price >= 100 && price <= 5000) {
                finalPrice = price;
                priceSource = `Data Attribute: ${attr.name}="${attr.value}"`;
                console.log(`🎯 FOUND via data attribute: $${price} (${attr.name})`);
                break;
              }
            }
          }
          if (finalPrice) break;
        }
      }

      // STRATEGY 6: Script Variable Search (Last Resort)
      if (!finalPrice) {
        console.log('📍 Strategy 6: Script variables');
        const scripts = document.querySelectorAll('script');

        for (const script of scripts) {
          const content = script.textContent;
          if (content && content.includes('price')) {
            // Look for common price variable patterns
            const patterns = [
              /"price":\s*([\d.]+)/g,
              /"priceAmount":\s*([\d.]+)/g,
              /"amount":\s*([\d.]+)/g,
              /price["\']:\s*["']?([\d.]+)/g
            ];

            for (const pattern of patterns) {
              const matches = [...content.matchAll(pattern)];
              for (const match of matches) {
                const price = parseFloat(match[1]);
                if (price >= 100 && price <= 5000) {
                  finalPrice = price;
                  priceSource = `Script Variable: ${match[0]}`;
                  console.log(`🎯 FOUND via script: $${price} from ${match[0]}`);
                  break;
                }
              }
              if (finalPrice) break;
            }
          }
          if (finalPrice) break;
        }
      }

      // STRATEGY 7: Comprehensive .aok-offscreen/.a-offscreen with Smart Filtering
      if (!finalPrice) {
        console.log('📍 Strategy 7: Comprehensive offscreen with smart filtering');

        const allOffscreenElements = document.querySelectorAll('.aok-offscreen, .a-offscreen');
        const candidates = [];

        for (const element of allOffscreenElements) {
          const text = element.textContent.trim();
          const price = parseFloat(text.replace(/[^0-9.]/g, ''));

          if (price >= 100 && price <= 5000) {
            let score = 1;

            // Context analysis
            const parentEl = element.parentElement;
            const parentId = parentEl?.id || '';
            const parentClasses = (parentEl?.className || '').toLowerCase();
            const parentText = (parentEl?.textContent || '').toLowerCase();

            // HIGH SCORES: Good price indicators
            if (parentId.includes('price') || parentId.includes('core')) score += 10;
            if (parentClasses.includes('price') && !parentClasses.includes('original')) score += 8;
            if (parentClasses.includes('core')) score += 9;
            if (text.includes('.') && text.match(/\.\d{2}/)) score += 5; // Exact cents

            // NEGATIVE SCORES: Bad indicators
            if (parentText.includes('shipping') || parentText.includes('tax')) score -= 15;
            if (parentText.includes('list') || parentText.includes('was')) score -= 10;
            if (parentText.includes('import') || parentText.includes('handling')) score -= 12;

            candidates.push({ price, score, text, element });
          }
        }

        if (candidates.length > 0) {
          // Sort by score (highest first)
          candidates.sort((a, b) => b.score - a.score);

          const best = candidates[0];
          if (best.score > 0) { // Only accept if score is positive
            finalPrice = best.price;
            priceSource = `Smart Filtered Offscreen (score: ${best.score})`;
            console.log(`🎯 FOUND via smart filtering: $${best.price} (score: ${best.score})`);
          }
        }
      }

      // Simple sale detection
      let basePrice = finalPrice;
      let salePrice = null;
      let isOnSale = false;

      if (finalPrice) {
        console.log('🔍 Checking for sale indicators...');

        const strikethroughSelectors = [
          '.a-price.a-text-strike .a-offscreen',
          '.a-price-original .a-offscreen',
          '[data-a-strike="true"] .a-offscreen'
        ];

        for (const selector of strikethroughSelectors) {
          const elements = document.querySelectorAll(selector);
          for (const element of elements) {
            const priceText = element.textContent.trim();
            const price = parseFloat(priceText.replace(/[^0-9.]/g, ''));
            if (price > finalPrice && price >= 100 && price <= 5000) {
              salePrice = finalPrice;
              basePrice = price;
              isOnSale = true;
              console.log(`💰 Sale detected: Was $${basePrice} → Now $${salePrice}`);
              break;
            }
          }
          if (isOnSale) break;
        }
      }

      // Extract image URL
      let imageUrl = null;
      const imageSelectors = [
        '#landingImage',
        '#imgBlkFront',
        '.a-dynamic-image',
        'img[data-a-image-name="landingImage"]'
      ];

      for (const selector of imageSelectors) {
        const img = document.querySelector(selector);
        if (img && img.src && img.src.includes('http')) {
          imageUrl = img.src;
          break;
        }
      }

      console.log(`🎯 PERFECT DETECTION RESULT: $${finalPrice} (${priceSource})`);

      return {
        basePrice: basePrice,
        salePrice: salePrice,
        isOnSale: isOnSale,
        currentPrice: salePrice || basePrice,
        imageUrl: imageUrl,
        scrapedAt: new Date(),
        success: !!finalPrice,
        priceSource: priceSource,
        detectionMethod: 'Perfect Detection v1.0'
      };
    });

    console.log(`🎯 Perfect scraping result: $${result.currentPrice} from ${result.priceSource}`);
    return result;

  } catch (error) {
    console.error(`❌ Perfect scraping failed: ${error.message}`);
    return {
      basePrice: null,
      salePrice: null,
      isOnSale: false,
      currentPrice: null,
      imageUrl: null,
      scrapedAt: new Date(),
      success: false,
      error: error.message
    };
  }
}

module.exports = { scrapePrice };