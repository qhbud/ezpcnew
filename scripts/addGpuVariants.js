/**
 * addGpuVariants.js
 *
 * Searches Amazon for brand-specific GPU variants and APPENDS them
 * to existing collections. Deduplicates by ASIN and product name similarity.
 * Goal: ensure every GPU model has at least 3 variants.
 */

const { connectToDatabase, getDatabase } = require('../config/database');
const puppeteer = require('puppeteer');
const config = require('./config/scrapeConfig');

// ─── GPU Model Definitions ─────────────────────────────────────────────────

const GPU_MODELS = [
    // NVIDIA RTX 50 Series
    { model: 'RTX 5090', collection: 'gpus_rtx_5090', manufacturer: 'NVIDIA', tier: 'flagship' },
    { model: 'RTX 5080', collection: 'gpus_rtx_5080', manufacturer: 'NVIDIA', tier: 'high-end' },
    { model: 'RTX 5070 Ti', collection: 'gpus_rtx_5070_ti', manufacturer: 'NVIDIA', tier: 'high-end' },
    { model: 'RTX 5070', collection: 'gpus_rtx_5070', manufacturer: 'NVIDIA', tier: 'upper-mid' },
    { model: 'RTX 5060 Ti', collection: 'gpus_rtx_5060_ti', manufacturer: 'NVIDIA', tier: 'mid-range' },
    { model: 'RTX 5060', collection: 'gpus_rtx_5060', manufacturer: 'NVIDIA', tier: 'mid-range' },
    // NVIDIA RTX 40 Series
    { model: 'RTX 4090', collection: 'gpus_rtx_4090', manufacturer: 'NVIDIA', tier: 'flagship' },
    { model: 'RTX 4080 Super', collection: 'gpus_rtx_4080_super', manufacturer: 'NVIDIA', tier: 'high-end' },
    { model: 'RTX 4080', collection: 'gpus_rtx_4080', manufacturer: 'NVIDIA', tier: 'high-end' },
    { model: 'RTX 4070 Ti Super', collection: 'gpus_rtx_4070_ti_super', manufacturer: 'NVIDIA', tier: 'high-end' },
    { model: 'RTX 4070 Ti', collection: 'gpus_rtx_4070_ti', manufacturer: 'NVIDIA', tier: 'upper-mid' },
    { model: 'RTX 4070 Super', collection: 'gpus_rtx_4070_super', manufacturer: 'NVIDIA', tier: 'upper-mid' },
    { model: 'RTX 4070', collection: 'gpus_rtx_4070', manufacturer: 'NVIDIA', tier: 'upper-mid' },
    { model: 'RTX 4060 Ti', collection: 'gpus_rtx_4060_ti', manufacturer: 'NVIDIA', tier: 'mid-range' },
    { model: 'RTX 4060', collection: 'gpus_rtx_4060', manufacturer: 'NVIDIA', tier: 'mid-range' },
    // NVIDIA RTX 30 Series
    { model: 'RTX 3090 Ti', collection: 'gpus_rtx_3090_ti', manufacturer: 'NVIDIA', tier: 'flagship' },
    { model: 'RTX 3090', collection: 'gpus_rtx_3090', manufacturer: 'NVIDIA', tier: 'flagship' },
    { model: 'RTX 3080 Ti', collection: 'gpus_rtx_3080_ti', manufacturer: 'NVIDIA', tier: 'high-end' },
    { model: 'RTX 3080', collection: 'gpus_rtx_3080', manufacturer: 'NVIDIA', tier: 'high-end' },
    { model: 'RTX 3070 Ti', collection: 'gpus_rtx_3070_ti', manufacturer: 'NVIDIA', tier: 'upper-mid' },
    { model: 'RTX 3070', collection: 'gpus_rtx_3070', manufacturer: 'NVIDIA', tier: 'upper-mid' },
    { model: 'RTX 3060 Ti', collection: 'gpus_rtx_3060_ti', manufacturer: 'NVIDIA', tier: 'mid-range' },
    { model: 'RTX 3060', collection: 'gpus_rtx_3060', manufacturer: 'NVIDIA', tier: 'mid-range' },
    { model: 'RTX 3050', collection: 'gpus_rtx_3050', manufacturer: 'NVIDIA', tier: 'entry' },
    // AMD RX 7000 Series
    { model: 'RX 7900 XTX', collection: 'gpus_rx_7900_xtx', manufacturer: 'AMD', tier: 'flagship' },
    { model: 'RX 7900 XT', collection: 'gpus_rx_7900_xt', manufacturer: 'AMD', tier: 'high-end' },
    { model: 'RX 7900 GRE', collection: 'gpus_rx_7900_gre', manufacturer: 'AMD', tier: 'high-end' },
    { model: 'RX 7800 XT', collection: 'gpus_rx_7800_xt', manufacturer: 'AMD', tier: 'upper-mid' },
    { model: 'RX 7700 XT', collection: 'gpus_rx_7700_xt', manufacturer: 'AMD', tier: 'upper-mid' },
    { model: 'RX 7600 XT', collection: 'gpus_rx_7600_xt', manufacturer: 'AMD', tier: 'mid-range' },
    { model: 'RX 7600', collection: 'gpus_rx_7600', manufacturer: 'AMD', tier: 'mid-range' },
    // AMD RX 6000 Series
    { model: 'RX 6950 XT', collection: 'gpus_rx_6950_xt', manufacturer: 'AMD', tier: 'high-end' },
    { model: 'RX 6900 XT', collection: 'gpus_rx_6900_xt', manufacturer: 'AMD', tier: 'high-end' },
    { model: 'RX 6800 XT', collection: 'gpus_rx_6800_xt', manufacturer: 'AMD', tier: 'high-end' },
    { model: 'RX 6800', collection: 'gpus_rx_6800', manufacturer: 'AMD', tier: 'upper-mid' },
    { model: 'RX 6750 XT', collection: 'gpus_rx_6750_xt', manufacturer: 'AMD', tier: 'upper-mid' },
    { model: 'RX 6700 XT', collection: 'gpus_rx_6700_xt', manufacturer: 'AMD', tier: 'upper-mid' },
    { model: 'RX 6650 XT', collection: 'gpus_rx_6650_xt', manufacturer: 'AMD', tier: 'mid-range' },
    { model: 'RX 6600 XT', collection: 'gpus_rx_6600_xt', manufacturer: 'AMD', tier: 'mid-range' },
    { model: 'RX 6600', collection: 'gpus_rx_6600', manufacturer: 'AMD', tier: 'mid-range' },
    { model: 'RX 6500 XT', collection: 'gpus_rx_6500_xt', manufacturer: 'AMD', tier: 'entry' },
    { model: 'RX 6400', collection: 'gpus_rx_6400', manufacturer: 'AMD', tier: 'entry' },
    // Intel Arc
    { model: 'Arc A770', collection: 'gpus_arc_a770', manufacturer: 'Intel', tier: 'upper-mid' },
    { model: 'Arc A750', collection: 'gpus_arc_a750', manufacturer: 'Intel', tier: 'mid-range' },
    { model: 'Arc A580', collection: 'gpus_arc_a580', manufacturer: 'Intel', tier: 'mid-range' },
    { model: 'Arc A380', collection: 'gpus_arc_a380', manufacturer: 'Intel', tier: 'entry' },
];

