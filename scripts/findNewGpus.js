const { MongoClient } = require('mongodb');
const puppeteer = require('puppeteer');
const fs = require('fs');
require('dotenv').config();

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/pcbuilder';
const affiliateTag = process.env.AMAZON_ASSOCIATE_TAG || 'qhezpc-20';

// GPU search terms to use
const GPU_SEARCH_TERMS = [
    'NVIDIA RTX 4090 graphics card',
    'NVIDIA RTX 4080 graphics card',
    'NVIDIA RTX 4070 Ti graphics card',
    'NVIDIA RTX 4070 graphics card',
    'AMD RX 7900 XTX graphics card',
    'AMD RX 7900 XT graphics card',
    'NVIDIA RTX 5090 graphics card',
    'NVIDIA RTX 5080 graphics card'
];

async function findNewGpus() {
    const client = new MongoClient(uri);
    let browser;

    try {
        await client.connect();
        console.log('Connected to MongoDB\n');

        const db = client.db('pcbuilder');

        // Get all existing ASINs from all GPU collections
        const existingAsins = new Set();
        const gpuCollections = await db.listCollections({ name: /^gpus/ }).toArray();
        const collections = gpuCollections.map(c => c.name);

        console.log(`📦 Checking ${collections.length} GPU collections for existing ASINs...`);
        for (const collectionName of collections) {
            const gpus = await db.collection(collectionName).find({}).toArray();
            gpus.forEach(gpu => {
                // Extract ASIN from sourceUrl or url
                const url = gpu.sourceUrl || gpu.url;
                if (url) {
                    const asin = extractAsin(url);
                    if (asin) existingAsins.add(asin);
                }
            });
        }

        console.log(`✓ Found ${existingAsins.size} existing GPUs in database\n`);

        // Launch Puppeteer
        console.log('🚀 Launching browser...');
        browser = await puppeteer.launch({
            headless: 'new',
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });

        const newGpus = [];
        const targetCount = 5;

        // Search Amazon for each GPU term
        for (const searchTerm of GPU_SEARCH_TERMS) {
            if (newGpus.length >= targetCount) break;

            console.log(`\n🔍 Searching Amazon for: "${searchTerm}"`);

            const searchResults = await searchAmazon(browser, searchTerm);
            console.log(`   Found ${searchResults.length} products on this page`);

            for (const result of searchResults) {
                if (newGpus.length >= targetCount) break;

                // Check if we already have this ASIN
                if (!existingAsins.has(result.asin)) {
                    console.log(`   ✨ NEW: ${result.name.substring(0, 60)}...`);
                    console.log(`      ASIN: ${result.asin}`);
                    console.log(`      Scraping full details...`);

                    // Scrape full product details
                    const fullDetails = await scrapeProductDetails(browser, result);

                    if (fullDetails) {
                        newGpus.push(fullDetails);
                        existingAsins.add(result.asin); // Prevent duplicates within this run
                        console.log(`      ✓ Details scraped successfully`);
                    } else {
                        console.log(`      ⚠️  Failed to scrape full details`);
                    }
                } else {
                    console.log(`   ⏭️  SKIP: ${result.name.substring(0, 60)}... (already in database)`);
                }
            }

            // Delay between searches to be polite to Amazon
            await new Promise(resolve => setTimeout(resolve, 3000));
        }

        // Save to JSON file
        if (newGpus.length > 0) {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const filename = `new-gpus-${timestamp}.json`;

            const output = {
                timestamp: new Date().toISOString(),
                totalFound: newGpus.length,
                gpus: newGpus
            };

            fs.writeFileSync(filename, JSON.stringify(output, null, 2));

            console.log(`\n\n✅ SUCCESS!`);
            console.log(`Found ${newGpus.length} new GPUs not in database`);
            console.log(`Saved to: ${filename}\n`);

            console.log('📋 New GPUs:');
            newGpus.forEach((gpu, i) => {
                console.log(`\n${i + 1}. ${gpu.name}`);
                console.log(`   Price: $${gpu.currentPrice || 'N/A'}`);
                console.log(`   Model: ${gpu.gpuModel || 'Unknown'}`);
                console.log(`   Memory: ${gpu.memory?.size || '?'}GB ${gpu.memory?.type || '?'}`);
            });
        } else {
            console.log('\n❌ No new GPUs found. All search results already in database.');
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

async function searchAmazon(browser, searchTerm) {
    const page = await browser.newPage();
    const results = [];

    try {
        // Set user agent to avoid detection
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

        // Navigate to Amazon search
        const searchUrl = `https://www.amazon.com/s?k=${encodeURIComponent(searchTerm)}&i=electronics`;

        await page.goto(searchUrl, {
            waitUntil: 'networkidle2',
            timeout: 30000
        });

        // Wait for results to load
        await page.waitForTimeout(3000);

        // Extract product information with multiple selector strategies
        const products = await page.evaluate(() => {
            const items = [];

            // Try multiple selectors for product containers
            let productDivs = document.querySelectorAll('[data-component-type="s-search-result"]');

            if (productDivs.length === 0) {
                // Try alternative selectors
                productDivs = document.querySelectorAll('.s-result-item[data-asin]');
            }

            for (const div of productDivs) {
                try {
                    // Extract ASIN
                    const asin = div.getAttribute('data-asin');
                    if (!asin || asin === '') continue;

                    // Extract title with multiple strategies
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

                    // Extract price with multiple strategies
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

                    // Alternative price extraction
                    if (!price) {
                        const priceSymbol = div.querySelector('.a-price .a-offscreen');
                        if (priceSymbol) {
                            const priceText = priceSymbol.textContent.replace(/[^0-9.]/g, '');
                            price = parseFloat(priceText);
                        }
                    }

                    // Extract image
                    const imgElement = div.querySelector('img.s-image');
                    const imageUrl = imgElement ? imgElement.src : '';

                    // Only add if we have valid data
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

async function scrapeProductDetails(browser, basicInfo) {
    const page = await browser.newPage();

    try {
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

        const productUrl = `https://www.amazon.com/dp/${basicInfo.asin}`;
        await page.goto(productUrl, {
            waitUntil: 'networkidle2',
            timeout: 30000
        });

        await page.waitForTimeout(3000);

        // Extract detailed information
        const details = await page.evaluate(() => {
            const data = {};

            // Get full title
            const titleElement = document.querySelector('#productTitle');
            data.title = titleElement ? titleElement.textContent.trim() : '';

            // Extract price using multiple methods
            data.price = null;

            // Method 1: Hidden input fields
            const hiddenPriceInput = document.querySelector('#twister-plus-price-data-price');
            if (hiddenPriceInput && hiddenPriceInput.value) {
                data.price = parseFloat(hiddenPriceInput.value);
            }

            // Method 2: Core price display
            if (!data.price) {
                const corePrice = document.querySelector('#corePrice_feature_div .a-offscreen');
                if (corePrice) {
                    const priceText = corePrice.textContent.replace(/[^0-9.]/g, '');
                    data.price = parseFloat(priceText);
                }
            }

            // Method 3: Price whole + fraction
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

            // Get images
            const mainImage = document.querySelector('#landingImage, #imgBlkFront');
            data.imageUrl = mainImage ? mainImage.src : '';

            // Get product features/specs
            const featureList = document.querySelectorAll('#feature-bullets ul li');
            data.features = Array.from(featureList).map(li => li.textContent.trim()).filter(f => f);

            // Get technical details from table
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

        // Parse GPU information from title and features
        const gpuInfo = parseGpuInfo(details.title, details.features);

        // Build simplified GPU object with only essential fields
        const now = new Date();
        const fullGpu = {
            name: details.title || basicInfo.name,
            basePrice: details.price,
            salePrice: null,
            isOnSale: false,
            gpuModel: gpuInfo.model,
            manufacturer: gpuInfo.manufacturer,
            memory: gpuInfo.memory,
            wattage: gpuInfo.wattage,
            sourceUrl: `https://www.amazon.com/dp/${basicInfo.asin}?tag=${affiliateTag}`
        };

        return fullGpu;

    } catch (error) {
        console.error(`      Error scraping product page: ${error.message}`);
        return null;
    } finally {
        await page.close();
    }
}

function parseGpuInfo(title, features = []) {
    const titleLower = title.toLowerCase();
    const allText = (title + ' ' + features.join(' ')).toLowerCase();

    // Detect manufacturer
    let manufacturer = 'Unknown';
    if (allText.includes('nvidia') || allText.includes('rtx') || allText.includes('geforce')) {
        manufacturer = 'NVIDIA';
    } else if (allText.includes('amd') || allText.includes('radeon') || allText.includes('rx ')) {
        manufacturer = 'AMD';
    } else if (allText.includes('intel') || allText.includes('arc')) {
        manufacturer = 'Intel';
    }

    // Detect GPU model
    let model = 'Unknown';
    const rtxPatterns = [
        /rtx\s*5090/i, /rtx\s*5080/i, /rtx\s*5070/i,
        /rtx\s*4090/i, /rtx\s*4080/i, /rtx\s*4070\s*ti/i, /rtx\s*4070\s*super/i, /rtx\s*4070/i, /rtx\s*4060\s*ti/i, /rtx\s*4060/i,
        /rtx\s*3090\s*ti/i, /rtx\s*3090/i, /rtx\s*3080\s*ti/i, /rtx\s*3080/i, /rtx\s*3070\s*ti/i, /rtx\s*3070/i, /rtx\s*3060\s*ti/i, /rtx\s*3060/i
    ];

    const amdPatterns = [
        /rx\s*7900\s*xtx/i, /rx\s*7900\s*xt/i, /rx\s*7800\s*xt/i, /rx\s*7700\s*xt/i, /rx\s*7600/i,
        /rx\s*6950\s*xt/i, /rx\s*6900\s*xt/i, /rx\s*6800\s*xt/i, /rx\s*6800/i, /rx\s*6700\s*xt/i, /rx\s*6600\s*xt/i, /rx\s*6600/i
    ];

    for (const pattern of rtxPatterns) {
        const match = allText.match(pattern);
        if (match) {
            model = match[0].replace(/\s+/g, ' ').toUpperCase();
            break;
        }
    }

    if (model === 'Unknown') {
        for (const pattern of amdPatterns) {
            const match = allText.match(pattern);
            if (match) {
                model = match[0].replace(/\s+/g, ' ').toUpperCase();
                break;
            }
        }
    }

    // Detect memory
    let memorySize = null;
    let memoryType = null;

    const memorySizeMatch = allText.match(/(\d+)\s*gb/i);
    if (memorySizeMatch) {
        memorySize = parseInt(memorySizeMatch[1]);
    }

    if (allText.includes('gddr6x')) {
        memoryType = 'GDDR6X';
    } else if (allText.includes('gddr6')) {
        memoryType = 'GDDR6';
    } else if (allText.includes('gddr7')) {
        memoryType = 'GDDR7';
    }

    // Estimate wattage based on model
    let wattage = 250; // default
    if (model.includes('4090')) wattage = 450;
    else if (model.includes('5090')) wattage = 575;
    else if (model.includes('4080') || model.includes('5080')) wattage = 320;
    else if (model.includes('4070')) wattage = 220;
    else if (model.includes('3090')) wattage = 350;
    else if (model.includes('3080')) wattage = 320;
    else if (model.includes('7900')) wattage = 355;

    // Determine tier
    let tier = 'mid';
    if (model.includes('4090') || model.includes('5090') || model.includes('7900 XTX')) {
        tier = 'flagship';
    } else if (model.includes('4080') || model.includes('5080') || model.includes('3090') || model.includes('7900 XT')) {
        tier = 'high-end';
    } else if (model.includes('4070') || model.includes('3080') || model.includes('7800')) {
        tier = 'upper-mid';
    }

    return {
        manufacturer,
        model,
        memory: {
            size: memorySize,
            type: memoryType
        },
        wattage,
        tier,
        searchTerms: [model, `GeForce ${model}`, `Radeon ${model}`].filter(t => t !== 'Unknown')
    };
}

function extractAsin(url) {
    if (!url) return null;

    // Match ASIN patterns: /dp/ASIN or /gp/product/ASIN
    const dpMatch = url.match(/\/dp\/([A-Z0-9]{10})/i);
    const gpMatch = url.match(/\/gp\/product\/([A-Z0-9]{10})/i);
    const productMatch = url.match(/\/product\/([A-Z0-9]{10})/i);

    if (dpMatch) return dpMatch[1];
    if (gpMatch) return gpMatch[1];
    if (productMatch) return productMatch[1];

    return null;
}

// Run the script
findNewGpus();
