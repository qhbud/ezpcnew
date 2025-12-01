const puppeteer = require('puppeteer');

async function deepPriceInvestigation() {
  console.log('🔍 DEEP INVESTIGATION OF AMAZON PRICE STRUCTURES\n');

  const testUrl = 'https://amazon.com/ASUS-GeForce-Graphics-Compatible-Technology/dp/B0D1N5L5DJ';

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: false, // Let's see what's happening
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      defaultViewport: { width: 1200, height: 800 }
    });

    const page = await browser.newPage();

    // Mimic real user behavior more closely
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
    await page.setExtraHTTPHeaders({
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
    });

    console.log(`🌐 Loading: ${testUrl}`);
    await page.goto(testUrl, { waitUntil: 'networkidle2', timeout: 60000 });

    // Wait for page to be fully loaded
    await page.waitForTimeout(8000);

    console.log('\n📊 Page loaded, analyzing content...');

    const analysis = await page.evaluate(() => {
      const result = {
        pageTitle: document.title,
        bodyText: document.body.textContent.substring(0, 200),
        hasAmazonElements: false,
        priceElements: [],
        allInputs: [],
        suspiciousElements: []
      };

      // Check if this is actually Amazon
      result.hasAmazonElements = !!(
        document.querySelector('#navbar') ||
        document.querySelector('.nav-logo') ||
        document.body.textContent.includes('Amazon')
      );

      // Find all input elements
      const inputs = document.querySelectorAll('input');
      for (const input of inputs) {
        if (input.type === 'hidden' && (input.name || input.id || input.value)) {
          result.allInputs.push({
            type: input.type,
            name: input.name || 'no-name',
            id: input.id || 'no-id',
            value: input.value || 'no-value',
            className: input.className || 'no-class'
          });
        }
      }

      // Find elements with price-like content more broadly
      const allElements = document.querySelectorAll('*');
      for (const element of allElements) {
        const text = (element.textContent || '').trim();
        const value = element.value || '';

        // Look for dollar signs or numeric values that could be prices
        if (text.includes('$') || value.includes('$') ||
            /\b\d{3,4}\.\d{2}\b/.test(text) || /\b\d{3,4}\.\d{2}\b/.test(value)) {

          result.suspiciousElements.push({
            tagName: element.tagName,
            className: element.className || 'no-class',
            id: element.id || 'no-id',
            text: text.substring(0, 100),
            value: value.substring(0, 100)
          });
        }

        // Specifically look for common Amazon price selectors
        if (element.matches && (
          element.matches('.a-price .a-offscreen') ||
          element.matches('.a-price .aok-offscreen') ||
          element.matches('[data-a-color="price"]') ||
          element.matches('.a-color-price') ||
          element.matches('#priceblock_dealprice') ||
          element.matches('#priceblock_ourprice')
        )) {
          result.priceElements.push({
            selector: element.tagName + (element.className ? '.' + element.className.split(' ')[0] : ''),
            text: text.substring(0, 50),
            value: value
          });
        }
      }

      return result;
    });

    console.log(`\n🏷️ Page Title: ${analysis.pageTitle}`);
    console.log(`🌐 Is Amazon Page: ${analysis.hasAmazonElements ? '✅' : '❌'}`);
    console.log(`📝 Page Content Preview: "${analysis.bodyText}..."`);

    console.log(`\n💰 Price Elements Found: ${analysis.priceElements.length}`);
    analysis.priceElements.forEach((item, i) => {
      console.log(`   ${i + 1}. ${item.selector}: "${item.text}" (value: "${item.value}")`);
    });

    console.log(`\n🔒 All Hidden Inputs (${analysis.allInputs.length}):`);
    analysis.allInputs.slice(0, 10).forEach((item, i) => {
      console.log(`   ${i + 1}. name="${item.name}" id="${item.id}" value="${item.value.substring(0, 50)}"`);
    });

    console.log(`\n🕵️ Suspicious Elements (${analysis.suspiciousElements.length}):`);
    analysis.suspiciousElements.slice(0, 10).forEach((item, i) => {
      console.log(`   ${i + 1}. ${item.tagName}.${item.className}: "${item.text}" (value: "${item.value}")`);
    });

    // Take a screenshot for debugging
    await page.screenshot({ path: 'amazon-page-debug.png', fullPage: true });
    console.log('\n📸 Screenshot saved as amazon-page-debug.png');

    // Wait a bit more to see if anything loads dynamically
    console.log('\n⏳ Waiting for any dynamic content...');
    await page.waitForTimeout(5000);

    // Try clicking on elements that might trigger price loading
    try {
      await page.click('#add-to-cart-button');
      await page.waitForTimeout(2000);
      console.log('🔘 Clicked add to cart button');
    } catch (e) {
      console.log('🔘 No add to cart button found');
    }

    // Final check for prices after interactions
    const finalAnalysis = await page.evaluate(() => {
      const prices = [];
      const elements = document.querySelectorAll('*');

      for (const element of elements) {
        const text = element.textContent || '';
        const priceMatch = text.match(/\$[\d,]+\.?\d*/g);
        if (priceMatch) {
          priceMatch.forEach(price => {
            const numPrice = parseFloat(price.replace(/[^0-9.]/g, ''));
            if (numPrice > 100 && numPrice < 5000) {
              prices.push({
                price: price,
                numPrice: numPrice,
                element: element.tagName + (element.className ? '.' + element.className.split(' ')[0] : ''),
                text: text.substring(0, 100)
              });
            }
          });
        }
      }

      // Remove duplicates
      return prices.filter((item, index, self) =>
        index === self.findIndex((t) => t.numPrice === item.numPrice)
      );
    });

    console.log(`\n💲 Final Price Search Results (${finalAnalysis.length}):`);
    finalAnalysis.forEach((item, i) => {
      console.log(`   ${i + 1}. ${item.price} (${item.numPrice}) from ${item.element}`);
    });

  } catch (error) {
    console.error('❌ Investigation failed:', error);
  } finally {
    if (browser) {
      // Keep browser open for manual inspection
      console.log('\n🔍 Browser kept open for manual inspection. Press Ctrl+C to close.');
      await new Promise(resolve => setTimeout(resolve, 60000)); // Wait 60 seconds
      await browser.close();
    }
  }

  process.exit(0);
}

deepPriceInvestigation().catch(console.error);