// Brand search prefixes by chip manufacturer
const BRAND_SEARCHES = {
    NVIDIA: ['ASUS', 'MSI', 'Gigabyte', 'EVGA', 'Zotac', 'PNY', 'Inno3D', 'Palit', 'Gainward', 'Galax'],
    AMD: ['Sapphire', 'PowerColor', 'XFX', 'MSI', 'Gigabyte', 'ASRock', 'ASUS', 'Acer', 'Yeston'],
    Intel: ['Sparkle', 'ASRock', 'ASUS', 'MSI', 'Acer', 'Gigabyte', 'Gunnir']
};

// Standard VRAM table (fallback when title parsing fails)
const VRAM_TABLE = {
    'RTX 5090': { size: 32, type: 'GDDR7' },
    'RTX 5080': { size: 16, type: 'GDDR7' },
    'RTX 5070 Ti': { size: 16, type: 'GDDR7' },
    'RTX 5070': { size: 12, type: 'GDDR7' },
    'RTX 5060 Ti': { size: 16, type: 'GDDR7' },
    'RTX 5060': { size: 8, type: 'GDDR7' },
    'RTX 4090': { size: 24, type: 'GDDR6X' },
    'RTX 4080 Super': { size: 16, type: 'GDDR6X' },
    'RTX 4080': { size: 16, type: 'GDDR6X' },
    'RTX 4070 Ti Super': { size: 16, type: 'GDDR6X' },
    'RTX 4070 Ti': { size: 12, type: 'GDDR6X' },
    'RTX 4070 Super': { size: 12, type: 'GDDR6X' },
    'RTX 4070': { size: 12, type: 'GDDR6X' },
    'RTX 4060 Ti': { size: 16, type: 'GDDR6X' },
    'RTX 4060': { size: 8, type: 'GDDR6X' },
    'RTX 3090 Ti': { size: 24, type: 'GDDR6X' },
    'RTX 3090': { size: 24, type: 'GDDR6X' },
    'RTX 3080 Ti': { size: 12, type: 'GDDR6X' },
    'RTX 3080': { size: 10, type: 'GDDR6X' },
    'RTX 3070 Ti': { size: 8, type: 'GDDR6X' },
    'RTX 3070': { size: 8, type: 'GDDR6' },
    'RTX 3060 Ti': { size: 8, type: 'GDDR6' },
    'RTX 3060': { size: 12, type: 'GDDR6' },
    'RTX 3050': { size: 8, type: 'GDDR6' },
    'RX 7900 XTX': { size: 24, type: 'GDDR6' },
    'RX 7900 XT': { size: 20, type: 'GDDR6' },
    'RX 7900 GRE': { size: 16, type: 'GDDR6' },
    'RX 7800 XT': { size: 16, type: 'GDDR6' },
    'RX 7700 XT': { size: 12, type: 'GDDR6' },
    'RX 7600 XT': { size: 16, type: 'GDDR6' },
    'RX 7600': { size: 8, type: 'GDDR6' },
    'RX 6950 XT': { size: 16, type: 'GDDR6' },
    'RX 6900 XT': { size: 16, type: 'GDDR6' },
    'RX 6800 XT': { size: 16, type: 'GDDR6' },
    'RX 6800': { size: 16, type: 'GDDR6' },
    'RX 6750 XT': { size: 12, type: 'GDDR6' },
    'RX 6700 XT': { size: 12, type: 'GDDR6' },
    'RX 6650 XT': { size: 8, type: 'GDDR6' },
    'RX 6600 XT': { size: 8, type: 'GDDR6' },
    'RX 6600': { size: 8, type: 'GDDR6' },
    'RX 6500 XT': { size: 4, type: 'GDDR6' },
    'RX 6400': { size: 4, type: 'GDDR6' },
    'Arc A770': { size: 16, type: 'GDDR6' },
    'Arc A750': { size: 8, type: 'GDDR6' },
    'Arc A580': { size: 8, type: 'GDDR6' },
    'Arc A380': { size: 6, type: 'GDDR6' }
};

