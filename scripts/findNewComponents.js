const { MongoClient } = require('mongodb');
const puppeteer = require('puppeteer');
const fs = require('fs');
require('dotenv').config();

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/pcbuilder';
const affiliateTag = process.env.AMAZON_ASSOCIATE_TAG || 'qhezpc-20';

// Search terms for each component type - with variety across price ranges
const COMPONENT_SEARCH_TERMS = {
    gpus: [
        'NVIDIA RTX 4090 graphics card',
        'NVIDIA RTX 4070 graphics card',
        'NVIDIA RTX 4060 graphics card',
        'AMD RX 7900 XTX graphics card',
        'AMD RX 7800 XT graphics card',
        'AMD RX 7600 graphics card',
        'Intel Arc A770 graphics card'
    ],
    cpus: [
        'Intel Core i9-14900K processor',
        'Intel Core i7-14700K processor',
        'Intel Core i5-14600K processor',
        'AMD Ryzen 9 7950X processor',
        'AMD Ryzen 7 7700X processor',
        'AMD Ryzen 5 7600X processor'
    ],
    motherboards: [
        'ASUS ROG STRIX Z790 motherboard',
        'MSI MAG B760 motherboard',
        'GIGABYTE B650 motherboard',
        'ASRock X670E motherboard',
        'ASUS TUF Gaming motherboard'
    ],
    rams: [
        'Corsair Vengeance DDR5 32GB',
        'G.Skill Trident Z5 DDR5 16GB',
        'Kingston Fury Beast DDR5 64GB',
        'Corsair Dominator DDR4 32GB',
        'G.Skill Ripjaws DDR4 16GB'
    ],
    psus: [
        'Corsair RM1000x power supply',
        'EVGA SuperNOVA 750 power supply',
        'Seasonic Focus 650W power supply',
        'be quiet! Pure Power 550W',
        'Thermaltake Toughpower 850W'
    ],
    cases: [
        'NZXT H7 Flow case',
        'Corsair 4000D Airflow',
        'Lian Li O11 Dynamic',
        'Fractal Design Meshify',
        'Phanteks Eclipse P400A'
    ],
    coolers: [
        'Noctua NH-D15 CPU cooler',
        'Arctic Liquid Freezer II 360mm',
        'be quiet! Dark Rock Pro 4',
        'Cooler Master Hyzen 212',
        'Corsair iCUE H150i AIO'
    ],
    storages: [
        'Samsung 990 Pro 2TB NVMe SSD',
        'WD Black SN850X 1TB NVMe',
        'Crucial P5 Plus 500GB NVMe',
        'Samsung 870 EVO 2TB SATA SSD',
        'WD Blue 4TB HDD'
    ]
};

// Function to check if we have too many similar items (for diversity)
function hasTooManySimilar(newComponent, existingComponents, componentType, maxSimilar = 3) {
    if (existingComponents.length === 0) return false;

    let similarCount = 0;

    // Define what makes items "similar" based on component type
    for (const existing of existingComponents) {
        let isSimilar = false;

        switch (componentType) {
            case 'psus':
                // Check if wattage is within 100W range
                const newWattage = newComponent.wattage;
                const existingWattage = existing.wattage;
                if (newWattage && existingWattage && Math.abs(newWattage - existingWattage) <= 100) {
                    isSimilar = true;
                }
                break;

            case 'gpus':
                // Check if same GPU model (e.g., both RTX 4070)
                const newModel = newComponent.gpuModel;
                const existingModel = existing.gpuModel;
                if (newModel && existingModel && newModel === existingModel) {
                    isSimilar = true;
                }
                break;

            case 'cpus':
                // Check if same model series (e.g., both i7-14700K)
                const newCpuModel = newComponent.model;
                const existingCpuModel = existing.model;
                if (newCpuModel && existingCpuModel && newCpuModel === existingCpuModel) {
                    isSimilar = true;
                }
                break;

            case 'rams':
                // Check if same capacity and type
                const newCapacity = newComponent.capacity;
                const existingCapacity = existing.capacity;
                const newType = newComponent.type;
                const existingType = existing.type;
                if (newCapacity && existingCapacity && newType && existingType &&
                    newCapacity === existingCapacity && newType === existingType) {
                    isSimilar = true;
                }
                break;

            case 'motherboards':
                // Check if same chipset
                const newChipset = newComponent.chipset;
                const existingChipset = existing.chipset;
                if (newChipset && existingChipset && newChipset === existingChipset) {
                    isSimilar = true;
                }
                break;

            case 'storages':
                // Check if same capacity and type
                const newStorageCapacity = newComponent.capacity;
                const existingStorageCapacity = existing.capacity;
                const newStorageType = newComponent.type;
                const existingStorageType = existing.type;
                if (newStorageCapacity && existingStorageCapacity &&
                    newStorageType && existingStorageType &&
                    newStorageCapacity === existingStorageCapacity &&
                    newStorageType === existingStorageType) {
                    isSimilar = true;
                }
                break;

            case 'coolers':
                // Check if same type (Air vs Liquid)
                const newCoolerType = newComponent.type;
                const existingCoolerType = existing.type;
                if (newCoolerType && existingCoolerType && newCoolerType === existingCoolerType) {
                    isSimilar = true;
                }
                break;

            case 'cases':
                // Check if same form factor
                const newFormFactor = newComponent.formFactor;
                const existingFormFactor = existing.formFactor;
                if (newFormFactor && existingFormFactor && newFormFactor === existingFormFactor) {
                    isSimilar = true;
                }
                break;
        }

        if (isSimilar) {
            similarCount++;
            if (similarCount >= maxSimilar) {
                return true;
            }
        }
    }

    return false;
}

