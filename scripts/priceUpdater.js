const puppeteer = require('puppeteer');
const { connectToDatabase, getDatabase } = require('../config/database');
const { ObjectId } = require('mongodb');
const { RiverSearchPriceDetector } = require('./riverSearchPriceDetection');
require('dotenv').config();

class PriceUpdater {
  constructor() {
    this.db = null;
    this.browser = null;
    this.page = null;
    this.riverSearch = null;
  }

  async connect() {
    try {
      await connectToDatabase();
      this.db = getDatabase();
      console.log('✅ Connected to MongoDB database');
    } catch (error) {
      console.error('❌ Failed to connect to database:', error);
      throw error;
    }
  }

  async initializeBrowser() {
    try {
      this.browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu'
        ]
      });
      this.page = await this.browser.newPage();

      // Set user agent to avoid detection
      await this.page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

      // Set viewport
      await this.page.setViewport({ width: 1920, height: 1080 });

      console.log('✅ Browser initialized');

      // Initialize RiverSearch price detector
      this.riverSearch = new RiverSearchPriceDetector();
      await this.riverSearch.initialize();
      console.log('✅ RiverSearch detector initialized');
    } catch (error) {
      console.error('❌ Failed to initialize browser:', error);
      throw error;
    }
  }

  async closeBrowser() {
    if (this.riverSearch) {
      await this.riverSearch.close();
    }
    if (this.browser) {
      await this.browser.close();
      console.log('✅ Browser closed');
    }
  }

  // Generic price extraction with multiple selectors
  async extractPrice(url, selectors = []) {
    try {
      console.log(`🔍 Scraping price from: ${url}`);

      await this.page.goto(url, {
        waitUntil: 'networkidle2',
        timeout: 30000
      });

      // Wait a bit for dynamic content to load
      await this.page.waitForTimeout(2000);

      let price = null;
      let priceText = '';
      let priceSource = null;

      // Try different price selectors
      for (const selector of selectors) {
        try {
          const element = await this.page.$(selector);
          if (element) {
            priceText = await this.page.evaluate(el => el.textContent.trim(), element);
            price = this.parsePrice(priceText);
            if (price) {
              priceSource = selector;
              console.log(`✅ Found price: $${price} using selector: ${selector}`);
              break;
            }
          }
        } catch (error) {
          console.log(`⚠️ Selector ${selector} failed:`, error.message);
          continue;
        }
      }

      if (!price) {
        console.log(`❌ Could not extract price from: ${url}`);
        console.log(`📄 Page content preview:`, await this.page.evaluate(() => document.body.textContent.substring(0, 500)));
        return {
          success: false,
          currentPrice: null,
          basePrice: null,
          salePrice: null,
          isOnSale: false,
          isAvailable: false,
          unavailabilityReason: 'Could not find price',
          detectionMethod: 'GenericScraper',
          priceSource: null
        };
      }

      return {
        success: true,
        currentPrice: price,
        basePrice: price,
        salePrice: null,
        isOnSale: false,
        isAvailable: true,
        unavailabilityReason: null,
        detectionMethod: 'GenericScraper',
        priceSource: priceSource
      };

    } catch (error) {
      console.error(`❌ Error scraping price from ${url}:`, error.message);
      return {
        success: false,
        currentPrice: null,
        basePrice: null,
        salePrice: null,
        isOnSale: false,
        isAvailable: false,
        unavailabilityReason: error.message,
        detectionMethod: 'GenericScraper',
        priceSource: null
      };
    }
  }

  // Parse price from text
  parsePrice(priceText) {
    if (!priceText) return null;

    // Remove common price text and symbols
    let cleaned = priceText
      .replace(/[^\d.,]/g, '') // Remove non-numeric characters except . and ,
      .replace(/,/g, ''); // Remove commas

    // Handle different price formats
    const priceMatch = cleaned.match(/(\d+\.?\d*)/);
    if (priceMatch) {
      const price = parseFloat(priceMatch[1]);
      return isNaN(price) ? null : price;
    }

    return null;
  }

  // Get price selectors for different websites
  getPriceSelectors(url) {
    const domain = new URL(url).hostname.toLowerCase();
    
    // Common price selectors for popular e-commerce sites
    const selectors = {
      'amazon.com': [
        '.a-price-whole',
        '.a-price .a-offscreen',
        '#priceblock_ourprice',
        '#priceblock_dealprice',
        '.a-price-range .a-price-whole',
        '[data-a-color="price"] .a-price-whole'
      ],
      'newegg.com': [
        '.price-current',
        '.price-current strong',
        '.product-price .price-current'
      ],
      'microcenter.com': [
        '.price',
        '.product-price',
        '.price-current'
      ],
      'bestbuy.com': [
        '.priceView-customer-price span',
        '.priceView-layout-large .priceView-customer-price',
        '.priceView-hero-price'
      ],
      'bhphotovideo.com': [
        '.price',
        '.product-price',
        '.price-current'
      ]
    };

    // Return specific selectors for known domains, or generic ones
    for (const [domainName, domainSelectors] of Object.entries(selectors)) {
      if (domain.includes(domainName)) {
        return domainSelectors;
      }
    }

    // Generic selectors for unknown sites
    return [
      '.price',
      '.product-price',
      '.price-current',
      '[class*="price"]',
      '[id*="price"]',
      '.amount',
      '.cost',
      '.value'
    ];
  }

  // Update a single item's price
  async updateItemPrice(collectionName, itemId, sourceUrl) {
    try {
      // Get the item first
      const collection = this.db.collection(collectionName);
      const item = await collection.findOne({ _id: new ObjectId(itemId) });

      if (!item) {
        throw new Error(`Item with ID ${itemId} not found in ${collectionName}`);
      }

      console.log(`🔄 Updating price for: ${item.name}`);

      // Use RiverSearch for Amazon URLs
      let priceData = null;
      if (sourceUrl.includes('amazon.com')) {
        priceData = await this.riverSearch.detectPrice(sourceUrl);
      } else {
        // Fallback to old method for non-Amazon URLs
        const selectors = this.getPriceSelectors(sourceUrl);
        priceData = await this.extractPrice(sourceUrl, selectors);
      }

      if (!priceData || !priceData.success) {
        console.log(`⚠️ Could not extract price for ${item.name}`);
        return null;
      }

      // Update the item in database with Targeted method metadata
      const updateData = {
        currentPrice: priceData.currentPrice,
        basePrice: priceData.basePrice || priceData.currentPrice,
        salePrice: priceData.salePrice,
        isOnSale: priceData.isOnSale || false,
        isAvailable: priceData.isAvailable !== false, // Default to true unless explicitly false
        unavailabilityReason: priceData.unavailabilityReason || null,
        detectionMethod: priceData.detectionMethod,
        priceSource: priceData.priceSource,
        priceHistory: item.priceHistory || [],
        updatedAt: new Date()
      };

      // Always add to price history (even if price unchanged) to track price checks
      updateData.priceHistory.push({
        price: priceData.currentPrice,
        date: new Date(),
        source: sourceUrl,
        detectionMethod: priceData.detectionMethod,
        isAvailable: priceData.isAvailable !== false
      });

      // Keep only last 10 price entries
      if (updateData.priceHistory.length > 10) {
        updateData.priceHistory = updateData.priceHistory.slice(-10);
      }

      // Log the update
      if (item.currentPrice !== priceData.currentPrice) {
        if (priceData.currentPrice === null) {
          console.log(`💰 Price updated: $${item.currentPrice} → NULL (${priceData.unavailabilityReason || 'Unavailable'})`);
        } else {
          console.log(`💰 Price updated: $${item.currentPrice} → $${priceData.currentPrice}`);
        }
      } else {
        if (priceData.currentPrice === null) {
          console.log(`✅ Still unavailable: NULL (added to history)`);
        } else {
          console.log(`✅ Price unchanged: $${priceData.currentPrice} (added to history)`);
        }
      }

      // Update the database
      const result = await collection.updateOne(
        { _id: new ObjectId(itemId) },
        { $set: updateData }
      );

      return {
        itemId: itemId,
        itemName: item.name,
        oldPrice: item.currentPrice,
        newPrice: priceData.currentPrice,
        priceChanged: item.currentPrice !== priceData.currentPrice,
        updated: result.modifiedCount > 0
      };

    } catch (error) {
      console.error(`❌ Error updating item price:`, error.message);
      throw error;
    }
  }

  // Update multiple items
  async updateMultipleItems(collectionName, filter = {}, limit = 10, urlField = 'sourceUrl', skip = 0) {
    try {
      const collection = this.db.collection(collectionName);
      const items = await collection.find(filter).skip(skip).limit(limit).toArray();

      console.log(`🔄 Updating ${items.length} items from ${collectionName}`);

      const results = [];

      for (const item of items) {
        const itemUrl = item[urlField];
        if (!itemUrl) {
          console.log(`⚠️ Skipping ${item.name} - no ${urlField}`);
          continue;
        }

        try {
          const result = await this.updateItemPrice(collectionName, item._id.toString(), itemUrl);
          if (result) {
            results.push(result);
          }

          // Add longer delay between requests for RiverSearch to avoid rate limiting
          console.log('⏳ Waiting 10 seconds before next product...');
          await new Promise(resolve => setTimeout(resolve, 10000));
          
        } catch (error) {
          console.error(`❌ Failed to update ${item.name}:`, error.message);
          results.push({
            itemId: item._id.toString(),
            itemName: item.name,
            error: error.message
          });
        }
      }

      return results;

    } catch (error) {
      console.error(`❌ Error updating multiple items:`, error.message);
      throw error;
    }
  }

  // Update all items with sourceURLs
  async updateAllItemsWithSourceURLs(collectionName) {
    return await this.updateMultipleItems(collectionName, { sourceUrl: { $exists: true, $ne: null } }, 0);
  }

  // Get items that need price updates (older than X days)
  async getItemsNeedingUpdate(collectionName, daysOld = 7) {
    try {
      const collection = this.db.collection(collectionName);
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);
      
      return await collection.find({
        sourceUrl: { $exists: true, $ne: null },
        $or: [
          { updatedAt: { $lt: cutoffDate } },
          { updatedAt: { $exists: false } }
        ]
      }).toArray();
    } catch (error) {
      console.error(`❌ Error getting items needing update:`, error.message);
      throw error;
    }
  }

  // Targeted Amazon scraper method
  async scrapeAmazonTargeted(url) {
    try {
      console.log(`🎯 Using Targeted Amazon scraper for: ${url}`);

      await this.page.goto(url, {
        waitUntil: 'networkidle2',
        timeout: 45000
      });

      // Wait for page to fully load and dynamic content
      await this.page.waitForTimeout(8000);

      const result = await this.page.evaluate(() => {
        const results = {
          success: false,
          currentPrice: null,
          detectionMethod: 'Targeted',
          priceSource: null,
          basePrice: null,
          salePrice: null,
          isOnSale: false,
          isAvailable: true,
          unavailabilityReason: null,
          debugInfo: []
        };

        // Get current product ID from URL
        const currentUrl = window.location.href;
        const productIdMatch = currentUrl.match(/\/dp\/([A-Z0-9]{10})/);
        const productId = productIdMatch ? productIdMatch[1] : '';

        console.log(`🆔 Current Product ID: ${productId}`);
        console.log('💰 PRICE DETECTION: Attempting to find product price first...');

        const bodyText = document.body.textContent.toLowerCase();

        // SPECIFIC UNAVAILABLE PRODUCTS - High priority unavailability check
        // Only check for "currently unavailable" text for known problematic products
        const currentlyUnavailableText = bodyText.includes('currently unavailable');

        const specificUnavailableProducts = [
          'B0CBQV398S', // MSI Gaming RTX 4070 (Renewed)
          'B0CSHFM3D5', // MSI Gaming RTX 4070 Super Ventus 3X
          'B0D36QHQBX', // PNY RTX 4080 Super XLR8 Verto
          'B0BLT4ZMGL'  // GIGABYTE RTX 4080 Eagle OC (has "currently unavailable")
        ];

        if (specificUnavailableProducts.includes(productId) && currentlyUnavailableText) {
          console.log(`🎯 Product ${productId} is specifically unavailable - "currently unavailable" text found`);
          results.isAvailable = false;
          results.unavailabilityReason = 'Specific product - Currently unavailable';
          results.currentPrice = null;
          results.success = true;
          results.detectionMethod = 'Targeted-Unavailable-Specific';
          results.debugInfo.push(`❌ UNAVAILABLE: ${productId} - Currently unavailable (specific product)`);
          console.log(`❌ PRODUCT UNAVAILABLE: ${productId} - Currently unavailable`);
          return results;
        }

        console.log('💰 PROCEEDING WITH PRICE DETECTION - Looking for prices...');

        // TARGETED STRATEGY 0: JSON Data Embedded in Page (Newest Method)
        console.log('🎯 STRATEGY 0: JSON Data Mining');
        try {
          const scripts = document.querySelectorAll('script[type="text/javascript"]');
          for (const script of scripts) {
            const scriptContent = script.textContent || '';

            // Look for price data in JSON structures
            const priceMatches = scriptContent.match(/"priceAmount":\s*"?([\d.]+)"?/g) ||
                                scriptContent.match(/"displayPrice":\s*"?\$?([\d.]+)"?/g) ||
                                scriptContent.match(/"currentPrice":\s*"?([\d.]+)"?/g) ||
                                scriptContent.match(/"price":\s*"?([\d.]+)"?/g);

            if (priceMatches) {
              for (const match of priceMatches) {
                const priceStr = match.match(/([\d.]+)/)[1];
                const price = parseFloat(priceStr);

                if (price && price >= 100 && price <= 5000) {
                  results.success = true;
                  results.currentPrice = price;
                  results.basePrice = price;
                  results.priceSource = 'JSON-embedded';
                  results.detectionMethod = 'Targeted-JSON';
                  results.debugInfo.push(`✅ Found via JSON: ${match} -> $${price}`);
                  console.log(`✅ JSON SUCCESS: Found $${price} in embedded data`);
                  return results;
                }
              }
            }
          }
        } catch (error) {
          results.debugInfo.push(`❌ JSON parsing error: ${error.message}`);
        }

        // TARGETED STRATEGY 1: Exact Hidden Input Matches from Analysis
        console.log('🎯 STRATEGY 1: Targeted Hidden Inputs');
        const targetedHiddenSelectors = [
          '#attach-base-product-price',
          '#twister-plus-price-data-price',
          '#priceValue',
          '#price-value',
          'input[name="items[0.base][customerVisiblePrice][amount]"]',
          'input[name="items[0.base][customerVisiblePrice][displayString]"]',
          'input[name="displayPrice"]',
          'input[name="priceAmount"]',
          'input[name="price"]',
          'input[data-a-price]',
          'input[id*="price"]',
          'input[id*="Price"]',
          'input[class*="price"]'
        ];

        for (const selector of targetedHiddenSelectors) {
          try {
            const element = document.querySelector(selector);
            if (element && element.value) {
              const value = element.value.toString();
              const price = parseFloat(value.replace(/[^0-9.]/g, ''));

              if (price && price >= 100 && price <= 5000) {
                results.success = true;
                results.currentPrice = price;
                results.basePrice = price;
                results.priceSource = selector;
                results.detectionMethod = 'Targeted-HiddenInput';
                results.debugInfo.push(`✅ Found via ${selector}: ${value} -> $${price}`);
                console.log(`✅ TARGETED SUCCESS: ${selector} = $${price}`);

                // Check for sales even with hidden inputs
                console.log('🏷️ CHECKING FOR SALES (Hidden Input)...');
                const strikethroughSelectors = [
                  '.a-price.a-text-strike .a-offscreen',
                  '[data-a-strike="true"] .a-offscreen',
                  '.a-text-strike'
                ];

                let originalPrice = null;
                for (const strikeSelector of strikethroughSelectors) {
                  const strikeElements = document.querySelectorAll(strikeSelector);
                  for (const strikeElement of strikeElements) {
                    const strikeText = strikeElement.textContent.trim();
                    const strikePrice = parseFloat(strikeText.replace(/[^0-9.]/g, ''));

                    if (strikePrice > price && strikePrice >= 100 && strikePrice <= 5000) {
                      originalPrice = strikePrice;
                      console.log(`🏷️ SALE DETECTED: Original $${originalPrice} -> Sale $${price}`);
                      break;
                    }
                  }
                  if (originalPrice) break;
                }

                if (originalPrice) {
                  results.basePrice = originalPrice;
                  results.salePrice = price;
                  results.currentPrice = price;
                  results.isOnSale = true;
                  console.log(`✅ FINAL RESULT: Sale $${results.salePrice} (was $${results.basePrice})`);
                } else {
                  results.basePrice = price;
                  results.salePrice = null;
                  results.isOnSale = false;
                  console.log(`✅ FINAL RESULT: Regular price $${results.basePrice}`);
                }

                return results;
              }
            }
          } catch (error) {
            results.debugInfo.push(`❌ Error with ${selector}: ${error.message}`);
          }
        }

        // TARGETED STRATEGY 2: Core Product Price Areas (Prioritized)
        console.log('🎯 STRATEGY 2: Core Product Price Areas');
        const coreProductPriceSelectors = [
          '#corePriceDisplay_desktop_feature_div .aok-offscreen',
          '#corePriceDisplay_desktop_feature_div .a-offscreen',
          '#priceblock_dealprice .a-offscreen',
          '#priceblock_ourprice .a-offscreen',
          '#corePrice_feature_div .a-offscreen',
          '#apex_desktop .a-offscreen',
          '.a-price .a-offscreen',
          '.a-price .aok-offscreen',
          'span.a-price-whole',
          '.a-price-range .a-offscreen',
          '#buybox .a-offscreen',
          '#rightCol .a-offscreen',
          '#desktop_buybox .a-offscreen',
          // Modern 2024/2025 Amazon selectors
          '.a-price-whole',
          '.a-price .a-price-whole',
          '[data-a-price="true"] .a-offscreen',
          '[data-a-price] .a-offscreen',
          '.a-color-price .a-offscreen',
          '#price .a-offscreen',
          '#price .aok-offscreen',
          '.price .a-offscreen',
          '.a-size-medium.a-color-price',
          '.a-size-base.a-color-price',
          'span[aria-hidden="true"]',
          '.a-button-primary .a-offscreen'
        ];

        for (const selector of coreProductPriceSelectors) {
          try {
            const elements = document.querySelectorAll(selector);
            for (const element of elements) {
              const text = element.textContent.trim();
              const price = parseFloat(text.replace(/[^0-9.]/g, ''));

              if (price && price >= 100 && price <= 5000) {
                results.success = true;
                results.currentPrice = price;
                results.basePrice = price;
                results.priceSource = selector;
                results.detectionMethod = 'Targeted-CorePrice';
                results.debugInfo.push(`✅ Found via ${selector}: "${text}" -> $${price}`);
                console.log(`✅ TARGETED SUCCESS: ${selector} = $${price}`);

                // Check for sales with core price
                console.log('🏷️ CHECKING FOR SALES (Core Price)...');
                const strikethroughSelectors = [
                  '.a-price.a-text-strike .a-offscreen',
                  '[data-a-strike="true"] .a-offscreen',
                  '.a-text-strike'
                ];

                let originalPrice = null;
                for (const strikeSelector of strikethroughSelectors) {
                  const strikeElements = document.querySelectorAll(strikeSelector);
                  for (const strikeElement of strikeElements) {
                    const strikeText = strikeElement.textContent.trim();
                    const strikePrice = parseFloat(strikeText.replace(/[^0-9.]/g, ''));

                    if (strikePrice > price && strikePrice >= 100 && strikePrice <= 5000) {
                      originalPrice = strikePrice;
                      console.log(`🏷️ SALE DETECTED: Original $${originalPrice} -> Sale $${price}`);
                      break;
                    }
                  }
                  if (originalPrice) break;
                }

                if (originalPrice) {
                  results.basePrice = originalPrice;
                  results.salePrice = price;
                  results.currentPrice = price;
                  results.isOnSale = true;
                  console.log(`✅ FINAL RESULT: Sale $${results.salePrice} (was $${results.basePrice})`);
                } else {
                  results.basePrice = price;
                  results.salePrice = null;
                  results.isOnSale = false;
                  console.log(`✅ FINAL RESULT: Regular price $${results.basePrice}`);
                }

                return results;
              }
            }
          } catch (error) {
            results.debugInfo.push(`❌ Error with ${selector}: ${error.message}`);
          }
        }

        // TARGETED STRATEGY 3: Main Product Price Container (Exclude Carousels)
        console.log('🎯 STRATEGY 3: Main Product Price (Anti-Carousel)');
        const mainProductSelectors = [
          '.a-offscreen',
          '.aok-offscreen',
          'span.a-offscreen',
          '.a-price-whole',
          '.a-price-fraction',
          '[data-a-color="price"]',
          '.a-color-price',
          'span[data-a-color="base"]',
          // Additional 2024/2025 patterns
          '.a-size-medium.a-color-price',
          '.a-size-base.a-color-price',
          '.a-size-large.a-color-price',
          '.a-price-symbol',
          '.a-price-decimal',
          'span[data-testid="price"]',
          '[data-testid="price-text"]',
          '.price-text',
          '.current-price',
          '.sale-price',
          '.regular-price'
        ];

        for (const selector of mainProductSelectors) {
          try {
            const elements = document.querySelectorAll(selector);
            for (const element of elements) {
              const text = element.textContent.trim();
              const price = parseFloat(text.replace(/[^0-9.]/g, ''));

              if (price && price >= 100 && price <= 5000) {
                // Get full path to element to check if it's in main product area
                let currentElement = element;
                let isInCarousel = false;
                let isInMainProductArea = false;
                let elementPath = '';

                // Walk up the DOM to check ancestry
                while (currentElement && currentElement.id !== 'dp-container') {
                  const elementId = currentElement.id || '';
                  const elementClass = currentElement.className || '';

                  elementPath = `${elementId}.${elementClass} > ${elementPath}`;

                  // Check if we're in a carousel or related products section
                  if (elementId.includes('CardInstance') ||
                      elementClass.includes('carousel') ||
                      elementClass.includes('sponsored') ||
                      elementId.includes('similarities') ||
                      elementId.includes('recommendations')) {
                    isInCarousel = true;
                    break;
                  }

                  // Check if we're in the main product price area
                  if (elementId.includes('corePriceDisplay') ||
                      elementId.includes('priceblock') ||
                      elementId.includes('corePrice') ||
                      elementId.includes('apex_desktop')) {
                    isInMainProductArea = true;
                  }

                  currentElement = currentElement.parentElement;
                }

                // Only accept prices from main product area, not carousels
                if (!isInCarousel && (isInMainProductArea || elementPath.includes('corePriceDisplay'))) {
                  results.success = true;
                  results.currentPrice = price;
                  results.basePrice = price;
                  results.priceSource = `${selector} (MainProduct)`;
                  results.detectionMethod = 'Targeted-MainProduct';
                  results.debugInfo.push(`✅ Found via ${selector}: "${text}" -> $${price} (Path: ${elementPath.substring(0, 100)}...)`);
                  console.log(`✅ TARGETED SUCCESS: ${selector} = $${price} (Main Product)`);

                  // ENHANCED SALE DETECTION - Check for strikethrough prices
                  console.log('🏷️ CHECKING FOR SALES...');
                  const strikethroughSelectors = [
                    '.a-price.a-text-strike .a-offscreen',
                    '.a-price-original .a-offscreen',
                    '[data-a-strike="true"] .a-offscreen',
                    '.a-text-strike'
                  ];

                  let originalPrice = null;
                  for (const strikeSelector of strikethroughSelectors) {
                    const strikeElements = document.querySelectorAll(strikeSelector);
                    for (const strikeElement of strikeElements) {
                      let strikeCurrentElement = strikeElement;
                      let strikeIsInCarousel = false;
                      let strikeIsInMainProductArea = false;

                      // Walk up DOM to check if strikethrough price is in main product area
                      while (strikeCurrentElement && strikeCurrentElement.id !== 'dp-container') {
                        const strikeElementId = strikeCurrentElement.id || '';
                        const strikeElementClass = strikeCurrentElement.className || '';

                        // Check if we're in a carousel
                        if (strikeElementId.includes('CardInstance') ||
                            strikeElementClass.includes('carousel') ||
                            strikeElementClass.includes('sponsored')) {
                          strikeIsInCarousel = true;
                          break;
                        }

                        // Check if we're in the main product price area
                        if (strikeElementId.includes('corePriceDisplay') ||
                            strikeElementId.includes('priceblock') ||
                            strikeElementId.includes('corePrice') ||
                            strikeElementId.includes('apex_desktop')) {
                          strikeIsInMainProductArea = true;
                        }

                        strikeCurrentElement = strikeCurrentElement.parentElement;
                      }

                      // Only accept strikethrough prices from main product area
                      if (!strikeIsInCarousel && strikeIsInMainProductArea) {
                        const strikeText = strikeElement.textContent.trim();
                        const strikePrice = parseFloat(strikeText.replace(/[^0-9.]/g, ''));

                        if (strikePrice > price && strikePrice >= 100 && strikePrice <= 5000) {
                          originalPrice = strikePrice;
                          console.log(`🏷️ SALE DETECTED: Original $${originalPrice} -> Sale $${price}`);
                          results.debugInfo.push(`🏷️ Sale found: ${strikeSelector} = $${strikePrice}`);
                          break;
                        }
                      }
                    }
                    if (originalPrice) break;
                  }

                  // Set sale information
                  if (originalPrice) {
                    results.basePrice = originalPrice;
                    results.salePrice = price;
                    results.currentPrice = price; // Current price is the sale price
                    results.isOnSale = true;
                    console.log(`✅ FINAL RESULT: Sale $${results.salePrice} (was $${results.basePrice})`);
                  } else {
                    results.basePrice = price;
                    results.salePrice = null;
                    results.isOnSale = false;
                    console.log(`✅ FINAL RESULT: Regular price $${results.basePrice}`);
                  }

                  return results;
                }
              }
            }
          } catch (error) {
            results.debugInfo.push(`❌ Error with ${selector}: ${error.message}`);
          }
        }

        // AVAILABILITY CHECK AS FALLBACK - Only if no prices found
        // This is much more conservative - only checks strong indicators
        console.log('⚠️ NO PRICE FOUND - Checking if product is actually unavailable...');

        const addToCartButton = document.querySelector('#add-to-cart-button, input[name="submit.add-to-cart"]');
        const seeAllBuyingText = bodyText.includes('see all buying options');

        // Check primary button text for strong unavailability indicators
        const primaryButton = document.querySelector('#add-to-cart-button, .a-button-primary, [data-action="see-all-buying-options"]');
        const primaryButtonText = primaryButton ? primaryButton.textContent.trim().toLowerCase() : '';
        const isSubmitFeedbackButton = primaryButtonText.includes('submit feedback');

        results.debugInfo.push(`🔍 FALLBACK AVAILABILITY CHECK:`);
        results.debugInfo.push(`   Add to Cart Button: ${addToCartButton ? '✅ Present' : '❌ Missing'}`);
        results.debugInfo.push(`   Currently Unavailable Text: ${currentlyUnavailableText ? '✅ Found' : '❌ Not Found'}`);
        results.debugInfo.push(`   See All Buying Text: ${seeAllBuyingText ? '✅ Found' : '❌ Not Found'}`);
        results.debugInfo.push(`   Primary Button: "${primaryButtonText || 'Not found'}"`);
        results.debugInfo.push(`   Submit Feedback Button: ${isSubmitFeedbackButton ? '✅ Found' : '❌ Not Found'}`);

        // Only declare unavailable with STRONG indicators
        let isUnavailable = false;
        let unavailabilityReason = '';

        // Method 1: "Currently unavailable" text (most reliable)
        if (currentlyUnavailableText) {
          isUnavailable = true;
          unavailabilityReason = 'Currently unavailable text found';
          results.debugInfo.push(`🎯 UNAVAILABLE: Currently unavailable text found`);
        }

        // Method 2: No Add to Cart + "See all buying options" (strong indicator)
        else if (!addToCartButton && seeAllBuyingText) {
          isUnavailable = true;
          unavailabilityReason = 'No Add to Cart + See All Buying Options';
          results.debugInfo.push(`🎯 UNAVAILABLE: No Add to Cart + See All Buying`);
        }

        // Method 3: Submit Feedback button (very strong indicator)
        else if (isSubmitFeedbackButton && !addToCartButton) {
          isUnavailable = true;
          unavailabilityReason = 'Submit Feedback button found';
          results.debugInfo.push(`🎯 UNAVAILABLE: Submit Feedback button found`);
        }

        if (isUnavailable) {
          results.isAvailable = false;
          results.unavailabilityReason = unavailabilityReason;
          results.currentPrice = null;
          results.success = true;
          results.detectionMethod = 'Targeted-Unavailable-Fallback';
          results.debugInfo.push(`❌ FALLBACK UNAVAILABLE: ${productId} - ${unavailabilityReason}`);
          console.log(`❌ FALLBACK UNAVAILABLE: ${productId} - ${unavailabilityReason}`);
          return results;
        }

        results.debugInfo.push('❌ No targeted elements found price, but no strong unavailability indicators');
        console.log('❌ TARGETED FAILED: No price found, product appears available but no price detected');
        return results;
      });

      return result;

    } catch (error) {
      console.log(`❌ Targeted scraping failed: ${error.message}`);
      return {
        success: false,
        currentPrice: null,
        error: error.message,
        detectionMethod: 'Targeted',
        debugInfo: [`Error: ${error.message}`],
        isAvailable: true,
        unavailabilityReason: null
      };
    }
  }
}