const TARGET_VARIANTS = 9;

// ─── Helper Functions ───────────────────────────────────────────────────────

function extractMemoryFromTitle(title, gpuModel) {
    if (!title) return VRAM_TABLE[gpuModel] || { size: null, type: null };
    const sizeMatch = title.match(/(\d+)\s*GB/i);
    const typeMatch = title.match(/GDDR\d+[A-Z]*/i);
    const extracted = {
        size: sizeMatch ? parseInt(sizeMatch[1]) : null,
        type: typeMatch ? typeMatch[0] : null
    };
    if (!extracted.size || !extracted.type) {
        const fallback = VRAM_TABLE[gpuModel];
        if (fallback) {
            return {
                size: extracted.size || fallback.size,
                type: extracted.type || fallback.type
            };
        }
    }
    return extracted;
}

function extractPartner(title) {
    if (!title) return 'Unknown';
    const upper = title.toUpperCase();
    const brands = [
        'ASUS', 'MSI', 'GIGABYTE', 'EVGA', 'ZOTAC', 'PNY', 'SAPPHIRE',
        'POWERCOLOR', 'XFX', 'ASROCK', 'PALIT', 'GAINWARD', 'INNO3D', 'SPARKLE',
        'GALAX', 'YESTON', 'ACER', 'GUNNIR'
    ];
    for (const brand of brands) {
        if (upper.includes(brand)) return brand.charAt(0) + brand.slice(1).toLowerCase();
    }
    return 'Unknown';
}

