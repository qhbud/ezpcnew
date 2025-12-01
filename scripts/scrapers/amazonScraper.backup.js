const BaseScraper = require('./baseScraper');
const ProductFilter = require('../utils/productFilter');
const CPUProductFilter = require('../utils/cpuProductFilter');
const MotherboardProductFilter = require('../utils/motherboardProductFilter');
const RAMProductFilter = require('../utils/ramProductFilter');
const PSUProductFilter = require('../utils/psuProductFilter');
const CoolerProductFilter = require('../utils/coolerProductFilter');
const PriceExtractor = require('../utils/priceExtractor');
const Logger = require('../utils/logger');
const ProgressTracker = require('../utils/progressTracker');
const StealthMode = require('../utils/stealthMode');

class AmazonScraper extends BaseScraper {
  constructor(siteType, selectors) {
    super(siteType, selectors);
    this.stealthMode = new StealthMode();
  }
  async waitForContent(page) {
    try {
      // Detect if we're on a search results page or a direct product page
      const pageType = await page.evaluate(() => {
        const hasSearchResults = document.querySelector('[data-component-type="s-search-result"]') !== null;
        const hasProductTitle = document.querySelector('#productTitle') !== null;
        const isProductPage = document.querySelector('#dp, #centerCol') !== null;
        
        if (hasSearchResults) return 'search';
        if (hasProductTitle || isProductPage) return 'product';
        return 'unknown';
      });
      
      Logger.scraping(this.siteType, `Detected page type: ${pageType}`);
      
      if (pageType === 'search') {
        Logger.scraping(this.siteType, 'Waiting for search results to load...');
        await page.waitForSelector(this.selectors.searchResults, { timeout: 15000 });
        Logger.scraping(this.siteType, 'Search results loaded successfully');
      } else if (pageType === 'product') {
        Logger.scraping(this.siteType, 'Direct product page detected, waiting for product content...');
        await page.waitForSelector('#productTitle, #dp', { timeout: 15000 });
        Logger.scraping(this.siteType, 'Product page loaded successfully');
      } else {
        Logger.warn('Unknown Amazon page type, proceeding anyway...');
      }
      
      await page.waitForTimeout(2000);
      
    } catch (error) {
      Logger.warn(`Amazon page content not found: ${error.message}`);
      // Try to take a screenshot for debugging
      try {
        await page.screenshot({ path: 'amazon-debug.png', fullPage: true });
        Logger.info('Screenshot saved as amazon-debug.png for debugging');
      } catch (screenshotError) {
        Logger.debug('Could not take screenshot');
      }
      throw error;
    }
  }

  async scrape(page, cardName, filterType = 'gpu') {
    try {
      Logger.scraping(this.siteType, 'Starting scrape...');
      
      await this.waitForContent(page);
      const products = await this.extractProducts(page, cardName, filterType);
      
      Logger.scraping(this.siteType, `Found ${products.length} matching products`);
      return products;
      
    } catch (error) {
      Logger.error(`Error scraping ${this.siteType}: ${error.message}`);
      return [];
    }
  }

  async extractProducts(page, cardName, filterType = 'gpu') {
    // Check if we're on a direct product page or search results
    const currentUrl = page.url();
    const isDirectProductPage = currentUrl.includes('/dp/');
    
    if (isDirectProductPage) {
      Logger.scraping(this.siteType, 'Processing direct product page...');
      return await this.extractFromDirectProductPage(page, cardName, filterType);
    } else {
      // Extract product URLs from search results
      const productUrls = await this.extractProductUrls(page);
      Logger.scraping(this.siteType, `Found ${productUrls.length} product URLs to check`);
      return await this.extractFromSearchResults(page, productUrls, cardName, filterType);
    }
  }
  
  async extractFromDirectProductPage(page, cardName, filterType = 'gpu') {
    const currentUrl = page.url();
    Logger.info(`🔍 Processing direct product page: ${currentUrl.substring(25, 80)}...`);
    
    try {
      // For direct product pages, extract data directly from the current page
      const productData = await this.extractSingleProductFromCurrentPage(page, currentUrl, cardName, true, filterType);
      
      if (productData && productData.isMatch) {
        Logger.success(`✅ Direct product matches: ${productData.rawData.title?.substring(0, 80)}...`);
        return [productData.product];
      } else if (productData) {
        Logger.warn(`❌ Direct product doesn't match RTX 4070: ${productData.rawData.title?.substring(0, 80)}...`);
      } else {
        Logger.error(`❌ Failed to extract data from direct product page`);
      }
      
      // Still show debug info even if not matching
      this.logAllProductsFound([productData].filter(Boolean), cardName);
      
      return [];
      
    } catch (error) {
      Logger.error(`Error processing direct product page: ${error.message}`);
      return [];
    }
  }
  
