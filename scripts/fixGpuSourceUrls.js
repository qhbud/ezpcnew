/**
 * fixGpuSourceUrls.js
 *
 * Finds all GPU documents across gpus_* collections that are missing sourceUrl,
 * searches Amazon for each GPU by name, extracts the product URL from
 * the first search result, and updates the document in MongoDB.
 * This allows the priceUpdater to keep these GPUs' prices current.
 */

const puppeteer = require('puppeteer');
const { MongoClient } = require('mongodb');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/pcbuilder';
const DB_NAME = process.env.DB_NAME || 'pcbuilder';
const AFFILIATE_TAG = 'qhezpc-20';

const MIN_DELAY = 3000;
const MAX_DELAY = 5000;

function randomDelay() {
    return Math.floor(Math.random() * (MAX_DELAY - MIN_DELAY + 1)) + MIN_DELAY;
}

async function searchAmazonForProduct(page, searchQuery) {
    try {
        const encoded = encodeURIComponent(searchQuery);
        const url = `https://www.amazon.com/s?k=${encoded}`;
        console.log(`   Searching: ${searchQuery}`);

        await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
        await page.waitForSelector('[data-component-type="s-search-result"]', { timeout: 15000 }).catch(() => {});

        const productData = await page.evaluate(() => {
            const results = document.querySelectorAll('[data-component-type="s-search-result"]');

            for (const result of results) {
                // Get the ASIN from the data attribute
                const asin = result.getAttribute('data-asin');
                if (!asin) continue;

                // Get the product link
                const link = result.querySelector('a.a-link-normal.s-no-outline, h2 a.a-link-normal');
                const href = link ? link.getAttribute('href') : null;

                // Get the product title to verify it's relevant
                const titleEl = result.querySelector('h2 span, .a-text-normal');
                const title = titleEl ? titleEl.textContent.trim() : '';

                // Get price to verify product is available
                const priceEl = result.querySelector('.a-price .a-offscreen');
                const priceText = priceEl ? priceEl.textContent.trim() : '';

                if (asin && title) {
                    return { asin, href, title, priceText };
                }
            }
            return null;
        });

        return productData;
    } catch (error) {
        console.error(`   Error searching for "${searchQuery}":`, error.message);
        return null;
    }
}

async function fixGpuSourceUrls() {
    const client = new MongoClient(MONGODB_URI);
    let browser;

    try {
        await client.connect();
        console.log('Connected to MongoDB successfully\n');

        const db = client.db(DB_NAME);

        // Find all gpus_* collections
        const collections = await db.listCollections().toArray();
        const gpuCollections = collections
            .filter(c => c.name.startsWith('gpus_'))
            .sort((a, b) => a.name.localeCompare(b.name));

        console.log(`Found ${gpuCollections.length} GPU collections\n`);

        // Gather all GPUs missing sourceUrl
        const gpusMissing = [];

        for (const colInfo of gpuCollections) {
            const col = db.collection(colInfo.name);
            const docs = await col.find({}).toArray();

            for (const doc of docs) {
                const hasSourceUrl = typeof doc.sourceUrl === 'string' && doc.sourceUrl.trim() !== '';
                if (!hasSourceUrl) {
                    gpusMissing.push({
                        collection: colInfo.name,
                        _id: doc._id,
                        name: doc.name || doc.title || doc.model || 'Unknown'
                    });
                }
            }
        }

        console.log(`Found ${gpusMissing.length} GPUs missing sourceUrl\n`);

        if (gpusMissing.length === 0) {
            console.log('All GPUs already have sourceUrls. Nothing to do.');
            return;
        }

        for (const gpu of gpusMissing) {
            console.log(`  [${gpu.collection}] ${gpu.name}`);
        }
        console.log('');

        // Launch browser
        console.log('Launching browser...\n');
        browser = await puppeteer.launch({
            headless: 'new',
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });

        const page = await browser.newPage();
        await page.setUserAgent(
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        );
        await page.setViewport({ width: 1920, height: 1080 });

        let updated = 0;
        let failed = 0;

        for (let i = 0; i < gpusMissing.length; i++) {
            const gpu = gpusMissing[i];
            console.log(`\n[${i + 1}/${gpusMissing.length}] ${gpu.name}`);
            console.log(`   Collection: ${gpu.collection}`);

            const productData = await searchAmazonForProduct(page, gpu.name);

            if (productData && productData.asin) {
                const sourceUrl = `https://www.amazon.com/dp/${productData.asin}?tag=${AFFILIATE_TAG}`;
                const col = db.collection(gpu.collection);
                await col.updateOne(
                    { _id: gpu._id },
                    { $set: { sourceUrl: sourceUrl, updatedAt: new Date() } }
                );
                updated++;
                console.log(`   Found: ${productData.title.substring(0, 70)}...`);
                console.log(`   ASIN: ${productData.asin} | Price: ${productData.priceText || 'N/A'}`);
                console.log(`   URL: ${sourceUrl}`);
            } else {
                failed++;
                console.log(`   FAILED - no product found`);
            }

            // Rate limit
            if (i < gpusMissing.length - 1) {
                const delay = randomDelay();
                console.log(`   Waiting ${delay}ms...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }

        // Summary
        console.log('\n' + '='.repeat(60));
        console.log('  RESULTS');
        console.log('='.repeat(60));
        console.log(`Total missing:   ${gpusMissing.length}`);
        console.log(`Updated:         ${updated}`);
        console.log(`Failed:          ${failed}`);
        console.log('='.repeat(60));

    } catch (error) {
        console.error('Error:', error.message);
        throw error;
    } finally {
        if (browser) await browser.close();
        await client.close();
        console.log('\nDatabase connection closed.');
    }
}

fixGpuSourceUrls()
    .then(() => {
        console.log('Script completed successfully');
        process.exit(0);
    })
    .catch((error) => {
        console.error('Script failed:', error);
        process.exit(1);
    });
