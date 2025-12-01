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
      console.log('🔍 Starting optimized price detection based on testing results...');

      const mainProductArea = document.querySelector('#centerCol, #dp, #dp-container, .dp-wrap') || document;
      console.log(`🔍 Using product area: ${mainProductArea === document ? 'entire page' : mainProductArea.id || mainProductArea.className}`);

      let finalPrice = null;
      let priceSource = null;
      let allCandidates = [];

      // PRIORITY 1: Core Price Display (66.7% success rate, most accurate)
      console.log('📍 Priority 1: Core Price Display');
      const corePriceSelectors = [
        '#corePriceDisplay_desktop_feature_div .aok-offscreen',
        '#corePriceDisplay_desktop_feature_div span.aok-offscreen',
        '#corePriceDisplay_desktop_feature_div > div.a-section.a-spacing-none.aok-align-center.aok-relative > span.aok-offscreen',
        '[data-feature-name="corePrice"] .a-offscreen'
      ];

      for (const selector of corePriceSelectors) {
        const elements = mainProductArea.querySelectorAll(selector);
        console.log(`   ${selector}: ${elements.length} elements`);

        for (let i = 0; i < elements.length; i++) {
          const el = elements[i];
          const text = el.textContent.trim();
          const price = parseFloat(text.replace(/[^0-9.]/g, ''));

          if (price >= 100 && price <= 5000) {
            allCandidates.push({
              price: price,
              text: text,
              method: 'Core Price Display',
              selector: selector,
              priority: 10,
              index: i
            });
            console.log(`     ✅ Core Price: $${price} from "${text}"`);
          }
        }
      }

      // PRIORITY 2: Buy Box Area (when core price not available)
      if (allCandidates.length === 0) {
        console.log('📍 Priority 2: Buy Box Area');
        const buyboxSelectors = [
          '#price_inside_buybox .a-offscreen',
          '#buybox .a-price .a-offscreen',
          '#buybox-inner .a-offscreen'
        ];

        for (const selector of buyboxSelectors) {
          const elements = mainProductArea.querySelectorAll(selector);
          console.log(`   ${selector}: ${elements.length} elements`);

          for (let i = 0; i < elements.length; i++) {
            const el = elements[i];
            const text = el.textContent.trim();
            const price = parseFloat(text.replace(/[^0-9.]/g, ''));

            if (price >= 100 && price <= 5000) {
              allCandidates.push({
                price: price,
                text: text,
                method: 'Buy Box Area',
                selector: selector,
                priority: 8,
                index: i
              });
              console.log(`     ✅ Buybox Price: $${price} from "${text}"`);
            }
          }
        }
      }

      // PRIORITY 3: All .aok-offscreen with intelligent filtering (if nothing found yet)
      if (allCandidates.length === 0) {
        console.log('📍 Priority 3: All .aok-offscreen (intelligent filtering)');
        const allAokElements = mainProductArea.querySelectorAll('.aok-offscreen');
        console.log(`   Found ${allAokElements.length} .aok-offscreen elements`);

        const aokCandidates = [];
        for (let i = 0; i < allAokElements.length; i++) {
          const el = allAokElements[i];
          const text = el.textContent.trim();
          const price = parseFloat(text.replace(/[^0-9.]/g, ''));

          if (price >= 100 && price <= 5000) {
            // Calculate priority based on context
            let priority = 5;
            const parentEl = el.parentElement;
            const parentClasses = (parentEl?.className || '').toLowerCase();
            const parentText = (parentEl?.textContent || '').toLowerCase();

            // HIGH PRIORITY: Near main price areas
            if (parentClasses.includes('price') || parentClasses.includes('buybox')) {
              priority += 3;
            }

            // PENALTIES: Avoid shipping, tax, list prices
            if (parentText.includes('shipping') || parentText.includes('tax') ||
                parentText.includes('list') || parentText.includes('typical') ||
                parentText.includes('was') || parentText.includes('msrp')) {
              priority -= 4;
            }

            // Position bonus (top-left area is usually main price)
            try {
              const rect = el.getBoundingClientRect();
              if (rect.top < window.innerHeight / 3 && rect.left < window.innerWidth / 2) {
                priority += 2;
              }
            } catch (e) {}

            aokCandidates.push({
              price: price,
              text: text,
              method: 'All .aok-offscreen',
              priority: priority,
              index: i,
              parentClasses: parentClasses
            });
          }
        }

        // Sort by priority and take the best ones
        aokCandidates.sort((a, b) => b.priority - a.priority);
        allCandidates.push(...aokCandidates.slice(0, 3)); // Top 3 candidates

        aokCandidates.slice(0, 3).forEach(candidate => {
          console.log(`     ✅ AOK Price: $${candidate.price} (priority: ${candidate.priority})`);
        });
      }

      // PRIORITY 4: Whole + Decimal (100% success rate but less precise)
      if (allCandidates.length === 0) {
        console.log('📍 Priority 4: Whole + Decimal (fallback)');
        const wholeElements = mainProductArea.querySelectorAll('.a-price-whole');
        console.log(`   Found ${wholeElements.length} .a-price-whole elements`);

        const wholeCandidates = [];
        for (let i = 0; i < wholeElements.length; i++) {
          const wholeEl = wholeElements[i];
          const decimalEl = wholeEl.parentNode?.querySelector('.a-price-decimal, .a-price-fraction');

          const wholeText = wholeEl.textContent.replace(/[^0-9]/g, '');
          const decimalText = decimalEl ? decimalEl.textContent.replace(/[^0-9]/g, '') : '00';

          if (wholeText) {
            const price = parseFloat(`${wholeText}.${decimalText.padEnd(2, '0').substring(0, 2)}`);
            if (price >= 100 && price <= 5000) {
              const isStrikethrough = wholeEl.closest('.a-text-strike') !== null;

              if (!isStrikethrough) { // Only non-strikethrough prices
                wholeCandidates.push({
                  price: price,
                  text: `${wholeEl.textContent}${decimalEl?.textContent || ''}`,
                  method: 'Whole + Decimal',
                  priority: 3,
                  index: i
                });
              }
            }
          }
        }

        // Take the first non-strikethrough price (usually the main price)
        if (wholeCandidates.length > 0) {
          allCandidates.push(wholeCandidates[0]);
          console.log(`     ✅ Whole+Decimal Price: $${wholeCandidates[0].price}`);
        }
      }

      // Select the best candidate
      if (allCandidates.length > 0) {
        // Sort by priority (highest first)
        allCandidates.sort((a, b) => b.priority - a.priority);

        const bestCandidate = allCandidates[0];
        finalPrice = bestCandidate.price;
        priceSource = `${bestCandidate.method} (${bestCandidate.selector || 'N/A'})`;

        console.log(`🏆 SELECTED: $${finalPrice} from ${bestCandidate.method}`);

        // Log all candidates for debugging
        console.log('🔍 All candidates found:');
        allCandidates.forEach((candidate, idx) => {
          const selected = idx === 0 ? ' ✅ SELECTED' : '';
          console.log(`   ${idx + 1}. $${candidate.price} (${candidate.method}, priority: ${candidate.priority})${selected}`);
        });
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
          const elements = mainProductArea.querySelectorAll(selector);
          for (const el of elements) {
            const priceText = el.textContent.trim();
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

      console.log(`💰 Final result: $${finalPrice} (${priceSource})`);

      return {
        basePrice: basePrice,
        salePrice: salePrice,
        isOnSale: isOnSale,
        currentPrice: salePrice || basePrice,
        imageUrl: imageUrl,
        scrapedAt: new Date(),
        success: !!finalPrice,
        priceSource: priceSource,
        totalCandidates: allCandidates.length,
        candidates: allCandidates.slice(0, 5).map(c => ({
          price: c.price,
          method: c.method,
          priority: c.priority,
          text: c.text
        }))
      };
    });

    console.log(`💰 Scraping result: $${result.currentPrice} from ${result.priceSource}`);
    return result;

  } catch (error) {
    console.error(`❌ Scraping failed: ${error.message}`);
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