// Function to detect combo products (bundles)
function isComboProduct(productName) {
    if (!productName) return false;

    const nameLower = productName.toLowerCase();

    // Very specific combo/bundle indicators - only flag obvious combos
    const strictComboKeywords = [
        'combo pack',
        'bundle pack',
        'combo deal',
        'bundle deal',
        'pc build',
        'complete build',
        'gaming pc',
        'desktop pc',
        'computer system',
        'full system',
        'with motherboard',
        'with cpu',
        'with processor',
        'cpu motherboard combo',
        'motherboard cpu combo',
        'processor motherboard combo',
        'cpu + motherboard',
        'motherboard + cpu',
        'processor + motherboard',
        '+ motherboard +',
        '+ cpu +',
        '+ processor +'
    ];

    // Check for specific combo indicators
    for (const keyword of strictComboKeywords) {
        if (nameLower.includes(keyword)) {
            return true;
        }
    }

    // Check for patterns like "Item1 and Item2" or "Item1 with Item2"
    // But be more specific - look for actual different component types being sold together
    const hasCpuAndMotherboard =
        (nameLower.includes('motherboard') || nameLower.includes('mobo')) &&
        (nameLower.includes('processor') || /\b(i[3579]-\d{4,5}|ryzen\s*[3579])\b/i.test(nameLower)) &&
        (nameLower.includes(' and ') || nameLower.includes(' with ') || nameLower.includes(' + '));

    const hasMultipleMainComponents =
        (nameLower.includes('graphics card') || nameLower.includes('gpu')) &&
        (nameLower.includes('motherboard') || nameLower.includes('processor')) &&
        (nameLower.includes(' and ') || nameLower.includes(' with ') || nameLower.includes(' + '));

    if (hasCpuAndMotherboard || hasMultipleMainComponents) {
        return true;
    }

    return false;
}

// Function to detect GPU accessories (not actual GPUs)
function isGpuAccessory(productName) {
    if (!productName) return false;

    const nameLower = productName.toLowerCase();

    // First check if this is actually a GPU by looking for model numbers
    const hasGpuModel = /\b(rtx\s*\d{4}|rx\s*\d{4}|arc\s*a\d{3}|gtx\s*\d{4}|radeon|geforce)\b/i.test(productName);

    // If it has a GPU model in the name, it's likely an actual GPU, not an accessory
    // Exception: if it explicitly says "for RTX" or "for RX" then it's an accessory for that GPU
    if (hasGpuModel && !/\bfor\s+(rtx|rx|arc|gtx|radeon|geforce)/i.test(productName)) {
        return false; // This is a real GPU, not an accessory
    }

    const accessoryKeywords = [
        'support bracket',
        'gpu bracket',
        'gpu stand',
        'gpu support',
        'anti sag',
        'anti-sag',
        'sag bracket',
        'sag holder',
        'video card brace',
        'graphics card brace',
        'gpu brace',
        'gpu holder',
        'vertical mount',
        'riser cable',
        'gpu cable',
        'display dummy',
        'backplate only',
        'replacement backplate'
    ];

    for (const keyword of accessoryKeywords) {
        if (nameLower.includes(keyword)) {
            return true;
        }
    }

    return false;
}

// Function to detect portable/external storage (not internal components)
function isPortableStorage(productName) {
    if (!productName) return false;

    const nameLower = productName.toLowerCase();

    const portableKeywords = [
        'portable',
        'external',
        'usb-c',
        'usb 3.',
        'thumb drive',
        'flash drive',
        'usb drive',
        'pocket',
        'rugged',
        'extreme portable',
        'memory card',
        'sd card',
        'cfexpress',
        'microsd',
        'cf card'
    ];

    for (const keyword of portableKeywords) {
        if (nameLower.includes(keyword)) {
            return true;
        }
    }

    return false;
}

