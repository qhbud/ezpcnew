const puppeteer = require('puppeteer');

async function investigatePriceSelectors() {
  console.log('🔍 INVESTIGATING ACTUAL PRICE SELECTORS ON AMAZON PAGES\n');

  const testUrls = [
    'https://amazon.com/ASUS-GeForce-Graphics-Compatible-Technology/dp/B0D1N5L5DJ',
    'https://amazon.com/ASRock-Graphics-Phantom-DisplayPort-Technology/dp/B0BHQXCL72'
  ];

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    for (const url of testUrls) {
      console.log(`\n🌐 INVESTIGATING: ${url.substring(0, 80)}...`);
      console.log('=' .repeat(80));

      const page = await browser.newPage();
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');

      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForTimeout(4000);

      const analysis = await page.evaluate(() => {
        const result = {
          allPriceElements: [],
          hiddenInputs: [],
          visiblePrices: [],
          priceContainers: []
        };

        // Find ALL elements containing price-like text or attributes
        const allElements = document.querySelectorAll('*');

        for (const element of allElements) {
          const text = element.textContent || '';
          const value = element.value || '';
          const className = element.className || '';
          const id = element.id || '';

          // Check for price patterns in text content
          const priceMatch = text.match(/\$[\d,]+\.?\d*/);
          const valueMatch = value.match(/[\d,]+\.?\d*/);

          if (priceMatch && parseFloat(priceMatch[0].replace(/[^0-9.]/g, '')) > 100) {
            result.allPriceElements.push({
              tagName: element.tagName,
              selector: `${element.tagName.toLowerCase()}${id ? '#' + id : ''}${className ? '.' + className.split(' ')[0] : ''}`,
              text: text.trim().substring(0, 100),
              price: priceMatch[0]
            });
          }

          // Check hidden inputs
          if (element.tagName === 'INPUT' && element.type === 'hidden') {
            if (valueMatch && parseFloat(valueMatch[0].replace(/[^0-9.]/g, '')) > 100) {
              result.hiddenInputs.push({
                name: element.name || 'no-name',
                value: value,
                id: id || 'no-id'
              });
            }
          }

          // Check for specific price-related classes
          if (className.includes('price') || className.includes('offscreen') || id.includes('price')) {
            const elementPrice = parseFloat(text.replace(/[^0-9.]/g, '')) || parseFloat(value.replace(/[^0-9.]/g, ''));
            if (elementPrice > 100 && elementPrice < 5000) {
              result.priceContainers.push({
                tagName: element.tagName,
                selector: `${element.tagName.toLowerCase()}${id ? '#' + id : ''}${className ? '.' + className.split(' ')[0] : ''}`,
                className: className,
                id: id,
                text: text.trim().substring(0, 50),
                value: value,
                price: elementPrice
              });
            }
          }
        }

        // Check for spans with aria-hidden="true" (common for prices)
        const ariaHiddenSpans = document.querySelectorAll('span[aria-hidden="true"]');
        for (const span of ariaHiddenSpans) {
          const text = span.textContent || '';
          const priceMatch = text.match(/\$[\d,]+\.?\d*/);
          if (priceMatch && parseFloat(priceMatch[0].replace(/[^0-9.]/g, '')) > 100) {
            result.visiblePrices.push({
              selector: 'span[aria-hidden="true"]',
              text: text.trim(),
              price: priceMatch[0],
              className: span.className
            });
          }
        }

        // Remove duplicates
        result.allPriceElements = result.allPriceElements.filter((item, index, self) =>
          index === self.findIndex((t) => t.price === item.price)
        );

        return result;
      });

      console.log(`\n💰 ALL PRICE ELEMENTS FOUND (${analysis.allPriceElements.length}):`);
      analysis.allPriceElements.slice(0, 10).forEach((item, i) => {
        console.log(`   ${i + 1}. ${item.selector}: ${item.price} ("${item.text.substring(0, 50)}...")`);
      });

      console.log(`\n🔒 HIDDEN INPUTS WITH PRICES (${analysis.hiddenInputs.length}):`);
      analysis.hiddenInputs.forEach((item, i) => {
        console.log(`   ${i + 1}. name="${item.name}" value="${item.value}" id="${item.id}"`);
      });

      console.log(`\n📦 PRICE CONTAINERS (${analysis.priceContainers.length}):`);
      analysis.priceContainers.slice(0, 5).forEach((item, i) => {
        console.log(`   ${i + 1}. ${item.selector} - $${item.price} (class: "${item.className}", text: "${item.text}")`);
      });

      console.log(`\n👁️ VISIBLE PRICES (${analysis.visiblePrices.length}):`);
      analysis.visiblePrices.forEach((item, i) => {
        console.log(`   ${i + 1}. ${item.price} (class: "${item.className}", text: "${item.text}")`);
      });

      await page.close();
    }

  } catch (error) {
    console.error('❌ Investigation failed:', error);
  } finally {
    if (browser) {
      await browser.close();
    }
  }

  process.exit(0);
}

investigatePriceSelectors().catch(console.error);