  async extractFromSearchResults(page, productUrls, cardName, filterType = 'gpu') {
    const products = [];
    const allProductsFound = []; // Track all products for debugging
    const maxProducts = Math.min(25, productUrls.length);
    
    // Initialize progress tracker
    const progressTracker = new ProgressTracker();
    const progressBar = progressTracker.createSimpleBar(maxProducts, 
      '🔍 Scraping: [{bar}] {percentage}% | {value}/{total} products | {status} | ETA: {eta_formatted}'
    );
    
    progressBar.start(maxProducts, 0, { status: 'Initializing...' });
    
    for (let i = 0; i < maxProducts; i++) {
      const productUrl = productUrls[i];
      
      // Update progress bar
      const statusText = `Product ${i + 1}/${maxProducts} - Extracting...`;
      progressBar.update(i, { status: statusText });
      
      Logger.info(`🔍 Checking product ${i + 1}/${maxProducts}: ${productUrl.substring(25, 80)}...`);
      
      try {
        Logger.info(`🚀 Starting extraction for product ${i + 1}...`);
        
        // Update progress with extraction status
        progressBar.update(i, { status: `Product ${i + 1} - Analyzing page...` });
        
        const productData = await this.extractSingleProduct(productUrl, cardName, true, 5, filterType); // Pass debug flag and filterType
        Logger.info(`🏁 Extraction completed for product ${i + 1}, isMatch: ${productData?.isMatch || 'unknown'}`);
        
        if (productData) {
          Logger.info(`📊 Product ${i + 1} data available: Title=${productData.rawData?.title ? 'YES' : 'NO'}, Price=${productData.rawData?.basePrice ? 'YES' : 'NO'}`);
          
          if (productData.isMatch) {
            products.push(productData.product);
            Logger.info(`✅ Product ${i + 1} MATCHED and ADDED to results`);
            progressBar.update(i + 1, { status: `Product ${i + 1} - ✅ MATCHED (${products.length} found)` });
          } else {
            Logger.info(`❌ Product ${i + 1} did not match criteria`);
            progressBar.update(i + 1, { status: `Product ${i + 1} - ❌ No match` });
          }
          allProductsFound.push(productData);
        } else {
          Logger.warn(`❌ Product ${i + 1} returned no data`);
          progressBar.update(i + 1, { status: `Product ${i + 1} - ❌ No data` });
        }
        
        // Use smart delay system with enhanced anti-detection
        const blockedCount = allProductsFound.filter(p => 
          p && p.rawData && p.rawData.debugInfo && 
          p.rawData.debugInfo.finalTitle === 'BLOCKED_BY_AMAZON'
        ).length;
        
        // Base delay increases with blocked count
        const baseDelay = 8000 + (blockedCount * 3000); // 8s + 3s per block
        const variance = 7000 + (blockedCount * 2000); // 7s + 2s variance per block
        
        Logger.info(`⏳ Using smart delay system (blocked count: ${blockedCount})...`);
        
        // Update progress bar during delay
        progressBar.update(i + 1, { 
          status: `Smart delay before product ${i + 2}...` 
        });
        
        // Use stealth mode's smart delay system
        const workerId = `main_scraper_${i}`;
        await this.stealthMode.smartDelay(baseDelay, variance, workerId);
        
      } catch (error) {
        Logger.error(`Error checking product ${i + 1}: ${error.message}`);
        
        // Add the failed product to our tracking for debugging
        allProductsFound.push({
          isMatch: false,
          matchesSearch: false,
          isValidProduct: false,
          product: null,
          rawData: {
            title: 'PROCESSING_ERROR',
            basePrice: null,
            salePrice: null,
            isOnSale: false,
            imageUrl: null,
            url: productUrl,
            debugInfo: {
              finalTitle: 'PROCESSING_ERROR',
              finalBasePrice: 'PROCESSING_ERROR', 
              finalSalePrice: 'PROCESSING_ERROR',
              finalOnSale: false,
              finalImage: 'PROCESSING_ERROR',
              extractionSuccess: false,
              processingError: error.message
            }
          }
        });
        
        // Update progress bar for failed product
        progressBar.update(i + 1, { status: `Product ${i + 1} - ❌ Failed` });
        
        Logger.warn(`⏭️  Continuing with next product...`);
      }
    }
    
    // Complete progress bar
    const matchedCount = allProductsFound.filter(p => p.isMatch).length;
    progressBar.update(maxProducts, { 
      status: `Complete! Found ${matchedCount} matching products` 
    });
    progressBar.stop();
      
    // Log all products found for debugging
    this.logAllProductsFound(allProductsFound, cardName);
      
    return products;
  }

  async extractProductUrls(page) {
    return await page.evaluate((selectors) => {
      const urls = [];
      const items = document.querySelectorAll(selectors.searchResults);
      
      console.log(`🔍 Amazon: Found ${items.length} search result items`);
      
      items.forEach((item, index) => {
        try {
          for (const linkSelector of selectors.productLinks) {
            const linkElement = item.querySelector(linkSelector);
            if (linkElement) {
              const href = linkElement.getAttribute('href');
              if (href && href.includes('/dp/')) {
                const fullUrl = href.startsWith('http') ? href : `https://amazon.com${href}`;
                urls.push(fullUrl);
                console.log(`🔗 Amazon: Found product URL ${index + 1}: ${fullUrl.substring(0, 80)}...`);
                break;
              }
            }
          }
        } catch (e) {
          console.log(`❌ Amazon: Error processing item ${index + 1}: ${e.message}`);
        }
      });
      
      console.log(`🔍 Amazon: Extracted ${urls.length} product URLs total`);
      return urls;
    }, this.selectors);
  }

  async extractSingleProductFromCurrentPage(page, productUrl, cardName, includeDebug = false, filterType = 'gpu') {
    // Extract data from the current page (for direct product URLs)
    try {
      const productData = await this.performProductExtraction(page, productUrl, cardName);
      return this.processProductData(productData, productUrl, cardName, includeDebug, filterType);
    } catch (error) {
      throw error;
    }
  }