// Function to detect prebuilt PCs/systems
function isPrebuiltPC(productName) {
    if (!productName) return false;

    const nameLower = productName.toLowerCase();

    // Strong indicators of prebuilt systems
    const prebuiltKeywords = [
        'gaming pc',
        'desktop pc',
        'gaming desktop',
        'desktop computer',
        'gaming system',
        'computer system',
        'complete system',
        'complete build',
        'pre-built',
        'prebuilt',
        'ready to ship',
        'plug and play'
    ];

    for (const keyword of prebuiltKeywords) {
        if (nameLower.includes(keyword)) {
            return true;
        }
    }

    // Check for patterns like "Intel i9 + RTX + RAM + SSD" which indicates a complete system
    const hasMultipleComponents = (
        (nameLower.includes('rtx') || nameLower.includes('geforce') || nameLower.includes('radeon')) &&
        (nameLower.includes('gb ram') || nameLower.includes('gb ddr')) &&
        (nameLower.includes('ssd') || nameLower.includes('nvme'))
    );

    if (hasMultipleComponents) {
        return true;
    }

    return false;
}

// Function to detect cables and accessories (not actual components)
function isCableOrAccessory(productName) {
    if (!productName) return false;

    const nameLower = productName.toLowerCase();

    const accessoryKeywords = [
        'cable',
        'adapter',
        'extension',
        'replacement cable',
        'power cable',
        'sata cable',
        'pcie cable',
        'connector kit'
    ];

    for (const keyword of accessoryKeywords) {
        if (nameLower.includes(keyword)) {
            return true;
        }
    }

    return false;
}

// Function to validate if a price is actually valid and reasonable
function isValidPrice(price) {
    // Check if price exists
    if (price === null || price === undefined) {
        return false;
    }

    // Convert to number if it's a string
    const numPrice = typeof price === 'string' ? parseFloat(price) : price;

    // Check for invalid numbers
    if (isNaN(numPrice) || !isFinite(numPrice)) {
        return false;
    }

    // Check if price is positive and reasonable (at least $1)
    // This filters out $0, negative prices, and unreasonably low prices
    if (numPrice < 1) {
        return false;
    }

    // Optional: Check for unreasonably high prices (likely errors)
    // Setting a max of $50,000 for PC components
    if (numPrice > 50000) {
        return false;
    }

    return true;
}

// Validate URL
function isValidProductUrl(url) {
    if (!url) return false;

    try {
        const urlObj = new URL(url);
        // Check if it's an Amazon product URL with ASIN
        return urlObj.hostname.includes('amazon.com') &&
               (url.includes('/dp/') || url.includes('/gp/product/'));
    } catch {
        return false;
    }
}