// Example usage function
async function exampleUsage() {
  const updater = new PriceUpdater();
  
  try {
    await updater.connect();
    await updater.initializeBrowser();
    
    // Example: Update a specific item
    // const result = await updater.updateItemPrice('gpus', 'ITEM_ID_HERE', 'https://amazon.com/product-url');
    
    // Example: Update all GPUs with sourceURLs
    console.log('🔄 Updating all GPUs with source URLs...');
    const results = await updater.updateAllItemsWithSourceURLs('gpus');
    
    console.log('\n📊 Update Results:');
    console.log(`Total items processed: ${results.length}`);
    console.log(`Items with price changes: ${results.filter(r => r.priceChanged).length}`);
    
    results.forEach(result => {
      if (result.error) {
        console.log(`❌ ${result.itemName}: ${result.error}`);
      } else if (result.priceChanged) {
        console.log(`💰 ${result.itemName}: $${result.oldPrice} → $${result.newPrice}`);
      } else {
        console.log(`✅ ${result.itemName}: $${result.newPrice} (unchanged)`);
      }
    });
    
  } catch (error) {
    console.error('❌ Example usage failed:', error);
  } finally {
    await updater.closeBrowser();
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('Usage: node priceUpdater.js <command> [options]');
    console.log('');
    console.log('Commands:');
    console.log('  update-item <collection> <itemId> <sourceUrl>  - Update single item');
    console.log('  update-collection <collection> [limit]          - Update multiple items');
    console.log('  update-all <collection>                        - Update all items with sourceURLs');
    console.log('  example                                         - Run example usage');
    console.log('');
    console.log('Examples:');
    console.log('  node priceUpdater.js update-item gpus 507f1f77bcf86cd799439011 https://amazon.com/product');
    console.log('  node priceUpdater.js update-collection gpus 5');
    console.log('  node priceUpdater.js update-all gpus');
    console.log('  node priceUpdater.js example');
    return;
  }

  const command = args[0];
  const updater = new PriceUpdater();

  try {
    await updater.connect();
    await updater.initializeBrowser();

    switch (command) {
      case 'update-item':
        if (args.length < 4) {
          console.log('❌ Missing arguments for update-item');
          return;
        }
        const [_, collection, itemId, sourceUrl] = args;
        const result = await updater.updateItemPrice(collection, itemId, sourceUrl);
        console.log('✅ Update result:', result);
        break;

      case 'update-collection':
        if (args.length < 2) {
          console.log('❌ Missing collection name');
          return;
        }
        const collectionName = args[1];
        const limit = args[2] ? parseInt(args[2]) : 10;
        const results = await updater.updateMultipleItems(collectionName, {}, limit);
        console.log(`✅ Updated ${results.length} items`);
        break;

      case 'update-all':
        if (args.length < 2) {
          console.log('❌ Missing collection name');
          return;
        }
        const allResults = await updater.updateAllItemsWithSourceURLs(args[1]);
        console.log(`✅ Updated ${allResults.length} items`);
        break;

      case 'example':
        await exampleUsage();
        break;

      default:
        console.log(`❌ Unknown command: ${command}`);
        break;
    }

  } catch (error) {
    console.error('❌ Command failed:', error);
  } finally {
    await updater.closeBrowser();
  }
}

// Run if called directly
if (require.main === module) {
  main()
    .then(() => {
      console.log('\n✅ Price updater completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Price updater failed:', error);
      process.exit(1);
    });
}

module.exports = { PriceUpdater };