/**
 * Check if a product title actually matches the GPU model we're looking for.
 * This filters out wrong models from search results.
 */
function titleMatchesModel(title, model) {
    if (!title) return false;
    const upper = title.toUpperCase();
    const modelUpper = model.toUpperCase();

    // For models with "Super" or "Ti Super", be strict
    if (modelUpper.includes('TI SUPER')) {
        return upper.includes('TI SUPER') || upper.includes('TI  SUPER');
    }
    if (modelUpper.includes('SUPER') && !modelUpper.includes('TI')) {
        // Must have SUPER but NOT Ti Super
        if (!upper.includes('SUPER')) return false;
        if (upper.includes('TI SUPER') || upper.includes('TI  SUPER')) return false;
    }
    if (modelUpper.includes(' TI') && !modelUpper.includes('SUPER')) {
        // Must have Ti but NOT Ti Super
        if (!upper.includes(' TI') && !upper.includes(' TI ')) return false;
        if (upper.includes('TI SUPER')) return false;
    }

    // Extract the numeric part (e.g., "4090" from "RTX 4090")
    const numMatch = modelUpper.match(/\d{4}/);
    if (numMatch) {
        if (!upper.includes(numMatch[0])) return false;
    }

    // Check chip family prefix
    if (modelUpper.startsWith('RTX') && !upper.includes('RTX')) return false;
    if (modelUpper.startsWith('GTX') && !upper.includes('GTX')) return false;
    if (modelUpper.startsWith('RX') && !upper.includes('RX')) return false;
    if (modelUpper.startsWith('ARC') && !upper.includes('ARC')) return false;

    // Filter out desktops, laptops, pre-built systems
    const badKeywords = ['DESKTOP', 'LAPTOP', 'NOTEBOOK', 'ALL-IN-ONE', 'TOWER PC', 'GAMING PC', 'PREBUILT', 'PRE-BUILT'];
    for (const kw of badKeywords) {
        if (upper.includes(kw)) return false;
    }

    return true;
}

/**
 * Check if a product is a duplicate of something already in the collection.
 * Compares by ASIN and by name similarity.
 */