async function findNewComponents() {
    const client = new MongoClient(uri);
    let browser;

    try {
        await client.connect();
        console.log('Connected to MongoDB\n');

        const db = client.db('pcbuilder');

        // Get existing ASINs and product names for all component types
        const { existingAsins, existingProducts } = await getAllExistingComponents(db);

        // Launch Puppeteer
        console.log('🚀 Launching browser...\n');
        browser = await puppeteer.launch({
            headless: 'new',
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });

        const allNewComponents = {
            timestamp: new Date().toISOString(),
            totalFound: 0,
            components: {
                gpus: [],
                cpus: [],
                motherboards: [],
                rams: [],
                psus: [],
                cases: [],
                coolers: [],
                storages: []
            }
        };

        // Parse command-line arguments for target counts
        const args = process.argv.slice(2);
        const targetCounts = {
            gpus: 20,
            cpus: 20,
            motherboards: 20,
            rams: 20,
            psus: 20,
            cases: 20,
            coolers: 20,
            storages: 20
        };

        // Override defaults if arguments provided
        if (args.length > 0) {
            const componentTypes = ['gpus', 'cpus', 'motherboards', 'rams', 'psus', 'cases', 'coolers', 'storages'];
            args.forEach((arg, index) => {
                if (index < componentTypes.length) {
                    const count = parseInt(arg);
                    if (!isNaN(count) && count >= 0) {
                        targetCounts[componentTypes[index]] = count;
                    }
                }
            });
        }

        console.log('📊 Target counts per component type:');
        console.log(`   GPUs: ${targetCounts.gpus}`);
        console.log(`   CPUs: ${targetCounts.cpus}`);
        console.log(`   Motherboards: ${targetCounts.motherboards}`);
        console.log(`   RAM: ${targetCounts.rams}`);
        console.log(`   PSUs: ${targetCounts.psus}`);
        console.log(`   Cases: ${targetCounts.cases}`);
        console.log(`   Coolers: ${targetCounts.coolers}`);
        console.log(`   Storage: ${targetCounts.storages}\n`);

        // Search for each component type
        for (const [componentType, searchTerms] of Object.entries(COMPONENT_SEARCH_TERMS)) {
            const targetCount = targetCounts[componentType];

            // Skip if target is 0
            if (targetCount === 0) {
                console.log(`\n⏭️  Skipping ${componentType.toUpperCase()} (target count is 0)\n`);
                continue;
            }

            console.log(`\n${'='.repeat(60)}`);
            console.log(`🔍 Searching for ${componentType.toUpperCase()} (target: ${targetCount})`);
            console.log(`${'='.repeat(60)}\n`);

            for (const searchTerm of searchTerms) {
                if (allNewComponents.components[componentType].length >= targetCount) break;

                console.log(`   Searching: "${searchTerm}"`);

                const searchResults = await searchAmazon(browser, searchTerm);
                console.log(`   Found ${searchResults.length} products on this page`);

                for (const result of searchResults) {
                    if (allNewComponents.components[componentType].length >= targetCount) break;

                    // Check if this is a combo product (should be skipped)
                    if (isComboProduct(result.name)) {
                        console.log(`   🚫 SKIP COMBO: ${result.name.substring(0, 60)}...`);
                        continue;
                    }

                    // Check if we already have this ASIN
                    if (!existingAsins.has(result.asin)) {
                        console.log(`   ✨ NEW: ${result.name.substring(0, 60)}...`);
                        console.log(`      ASIN: ${result.asin}`);
                        console.log(`      Scraping full details...`);

                        // Scrape full product details
                        const fullDetails = await scrapeProductDetails(browser, result, componentType);

                        if (fullDetails) {
                            // Validate URL
                            if (!isValidProductUrl(fullDetails.sourceUrl)) {
                                console.log(`      🚫 REJECTED: Invalid or missing product URL`);
                            }
                            // Check for valid price using robust validation
                            else if (!isValidPrice(fullDetails.basePrice)) {
                                const priceDisplay = fullDetails.basePrice === null ? 'null' :
                                                    fullDetails.basePrice === undefined ? 'undefined' :
                                                    fullDetails.basePrice;
                                console.log(`      🚫 REJECTED: Invalid or missing price (${priceDisplay})`);
                            }
                            // Double-check if it's a combo after getting full details
                            else if (isComboProduct(fullDetails.name)) {
                                console.log(`      🚫 REJECTED: Combo product`);
                                console.log(`         Name: ${fullDetails.name.substring(0, 100)}...`);
                            }
                            // Check for GPU accessories
                            else if (componentType === 'gpus' && isGpuAccessory(fullDetails.name)) {
                                console.log(`      🚫 REJECTED: GPU accessory, not actual GPU`);
                                console.log(`         Name: ${fullDetails.name.substring(0, 100)}...`);
                            }
                            // Check for prebuilt PCs
                            else if (isPrebuiltPC(fullDetails.name)) {
                                console.log(`      🚫 REJECTED: Prebuilt PC/complete system`);
                                console.log(`         Name: ${fullDetails.name.substring(0, 100)}...`);
                            }
                            // Check for cables and accessories
                            else if (isCableOrAccessory(fullDetails.name)) {
                                console.log(`      🚫 REJECTED: Cable or accessory, not actual component`);
                                console.log(`         Name: ${fullDetails.name.substring(0, 100)}...`);
                            }
                            // Check for portable/external storage
                            else if (componentType === 'storages' && isPortableStorage(fullDetails.name)) {
                                console.log(`      🚫 REJECTED: Portable/external storage or memory card`);
                                console.log(`         Name: ${fullDetails.name.substring(0, 100)}...`);
                            }
                            // Check for diversity - avoid too many similar items
                            else if (hasTooManySimilar(fullDetails, allNewComponents.components[componentType], componentType)) {
                                console.log(`      🚫 REJECTED: Too many similar items already collected (ensuring variety)`);
                            }
                            else {
                                // Final safety check: verify price one more time before saving
                                if (!isValidPrice(fullDetails.basePrice)) {
                                    console.log(`      🚫 REJECTED: Final price validation failed (${fullDetails.basePrice})`);
                                }
                                // Check if product name already exists in database
                                else {
                                    const normalizedName = normalizeProductName(fullDetails.name);
                                    if (existingProducts.has(normalizedName)) {
                                        console.log(`      ⏭️  DUPLICATE: Product already exists in database by name`);
                                    } else {
                                        allNewComponents.components[componentType].push(fullDetails);
                                        existingAsins.add(result.asin); // Prevent duplicates
                                        existingProducts.add(normalizedName); // Prevent duplicate names
                                        console.log(`      ✓ Details scraped successfully`);
                                    }
                                }
                            }
                        } else {
                            console.log(`      ⚠️  Failed to scrape full details`);
                        }
                    } else {
                        console.log(`   ⏭️  SKIP: ${result.name.substring(0, 60)}... (already in database)`);
                    }
                }

                // Delay between searches
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        }

        // Calculate total found
        allNewComponents.totalFound = Object.values(allNewComponents.components).reduce(
            (sum, arr) => sum + arr.length, 0
        );

        // Save to JSON file
        if (allNewComponents.totalFound > 0) {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const filename = `new-components-${timestamp}.json`;

            fs.writeFileSync(filename, JSON.stringify(allNewComponents, null, 2));

            console.log(`\n\n${'='.repeat(60)}`);
            console.log(`✅ SUCCESS!`);
            console.log(`${'='.repeat(60)}`);
            console.log(`Found ${allNewComponents.totalFound} new components not in database`);
            console.log(`Saved to: ${filename}\n`);

            console.log('📋 Summary by Component Type:\n');
            for (const [type, components] of Object.entries(allNewComponents.components)) {
                console.log(`   ${type.toUpperCase()}: ${components.length} new components`);
            }
        } else {
            console.log('\n❌ No new components found. All search results already in database.');
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        if (browser) {
            await browser.close();
        }
        await client.close();
        console.log('\nDisconnected from MongoDB');
    }
}

async function getAllExistingComponents(db) {
    const existingAsins = new Set();
    const existingProducts = new Set();

    // All collection patterns to check
    const collectionPatterns = [
        /^gpus/,
        /^cpus/,
        /^motherboards/,
        /^rams/,
        /^psus/,
        /^cases/,
        /^coolers/,
        /^storages/
    ];

    console.log('📦 Checking database for existing components...');

    for (const pattern of collectionPatterns) {
        const collections = await db.listCollections({ name: pattern }).toArray();

        for (const collection of collections) {
            const items = await db.collection(collection.name).find({}).toArray();
            items.forEach(item => {
                // Store ASIN
                const url = item.sourceUrl || item.url;
                if (url) {
                    const asin = extractAsin(url);
                    if (asin) existingAsins.add(asin);
                }

                // Store normalized product name
                if (item.name) {
                    const normalizedName = normalizeProductName(item.name);
                    existingProducts.add(normalizedName);
                }
            });
        }
    }

    console.log(`✓ Found ${existingAsins.size} existing components in database`);
    console.log(`✓ Loaded ${existingProducts.size} unique product names\n`);
    return { existingAsins, existingProducts };
}

// Normalize product name for comparison (remove special chars, lowercase, trim whitespace)
function normalizeProductName(name) {
    if (!name) return '';
    return name
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, '') // Remove special characters
        .replace(/\s+/g, ' ')        // Normalize whitespace
        .trim();
}

async function searchAmazon(browser, searchTerm) {
    const page = await browser.newPage();
    const results = [];

    try {
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

        const searchUrl = `https://www.amazon.com/s?k=${encodeURIComponent(searchTerm)}&i=electronics`;

        await page.goto(searchUrl, {
            waitUntil: 'networkidle2',
            timeout: 30000
        });

        await page.waitForTimeout(3000);

        const products = await page.evaluate(() => {
            const items = [];
            let productDivs = document.querySelectorAll('[data-component-type="s-search-result"]');

            if (productDivs.length === 0) {
                productDivs = document.querySelectorAll('.s-result-item[data-asin]');
            }

            for (const div of productDivs) {
                try {
                    const asin = div.getAttribute('data-asin');
                    if (!asin || asin === '') continue;

                    let name = '';
                    const titleElement1 = div.querySelector('h2 a span');
                    const titleElement2 = div.querySelector('h2.s-line-clamp-2');
                    const titleElement3 = div.querySelector('.s-title-instructions-style span');

                    if (titleElement1) {
                        name = titleElement1.textContent.trim();
                    } else if (titleElement2) {
                        name = titleElement2.textContent.trim();
                    } else if (titleElement3) {
                        name = titleElement3.textContent.trim();
                    }

                    if (!name) continue;

                    let price = null;
                    const priceWhole = div.querySelector('.a-price-whole');
                    const priceFraction = div.querySelector('.a-price-fraction');

                    if (priceWhole) {
                        const whole = priceWhole.textContent.replace(/[^0-9]/g, '');
                        const fraction = priceFraction ? priceFraction.textContent.replace(/[^0-9]/g, '') : '00';
                        if (whole) {
                            price = parseFloat(`${whole}.${fraction}`);
                        }
                    }

                    if (!price) {
                        const priceSymbol = div.querySelector('.a-price .a-offscreen');
                        if (priceSymbol) {
                            const priceText = priceSymbol.textContent.replace(/[^0-9.]/g, '');
                            price = parseFloat(priceText);
                        }
                    }

                    const imgElement = div.querySelector('img.s-image');
                    const imageUrl = imgElement ? imgElement.src : '';

                    if (name && asin) {
                        items.push({
                            asin,
                            name,
                            price,
                            imageUrl
                        });
                    }
                } catch (err) {
                    // Skip problematic items
                }
            }

            return items;
        });

        results.push(...products);

    } catch (error) {
        console.error(`   Error searching Amazon: ${error.message}`);
    } finally {
        await page.close();
    }

    return results;
}

async function scrapeProductDetails(browser, basicInfo, componentType) {
    let page;

    try {
        page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

        const productUrl = `https://www.amazon.com/dp/${basicInfo.asin}`;
        await page.goto(productUrl, {
            waitUntil: 'networkidle2',
            timeout: 30000
        });

        await page.waitForTimeout(3000);

        const details = await page.evaluate(() => {
            const data = {};

            const titleElement = document.querySelector('#productTitle');
            data.title = titleElement ? titleElement.textContent.trim() : '';

            data.price = null;

            const hiddenPriceInput = document.querySelector('#twister-plus-price-data-price');
            if (hiddenPriceInput && hiddenPriceInput.value) {
                data.price = parseFloat(hiddenPriceInput.value);
            }

            if (!data.price) {
                const corePrice = document.querySelector('#corePrice_feature_div .a-offscreen');
                if (corePrice) {
                    const priceText = corePrice.textContent.replace(/[^0-9.]/g, '');
                    data.price = parseFloat(priceText);
                }
            }

            if (!data.price) {
                const priceWhole = document.querySelector('.a-price-whole');
                const priceFraction = document.querySelector('.a-price-fraction');
                if (priceWhole) {
                    const whole = priceWhole.textContent.replace(/[^0-9]/g, '');
                    const fraction = priceFraction ? priceFraction.textContent.replace(/[^0-9]/g, '') : '00';
                    if (whole) {
                        data.price = parseFloat(`${whole}.${fraction}`);
                    }
                }
            }

            const mainImage = document.querySelector('#landingImage, #imgBlkFront');
            data.imageUrl = mainImage ? mainImage.src : '';

            const featureList = document.querySelectorAll('#feature-bullets ul li');
            data.features = Array.from(featureList).map(li => li.textContent.trim()).filter(f => f);

            data.specs = {};
            const techDetails = document.querySelectorAll('#productDetails_techSpec_section_1 tr, .prodDetTable tr');
            techDetails.forEach(row => {
                const th = row.querySelector('th');
                const td = row.querySelector('td');
                if (th && td) {
                    const key = th.textContent.trim();
                    const value = td.textContent.trim();
                    data.specs[key] = value;
                }
            });

            return data;
        });

        // Parse component-specific information
        const parsedInfo = parseComponentInfo(details.title, details.features, details.specs, componentType);

        // Build component object with relevant fields
        const component = {
            name: details.title || basicInfo.name,
            basePrice: details.price,
            salePrice: null,
            isOnSale: false,
            sourceUrl: `https://www.amazon.com/dp/${basicInfo.asin}?tag=${affiliateTag}`,
            imageUrl: details.imageUrl || basicInfo.imageUrl,
            ...parsedInfo
        };

        return component;

    } catch (error) {
        console.error(`      Error scraping product page: ${error.message}`);
        return null;
    } finally {
        if (page) {
            try {
                await page.close();
            } catch (e) {
                // Page already closed
            }
        }
    }
}

function parseComponentInfo(title, features = [], specs = {}, componentType) {
    const titleLower = title.toLowerCase();
    const allText = (title + ' ' + features.join(' ')).toLowerCase();

    const info = {};

    switch (componentType) {
        case 'gpus':
            info.gpuModel = extractGpuModel(allText);
            info.manufacturer = extractManufacturer(allText, ['NVIDIA', 'AMD', 'Intel']);
            info.memory = extractMemory(allText);
            info.wattage = estimateGpuWattage(info.gpuModel);
            break;

        case 'cpus':
            info.model = extractCpuModel(allText);
            info.manufacturer = extractManufacturer(allText, ['Intel', 'AMD']);
            info.cores = extractCores(allText);
            info.speed = extractSpeed(allText);
            info.socket = extractSocket(allText, specs);
            info._socketOptions = 'Available sockets in DB: AM4, AM5, LGA1700, LGA1851, sTRX5';
            break;

        case 'motherboards':
            info.chipset = extractChipset(allText);
            info.socket = extractSocket(allText, specs);
            info.formFactor = extractFormFactor(allText);
            info.manufacturer = extractManufacturer(allText, ['ASUS', 'MSI', 'GIGABYTE', 'ASRock']);
            info.ddr = extractDdrType(allText);
            info.ramSlots = extractRamSlots(allText, specs);
            info.m2Slots = extractM2Slots(allText, specs);
            info.pcieSlots = extractPcieSlots(allText, specs);
            break;

        case 'rams':
            info.capacity = extractRamCapacity(allText);
            info.type = extractRamType(allText);
            info.speed = extractRamSpeed(allText);
            info.manufacturer = extractManufacturer(allText, ['Corsair', 'G.Skill', 'Kingston', 'Crucial']);
            break;

        case 'psus':
            info.wattage = extractPsuWattage(allText);
            info.efficiency = extractEfficiency(allText);
            info.modular = extractModular(allText);
            info.manufacturer = extractManufacturer(allText, ['Corsair', 'EVGA', 'Seasonic', 'be quiet!']);
            break;

        case 'cases':
            info.formFactor = extractFormFactor(allText);
            info.manufacturer = extractManufacturer(allText, ['NZXT', 'Corsair', 'Lian Li', 'Fractal Design']);
            info.rgb = extractRgb(allText);
            break;

        case 'coolers':
            info.type = extractCoolerType(allText);
            info.manufacturer = extractManufacturer(allText, ['Noctua', 'Arctic', 'Corsair', 'be quiet!']);
            break;

        case 'storages':
            info.capacity = extractStorageCapacity(allText);
            info.type = extractStorageType(allText);
            info.interface = extractStorageInterface(allText);
            info.manufacturer = extractManufacturer(allText, ['Samsung', 'WD', 'Crucial', 'Seagate']);
            info._typeOptions = 'Available types in DB: HDD, M.2 SSD, SATA SSD, SSHD';
            info._interfaceOptions = 'Common interfaces: NVMe, SATA, M.2';
            break;
    }

    return info;
}

// Helper functions for parsing
function extractGpuModel(text) {
    const patterns = [
        /rtx\s*5090/i, /rtx\s*5080/i, /rtx\s*5070/i,
        /rtx\s*4090/i, /rtx\s*4080/i, /rtx\s*4070\s*ti/i, /rtx\s*4070\s*super/i, /rtx\s*4070/i,
        /rx\s*7900\s*xtx/i, /rx\s*7900\s*xt/i
    ];
    for (const pattern of patterns) {
        const match = text.match(pattern);
        if (match) return match[0].replace(/\s+/g, ' ').toUpperCase();
    }
    return 'Unknown';
}

function extractCpuModel(text) {
    const patterns = [
        /i9-\d{5}[KF]*/i, /i7-\d{5}[KF]*/i, /i5-\d{5}[KF]*/i,
        /ryzen\s*9\s*\d{4}[X]*/i, /ryzen\s*7\s*\d{4}[X]*/i, /ryzen\s*5\s*\d{4}[X]*/i
    ];
    for (const pattern of patterns) {
        const match = text.match(pattern);
        if (match) return match[0];
    }
    return 'Unknown';
}

function extractManufacturer(text, options) {
    for (const option of options) {
        if (text.includes(option.toLowerCase())) return option;
    }
    return 'Unknown';
}

function extractMemory(text) {
    const size = text.match(/(\d+)\s*gb/i);
    const type = text.match(/gddr\d+x?/i);
    return {
        size: size ? parseInt(size[1]) : null,
        type: type ? type[0].toUpperCase() : null
    };
}

function extractCores(text) {
    // Try different core count patterns

    // Pattern 1: "16 (8P+8E) Cores" - Intel hybrid architecture
    let match = text.match(/(\d+)\s*\([0-9p+e\s]+\)\s*cores/i);
    if (match) return parseInt(match[1]);

    // Pattern 2: "16 cores" or "16-core"
    match = text.match(/(\d+)[\s-]cores?/i);
    if (match) return parseInt(match[1]);

    // Pattern 3: "core count: 16" or "cores: 16"
    match = text.match(/cores?[\s:]+(\d+)/i);
    if (match) return parseInt(match[1]);

    // Pattern 4: Just a number followed by "core" (e.g., "8 core processor")
    match = text.match(/\b(\d+)\s*core\b/i);
    if (match) return parseInt(match[1]);

    return null;
}

function extractSpeed(text) {
    const match = text.match(/(\d+\.?\d*)\s*ghz/i);
    return match ? parseFloat(match[1]) : null;
}

function extractSocket(text, specs) {
    const socketPatterns = ['LGA1700', 'LGA1200', 'AM5', 'AM4'];
    for (const socket of socketPatterns) {
        if (text.includes(socket.toLowerCase())) return socket;
    }
    return Object.values(specs).find(v => v.includes('LGA') || v.includes('AM')) || 'Unknown';
}

function extractChipset(text) {
    const patterns = ['Z790', 'Z690', 'B760', 'B650', 'X670E', 'X670'];
    for (const chipset of patterns) {
        if (text.includes(chipset.toLowerCase())) return chipset;
    }
    return 'Unknown';
}

function extractFormFactor(text) {
    const factors = ['ATX', 'Micro-ATX', 'Mini-ITX', 'E-ATX'];
    for (const factor of factors) {
        if (text.includes(factor.toLowerCase())) return factor;
    }
    return 'ATX';
}

function extractRamCapacity(text) {
    const match = text.match(/(\d+)\s*gb/i);
    return match ? parseInt(match[1]) : null;
}

function extractRamType(text) {
    if (text.includes('ddr5')) return 'DDR5';
    if (text.includes('ddr4')) return 'DDR4';
    return 'Unknown';
}

function extractRamSpeed(text) {
    // Try to match MHz first
    let match = text.match(/(\d{4,5})\s*mhz/i);
    if (match) return parseInt(match[1]);

    // Try to match MT/s (MegaTransfers per second - common for DDR5)
    match = text.match(/(\d{4,5})\s*mt\/s/i);
    if (match) return parseInt(match[1]);

    // Try to match just the number before MHz or MT/s without space
    match = text.match(/(\d{4,5})mhz/i);
    if (match) return parseInt(match[1]);

    match = text.match(/(\d{4,5})mt\/s/i);
    if (match) return parseInt(match[1]);

    return null;
}

function extractPsuWattage(text) {
    const match = text.match(/(\d{3,4})w/i);
    return match ? parseInt(match[1]) : null;
}

function extractEfficiency(text) {
    const ratings = ['80 Plus Titanium', '80 Plus Platinum', '80 Plus Gold', '80 Plus Bronze'];
    for (const rating of ratings) {
        if (text.includes(rating.toLowerCase())) return rating;
    }
    return 'Unknown';
}

function extractModular(text) {
    if (text.includes('fully modular')) return 'Fully Modular';
    if (text.includes('semi-modular')) return 'Semi-Modular';
    if (text.includes('modular')) return 'Modular';
    return 'Non-Modular';
}

function extractRgb(text) {
    if (text.includes('rgb') || text.includes('argb')) return true;
    return false;
}

function extractCoolerType(text) {
    if (text.includes('liquid') || text.includes('aio')) return 'Liquid';
    return 'Air';
}

function extractStorageCapacity(text) {
    const match = text.match(/(\d+)\s*(tb|gb)/i);
    if (!match) return null;
    const value = parseInt(match[1]);
    const unit = match[2].toLowerCase();
    return unit === 'tb' ? value * 1000 : value;
}

function extractStorageType(text) {
    // Check for M.2 form factor
    if (text.includes('m.2') || text.includes('m2')) return 'M.2 SSD';
    // Check for HDD
    if (text.includes('hdd')) return 'HDD';
    // Check for SSHD (hybrid)
    if (text.includes('sshd') || text.includes('hybrid')) return 'SSHD';
    // Default to SATA SSD if it's an SSD
    if (text.includes('ssd')) return 'SATA SSD';
    return 'Unknown';
}

function extractStorageInterface(text) {
    // Check for M.2 form factor
    if (text.includes('m.2') || text.includes('m2')) return 'M.2';
    // Check for NVMe protocol (separate from form factor)
    if (text.includes('nvme')) return 'NVMe';
    // Check for explicit SATA mention
    if (text.includes('sata')) return 'SATA';
    return 'Unknown';
}

function estimateGpuWattage(model) {
    if (model.includes('4090') || model.includes('5090')) return 450;
    if (model.includes('4080') || model.includes('5080')) return 320;
    if (model.includes('4070')) return 220;
    if (model.includes('7900')) return 355;
    return 250;
}

function extractDdrType(text) {
    if (text.includes('ddr5')) return 'DDR5';
    if (text.includes('ddr4')) return 'DDR4';
    return 'Unknown';
}

function extractRamSlots(text, specs) {
    // Look for patterns like "4 x DIMM", "4 DIMM slots", "4x RAM slots"
    const slotMatch = text.match(/(\d)\s*[x×]\s*(dimm|ram|memory)/i);
    if (slotMatch) return parseInt(slotMatch[1]);

    // Check specs
    for (const [key, value] of Object.entries(specs)) {
        if (key.toLowerCase().includes('memory') || key.toLowerCase().includes('dimm')) {
            const match = value.match(/(\d)\s*[x×]/i);
            if (match) return parseInt(match[1]);
        }
    }

    return null;
}

function extractM2Slots(text, specs) {
    // Look for patterns like "5x M.2", "4 M.2 slots", "3 x M.2"
    const slotMatch = text.match(/(\d)\s*[x×]?\s*m\.?2/i);
    if (slotMatch) return parseInt(slotMatch[1]);

    // Check specs
    for (const [key, value] of Object.entries(specs)) {
        if (key.toLowerCase().includes('m.2')) {
            const match = value.match(/(\d)/);
            if (match) return parseInt(match[1]);
        }
    }

    return null;
}

function extractPcieSlots(text, specs) {
    // Look for patterns like "3 x PCIe", "4 PCIe slots"
    const slotMatch = text.match(/(\d)\s*[x×]?\s*pcie/i);
    if (slotMatch) return parseInt(slotMatch[1]);

    // Check specs for PCIe information
    for (const [key, value] of Object.entries(specs)) {
        if (key.toLowerCase().includes('pcie') || key.toLowerCase().includes('expansion')) {
            const match = value.match(/(\d)\s*[x×]/i);
            if (match) return parseInt(match[1]);
        }
    }

    return null;
}

function extractAsin(url) {
    if (!url) return null;
    const dpMatch = url.match(/\/dp\/([A-Z0-9]{10})/i);
    const gpMatch = url.match(/\/gp\/product\/([A-Z0-9]{10})/i);
    const productMatch = url.match(/\/product\/([A-Z0-9]{10})/i);

    if (dpMatch) return dpMatch[1];
    if (gpMatch) return gpMatch[1];
    if (productMatch) return productMatch[1];

    return null;
}

// Run the script
findNewComponents();
