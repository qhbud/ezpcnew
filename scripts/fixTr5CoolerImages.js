const puppeteer = require('puppeteer');
const { MongoClient } = require('mongodb');

const uri = 'mongodb://localhost:27017';
const client = new MongoClient(uri);

async function scrapeAmazonProduct(page, url) {
    try {
        console.log(`   Navigating to: ${url}`);
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });

        // Wait for product title
        await page.waitForSelector('#productTitle, h1', { timeout: 10000 });

        const productData = await page.evaluate(() => {
            // Get title
            const titleElement = document.querySelector('#productTitle');
            const title = titleElement ? titleElement.textContent.trim() : 'Unknown';

            // Get price - try multiple selectors
            let price = null;
            const priceSelectors = [
                '.a-price .a-offscreen',
                '#priceblock_ourprice',
                '#priceblock_dealprice',
                '.a-price-whole',
                '[data-a-color="price"] .a-offscreen'
            ];

            for (const selector of priceSelectors) {
                const priceElement = document.querySelector(selector);
                if (priceElement) {
                    const priceText = priceElement.textContent.trim();
                    const match = priceText.match(/[\d,]+\.?\d*/);
                    if (match) {
                        price = parseFloat(match[0].replace(',', ''));
                        break;
                    }
                }
            }

            // Get image - try multiple sources
            let imageUrl = '';

            // Try main product image first
            const mainImage = document.querySelector('#landingImage');
            if (mainImage) {
                // Try data attributes first (higher quality)
                imageUrl = mainImage.dataset.oldHires ||
                          mainImage.dataset.dynamicImageUrl ||
                          mainImage.src || '';
            }

            // If no main image or if it's a placeholder, try alternative selectors
            if (!imageUrl || imageUrl.includes('Prime_Logo') || imageUrl.includes('transparent-pixel')) {
                const altImages = document.querySelectorAll('#altImages img, #imageBlock img, .imgTagWrapper img');
                for (const img of altImages) {
                    const src = img.dataset.oldHires || img.dataset.dynamicImageUrl || img.src || '';
                    if (src && !src.includes('Prime_Logo') && !src.includes('transparent-pixel') && src.includes('images-amazon')) {
                        imageUrl = src;
                        break;
                    }
                }
            }

            // Clean up image URL to get high quality version
            if (imageUrl) {
                // Remove size restrictions from Amazon image URLs
                imageUrl = imageUrl.split('._')[0] + '.jpg';
            }

            return {
                title,
                price,
                imageUrl
            };
        });

        return productData;
    } catch (error) {
        console.error(`   ❌ Error scraping ${url}:`, error.message);
        return null;
    }
}

async function fixTr5CoolerImages() {
    let browser;
    try {
        await client.connect();
        console.log('✅ Connected to MongoDB\n');

        const db = client.db('pcbuilder');
        const collection = db.collection('coolers');

        // Launch browser
        console.log('🚀 Launching browser...\n');
        browser = await puppeteer.launch({
            headless: 'new',
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });

        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

        const coolersToUpdate = [
            {
                name: 'SilverStone XE360-TR5 Liquid CPU Cooler',
                url: 'https://www.amazon.com/SilverStone-Technology-XE360-TR5-Liquid-SST-XE360-TR5/dp/B0D7KYN5PP/'
            },
            {
                name: 'Noctua NH-D9 TR5-SP6',
                url: 'https://www.amazon.com/Noctua-NH-D15-Specialised-Convexity-Version/dp/B0D5B5B821/'
            }
        ];

        console.log('📝 Updating TR5 cooler images...\n');

        for (const cooler of coolersToUpdate) {
            console.log(`\n🔍 Scraping: ${cooler.name}`);

            const productData = await scrapeAmazonProduct(page, cooler.url);

            if (productData) {
                // Update in database
                const updateData = {
                    updatedAt: new Date()
                };

                if (productData.price) {
                    updateData.currentPrice = productData.price;
                    updateData.basePrice = productData.price;
                }

                if (productData.title) {
                    updateData.title = productData.title;
                }

                if (productData.imageUrl && !productData.imageUrl.includes('Prime_Logo')) {
                    updateData.imageUrl = productData.imageUrl;
                    console.log(`   ✅ Found valid image URL`);
                } else {
                    console.log(`   ⚠️  Could not find valid product image`);
                }

                await collection.updateOne(
                    { name: cooler.name },
                    { $set: updateData }
                );

                console.log(`   ✅ Updated: ${cooler.name}`);
                if (productData.price) console.log(`      Price: $${productData.price}`);
                if (productData.imageUrl && !productData.imageUrl.includes('Prime_Logo')) {
                    console.log(`      Image: ${productData.imageUrl.substring(0, 80)}...`);
                }
            } else {
                console.log(`   ⚠️  Could not update ${cooler.name}`);
            }

            // Wait between requests
            await new Promise(resolve => setTimeout(resolve, 3000));
        }

        console.log('\n\n✅ Update completed!');

    } catch (error) {
        console.error('❌ Error:', error.message);
        throw error;
    } finally {
        if (browser) {
            await browser.close();
        }
        await client.close();
        console.log('\n✅ Database connection closed');
    }
}

fixTr5CoolerImages()
    .then(() => {
        console.log('✅ Script completed successfully');
        process.exit(0);
    })
    .catch((error) => {
        console.error('❌ Script failed:', error);
        process.exit(1);
    });
