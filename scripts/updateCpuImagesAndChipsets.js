const { connectToDatabase, getDatabase } = require('../config/database');
const puppeteer = require('puppeteer');
const colors = require('colors');

class CPUImageAndChipsetUpdater {
    constructor() {
        this.db = null;
        this.browser = null;
    }

    async connect() {
        await connectToDatabase();
        this.db = getDatabase();
        console.log('✅ Connected to database'.green);
    }

    async initBrowser() {
        this.browser = await puppeteer.launch({
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-blink-features=AutomationControlled'
            ]
        });
        console.log('🌐 Browser initialized'.cyan);
    }

    // Get all CPU collections
    async getCPUCollections() {
        const collections = await this.db.listCollections().toArray();
        return collections
            .filter(col => col.name.startsWith('cpus'))
            .map(col => col.name);
    }

    // Extract chipset from CPU specifications on Amazon
    async extractChipsetFromAmazon(page, cpuTitle) {
        try {
            // Look for chipset in product details table
            const chipset = await page.evaluate(() => {
                // Common chipset patterns
                const chipsetPatterns = [
                    /chipset[:\s]+([A-Z]\d{3}[A-Z]?)/i,
                    /socket[:\s]+([A-Z]{2,3}\s*\d{3,4})/i,
                    /(B650|X670|Z790|B760|H770|Z690|B660)/i
                ];

                // Check product details table
                const detailRows = document.querySelectorAll('table tr, .prodDetTable tr, #prodDetails tr, #productDetails_techSpec_section_1 tr');
                for (const row of detailRows) {
                    const text = row.textContent;
                    for (const pattern of chipsetPatterns) {
                        const match = text.match(pattern);
                        if (match) {
                            return match[1] || match[0];
                        }
                    }
                }

                // Check product description
                const description = document.querySelector('#feature-bullets, #productDescription, .a-section.a-spacing-medium');
                if (description) {
                    const descText = description.textContent;
                    for (const pattern of chipsetPatterns) {
                        const match = descText.match(pattern);
                        if (match) {
                            return match[1] || match[0];
                        }
                    }
                }

                return null;
            });

            return chipset;
        } catch (error) {
            console.log(`   ⚠️  Error extracting chipset: ${error.message}`.yellow);
            return null;
        }
    }

    // Search Amazon for CPU and get the first product
    async searchAmazonForCPU(page, cpuTitle) {
        const searchQuery = encodeURIComponent(cpuTitle);
        const searchUrl = `https://www.amazon.com/s?k=${searchQuery}`;

        console.log(`   🔍 Searching Amazon for: ${cpuTitle}`.cyan);

        await page.goto(searchUrl, {
            waitUntil: 'networkidle2',
            timeout: 30000
        });

        await page.waitForTimeout(2000);

        // Get the first product link
        const productUrl = await page.evaluate(() => {
            const productLinks = document.querySelectorAll('a.a-link-normal.s-no-outline');
            for (const link of productLinks) {
                const href = link.getAttribute('href');
                if (href && href.includes('/dp/')) {
                    return 'https://www.amazon.com' + href;
                }
            }
            return null;
        });

        return productUrl;
    }

    // Scrape CPU details from Amazon product page
    async scrapeCPUDetails(cpu) {
        const page = await this.browser.newPage();

        try {
            // Set user agent to avoid detection
            await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

            console.log(`   🔍 Processing: ${cpu.title || cpu.name}`.cyan);

            // Search Amazon for the CPU to get real product URL
            const productUrl = await this.searchAmazonForCPU(page, cpu.title || cpu.name);

            if (!productUrl) {
                console.log(`   ⚠️  No Amazon product found for: ${cpu.title}`.yellow);
                return { imageUrl: null, chipset: null, sourceUrl: null };
            }

            console.log(`   ✅ Found product page`.green);

            await page.goto(productUrl, {
                waitUntil: 'networkidle2',
                timeout: 30000
            });

            // Wait a bit for images to load
            await page.waitForTimeout(2000);

            // Extract image URL
            const imageUrl = await page.evaluate(() => {
                // Try multiple selectors for product image
                const imageSelectors = [
                    '#landingImage',
                    '#imgBlkFront',
                    '#main-image',
                    '.a-dynamic-image',
                    'img[data-a-dynamic-image]',
                    '#ebooksImageBlock img'
                ];

                for (const selector of imageSelectors) {
                    const img = document.querySelector(selector);
                    if (img) {
                        // Get the highest resolution image
                        const dynamicImage = img.getAttribute('data-a-dynamic-image');
                        if (dynamicImage) {
                            try {
                                const imageData = JSON.parse(dynamicImage);
                                const imageUrls = Object.keys(imageData);
                                if (imageUrls.length > 0) {
                                    // Return the first URL (usually highest res)
                                    return imageUrls[0];
                                }
                            } catch (e) {
                                // If parsing fails, just use src
                            }
                        }
                        // Fallback to src attribute
                        const src = img.src || img.getAttribute('src');
                        if (src && !src.includes('placeholder')) {
                            return src;
                        }
                    }
                }
                return null;
            });

            // Extract chipset information
            const chipset = await this.extractChipsetFromAmazon(page, cpu.title || cpu.name);

            if (imageUrl) {
                console.log(`   ✅ Found image`.green);
            } else {
                console.log(`   ⚠️  No image found`.yellow);
            }

            if (chipset) {
                console.log(`   ✅ Found chipset: ${chipset}`.green);
            }

            return { imageUrl, chipset, sourceUrl: productUrl };

        } catch (error) {
            console.log(`   ❌ Error scraping ${cpu.title}: ${error.message}`.red);
            return { imageUrl: null, chipset: null, sourceUrl: null };
        } finally {
            await page.close();
        }
    }

    // Update a single CPU collection
    async updateCPUCollection(collectionName) {
        console.log(`\n📦 Processing collection: ${collectionName}`.cyan.bold);

        const collection = this.db.collection(collectionName);
        const cpus = await collection.find({}).toArray();

        console.log(`   Found ${cpus.length} CPUs to update`.cyan);

        let updated = 0;
        let failed = 0;

        for (const cpu of cpus) {
            try {
                // Skip if already has image and chipset
                if (cpu.imageUrl && cpu.chipset) {
                    console.log(`   ⏭️  Skipping ${cpu.title} (already has image and chipset)`.gray);
                    continue;
                }

                const { imageUrl, chipset, sourceUrl } = await this.scrapeCPUDetails(cpu);

                const updateData = {
                    updatedAt: new Date()
                };

                if (imageUrl && !cpu.imageUrl) {
                    updateData.imageUrl = imageUrl;
                }

                if (chipset && !cpu.chipset) {
                    updateData.chipset = chipset;
                }

                if (sourceUrl) {
                    updateData.sourceUrl = sourceUrl;
                }

                // Update the CPU in database
                if (Object.keys(updateData).length > 1) { // More than just updatedAt
                    await collection.updateOne(
                        { _id: cpu._id },
                        { $set: updateData }
                    );
                    updated++;
                    console.log(`   ✅ Updated: ${cpu.title}`.green);
                } else {
                    console.log(`   ℹ️  No new data for: ${cpu.title}`.gray);
                }

                // Add delay to avoid rate limiting
                await new Promise(resolve => setTimeout(resolve, 2000));

            } catch (error) {
                failed++;
                console.log(`   ❌ Failed to update ${cpu.title}: ${error.message}`.red);
            }
        }

        console.log(`\n   Summary for ${collectionName}:`.cyan);
        console.log(`   ✅ Updated: ${updated}`.green);
        console.log(`   ❌ Failed: ${failed}`.red);
        console.log(`   📊 Total: ${cpus.length}`.cyan);

        return { updated, failed, total: cpus.length };
    }

    // Main update function
    async updateAllCPUs() {
        try {
            console.log('\n🚀 Starting CPU Image and Chipset Update\n'.cyan.bold);

            const collections = await this.getCPUCollections();
            console.log(`📋 Found ${collections.length} CPU collections:\n`.cyan);
            collections.forEach(col => console.log(`   • ${col}`.cyan));

            const overallStats = {
                updated: 0,
                failed: 0,
                total: 0
            };

            for (const collectionName of collections) {
                const stats = await this.updateCPUCollection(collectionName);
                overallStats.updated += stats.updated;
                overallStats.failed += stats.failed;
                overallStats.total += stats.total;
            }

            console.log('\n' + '='.repeat(60).cyan);
            console.log('📊 OVERALL SUMMARY'.cyan.bold);
            console.log('='.repeat(60).cyan);
            console.log(`✅ Successfully updated: ${overallStats.updated} CPUs`.green);
            console.log(`❌ Failed: ${overallStats.failed} CPUs`.red);
            console.log(`📊 Total CPUs processed: ${overallStats.total}`.cyan);
            console.log('='.repeat(60).cyan);

        } catch (error) {
            console.log(`\n❌ Update process failed: ${error.message}`.red);
            throw error;
        }
    }

    async close() {
        if (this.browser) {
            await this.browser.close();
            console.log('🚪 Browser closed'.cyan);
        }
    }
}

// Run the updater
async function main() {
    const updater = new CPUImageAndChipsetUpdater();

    try {
        await updater.connect();
        await updater.initBrowser();
        await updater.updateAllCPUs();
    } catch (error) {
        console.error('Fatal error:'.red, error);
    } finally {
        await updater.close();
        process.exit(0);
    }
}

main();