  async extractSingleProduct(productUrl, cardName, includeDebug = false, maxRetries = 5, filterType = 'gpu') {
    let lastError = null;
    const workerId = `amazon_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Try up to maxRetries times with different strategies
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      // Use stealth mode to create enhanced page
      const productPage = await this.stealthMode.setupStealthBrowser(this.browser, workerId);
      
      try {
        Logger.info(`🔄 Opening new page for: ${productUrl.substring(25, 80)}... (attempt ${attempt}/${maxRetries})`);
        
        // Progressive delay based on attempt number (longer delays for retries)
        if (attempt > 1) {
          await this.stealthMode.smartDelay(5000, 5000, workerId); // Smart delay instead of basic timeout
        }

        // Simulate human behavior before navigation
        await this.stealthMode.simulateHumanBehavior(productPage, workerId);
        
        Logger.debug(`🌐 Navigating to product page...`);
        let navigationSuccess = false;
        
        // Try multiple navigation strategies in order of preference (more aggressive timeouts for retries)
        const timeoutMultiplier = attempt > 1 ? 1.5 : 1; // Longer timeouts for retries
        const navStrategies = [
          { waitUntil: 'domcontentloaded', timeout: Math.round(25000 * timeoutMultiplier), name: 'domcontentloaded' },
          { waitUntil: 'load', timeout: Math.round(20000 * timeoutMultiplier), name: 'load' },
          { waitUntil: 'networkidle2', timeout: Math.round(30000 * timeoutMultiplier), name: 'networkidle2' },
          { waitUntil: 'networkidle0', timeout: Math.round(15000 * timeoutMultiplier), name: 'networkidle0' }
        ];
        
        for (const strategy of navStrategies) {
          try {
            Logger.debug(`🔄 Trying navigation with ${strategy.name} (${strategy.timeout}ms timeout)...`);
            await productPage.goto(productUrl, { 
              waitUntil: strategy.waitUntil, 
              timeout: strategy.timeout 
            });
            Logger.debug(`✅ Product page loaded successfully with ${strategy.name}`);
            navigationSuccess = true;
            break;
          } catch (navError) {
            Logger.warn(`⚠️ Navigation failed with ${strategy.name}: ${navError.message}`);
            if (strategy === navStrategies[navStrategies.length - 1]) {
              // Last strategy failed, try one final bare minimum approach
              try {
                Logger.debug(`🔄 Final attempt: basic page load without wait conditions...`);
                await productPage.goto(productUrl, { timeout: 8000 });
                // Give it a moment to load some content
                await productPage.waitForTimeout(3000);
                Logger.debug(`✅ Basic page load completed`);
                navigationSuccess = true;
                break;
              } catch (finalError) {
                Logger.error(`❌ All navigation strategies failed: ${finalError.message}`);
              }
            }
          }
        }
        
        if (!navigationSuccess) {
          throw new Error('Failed to load page with any navigation strategy');
        }
        
        // Check for blocking before extraction
        const isBlocked = await this.stealthMode.detectAndHandleBlocking(productPage, workerId);
        if (isBlocked && attempt < maxRetries) {
          Logger.warn(`⚠️ Blocking detected on attempt ${attempt}, will retry...`);
          await this.stealthMode.cleanupSession(workerId);
          lastError = new Error('Page blocked by Amazon - stealth detection');
          continue;
        }

        Logger.debug(`📊 Starting product data extraction...`);
        const productData = await this.performProductExtraction(productPage, productUrl, cardName);
        Logger.debug(`📊 Product data extracted, processing...`);
        
        // Add human behavior simulation during processing
        await this.stealthMode.simulateHumanBehavior(productPage, workerId);
        
        const result = this.processProductData(productData, productUrl, cardName, includeDebug, filterType);
        
        // Check if this attempt was blocked (fallback detection)
        if (productData.debug && productData.debug.finalTitle === 'BLOCKED_BY_AMAZON' && attempt < maxRetries) {
          Logger.warn(`⚠️ Attempt ${attempt} was blocked by Amazon, will retry...`);
          await this.stealthMode.cleanupSession(workerId);
          lastError = new Error('Page blocked by Amazon');
          continue; // Try again with different fingerprint
        }
        
        Logger.debug(`🚪 Cleaning up session...`);
        await this.stealthMode.cleanupSession(workerId);
        Logger.debug(`✅ Product processing completed`);
        return result;
        
      } catch (error) {
        await this.stealthMode.cleanupSession(workerId);
        lastError = error;
        
        if (attempt < maxRetries) {
          Logger.warn(`⚠️ Attempt ${attempt} failed: ${error.message}, retrying...`);
          continue;
        } else {
          Logger.error(`❌ All ${maxRetries} attempts failed for product`);
          
          // Instead of throwing and stopping the entire process, return a "failed" result
          // This allows the scraper to continue with other products
          Logger.warn(`⏭️  Skipping this product and continuing with others...`);
          return {
            isMatch: false,
            matchesSearch: false,
            isValidProduct: false,
            product: null,
            rawData: {
              title: 'EXTRACTION_COMPLETELY_FAILED',
              basePrice: null,
              salePrice: null,
              isOnSale: false,
              imageUrl: null,
              url: productUrl,
              debugInfo: {
                finalTitle: 'ALL_ATTEMPTS_FAILED',
                finalBasePrice: 'ALL_ATTEMPTS_FAILED', 
                finalSalePrice: 'ALL_ATTEMPTS_FAILED',
                finalOnSale: false,
                finalImage: 'ALL_ATTEMPTS_FAILED',
                extractionSuccess: false,
                lastError: error.message
              }
            }
          };
        }
      }
    }
    
    // If we get here, all retries failed
    throw lastError || new Error('All retry attempts failed');
  }
  
  async performProductExtraction(page, productUrl, cardName) {
    try {
      // Check if we can find basic page elements first
      const pageCheck = await page.evaluate(() => {
        return {
          hasTitle: !!document.querySelector('#productTitle'),
          hasPrice: !!document.querySelector('.a-price'),
          pageTitle: document.title,
          bodyLength: document.body ? document.body.textContent.length : 0,
          url: window.location.href
        };
      });
      
      Logger.info(`🔍 Page check for ${productUrl.substring(50, 90)}...: hasTitle=${pageCheck.hasTitle}, hasPrice=${pageCheck.hasPrice}, bodyLength=${pageCheck.bodyLength}`);
      
      if (pageCheck.bodyLength < 5000) {
        Logger.warn(`⚠️ Page seems incomplete or blocked (${pageCheck.bodyLength} chars, pageTitle: "${pageCheck.pageTitle}")`);
        
        // Check if this looks like a captcha or blocking page
        if (pageCheck.bodyLength < 2000) {
          Logger.error(`❌ Page appears to be blocked by Amazon (${pageCheck.bodyLength} chars). Skipping this product.`);
          return {
            title: null,
            basePrice: null,
            salePrice: null,
            isOnSale: false,
            imageUrl: null,
            debug: {
              finalTitle: 'BLOCKED_BY_AMAZON',
              finalBasePrice: 'BLOCKED_BY_AMAZON',
              finalSalePrice: 'BLOCKED_BY_AMAZON',
              finalOnSale: false,
              finalImage: 'BLOCKED_BY_AMAZON',
              extractionSuccess: false,
              pageCheck
            }
          };
        }
        
        Logger.info(`⏳ Waiting 5 seconds for page to fully load...`);
        await page.waitForTimeout(5000);
      }
      
      // Add a timeout wrapper for the evaluation
      const extractionPromise = page.evaluate((selectors) => {
        console.log('🚀 Starting product data extraction...');
        // Extract title with comprehensive selector fallback
        console.log(`🔍 Looking for title with primary selector: ${selectors.title}`);
        let titleEl = document.querySelector(selectors.title);
        let title = titleEl?.textContent?.trim() || null;
        
        if (!title) {
          console.log(`❌ Primary title selector failed, trying alternatives...`);
          // Try comprehensive alternative title selectors
          const altSelectors = [
            'h1[id*="title"]',                    // Any h1 with title in id
            'h1.a-size-large',                     // Amazon's large heading
            'span[id*="productTitle"]',            // Span with productTitle in id
            '.a-size-large.product-title',         // Product title with size class
            '[data-automation-id="title"]',       // Automation title
            '.a-size-extra-large',                 // Extra large text
            'h1',                                  // Any h1
            '.s-size-mini .a-color-base',          // Search result title
            'h2 a span',                           // Search result nested span
            '.a-link-normal .a-size-base-plus'     // Link with base plus size
          ];
          
          for (const altSelector of altSelectors) {
            const altEl = document.querySelector(altSelector);
            if (altEl && altEl.textContent.trim() && altEl.textContent.trim().length > 5) {
              title = altEl.textContent.trim();
              console.log(`✅ Found title with selector "${altSelector}": "${title.substring(0, 80)}..."`);
              break;
            }
          }
        } else {
          console.log(`✅ Title found with primary selector: "${title.substring(0, 80)}..."`);
        }
        
        console.log(`📄 Final title: "${title || 'No title found'}"`);
        
        // Extract prices using aok-offscreen priority approach
        let basePrice = null;
        let salePrice = null;
        let isOnSale = false;
        
        // No price range restrictions - accept all valid prices
        
        console.log('🔍 Amazon Price Detection: Using .aok-offscreen priority approach');
        
        // Check if we're on a product page vs search results page
        const isProductPage = document.querySelector('#productTitle, #dp') !== null;
        console.log(`🔍 Page type: ${isProductPage ? 'Product page' : 'Search results page'}`);
        
        // For product pages, focus on main product area
        let mainProductArea = document;
        if (isProductPage) {
          mainProductArea = document.querySelector('#centerCol, #dp, #dp-container, .dp-wrap') || document;
          console.log(`🔍 Using product area: ${mainProductArea === document ? 'entire page' : mainProductArea.id || mainProductArea.className}`);
        }
        
        // PRIORITY 1: Enhanced price detection with multiple strategies
        console.log(`🔍 Starting comprehensive price detection...`);

        let finalPrice = null;
        let allCandidates = [];

        // Strategy 1: Look for .aok-offscreen elements with enhanced validation
        const aokElements = mainProductArea.querySelectorAll('.aok-offscreen');
        console.log(`📍 Strategy 1 - .aok-offscreen elements: found ${aokElements.length}`);

        for (let i = 0; i < aokElements.length; i++) {
          const el = aokElements[i];
          const text = el.textContent.trim();
          console.log(`   aok-offscreen[${i}]: "${text}"`);

          // Extract price from text
          const priceMatch = text.match(/\$?([\d,]+\.?\d*)/);
          if (priceMatch) {
            const price = parseFloat(priceMatch[1].replace(/,/g, ''));

            // Enhanced validation: reasonable GPU price range
            if (price >= 100 && price <= 5000) {
              // Context scoring for this element
              let contextScore = 1;

              // Get parent element context
              const parentEl = el.parentElement;
              const parentClasses = (parentEl?.className || '').toLowerCase();
              const parentText = (parentEl?.textContent || '').toLowerCase();

              // Look for price-related parent classes and content
              const isPriceContainer = parentClasses.includes('price') ||
                                     parentClasses.includes('a-price') ||
                                     parentText.includes('price');

              // Enhanced context analysis
              const nearbyText = (parentEl?.parentElement?.textContent || '').toLowerCase();

              // HIGHEST PRIORITY: Current price indicators
              if (parentClasses.includes('a-price-current') ||
                  nearbyText.includes('current price') ||
                  parentText.includes('current')) {
                contextScore += 5;
                console.log(`     🎯 CURRENT PRICE indicator (+5): ${parentClasses}`);
              }

              // HIGH PRIORITY: Main price areas
              if (isPriceContainer) {
                contextScore += 3;
                console.log(`     💰 Price container (+3): ${parentClasses}`);
              }

              // PENALTIES: Avoid shipping, tax, list price areas
              if (parentText.includes('shipping') || parentText.includes('tax') ||
                  parentText.includes('handling') || parentText.includes('list price') ||
                  parentText.includes('typical') || parentText.includes('was')) {
                contextScore -= 3;
                console.log(`     ❌ Penalty (-3): shipping/tax/list detected`);
              }

              // BONUS: Position preference (prices near top are often current)
              try {
                const rect = el.getBoundingClientRect();
                if (rect.top < window.innerHeight / 3) {
                  contextScore += 1;
                  console.log(`     📍 Position bonus (+1): above fold`);
                }
              } catch (e) {
                // Ignore positioning errors
              }

              allCandidates.push({
                price: price,
                text: text,
                element: el,
                strategy: 'aok-offscreen',
                contextScore: contextScore,
                index: i,
                parentClasses: parentClasses,
                parentText: parentText.substring(0, 100)
              });

              console.log(`     ✅ Candidate: $${price} (score: ${contextScore})`);
            } else {
              console.log(`     ❌ Price $${price} outside valid range (100-5000)`);
            }
          }
        }

        // Strategy 2: Look for .a-price-whole + .a-price-decimal combinations
        console.log(`📍 Strategy 2 - .a-price-whole combinations...`);
        const wholePriceElements = mainProductArea.querySelectorAll('.a-price-whole');

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

              // Avoid strikethrough prices (these are usually "was" prices)
              if (parentClasses.includes('a-text-strike') ||
                  parentText.includes('was') ||
                  parentText.includes('list')) {
                contextScore -= 4;
                console.log(`     ❌ Strikethrough/list price penalty (-4)`);
              } else {
                console.log(`     ✅ Clean price element (+0)`);
              }

              // Bonus for current price indicators
              if (parentClasses.includes('a-price-current')) {
                contextScore += 3;
                console.log(`     🎯 Current price bonus (+3)`);
              }

              allCandidates.push({
                price: price,
                text: `${wholeEl.textContent}${decimalEl?.textContent || ''}`,
                element: wholeEl,
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
            // If scores are equal, prefer aok-offscreen over whole-decimal
            const strategyOrder = { 'aok-offscreen': 2, 'whole-decimal': 1 };
            return (strategyOrder[b.strategy] || 0) - (strategyOrder[a.strategy] || 0);
          });

          const bestCandidate = allCandidates[0];
          console.log(`🏆 SELECTED BEST: $${bestCandidate.price} (${bestCandidate.strategy}, score: ${bestCandidate.contextScore})`);

          // Log all candidates for debugging
          console.log('🔍 All price candidates found:');
          allCandidates.forEach((candidate, idx) => {
            const selected = idx === 0 ? ' ✅ SELECTED' : '';
            console.log(`   ${idx + 1}. $${candidate.price} (${candidate.strategy}, score: ${candidate.contextScore})${selected}`);
            console.log(`      Text: "${candidate.text}"`);
            console.log(`      Parent: "${candidate.parentClasses}"`);
            console.log(`      Context: "${candidate.parentText}..."`);
          });

          finalPrice = bestCandidate.price;
        }

        // If we found a good price candidate, use it
        if (finalPrice) {
          basePrice = finalPrice;
          console.log(`💰 Final price selected: $${finalPrice}`);
        } else {
          console.log('❌ No valid price candidates found');
        }

        // Simple sale detection (check for strikethrough prices indicating sales)
        if (basePrice) {
          console.log('🔍 Checking for sale price indicators...');

          // Look for strikethrough prices (these indicate the original price)
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

        // FALLBACK: If no price found, try traditional selectors
        if (!basePrice) {
          console.log('🔍 Fallback: Using traditional price detection...');

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
                console.log(`💰 Fallback price found: $${basePrice} from ${selector}`);
                break;
              }
            }
          }
        }
                const price = parseFloat(typicalPriceMatch[1].replace(/,/g, ''));
                if (price && price >= 200 && price <= 5000 && price > aokPriceInfo.price) {
                  typicalPrice = price;
                  console.log(`💰 Found typical price via text pattern: $${typicalPrice}`);
                }
              }
            }

            // Look for current sale price (different from the price we already found)
            let currentSalePrice = null;

            // Enhanced current price selectors - prioritize actual current prices
            const currentPriceSelectors = [
              // Highest priority: Amazon's core price feature
              '[data-feature-name="corePrice"] .a-price:not(.a-text-strike) .a-offscreen',
              // Current price indicators
              '.a-price-current .a-offscreen',
              // Buybox prices (main purchase area)
              '#price_inside_buybox .a-price:not(.a-text-strike):not(.a-price-original) .a-offscreen',
              // General non-strikethrough prices
              '.a-price:not(.a-text-strike):not(.a-price-original):not(.a-price-secondary) .a-offscreen',
              // Buy box area prices
              '#buybox .a-price:not(.a-text-strike) .a-offscreen',
              // Product pricing area
              '#priceblock_ourprice .a-offscreen',
              '#priceblock_dealprice .a-offscreen',
              // Mobile price selectors
              '.a-size-medium.a-color-price:not(.a-text-strike) .a-offscreen'
            ];

            for (const selector of currentPriceSelectors) {
              const elements = mainProductArea.querySelectorAll(selector);
              console.log(`   Checking current price selector "${selector}": found ${elements.length} elements`);

              for (const el of elements) {
                const priceText = el.textContent.trim();
                const price = parseFloat(priceText.replace(/[^0-9.]/g, ''));
                console.log(`     Current price candidate: "${priceText}" → $${price}`);

                if (price && price >= 200 && price <= 5000 && price !== aokPriceInfo.price) {
                  // Check context to prefer sale prices
                  const parentText = (el.closest('.a-price')?.textContent || '').toLowerCase();
                  const isNotStrikethrough = !el.closest('.a-text-strike, .a-price-original');

                  if (isNotStrikethrough && (!currentSalePrice ||
                      (typicalPrice && price < typicalPrice && price < currentSalePrice))) {
                    currentSalePrice = price;
                    console.log(`💰 Found current sale price candidate: $${currentSalePrice}`);
                  }
                }
              }
            }

            // Determine final pricing structure
            if (typicalPrice && currentSalePrice && currentSalePrice < typicalPrice) {
              // We have a sale: typical price > current sale price
              const discountPercent = Math.round(((typicalPrice - currentSalePrice) / typicalPrice) * 100);

              basePrice = typicalPrice;
              salePrice = currentSalePrice;
              isOnSale = true;

              console.log(`💰 SALE DETECTED: Typical $${basePrice} → Sale $${salePrice} (${discountPercent}% off)`);

            } else if (typicalPrice && aokPriceInfo.price < typicalPrice) {
              // Our original price is actually the sale price
              const discountPercent = Math.round(((typicalPrice - aokPriceInfo.price) / typicalPrice) * 100);

              basePrice = typicalPrice;
              salePrice = aokPriceInfo.price;
              isOnSale = true;

              console.log(`💰 SALE DETECTED (original): Typical $${basePrice} → Sale $${salePrice} (${discountPercent}% off)`);

            } else {
              // No sale detected, use original price
              basePrice = aokPriceInfo.price;
              console.log(`💰 No sale detected, base price: $${basePrice}`);
            }
          }
        }
        
        // FALLBACK: If no .aok-offscreen found, use traditional price detection
        if (!basePrice) {
          console.log('🔍 Fallback: No .aok-offscreen found, using traditional detection...');
          
          let currentPrice = null;
          
          // Traditional price selectors
          const fallbackSelectors = [
            '.a-price:not(.a-text-strike):not(.a-price-original) .a-offscreen',
            '.a-price-current .a-offscreen',
            '[data-feature-name="corePrice"] .a-price .a-offscreen',
            '#price_inside_buybox .a-price .a-offscreen'
          ];
          
          for (const selector of fallbackSelectors) {
            const elements = mainProductArea.querySelectorAll(selector);
            console.log(`   Fallback ${selector}: found ${elements.length} elements`);
            
            for (const el of elements) {
              const priceText = el.textContent.trim();
              const price = parseFloat(priceText.replace(/[^0-9.]/g, ''));
              console.log(`     Text: "${priceText}" → $${price}`);
              
              if (price && price > 0) {
                currentPrice = price;
                console.log(`💰 Fallback price found: $${currentPrice} from ${selector}`);
                break;
              }
            }
            if (currentPrice) break;
          }
          
          // Try price-whole + decimal as fallback
          if (!currentPrice) {
            console.log('🔍 Fallback: price-whole + decimal...');
            const wholeElements = mainProductArea.querySelectorAll('.a-price-whole:not(.a-text-strike *)');
            
            for (const wholeEl of wholeElements) {
              const decimal = wholeEl.parentNode.querySelector('.a-price-decimal, .a-price-fraction');
              const wholeText = wholeEl.textContent.replace(/[^0-9]/g, '');
              const decimalText = decimal ? decimal.textContent.replace(/[^0-9]/g, '') : '00';
              
              if (wholeText) {
                const price = parseFloat(`${wholeText}.${decimalText.padEnd(2, '0').substring(0, 2)}`);
                console.log(`   Whole+Decimal: "${wholeEl.textContent}" + "${decimal?.textContent || ''}" = $${price}`);
                
                if (price && price > 0) {
                  currentPrice = price;
                  console.log(`💰 Fallback price found: $${currentPrice}`);
                  break;
                }
              }
            }
          }

          // ULTRA FALLBACK: Search entire page text for price patterns
          if (!currentPrice) {
            console.log('🔍 Ultra fallback: scanning entire page for price patterns...');
            const pageText = document.body.textContent || '';
            const pricePatterns = [
              /\$\s*([1-9]\d{2,3}(?:\.\d{2})?)/g, // $XXX.XX format
              /([1-9]\d{2,3}(?:\.\d{2})?)\s*dollars?/gi, // XXX dollars format
              /Price:\s*\$\s*([1-9]\d{2,3}(?:\.\d{2})?)/gi // "Price: $XXX" format
            ];
            
            for (const pattern of pricePatterns) {
              const matches = [...pageText.matchAll(pattern)];
              for (const match of matches) {
                const price = parseFloat(match[1]);
                if (price && price >= 200 && price <= 5000) {
                  currentPrice = price;
                  console.log(`💰 Ultra fallback price found: $${currentPrice} via pattern matching`);
                  break;
                }
              }
              if (currentPrice) break;
            }
          }
          
          if (currentPrice) {
            basePrice = currentPrice;
            console.log(`💰 Fallback base price set: $${basePrice}`);
            
            // Still check for sales using traditional methods if needed
            const productAreaText = mainProductArea.textContent || '';
            const listPriceMatch = productAreaText.match(/List Price:\s*\$?([\d,]+\.?\d*)/i);
            
            if (listPriceMatch) {
              const listPrice = parseFloat(listPriceMatch[1].replace(/,/g, ''));
              const discountPercent = ((listPrice - currentPrice) / listPrice) * 100;
              
              if (listPrice > currentPrice && discountPercent >= 5 && discountPercent <= 50 && listPrice > 200) {
                basePrice = listPrice;
                salePrice = currentPrice;
                isOnSale = true;
                console.log(`💰 Fallback sale detected: List $${basePrice} → Current $${salePrice} (${discountPercent.toFixed(1)}% off)`);
              }
            }
          } else {
            console.log(`❌ No valid price found in any fallback method`);
          }
        }
        
        console.log(`💰 Final pricing: Base $${basePrice}, Sale $${salePrice}, On Sale: ${isOnSale}`);
        
        // Extract image with fallbacks
        let imageUrl = null;
        const imageSelectors = [
          '#landingImage',                    // Primary product image
          '#imgBlkFront',                    // Front image
          '.a-dynamic-image',                // Dynamic image
          'img[data-a-image-name="landingImage"]', // Landing image by name
          '.s-image',                        // Search result image
          'img[src*="images-amazon"]',      // Amazon CDN image
          'img[src*="ssl-images-amazon"]',  // SSL images
          'img'                              // Any image as last resort
        ];
        
        for (const selector of imageSelectors) {
          const imgEl = document.querySelector(selector);
          if (imgEl && imgEl.src && imgEl.src.includes('http')) {
            imageUrl = imgEl.src;
            console.log(`🖼️ Found image with selector "${selector}": ${imageUrl.substring(0, 80)}...`);
            break;
          }
        }
        
        if (!imageUrl) {
          console.log(`❌ No image found with any selector`);
        }
        
        // Final validation and return
        const result = {
          title,
          basePrice,
          salePrice,
          isOnSale,
          imageUrl
        };
        
        // Return detailed result for debugging
        return {
          ...result,
          debug: {
            finalTitle: title ? `"${title.substring(0, 80)}..."` : 'NONE',
            finalBasePrice: basePrice ? `$${basePrice}` : 'NONE', 
            finalSalePrice: salePrice ? `$${salePrice}` : 'NONE',
            finalOnSale: isOnSale,
            finalImage: imageUrl ? 'Found' : 'NONE',
            extractionSuccess: !!(title && basePrice)
          }
        };
      }, this.selectors);
      
      // Add a timeout to the extraction process
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Product extraction timed out after 15 seconds')), 15000);
      });
      
      const result = await Promise.race([extractionPromise, timeoutPromise]);
      Logger.debug(`📊 Extraction completed for: ${productUrl.substring(50, 90)}...`);
      return result;
      
    } catch (error) {
      Logger.error(`❌ Product extraction failed for ${productUrl.substring(50, 90)}...: ${error.message}`);
      // Return empty result instead of throwing
      return {
        title: null,
        basePrice: null,
        salePrice: null,
        isOnSale: false,
        imageUrl: null,
        debug: {
          finalTitle: 'EXTRACTION_FAILED',
          finalBasePrice: 'EXTRACTION_FAILED',
          finalSalePrice: 'EXTRACTION_FAILED',
          finalOnSale: false,
          finalImage: 'EXTRACTION_FAILED',
          extractionSuccess: false
        }
      };
    }
  }
  
  processProductData(productData, productUrl, cardName, includeDebug, filterType = 'gpu') {
    // Log debug info from page evaluation
    if (productData.debug) {
      Logger.debug(`🤖 Product ${productUrl.substring(50, 90)}...`);
      Logger.debug(`   Title: ${productData.debug.finalTitle}`);
      Logger.debug(`   Base Price: ${productData.debug.finalBasePrice}`);
      Logger.debug(`   Sale Price: ${productData.debug.finalSalePrice}`);
      Logger.debug(`   On Sale: ${productData.debug.finalOnSale}`);
      Logger.debug(`   Image: ${productData.debug.finalImage}`);
      Logger.debug(`   Extraction Success: ${productData.debug.extractionSuccess}`);
    }
    
    // Choose the appropriate filter based on the component type
    let Filter;
    if (filterType === 'cpu') {
      Filter = CPUProductFilter;
    } else if (filterType === 'motherboard') {
      Filter = MotherboardProductFilter;
    } else if (filterType === 'ram') {
      Filter = RAMProductFilter;
    } else if (filterType === 'psu') {
      Filter = PSUProductFilter;
    } else if (filterType === 'cooler') {
      Filter = CoolerProductFilter;
    } else {
      Filter = ProductFilter;
    }
    Logger.debug(`Using ${filterType.toUpperCase()} filter for validation`);
    
    if (!includeDebug) {
      // Original behavior - only return matching products
      if (Filter.matchesSearchCriteria(productData.title, cardName) && 
          Filter.validateProduct(productData)) {
        
        Logger.success(`Found matching product: ${productData.title.substring(0, 80)}...`);
        
        const product = this.createProductData(
          productData.title,
          productData.basePrice,
          productUrl,
          productData.imageUrl,
          'Amazon'
        );
        
        // Override with sale price info if detected
        if (productData.isOnSale && productData.salePrice) {
          product.salePrice = productData.salePrice;
          product.isOnSale = true;
          product.currentPrice = productData.salePrice;
        }
        
        return product;
      }
      return null;
    } else {
      // Debug mode - return all products with match status
      const matchesSearch = Filter.matchesSearchCriteria(productData.title, cardName);
      const isValidProduct = Filter.validateProduct(productData);
      const isMatch = matchesSearch && isValidProduct;
      
      if (isMatch) {
        Logger.success(`Found matching product: ${productData.title.substring(0, 80)}...`);
      }
      
      return {
        isMatch,
        matchesSearch,
        isValidProduct,
        product: isMatch ? (() => {
          const product = this.createProductData(
            productData.title,
            productData.basePrice,
            productUrl,
            productData.imageUrl,
            'Amazon'
          );
          
          // Override with sale price info if detected
          if (productData.isOnSale && productData.salePrice) {
            product.salePrice = productData.salePrice;
            product.isOnSale = true;
            product.currentPrice = productData.salePrice;
          }
          
          return product;
        })() : null,
        rawData: {
          title: productData.title,
          basePrice: productData.basePrice,
          salePrice: productData.salePrice,
          isOnSale: productData.isOnSale,
          imageUrl: productData.imageUrl,
          url: productUrl,
          debugInfo: productData.debug
        }
      };
    }
  }

  setBrowser(browser) {
    this.browser = browser;
  }

  logAllProductsFound(allProductsFound, cardName) {
    if (allProductsFound.length === 0) {
      Logger.warn('No products found to analyze');
      return;
    }

    Logger.info('\n🔍 ALL PRODUCTS FOUND ON AMAZON (DEBUG):');
    Logger.info('=' .repeat(120));
    
    allProductsFound.forEach((productInfo, index) => {
      const data = productInfo.rawData;
      
      Logger.info(`\n📦 Product ${index + 1}:`);
      Logger.info(`   Title: ${data.title || 'No title found'}`);
      Logger.info(`   Base Price: ${data.basePrice ? `$${data.basePrice}` : 'No price found'}`);
      Logger.info(`   Sale Price: ${data.salePrice ? `$${data.salePrice}` : 'Not on sale'}`);
      if (data.isOnSale) {
        const discount = ((data.basePrice - data.salePrice) / data.basePrice * 100).toFixed(1);
        Logger.info(`   Discount: ${discount}% off`);
      }
      Logger.info(`   🔧 Price Detection: Check browser console for detailed price parsing info`);
      Logger.info(`   URL: ${data.url.substring(0, 100)}...`);
      
      // Match analysis
      Logger.info(`   🔍 Match Analysis:`);
      Logger.info(`     - Matches "${cardName}": ${productInfo.matchesSearch ? '✅ YES' : '❌ NO'}`);
      Logger.info(`     - Valid Product: ${productInfo.isValidProduct ? '✅ YES' : '❌ NO'}`);
      Logger.info(`     - Overall Match: ${productInfo.isMatch ? '✅ INCLUDED' : '❌ EXCLUDED'}`);
      
      if (!productInfo.matchesSearch) {
        const cleanTitle = (data.title || '').replace(/[™®©]/g, '').toLowerCase();
        Logger.info(`     - Reason: Title "${cleanTitle}" doesn't contain "${cardName.toLowerCase()}"`);
        
        // Show what it does contain
        if (cleanTitle.includes('rtx')) {
          if (cleanTitle.includes('4070 super')) {
            Logger.info(`     - Note: Contains "RTX 4070 Super" - excluded for base RTX 4070 search`);
          } else if (cleanTitle.includes('4070 ti')) {
            Logger.info(`     - Note: Contains "RTX 4070 Ti" - excluded for base RTX 4070 search`);
          } else if (cleanTitle.includes('5070')) {
            Logger.info(`     - Note: Contains "RTX 5070" - different generation`);
          } else if (cleanTitle.includes('3060')) {
            Logger.info(`     - Note: Contains "RTX 3060" - different model`);
          }
        }
      }
      if (!productInfo.isValidProduct) {
        Logger.info(`     - Reason: Failed validation (no title/price or price out of range $200-$5000)`);
      }
    });
    
    Logger.info('\n' + '=' .repeat(120));
    
    const matchedCount = allProductsFound.filter(p => p.isMatch).length;
    const excludedCount = allProductsFound.length - matchedCount;
    
    Logger.info(`📊 Summary: ${matchedCount} matched, ${excludedCount} excluded out of ${allProductsFound.length} total products`);
  }
}

module.exports = AmazonScraper;