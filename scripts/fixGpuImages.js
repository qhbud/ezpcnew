/**
 * fixGpuImages.js
 *
 * Finds all GPU documents across gpus_* collections that are missing imageUrl,
 * searches Amazon for each GPU by name, extracts the product image from
 * search results, and updates the document in MongoDB.
 */

const puppeteer = require('puppeteer');
const { MongoClient } = require('mongodb');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/pcbuilder';
const DB_NAME = process.env.DB_NAME || 'pcbuilder';

// Delay between Amazon searches (ms)
const MIN_DELAY = 3000;
const MAX_DELAY = 5000;

function randomDelay() {
  return Math.floor(Math.random() * (MAX_DELAY - MIN_DELAY + 1)) + MIN_DELAY;
}

async function searchAmazonForImage(page, searchQuery) {
  try {
    const encoded = encodeURIComponent(searchQuery);
    const url = `https://www.amazon.com/s?k=${encoded}`;
    console.log(`   Searching: ${searchQuery}`);

    await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });

    // Wait for search results to load
    await page.waitForSelector('[data-component-type="s-search-result"], .s-result-item', { timeout: 15000 }).catch(() => {});

    const imageUrl = await page.evaluate(() => {
      // Find the first search result with a product image
      const results = document.querySelectorAll('[data-component-type="s-search-result"]');

      for (const result of results) {
        // Skip sponsored/ad results if possible
        const adLabel = result.querySelector('.puis-label-popover-default');

        const img = result.querySelector('.s-image');
        if (img && img.src) {
          let src = img.src;
          // Skip placeholder/spinner images
          if (src.includes('transparent-pixel') || src.includes('loading') || src.includes('spinner')) {
            continue;
          }
          // Clean up Amazon image URL - get a decent resolution
          // Amazon search result images are typically like:
          // https://m.media-amazon.com/images/I/XXXXX._AC_UL320_.jpg
          // Convert to a cleaner version
          if (src.includes('._')) {
            src = src.replace(/\._[^.]+_\./, '._AC_SL500_.');
          }
          return src;
        }
      }

      // Fallback: try any .s-image on the page
      const anyImg = document.querySelector('.s-image');
      if (anyImg && anyImg.src && !anyImg.src.includes('transparent-pixel')) {
        let src = anyImg.src;
        if (src.includes('._')) {
          src = src.replace(/\._[^.]+_\./, '._AC_SL500_.');
        }
        return src;
      }

      return null;
    });

    return imageUrl;
  } catch (error) {
    console.error(`   Error searching for "${searchQuery}":`, error.message);
    return null;
  }
}

async function fixGpuImages() {
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

    // Gather all GPUs missing images
    const gpusMissingImages = [];

    for (const colInfo of gpuCollections) {
      const col = db.collection(colInfo.name);
      const docs = await col.find({}).toArray();

      for (const doc of docs) {
        const hasImage = typeof doc.imageUrl === 'string' && doc.imageUrl.trim() !== '';
        if (!hasImage) {
          gpusMissingImages.push({
            collection: colInfo.name,
            _id: doc._id,
            name: doc.name || doc.title || doc.model || 'Unknown'
          });
        }
      }
    }

    console.log(`Found ${gpusMissingImages.length} GPUs missing images\n`);

    if (gpusMissingImages.length === 0) {
      console.log('All GPUs already have images. Nothing to do.');
      return;
    }

    // List them
    for (const gpu of gpusMissingImages) {
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
    // Set viewport for consistent rendering
    await page.setViewport({ width: 1920, height: 1080 });

    let updated = 0;
    let failed = 0;

    for (let i = 0; i < gpusMissingImages.length; i++) {
      const gpu = gpusMissingImages[i];
      console.log(`\n[${i + 1}/${gpusMissingImages.length}] ${gpu.name}`);
      console.log(`   Collection: ${gpu.collection}`);

      const imageUrl = await searchAmazonForImage(page, gpu.name);

      if (imageUrl) {
        const col = db.collection(gpu.collection);
        await col.updateOne(
          { _id: gpu._id },
          { $set: { imageUrl: imageUrl, updatedAt: new Date() } }
        );
        updated++;
        console.log(`   Updated with image: ${imageUrl.substring(0, 80)}...`);
      } else {
        failed++;
        console.log(`   FAILED - no image found`);
      }

      // Rate limit between searches
      if (i < gpusMissingImages.length - 1) {
        const delay = randomDelay();
        console.log(`   Waiting ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('  RESULTS');
    console.log('='.repeat(60));
    console.log(`Total missing:   ${gpusMissingImages.length}`);
    console.log(`Updated:         ${updated}`);
    console.log(`Failed:          ${failed}`);
    console.log('='.repeat(60));

  } catch (error) {
    console.error('Error:', error.message);
    throw error;
  } finally {
    if (browser) {
      await browser.close();
    }
    await client.close();
    console.log('\nDatabase connection closed.');
  }
}

fixGpuImages()
  .then(() => {
    console.log('Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Script failed:', error);
    process.exit(1);
  });
