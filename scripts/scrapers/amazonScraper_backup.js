async function scrapePrice(page, url) {
  try {
    console.log(`🔍 Scraping: ${url}`);

    await page.goto(url, {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });

    // Wait a moment for dynamic content
    await page.waitForTimeout(2000);

    const result = await page.evaluate(() => {
      console.log('🔍 Starting enhanced price detection...');

      // Define main product area
      const mainProductArea = document.querySelector('#centerCol, #dp, #dp-container, .dp-wrap') || document;
      console.log(`🔍 Using product area: ${mainProductArea === document ? 'entire page' : mainProductArea.id || mainProductArea.className}`);

      let basePrice = null;
      let salePrice = null;
      let isOnSale = false;
      let allCandidates = [];

      // Enhanced Strategy 1: .aok-offscreen elements with context scoring
      const aokElements = mainProductArea.querySelectorAll('.aok-offscreen');
      console.log(`📍 Found ${aokElements.length} .aok-offscreen elements`);

      for (let i = 0; i < aokElements.length; i++) {
        const el = aokElements[i];
        const text = el.textContent.trim();
        console.log(`   aok-offscreen[${i}]: "${text}"`);

        // Extract price from text
        const priceMatch = text.match(/\$?([\d,]+\.?\d*)/);
        if (priceMatch) {
          const price = parseFloat(priceMatch[1].replace(/,/g, ''));

          // Validate price range for GPUs
          if (price >= 100 && price <= 5000) {
            let contextScore = 1;

            // Analyze parent element context
            const parentEl = el.parentElement;
            const parentClasses = (parentEl?.className || '').toLowerCase();
            const parentText = (parentEl?.textContent || '').toLowerCase();
            const nearbyText = (parentEl?.parentElement?.textContent || '').toLowerCase();

            // HIGH PRIORITY: Current price indicators
            if (parentClasses.includes('a-price-current') ||
                nearbyText.includes('current price') ||
                parentText.includes('current')) {
              contextScore += 5;
              console.log(`     🎯 CURRENT PRICE detected (+5)`);
            }

            // MEDIUM PRIORITY: Price containers
            if (parentClasses.includes('price') || parentClasses.includes('a-price')) {
              contextScore += 3;
              console.log(`     💰 Price container (+3)`);
            }

            // PENALTIES: Avoid unwanted price types
            if (parentText.includes('shipping') || parentText.includes('tax') ||
                parentText.includes('list price') || parentText.includes('typical') ||
                parentText.includes('was') || parentText.includes('msrp')) {
              contextScore -= 3;
              console.log(`     ❌ Unwanted price type (-3)`);
            }

            // Position bonus (prices near top are often current)
            try {
              const rect = el.getBoundingClientRect();
              if (rect.top < window.innerHeight / 3) {
                contextScore += 1;
                console.log(`     📍 Position bonus (+1)`);
              }
            } catch (e) {}

            allCandidates.push({
              price: price,
              text: text,
              strategy: 'aok-offscreen',
              contextScore: contextScore,
              index: i,
              parentClasses: parentClasses,
              parentText: parentText.substring(0, 100)
            });

            console.log(`     ✅ Candidate: $${price} (score: ${contextScore})`);
          } else {
            console.log(`     ❌ Price $${price} outside valid range`);
          }
        }
      }

      // Enhanced Strategy 2: .a-price-whole + .a-price-decimal combinations
      const wholePriceElements = mainProductArea.querySelectorAll('.a-price-whole');
      console.log(`📍 Found ${wholePriceElements.length} .a-price-whole elements`);

      for (let i = 0; i < wholePriceElements.length; i++) {
        const wholeEl = wholePriceElements[i];
        const decimalEl = wholeEl.parentNode?.querySelector('.a-price-decimal, .a-price-fraction');

        const wholeText = wholeEl.textContent.replace(/[^0-9]/g, '');
        const decimalText = decimalEl ? decimalEl.textContent.replace(/[^0-9]/g, '') : '00';

        if (wholeText) {
          const price = parseFloat(`${wholeText}.${decimalText.padEnd(2, '0').substring(0, 2)}`);
          console.log(`   whole+decimal[${i}]: "${wholeEl.textContent}" + "${decimalEl?.textContent || ''}" = $${price}`);

          if (price >= 100 && price <= 5000) {
            let contextScore = 2; // Base score for whole+decimal

            const parentEl = wholeEl.closest('.a-price');
            const parentClasses = (parentEl?.className || '').toLowerCase();
            const parentText = (parentEl?.textContent || '').toLowerCase();

            // Avoid strikethrough prices (usually "was" prices)
            if (parentClasses.includes('a-text-strike') ||
                parentText.includes('was') ||
                parentText.includes('list')) {
              contextScore -= 4;
              console.log(`     ❌ Strikethrough/list price (-4)`);
            }

            // Bonus for current price indicators
            if (parentClasses.includes('a-price-current')) {
              contextScore += 3;
              console.log(`     🎯 Current price bonus (+3)`);
            }

            allCandidates.push({
              price: price,
              text: `${wholeEl.textContent}${decimalEl?.textContent || ''}`,
              strategy: 'whole-decimal',
              contextScore: contextScore,
              index: i,
              parentClasses: parentClasses,
              parentText: parentText.substring(0, 100)
            });

            console.log(`     ✅ Candidate: $${price} (score: ${contextScore})`);
          }
        }
      }

      // Select the best candidate
      if (allCandidates.length > 0) {
        // Sort by context score (highest first), then by strategy preference
        allCandidates.sort((a, b) => {
          if (b.contextScore !== a.contextScore) {
            return b.contextScore - a.contextScore;
          }
          // Prefer aok-offscreen over whole-decimal if scores are equal
          const strategyOrder = { 'aok-offscreen': 2, 'whole-decimal': 1 };
          return (strategyOrder[b.strategy] || 0) - (strategyOrder[a.strategy] || 0);
        });

        const bestCandidate = allCandidates[0];
        console.log(`🏆 SELECTED: $${bestCandidate.price} (${bestCandidate.strategy}, score: ${bestCandidate.contextScore})`);

        // Log all candidates for debugging
        console.log('🔍 All candidates:');
        allCandidates.forEach((candidate, idx) => {
          const selected = idx === 0 ? ' ✅ SELECTED' : '';
          console.log(`   ${idx + 1}. $${candidate.price} (${candidate.strategy}, score: ${candidate.contextScore})${selected}`);
          console.log(`      Text: "${candidate.text}"`);
          console.log(`      Parent: "${candidate.parentClasses}"`);
        });

        basePrice = bestCandidate.price;
      }

      // FALLBACK: Try basic selectors if no price found
      if (!basePrice) {
        console.log('🔍 Fallback: Basic price detection...');

        const fallbackSelectors = [
          '.a-price:not(.a-text-strike) .a-offscreen',
          '.a-price-current .a-offscreen',
          '#price_inside_buybox .a-offscreen'
        ];

        for (const selector of fallbackSelectors) {
          const element = mainProductArea.querySelector(selector);
          if (element) {
            const priceText = element.textContent.trim();
            const price = parseFloat(priceText.replace(/[^0-9.]/g, ''));
            if (price >= 100 && price <= 5000) {
              basePrice = price;
              console.log(`💰 Fallback price: $${basePrice} from ${selector}`);
              break;
            }
          }
        }
      }

      // Simple sale detection: Look for strikethrough prices
      if (basePrice) {
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
            if (price > basePrice) {
              salePrice = basePrice;
              basePrice = price;
              isOnSale = true;
              console.log(`💰 Sale detected: Was $${basePrice} → Now $${salePrice}`);
              break;
            }
          }
          if (isOnSale) break;
        }
      }

      console.log(`💰 Final result: Base $${basePrice}, Sale $${salePrice}, On Sale: ${isOnSale}`);

      // Extract image URL
      let imageUrl = null;
      const imageSelectors = [
        '#landingImage',
        '#imgBlkFront',
        '.a-dynamic-image',
        'img[data-a-image-name="landingImage"]',
        '.s-image',
        'img[src*="images-amazon"]'
      ];

      for (const selector of imageSelectors) {
        const img = document.querySelector(selector);
        if (img && img.src && img.src.includes('http')) {
          imageUrl = img.src;
          break;
        }
      }

      return {
        basePrice: basePrice,
        salePrice: salePrice,
        isOnSale: isOnSale,
        currentPrice: salePrice || basePrice,
        imageUrl: imageUrl,
        scrapedAt: new Date(),
        success: !!basePrice,
        candidates: allCandidates.map(c => ({
          price: c.price,
          strategy: c.strategy,
          score: c.contextScore,
          text: c.text
        }))
      };
    });

    console.log(`💰 Scraping result: $${result.currentPrice} (base: $${result.basePrice}, sale: $${result.salePrice})`);
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