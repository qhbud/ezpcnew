const puppeteer = require('puppeteer');

async function analyzeUnavailableProducts() {
  console.log('🔍 ANALYZING UNAVAILABLE/SOLD OUT PRODUCT INDICATORS\n');

  // Test URLs - some should be sold out/unavailable
  const testUrls = [
    {
      name: 'MSI Gaming RTX 4070 Ventus 2X (Renewed)',
      url: 'https://amazon.com/MSI-GeForce-Lovelace-Architecture-Graphics/dp/B0CBQV398S',
      expectedStatus: 'possibly unavailable'
    },
    {
      name: 'MSI Gaming RTX 4070 Super Ventus 3X',
      url: 'https://amazon.com/MSI-RTX-4070-12G-3X/dp/B0CSHFM3D5',
      expectedStatus: 'possibly unavailable'
    },
    {
      name: 'ASUS Dual RTX 4070 EVO (High Price)',
      url: 'https://amazon.com/ASUS-Compatibility-Axial-tech-Technology-Auto-Extreme/dp/B0CQRX9HPK',
      expectedStatus: 'available but expensive'
    }
  ];

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    for (const testCase of testUrls) {
      console.log(`\n🔬 ANALYZING: ${testCase.name}`);
      console.log(`🌐 URL: ${testCase.url.substring(0, 80)}...`);
      console.log(`📋 Expected: ${testCase.expectedStatus}`);
      console.log('=' .repeat(70));

      const page = await browser.newPage();
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');

      try {
        await page.goto(testCase.url, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await page.waitForTimeout(4000);

        const availability = await page.evaluate(() => {
          const indicators = {
            availabilityText: [],
            buyBoxPresent: false,
            priceElements: [],
            stockIndicators: [],
            buttonTexts: [],
            messageTexts: [],
            unavailabilityKeywords: []
          };

          console.log('🔍 Searching for availability indicators...');

          // 1. CHECK BUY BOX PRESENCE
          const buyBox = document.querySelector('#buybox, #rightCol, #desktop_buybox');
          indicators.buyBoxPresent = !!buyBox;

          // 2. AVAILABILITY TEXT SEARCHES
          const availabilitySelectors = [
            '#availability span',
            '.a-color-success',
            '.a-color-state',
            '.a-color-price',
            '#merchant-info',
            '#availability .a-size-medium',
            '.a-alert-content'
          ];

          for (const selector of availabilitySelectors) {
            const elements = document.querySelectorAll(selector);
            for (const element of elements) {
              const text = element.textContent.trim();
              if (text && text.length > 0 && text.length < 200) {
                indicators.availabilityText.push({
                  selector: selector,
                  text: text
                });
              }
            }
          }

          // 3. BUTTON TEXT ANALYSIS
          const buttons = document.querySelectorAll('button, input[type="submit"], .a-button');
          for (const button of buttons) {
            const text = button.textContent.trim();
            if (text && text.length > 0 && text.length < 100) {
              indicators.buttonTexts.push(text);
            }
          }

          // 4. STOCK/AVAILABILITY KEYWORDS
          const unavailabilityKeywords = [
            'currently unavailable',
            'out of stock',
            'temporarily out of stock',
            'sold out',
            'not available',
            'unavailable',
            'item is no longer available',
            'this item cannot be shipped',
            'see all buying options',
            'other sellers',
            'marketplace sellers'
          ];

          const bodyText = document.body.textContent.toLowerCase();
          for (const keyword of unavailabilityKeywords) {
            if (bodyText.includes(keyword.toLowerCase())) {
              indicators.unavailabilityKeywords.push(keyword);
            }
          }

          // 5. PRICE ELEMENT ANALYSIS
          const priceSelectors = [
            '.a-price',
            '#priceblock_dealprice',
            '#priceblock_ourprice',
            '.a-offscreen'
          ];

          for (const selector of priceSelectors) {
            const elements = document.querySelectorAll(selector);
            for (const element of elements) {
              const text = element.textContent.trim();
              const price = parseFloat(text.replace(/[^0-9.]/g, ''));
              if (price >= 100 && price <= 5000) {
                indicators.priceElements.push({
                  selector: selector,
                  text: text,
                  price: price
                });
              }
            }
          }

          // 6. SPECIFIC STOCK INDICATORS
          const stockSelectors = [
            '[data-feature-name="availability"]',
            '#availability',
            '.a-alert-content',
            '#merchant-info'
          ];

          for (const selector of stockSelectors) {
            const elements = document.querySelectorAll(selector);
            for (const element of elements) {
              const text = element.textContent.trim();
              if (text && text.length > 0 && text.length < 300) {
                indicators.stockIndicators.push({
                  selector: selector,
                  text: text
                });
              }
            }
          }

          return indicators;
        });

        // Analyze results
        console.log('\n📊 AVAILABILITY ANALYSIS:');

        console.log(`\n🛒 Buy Box Present: ${availability.buyBoxPresent ? '✅ YES' : '❌ NO'}`);

        if (availability.unavailabilityKeywords.length > 0) {
          console.log(`\n⚠️ UNAVAILABILITY KEYWORDS FOUND:`);
          availability.unavailabilityKeywords.forEach((keyword, i) => {
            console.log(`   ${i + 1}. "${keyword}"`);
          });
        }

        if (availability.availabilityText.length > 0) {
          console.log(`\n📝 AVAILABILITY TEXT:`);
          availability.availabilityText.slice(0, 5).forEach((item, i) => {
            console.log(`   ${i + 1}. ${item.selector}: "${item.text}"`);
          });
        }

        if (availability.stockIndicators.length > 0) {
          console.log(`\n📦 STOCK INDICATORS:`);
          availability.stockIndicators.slice(0, 3).forEach((item, i) => {
            console.log(`   ${i + 1}. ${item.selector}: "${item.text}"`);
          });
        }

        if (availability.buttonTexts.length > 0) {
          console.log(`\n🔘 BUTTON TEXTS:`);
          const uniqueButtons = [...new Set(availability.buttonTexts)];
          uniqueButtons.slice(0, 5).forEach((text, i) => {
            console.log(`   ${i + 1}. "${text}"`);
          });
        }

        if (availability.priceElements.length > 0) {
          console.log(`\n💰 PRICE ELEMENTS:`);
          availability.priceElements.slice(0, 3).forEach((item, i) => {
            console.log(`   ${i + 1}. ${item.selector}: $${item.price} ("${item.text}")`);
          });
        }

        // Determine availability status
        const isUnavailable = availability.unavailabilityKeywords.length > 0 ||
                             !availability.buyBoxPresent ||
                             availability.buttonTexts.some(text =>
                               text.toLowerCase().includes('see all buying options') ||
                               text.toLowerCase().includes('other sellers')
                             );

        console.log(`\n🎯 AVAILABILITY STATUS: ${isUnavailable ? '❌ UNAVAILABLE' : '✅ AVAILABLE'}`);

      } catch (error) {
        console.log(`❌ Error analyzing ${testCase.name}: ${error.message}`);
      }

      await page.close();
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

  } catch (error) {
    console.error('❌ Analysis failed:', error);
  } finally {
    if (browser) {
      await browser.close();
    }
  }

  console.log('\n\n🎯 UNAVAILABILITY DETECTION PATTERNS IDENTIFIED:');
  console.log('✅ Keywords: "currently unavailable", "out of stock", "sold out"');
  console.log('✅ Missing buy box (#buybox, #rightCol)');
  console.log('✅ Button text: "See all buying options", "Other sellers"');
  console.log('✅ Availability messages in #availability selector');

  process.exit(0);
}

analyzeUnavailableProducts().catch(console.error);