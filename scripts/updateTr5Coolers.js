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

            // Get image
            let imageUrl = '';
            const imageElement = document.querySelector('#landingImage, #imgBlkFront, .a-dynamic-image');
            if (imageElement) {
                imageUrl = imageElement.src || imageElement.dataset.oldHires || imageElement.dataset.dynamicImageUrl || '';
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

async function updateTr5Coolers() {
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

        console.log('📝 Updating TR5 cooler prices...\n');

        for (const cooler of coolersToUpdate) {
            console.log(`\n🔍 Scraping: ${cooler.name}`);

            const productData = await scrapeAmazonProduct(page, cooler.url);

            if (productData && productData.price) {
                // Update in database
                const updateData = {
                    currentPrice: productData.price,
                    basePrice: productData.price,
                    title: productData.title,
                    updatedAt: new Date()
                };

                if (productData.imageUrl) {
                    updateData.imageUrl = productData.imageUrl;
                }

                await collection.updateOne(
                    { name: cooler.name },
                    { $set: updateData }
                );

                console.log(`   ✅ Updated: ${cooler.name}`);
                console.log(`      Price: $${productData.price}`);
                console.log(`      Title: ${productData.title}`);
                if (productData.imageUrl) {
                    console.log(`      Image: ${productData.imageUrl.substring(0, 60)}...`);
                }
            } else {
                console.log(`   ⚠️  Could not get price for ${cooler.name}`);
            }

            // Wait between requests
            await new Promise(resolve => setTimeout(resolve, 2000));
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

updateTr5Coolers()
    .then(() => {
        console.log('✅ Script completed successfully');
        process.exit(0);
    })
    .catch((error) => {
        console.error('❌ Script failed:', error);
        process.exit(1);
    });
