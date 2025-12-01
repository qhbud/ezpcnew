const { connectToDatabase, getDatabase } = require('../config/database');
const puppeteer = require('puppeteer');
const colors = require('colors');

class CpuUrlFinder {
    constructor() {
        this.db = null;
        this.browser = null;
        this.page = null;
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
                '--disable-accelerated-2d-canvas',
                '--no-first-run',
                '--no-zygote',
                '--disable-gpu'
            ]
        });
        this.page = await this.browser.newPage();
        await this.page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
        await this.page.setViewport({ width: 1920, height: 1080 });
        console.log('✅ Browser initialized'.green);
    }

    async searchForProductUrl(cpuName) {
        try {
            // Create search URL
            const searchQuery = cpuName.replace(/\s+/g, '+');
            const searchUrl = `https://www.amazon.com/s?k=${searchQuery}`;

            console.log(`   🔍 Searching: ${searchUrl}`.gray);

            // Navigate to search page
            await this.page.goto(searchUrl, {
                waitUntil: 'domcontentloaded',
                timeout: 30000
            });

            // Wait for results
            await this.page.waitForTimeout(3000);

            // Extract first product URL
            const productUrl = await this.page.evaluate(() => {
                // Look for product links
                const productLinks = document.querySelectorAll('a[href*="/dp/"]');

                for (const link of productLinks) {
                    const href = link.getAttribute('href');

                    // Skip sponsored products
                    let parent = link;
                    let isSponsored = false;
                    while (parent && parent !== document.body) {
                        const text = parent.textContent || '';
                        if (text.includes('Sponsored') || parent.getAttribute('data-component-type') === 'sp-sponsored-result') {
                            isSponsored = true;
                            break;
                        }
                        parent = parent.parentElement;
                    }

                    if (isSponsored) continue;

                    // Extract clean product URL
                    if (href && href.includes('/dp/')) {
                        const match = href.match(/\/dp\/([A-Z0-9]+)/);
                        if (match) {
                            return `https://www.amazon.com/dp/${match[1]}`;
                        }
                    }
                }

                return null;
            });

            if (productUrl) {
                console.log(`   ✅ Found: ${productUrl}`.green);
                return productUrl;
            } else {
                console.log(`   ⚠️  No product URL found`.yellow);
                return null;
            }

        } catch (error) {
            console.log(`   ❌ Error searching: ${error.message}`.red);
            return null;
        }
    }

    async updateCpuUrl(collectionName, cpu, newUrl) {
        try {
            await this.db.collection(collectionName).updateOne(
                { _id: cpu._id },
                {
                    $set: {
                        sourceUrl: newUrl,
                        url: newUrl,
                        updatedAt: new Date()
                    }
                }
            );
            return true;
        } catch (error) {
            console.log(`   ❌ Database update failed: ${error.message}`.red);
            return false;
        }
    }

    async processAllCpus() {
        try {
            console.log('\n🔍 Finding Product URLs for All CPUs\n'.cyan.bold);

            const collections = await this.db.listCollections().toArray();
            const cpuCollections = collections
                .filter(col => col.name.startsWith('cpus'))
                .map(col => col.name);

            console.log(`📋 Found ${cpuCollections.length} CPU collections`.cyan);

            let totalProcessed = 0;
            let totalUpdated = 0;
            let totalFailed = 0;

            for (const collectionName of cpuCollections) {
                console.log(`\n${'='.repeat(60)}`.cyan);
                console.log(`📦 Processing collection: ${collectionName}`.cyan.bold);
                console.log(`${'='.repeat(60)}`.cyan);

                const cpus = await this.db.collection(collectionName).find({}).toArray();
                console.log(`   Found ${cpus.length} CPUs`.cyan);

                for (let i = 0; i < cpus.length; i++) {
                    const cpu = cpus[i];
                    console.log(`\n   [${i + 1}/${cpus.length}] ${cpu.title}`.cyan);

                    totalProcessed++;

                    // Check if it already has a product URL (contains /dp/)
                    if (cpu.sourceUrl && cpu.sourceUrl.includes('/dp/')) {
                        console.log(`   ✓ Already has product URL`.gray);
                        continue;
                    }

                    // Search for product URL
                    const productUrl = await this.searchForProductUrl(cpu.title);

                    if (productUrl) {
                        const updated = await this.updateCpuUrl(collectionName, cpu, productUrl);
                        if (updated) {
                            console.log(`   💾 Updated database`.green);
                            totalUpdated++;
                        } else {
                            totalFailed++;
                        }
                    } else {
                        console.log(`   ⚠️  Could not find product URL`.yellow);
                        totalFailed++;
                    }

                    // Rate limiting - wait between searches
                    if (i < cpus.length - 1) {
                        const delay = 2000 + Math.random() * 2000; // 2-4 seconds
                        console.log(`   ⏳ Waiting ${(delay/1000).toFixed(1)}s...`.gray);
                        await new Promise(resolve => setTimeout(resolve, delay));
                    }
                }
            }

            console.log('\n' + '='.repeat(60).cyan);
            console.log('📊 SUMMARY'.cyan.bold);
            console.log('='.repeat(60).cyan);
            console.log(`✅ Total Processed: ${totalProcessed}`.green);
            console.log(`💾 URLs Updated: ${totalUpdated}`.green);
            console.log(`❌ Failed: ${totalFailed}`.red);
            console.log('='.repeat(60).cyan);

            console.log('\n💡 Next Step: Run price updater to get current prices'.yellow.bold);
            console.log('   Command: npm run update-cpu-prices\n'.gray);

        } catch (error) {
            console.error('❌ Error:'.red, error);
            throw error;
        }
    }

    async close() {
        if (this.browser) {
            await this.browser.close();
            console.log('\n🚪 Browser closed'.cyan);
        }
    }
}

async function main() {
    const finder = new CpuUrlFinder();

    try {
        await finder.connect();
        await finder.initBrowser();
        await finder.processAllCpus();
    } catch (error) {
        console.error('Fatal error:'.red, error);
    } finally {
        await finder.close();
        process.exit(0);
    }
}

main();