function isDuplicate(product, existingProducts) {
    const newAsin = product.asin;
    const newName = (product.name || '').toUpperCase().trim();
    const newUrl = product.sourceUrl || '';

    for (const existing of existingProducts) {
        // Match by ASIN
        if (newAsin && existing.asin && newAsin === existing.asin) return true;

        // Match by source URL (same product page)
        if (newUrl && existing.sourceUrl) {
            // Extract ASIN from URLs like /dp/B0XXXXXX/
            const newUrlAsin = newUrl.match(/\/dp\/([A-Z0-9]{10})/i);
            const existUrlAsin = (existing.sourceUrl || '').match(/\/dp\/([A-Z0-9]{10})/i);
            if (newUrlAsin && existUrlAsin && newUrlAsin[1] === existUrlAsin[1]) return true;
        }

        // Match by very similar name (first 60 chars match)
        const existName = (existing.name || existing.title || '').toUpperCase().trim();
        if (newName && existName) {
            const shortNew = newName.substring(0, 60);
            const shortExist = existName.substring(0, 60);
            if (shortNew === shortExist) return true;
        }
    }
    return false;
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// ─── Amazon Search & Extract ────────────────────────────────────────────────

async function searchAmazon(page, searchQuery) {
    const encodedQuery = encodeURIComponent(searchQuery + ' graphics card');
    const url = `https://www.amazon.com/s?k=${encodedQuery}`;

    try {
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
        // Wait for search results to load
        try {
            await page.waitForSelector('[data-component-type="s-search-result"], div[data-asin]', { timeout: 8000 });
        } catch (e) {
            // Timeout waiting for results - page might still have content
        }
        // Small delay for dynamic content
        await sleep(2000);
    } catch (error) {
        console.log(`    ⚠️  Navigation failed for "${searchQuery}": ${error.message}`);
        return [];
    }

    // Extract products from search results page
    const products = await page.evaluate(() => {
        const items = [];
        const containers = document.querySelectorAll('[data-component-type="s-search-result"], div[data-asin]:not([data-asin=""])');

        containers.forEach((item) => {
            try {
                // Title
                let title = '';
                const titleEl = item.querySelector('h2 span.a-text-normal') ||
                    item.querySelector('h2 a span') ||
                    item.querySelector('h2 span');
                if (titleEl) title = titleEl.textContent.trim();
                if (!title) return;

                // Price
                let price = null;
                const priceSelectors = ['.a-price .a-offscreen', '.a-price-whole', 'span.a-price span[aria-hidden="true"]'];
                for (const sel of priceSelectors) {
                    const el = item.querySelector(sel);
                    if (el) {
                        const cleaned = (el.textContent || '').replace(/[^0-9.]/g, '');
                        const p = parseFloat(cleaned);
                        if (p > 0 && p < 10000) { price = p; break; }
                    }
                }

                // URL
                let productUrl = '';
                const linkEl = item.querySelector('h2 a, a.a-link-normal[href*="/dp/"]');
                if (linkEl) productUrl = linkEl.href || '';

                // Image
                let imageUrl = '';
                const imgEl = item.querySelector('img.s-image, img[data-image-latency]');
                if (imgEl) imageUrl = imgEl.src || imgEl.getAttribute('data-src') || '';

                // ASIN
                const asin = item.getAttribute('data-asin') || '';

                if (title && price && price > 0) {
                    items.push({ name: title, title, basePrice: price, currentPrice: price, price, salePrice: null, isOnSale: false, sourceUrl: productUrl, imageUrl, asin, source: 'Amazon', scrapedAt: new Date().toISOString() });
                }
            } catch (e) { /* skip item */ }
        });
        return items;
    });

    return products;
}

// ─── Main Script ────────────────────────────────────────────────────────────

async function main() {
    console.log('🚀 GPU Variant Finder - Adding more variants to reach 9+ per model\n');

    // Connect to database
    await connectToDatabase();
    const db = getDatabase();
    console.log('✅ Connected to MongoDB\n');

    // Launch browser
    const browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    console.log('✅ Browser launched\n');

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    await page.setViewport({ width: 1920, height: 1080 });

    const stats = { modelsProcessed: 0, modelsSkipped: 0, variantsAdded: 0, searchesMade: 0 };

    for (const gpuModel of GPU_MODELS) {
        const { model, collection: collName, manufacturer, tier } = gpuModel;

        // Check current variant count
        const collExists = await db.listCollections({ name: collName }).toArray();
        let existingProducts = [];
        if (collExists.length > 0) {
            existingProducts = await db.collection(collName).find({}).toArray();
        }

        const currentCount = existingProducts.length;

        if (currentCount >= TARGET_VARIANTS) {
            console.log(`✅ ${model}: already has ${currentCount} variants - skipping`);
            stats.modelsSkipped++;
            continue;
        }

        const needed = TARGET_VARIANTS - currentCount;
        console.log(`\n🔍 ${model}: has ${currentCount} variants, need ${needed} more`);

        const brands = BRAND_SEARCHES[manufacturer] || [];
        let addedForModel = 0;

        for (const brand of brands) {
            if (addedForModel >= needed) {
                console.log(`    ✅ Reached target for ${model}`);
                break;
            }

            const query = `${brand} ${model}`;
            console.log(`    🌐 Searching: "${query}"`);
            stats.searchesMade++;

            const products = await searchAmazon(page, query);
            console.log(`    📦 Found ${products.length} raw results`);

            // Filter to only matching products
            const matching = products.filter(p => titleMatchesModel(p.name, model));
            console.log(`    🎯 ${matching.length} match "${model}"`);

            for (const product of matching) {
                if (addedForModel >= needed) break;

                // Check for duplicates against existing + newly added
                if (isDuplicate(product, existingProducts)) {
                    console.log(`    ⏭️  Duplicate: ${product.name.substring(0, 60)}...`);
                    continue;
                }

                // Enrich the product
                const memory = extractMemoryFromTitle(product.name, model);
                const enriched = {
                    ...product,
                    gpuModel: model,
                    manufacturer,
                    tier,
                    partner: extractPartner(product.name),
                    memory,
                    searchTerms: [query],
                    lastUpdated: new Date(),
                    updatedAt: new Date(),
                    createdAt: new Date(),
                    category: 'gpus',
                    isAvailable: true
                };

                // Insert into collection
                await db.collection(collName).insertOne(enriched);
                existingProducts.push(enriched); // Track for dedup
                addedForModel++;
                stats.variantsAdded++;
                console.log(`    ✅ Added: ${product.name.substring(0, 70)}... ($${product.currentPrice})`);
            }

            // Rate limit between searches
            const delay = 3000 + Math.random() * 3000;
            await sleep(delay);
        }

        if (addedForModel < needed) {
            // Try a generic search as fallback
            const genericQuery = model;
            console.log(`    🌐 Fallback search: "${genericQuery}"`);
            stats.searchesMade++;

            const products = await searchAmazon(page, genericQuery);
            const matching = products.filter(p => titleMatchesModel(p.name, model));

            for (const product of matching) {
                if (addedForModel >= needed) break;
                if (isDuplicate(product, existingProducts)) continue;

                const memory = extractMemoryFromTitle(product.name, model);
                const enriched = {
                    ...product,
                    gpuModel: model,
                    manufacturer,
                    tier,
                    partner: extractPartner(product.name),
                    memory,
                    searchTerms: [genericQuery],
                    lastUpdated: new Date(),
                    updatedAt: new Date(),
                    createdAt: new Date(),
                    category: 'gpus',
                    isAvailable: true
                };

                await db.collection(collName).insertOne(enriched);
                existingProducts.push(enriched);
                addedForModel++;
                stats.variantsAdded++;
                console.log(`    ✅ Added: ${product.name.substring(0, 70)}... ($${product.currentPrice})`);
            }

            await sleep(3000 + Math.random() * 3000);
        }

        const finalCount = currentCount + addedForModel;
        if (finalCount >= TARGET_VARIANTS) {
            console.log(`    🎉 ${model}: now has ${finalCount} variants!`);
        } else {
            console.log(`    ⚠️  ${model}: only ${finalCount} variants found (target: ${TARGET_VARIANTS})`);
        }
        stats.modelsProcessed++;
    }

    // Cleanup
    await page.close();
    await browser.close();

    // Print summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 SUMMARY');
    console.log('='.repeat(60));
    console.log(`Models processed: ${stats.modelsProcessed}`);
    console.log(`Models skipped (already had ${TARGET_VARIANTS}+): ${stats.modelsSkipped}`);
    console.log(`New variants added: ${stats.variantsAdded}`);
    console.log(`Total searches made: ${stats.searchesMade}`);
    console.log('='.repeat(60));

    process.exit(0);
}

main().catch(err => {
    console.error('❌ Fatal error:', err);
    process.exit(1);
});
