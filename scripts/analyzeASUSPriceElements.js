const puppeteer = require('puppeteer');

async function analyzeASUSPriceElements() {
  console.log('🔍 COMPREHENSIVE ANALYSIS OF ASUS CARD PRICE ELEMENTS\n');

  const url = 'https://amazon.com/ASUS-Compatibility-Axial-tech-Technology-Auto-Extreme/dp/B0CQRX9HPK/ref=sr_1_7?dib=eyJ2IjoiMSJ9.lD9kVUM34bd7jrJTOkx9KCM4tRM9Ru9WICeSOrGuyp926YnqtP69AZXzeUIsISLJSh4-ahS8sQiEQtoY4ew0UM3cy-Af3I-OPMZdrHsKV9Ksq7ZB0NFZ0VBGgyfSYUgCvyfVYxn7LBXB30HJk4DDJ9YT0zdZWiR118H2fh6X2ZZREDGC02QLj0RS3EgbO_7TmOZk_KlQYHxNL6NiFZKSd42OxqN6fLJ5yRPh1TDxzKE.lpDZqzRlj7XU-6WQu-ogB8xkIGiCrBExG7GzdVbrWDk&dib_tag=se&keywords=rtx+4070&qid=1757217840&sr=8-7';

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');

    console.log('🌐 Loading ASUS page...');
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(4000);

    const analysis = await page.evaluate(() => {
      const results = {
        hiddenInputs: [],
        offscreenElements: [],
        visiblePrices: [],
        mainProductPrices: [],
        carouselPrices: []
      };

      console.log('🔍 Analyzing all price elements...');

      // 1. HIDDEN INPUTS
      const hiddenInputs = document.querySelectorAll('input');
      for (const input of hiddenInputs) {
        if (input.value) {
          const value = input.value.toString();
          const price = parseFloat(value.replace(/[^0-9.]/g, ''));
          if (price >= 100 && price <= 5000) {
            results.hiddenInputs.push({
              id: input.id,
              name: input.name,
              value: input.value,
              price: price,
              type: input.type
            });
          }
        }
      }

      // 2. OFFSCREEN ELEMENTS WITH LOCATION CONTEXT
      const offscreenElements = document.querySelectorAll('.a-offscreen, .aok-offscreen');
      for (const element of offscreenElements) {
        const text = element.textContent.trim();
        const price = parseFloat(text.replace(/[^0-9.]/g, ''));

        if (price >= 100 && price <= 5000) {
          // Get context information
          let currentEl = element;
          let context = '';
          let isInCarousel = false;
          let isInMainProduct = false;

          for (let i = 0; i < 5 && currentEl; i++) {
            const id = currentEl.id || '';
            const className = currentEl.className || '';
            context += `${id}.${className} > `;

            if (id.includes('CardInstance') || className.includes('carousel')) {
              isInCarousel = true;
            }
            if (id.includes('corePriceDisplay') || id.includes('priceblock') || id.includes('corePrice')) {
              isInMainProduct = true;
            }

            currentEl = currentEl.parentElement;
          }

          results.offscreenElements.push({
            text: text,
            price: price,
            context: context.substring(0, 200),
            isInCarousel: isInCarousel,
            isInMainProduct: isInMainProduct,
            parentId: element.parentElement?.id || '',
            parentClass: element.parentElement?.className || ''
          });
        }
      }

      // 3. VISIBLE PRICE ELEMENTS
      const visibleSelectors = ['.a-price', '.offer-price', '.a-price-whole', '.a-price-fraction'];
      for (const selector of visibleSelectors) {
        const elements = document.querySelectorAll(selector);
        for (const element of elements) {
          const text = element.textContent.trim();
          const price = parseFloat(text.replace(/[^0-9.]/g, ''));
          if (price >= 100 && price <= 5000) {
            results.visiblePrices.push({
              selector: selector,
              text: text,
              price: price,
              id: element.id,
              className: element.className
            });
          }
        }
      }

      // 4. CATEGORIZE BY MAIN PRODUCT VS CAROUSEL
      results.offscreenElements.forEach(elem => {
        if (elem.isInMainProduct || elem.context.includes('corePriceDisplay')) {
          results.mainProductPrices.push(elem);
        } else if (elem.isInCarousel || elem.context.includes('CardInstance')) {
          results.carouselPrices.push(elem);
        }
      });

      return results;
    });

    // Display results
    console.log('\n📊 COMPREHENSIVE PRICE ANALYSIS:');
    console.log('=' .repeat(60));

    console.log('\n🔒 HIDDEN INPUT ELEMENTS:');
    analysis.hiddenInputs.forEach((input, i) => {
      console.log(`  ${i + 1}. ${input.id || 'no-id'} = $${input.price}`);
      console.log(`     Value: "${input.value}" | Type: ${input.type}`);
    });

    console.log('\n🎯 MAIN PRODUCT PRICES:');
    analysis.mainProductPrices.forEach((price, i) => {
      console.log(`  ${i + 1}. $${price.price} - "${price.text}"`);
      console.log(`     Context: ${price.context.substring(0, 100)}...`);
    });

    console.log('\n🎠 CAROUSEL/RELATED PRODUCT PRICES:');
    analysis.carouselPrices.forEach((price, i) => {
      console.log(`  ${i + 1}. $${price.price} - "${price.text}"`);
      console.log(`     Context: ${price.context.substring(0, 100)}...`);
    });

    console.log('\n👀 ALL OFFSCREEN ELEMENTS:');
    analysis.offscreenElements.forEach((elem, i) => {
      const type = elem.isInMainProduct ? '🎯 MAIN' : elem.isInCarousel ? '🎠 CAROUSEL' : '❓ OTHER';
      console.log(`  ${i + 1}. ${type} $${elem.price} - "${elem.text}"`);
      console.log(`     Parent: ${elem.parentId}.${elem.parentClass.substring(0, 50)}`);
    });

    console.log('\n💰 VISIBLE PRICE ELEMENTS:');
    analysis.visiblePrices.slice(0, 10).forEach((price, i) => {
      console.log(`  ${i + 1}. $${price.price} via ${price.selector}`);
      console.log(`     Text: "${price.text}" | Class: ${price.className.substring(0, 50)}`);
    });

    console.log('\n\n🎯 CONCLUSION:');
    const mainPrices = [...new Set(analysis.mainProductPrices.map(p => p.price))];
    const carouselPrices = [...new Set(analysis.carouselPrices.map(p => p.price))];
    const hiddenPrices = [...new Set(analysis.hiddenInputs.map(p => p.price))];

    console.log(`📍 Main Product Prices: ${mainPrices.length > 0 ? mainPrices.join(', ') : 'None detected'}`);
    console.log(`🎠 Carousel Prices: ${carouselPrices.length > 0 ? carouselPrices.join(', ') : 'None detected'}`);
    console.log(`🔒 Hidden Input Prices: ${hiddenPrices.length > 0 ? hiddenPrices.join(', ') : 'None detected'}`);

    if (hiddenPrices.includes(589.41)) {
      console.log('\n✅ $589.41 is in hidden inputs - likely the current accurate price');
    }
    if (carouselPrices.includes(469.99)) {
      console.log('⚠️ $469.99 found in carousel - likely a related/discounted product');
    }

  } catch (error) {
    console.error('❌ Analysis failed:', error);
  } finally {
    if (browser) {
      await browser.close();
    }
  }

  process.exit(0);
}

analyzeASUSPriceElements().catch(console.error);