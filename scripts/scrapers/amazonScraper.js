// Amazon product-page price scraper for component ingest.
//
// Detection algorithm is ported from scripts/riverSearchPriceDetection.js — the
// price detector the nightly price-updater uses, which reliably reads the real
// buy-box price. The previous version of this file scanned EVERY <script> tag
// for any "price": N and scanned every .a-offscreen on the page, so it picked up
// the prices of *related/recommended* products (carousels) and returned inflated
// numbers (a $200 B760-A came back $779). The fixes that matter:
//   1. Read the buy-box / core price area FIRST (corePriceDisplay, apex, buybox).
//   2. Fall back to JSON-LD offers.price, then reliable hidden price inputs.
//   3. Only then scan generic .a-price — and EXCLUDE carousel / sponsored /
//      "CardInstance" (recommendation) sections so a related product can't win.
//   4. Drop the script-variable and broad data-attribute scans entirely.
//   5. Dismiss the "Continue Shopping" interstitial first — when present it
//      replaces the product page (no real price and no #productTitle), which
//      caused both wrong prices and the "title did not load" failures.
// Keep this in sync with riverSearchPriceDetection.js.

async function scrapePrice(page, url, options = {}) {
  // Per-component plausible price window (caller passes PRICE_WINDOWS[type]).
  const minPrice = Number.isFinite(options.minPrice) ? options.minPrice : 10;
  const maxPrice = Number.isFinite(options.maxPrice) ? options.maxPrice : 5000;

  try {
    console.log(`🔍 Scraping: ${url} (price window $${minPrice}-$${maxPrice})`);

    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await page.waitForTimeout(1500 + Math.floor(Math.random() * 1500));

    // Dismiss the "Continue Shopping" / warranty interstitial that Amazon
    // sometimes injects in place of the product page.
    try {
      const dismissSelectors = [
        'input[name="continueShopping"]',
        'button[name="continueShopping"]',
        'a[data-csa-c-content-id="continue_shopping"]',
        '#nav-cart-flyout-continue-shopping',
        'input[aria-labelledby="attachSiNoCoverage-announce"]',
        '#attachSiNoCoverage',
        'input[value="No thanks"]',
        'button.a-button-close'
      ];
      for (const selector of dismissSelectors) {
        const button = await page.$(selector);
        if (button) {
          await button.click().catch(() => {});
          await page.waitForTimeout(1500);
          break;
        }
      }
    } catch (e) {
      // No interstitial — proceed.
    }

    // Wait for a real price element, then nudge the page (human-like) so lazy
    // price/title content renders.
    try {
      await page.waitForSelector('.a-price, #corePriceDisplay_desktop_feature_div, #apex_desktop', { timeout: 12000 });
    } catch (e) {
      // Continue anyway; the evaluate below still tries every strategy.
    }
    await page.evaluate(() => window.scrollBy(0, 200)).catch(() => {});
    await page.waitForTimeout(800);

    const result = await page.evaluate((minPrice, maxPrice) => {
      const out = {
        basePrice: null,
        salePrice: null,
        isOnSale: false,
        currentPrice: null,
        imageUrl: null,
        success: false,
        priceSource: null
      };

      // Parse a numeric price, rejecting unit prices ("$12.34 / kg") and anything
      // outside the plausible window for this component type.
      function extractPrice(text) {
        if (!text) return null;
        const lower = text.toLowerCase();
        const unitPatterns = ['/kg', '/ kg', '/g', '/ g', '/100g', '/ 100 g', '/oz', '/ oz', '/lb', '/ lb', '/count', '/ count', 'per kg', 'per g', 'per oz', 'per lb', 'per count'];
        for (const u of unitPatterns) { if (lower.includes(u)) return null; }
        const n = parseFloat(text.replace(/[^0-9.]/g, ''));
        return (Number.isFinite(n) && n >= minPrice && n <= maxPrice) ? n : null;
      }

      // True if the element sits inside a recommendation carousel, sponsored
      // block, or comparison table — those prices belong to OTHER products.
      function inExcludedSection(el) {
        let p = el.parentElement;
        while (p && p !== document.body) {
          const cls = (p.className && p.className.toString ? p.className.toString() : '').toLowerCase();
          const id = (p.id || '').toLowerCase();
          if (cls.includes('carousel') || cls.includes('sponsored') || cls.includes('-similar') || cls.includes('comparison')
            || id.includes('cardinstance') || id.includes('sims') || id.includes('similarities') || id.includes('comparison') || id.includes('sp_detail')) {
            return true;
          }
          p = p.parentElement;
        }
        return false;
      }

      function priceFromScope(scope) {
        const whole = scope.querySelector('.a-price:not(.a-text-price):not(.a-text-strike) .a-price-whole') || scope.querySelector('.a-price-whole');
        if (whole) {
          const wt = whole.textContent.trim().replace(/[^0-9]/g, '');
          const fracEl = whole.parentElement ? whole.parentElement.querySelector('.a-price-fraction') : null;
          const ft = fracEl ? fracEl.textContent.trim().replace(/[^0-9]/g, '') : '00';
          const p = extractPrice(`${wt}.${ft || '00'}`);
          if (p) return p;
        }
        const off = scope.querySelector('.a-price:not(.a-text-strike) .a-offscreen');
        if (off) { const p = extractPrice(off.textContent); if (p) return p; }
        return null;
      }

      // Image
      for (const s of ['#landingImage', '#imgBlkFront', '#main-image', '.a-dynamic-image']) {
        const img = document.querySelector(s);
        if (img && img.src && img.src.includes('http')) { out.imageUrl = img.src; break; }
      }

      // STRATEGY 1: core price display (the main buy-box price block)
      const core = document.getElementById('corePriceDisplay_desktop_feature_div') || document.getElementById('corePrice_feature_div');
      if (core) {
        const p = priceFromScope(core);
        if (p) {
          out.currentPrice = p; out.basePrice = p; out.success = true; out.priceSource = 'corePriceDisplay';
          const strike = core.querySelector('.a-price.a-text-price .a-offscreen, .a-text-strike');
          if (strike) {
            const op = extractPrice(strike.textContent);
            if (op && op > p && op < p * 2) { out.basePrice = op; out.salePrice = p; out.isOnSale = true; }
          }
        }
      }

      // STRATEGY 2: apex / buybox containers
      if (!out.success) {
        for (const id of ['apex_desktop', 'buybox', 'price_inside_buybox', 'apex_offerDisplay_desktop', 'corePrice_desktop']) {
          const scope = document.getElementById(id);
          if (!scope) continue;
          const p = priceFromScope(scope);
          if (p) { out.currentPrice = p; out.basePrice = p; out.success = true; out.priceSource = `buybox:${id}`; break; }
        }
      }

      // STRATEGY 3: JSON-LD structured data (the product's own offer)
      if (!out.success) {
        for (const s of document.querySelectorAll('script[type="application/ld+json"]')) {
          try {
            const d = JSON.parse(s.textContent);
            const nodes = Array.isArray(d) ? d : (d['@graph'] && Array.isArray(d['@graph']) ? d['@graph'] : [d]);
            for (const node of nodes) {
              const offers = node && node.offers;
              const raw = offers && (offers.price || offers.lowPrice || (Array.isArray(offers) && offers[0] && offers[0].price));
              if (raw) { const p = extractPrice(String(raw)); if (p) { out.currentPrice = p; out.basePrice = p; out.success = true; out.priceSource = 'json-ld'; break; } }
            }
          } catch (e) { /* skip invalid JSON */ }
          if (out.success) break;
        }
      }

      // STRATEGY 4: reliable hidden price inputs
      if (!out.success) {
        for (const s of ['#twister-plus-price-data-price', '#attach-base-product-price', 'input[name*="customerVisiblePrice"][name*="amount"]', 'input[id*="price-data-price"]']) {
          try {
            const el = document.querySelector(s);
            if (el && el.value) { const p = extractPrice(el.value); if (p) { out.currentPrice = p; out.basePrice = p; out.success = true; out.priceSource = `hidden:${s}`; break; } }
          } catch (e) { /* complex selector — skip */ }
        }
      }

      // STRATEGY 5: generic .a-price scan, main column first, carousels excluded
      if (!out.success) {
        const scoped = [
          ...document.querySelectorAll('#centerCol .a-price, #ppd .a-price, #desktop_buybox .a-price'),
          ...document.querySelectorAll('.a-price')
        ];
        for (const el of scoped) {
          if (el.classList.contains('a-text-strike') || el.classList.contains('a-text-price')) continue;
          if (inExcludedSection(el)) continue;
          let p = null;
          const whole = el.querySelector('.a-price-whole');
          if (whole) {
            const wt = whole.textContent.trim().replace(/[^0-9]/g, '');
            const fracEl = el.querySelector('.a-price-fraction');
            const ft = fracEl ? fracEl.textContent.trim().replace(/[^0-9]/g, '') : '00';
            p = extractPrice(`${wt}.${ft || '00'}`);
          }
          if (!p) { const off = el.querySelector('.a-offscreen'); if (off) p = extractPrice(off.textContent); }
          if (p) { out.currentPrice = p; out.basePrice = p; out.success = true; out.priceSource = 'a-price-scan'; break; }
        }
      }

      return out;
    }, minPrice, maxPrice);

    console.log(`🎯 Scrape result: $${result.currentPrice} (${result.priceSource})`);
    return {
      basePrice: result.basePrice,
      salePrice: result.salePrice,
      isOnSale: result.isOnSale,
      currentPrice: result.salePrice || result.currentPrice || result.basePrice,
      imageUrl: result.imageUrl,
      scrapedAt: new Date(),
      success: !!result.currentPrice,
      priceSource: result.priceSource,
      detectionMethod: 'RiverSearch-port v2.0'
    };

  } catch (error) {
    console.error(`❌ Price scrape failed: ${error.message}`);
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
