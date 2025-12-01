const puppeteer = require('puppeteer');

// Diagnostic script to analyze Amazon price HTML elements
async function diagnosePriceElements() {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();
  
  // Test with a known RTX 4070 product
  const testUrl = 'https://www.amazon.com/MSI-GeForce-RTX-4070-12G/dp/B0BZB7DS7Q';
  
  console.log(`🔍 Analyzing price elements for: ${testUrl}`);
  
  await page.goto(testUrl, { waitUntil: 'networkidle0' });
  
  // Extract all price-related elements and their context
  const priceAnalysis = await page.evaluate(() => {
    const results = {
      allPriceElements: [],
      priceSelectors: [
        '.a-price .a-offscreen',
        '.a-price-whole',
        '.a-price-decimal', 
        '.a-price-fraction',
        '.a-price-symbol',
        '.a-price-current',
        '.a-price-range',
        '.a-price.a-text-price',
        '.a-price-original',
        '.a-text-strike',
        '[data-a-price]',
        '#price_inside_buybox',
        '#apex_desktop',
        '[data-feature-name="corePrice"]',
        '[data-feature-name="price"]'
      ]
    };
    
    // Check each selector
    results.priceSelectors.forEach(selector => {
      const elements = document.querySelectorAll(selector);
      elements.forEach((el, index) => {
        results.allPriceElements.push({
          selector: selector,
          index: index,
          text: el.textContent.trim(),
          innerHTML: el.innerHTML,
          className: el.className,
          id: el.id,
          parentText: el.parentElement ? el.parentElement.textContent.trim().substring(0, 100) : '',
          attributes: Array.from(el.attributes).map(attr => ({name: attr.name, value: attr.value}))
        });
      });
    });
    
    // Look for specific price patterns in the page
    const pageText = document.body.textContent;
    const pricePatterns = [
      /List Price:\s*\$?[\d,]+\.?\d*/gi,
      /Price:\s*\$?[\d,]+\.?\d*/gi,
      /\$\s*[\d,]+\.?\d*/g,
      /Save \$[\d,]+\.?\d*/gi,
      /-\d+%/g
    ];
    
    results.pricePatterns = {};
    pricePatterns.forEach((pattern, i) => {
      const matches = pageText.match(pattern) || [];
      results.pricePatterns[`pattern_${i}`] = matches.slice(0, 5); // First 5 matches
    });
    
    // Get current page structure
    results.pageInfo = {
      title: document.title,
      url: window.location.href,
      hasProductTitle: !!document.querySelector('#productTitle'),
      hasBuyBox: !!document.querySelector('#buybox, #apex_desktop'),
      mainContentArea: document.querySelector('#centerCol, #dp-container') ? 'found' : 'not found'
    };
    
    return results;
  });
  
  console.log('\n📊 PRICE ANALYSIS RESULTS:');
  console.log('=========================');
  
  console.log('\n🌐 Page Info:');
  console.log(JSON.stringify(priceAnalysis.pageInfo, null, 2));
  
  console.log('\n💰 Price Elements Found:');
  priceAnalysis.allPriceElements.forEach((el, i) => {
    console.log(`\n${i + 1}. ${el.selector}[${el.index}]:`);
    console.log(`   Text: "${el.text}"`);
    console.log(`   Class: "${el.className}"`);
    console.log(`   ID: "${el.id}"`);
    console.log(`   Parent context: "${el.parentText.substring(0, 60)}..."`);
    if (el.attributes.length > 0) {
      console.log(`   Attributes: ${el.attributes.map(a => `${a.name}="${a.value}"`).join(', ')}`);
    }
  });
  
  console.log('\n🔍 Price Patterns in Page:');
  Object.entries(priceAnalysis.pricePatterns).forEach(([pattern, matches]) => {
    if (matches.length > 0) {
      console.log(`   ${pattern}: ${matches.join(', ')}`);
    }
  });
  
  // Keep browser open for manual inspection
  console.log('\n✋ Browser kept open for manual inspection. Press Ctrl+C to close.');
  
  // Wait for user to close
  await new Promise(resolve => {
    process.on('SIGINT', () => {
      console.log('\n🚪 Closing browser...');
      browser.close();
      resolve();
    });
  });
}

diagnosePriceElements().catch(console.error);