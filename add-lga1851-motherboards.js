require('dotenv').config();
const mongoose = require('mongoose');
const puppeteer = require('puppeteer');

const motherboardSchema = new mongoose.Schema({}, { strict: false, collection: 'motherboards' });
const Motherboard = mongoose.model('Motherboard', motherboardSchema);

const newMotherboards = [
    {
        url: 'https://www.amazon.com/dp/B0DGWWRTPV?tag=qhezpc-20',
        socket: 'LGA1851',
        chipset: 'Z890',
        formFactor: 'ATX',
        memoryType: 'DDR5',
        manufacturer: 'ASUS'
    },
    {
        url: 'https://www.amazon.com/dp/B0DGWDRMVW?tag=qhezpc-20',
        socket: 'LGA1851',
        chipset: 'Z890',
        formFactor: 'ATX',
        memoryType: 'DDR5',
        manufacturer: 'ASUS'
    },
    {
        url: 'https://www.amazon.com/dp/B0DGWKQCKH?tag=qhezpc-20',
        socket: 'LGA1851',
        chipset: 'Z890',
        formFactor: 'E-ATX',
        memoryType: 'DDR5',
        manufacturer: 'ASUS'
    },
    {
        url: 'https://www.amazon.com/dp/B0DZF28PL4?tag=qhezpc-20',
        socket: 'LGA1851',
        chipset: 'Z890',
        formFactor: 'ATX',
        memoryType: 'DDR5',
        manufacturer: 'NZXT'
    },
    {
        url: 'https://www.amazon.com/dp/B0CRDMX2SV?tag=qhezpc-20',
        socket: 'LGA1851',
        chipset: 'Z890',
        formFactor: 'Micro-ATX',
        memoryType: 'DDR5',
        manufacturer: 'ASUS'
    },
    {
        url: 'https://www.amazon.com/dp/B0DGWHZKMC?tag=qhezpc-20',
        socket: 'LGA1851',
        chipset: 'Z890',
        formFactor: 'ATX',
        memoryType: 'DDR5',
        manufacturer: 'ASUS'
    },
    {
        url: 'https://www.amazon.com/dp/B0DGWNVCHL?tag=qhezpc-20',
        socket: 'LGA1851',
        chipset: 'Z890',
        formFactor: 'ATX',
        memoryType: 'DDR5',
        manufacturer: 'ASUS'
    },
    {
        url: 'https://www.amazon.com/dp/B0DJPTBCD6?tag=qhezpc-20',
        socket: 'LGA1851',
        chipset: 'Z890',
        formFactor: 'Micro-ATX',
        memoryType: 'DDR5',
        manufacturer: 'ASRock'
    },
    {
        url: 'https://www.amazon.com/dp/B0DJRNZWGN?tag=qhezpc-20',
        socket: 'LGA1851',
        chipset: 'Z890',
        formFactor: 'ATX',
        memoryType: 'DDR5',
        manufacturer: 'ASRock'
    },
    {
        url: 'https://www.amazon.com/dp/B0DGWRK1PN?tag=qhezpc-20',
        socket: 'LGA1851',
        chipset: 'Z890',
        formFactor: 'ATX',
        memoryType: 'DDR5',
        manufacturer: 'ASUS'
    }
];

async function scrapeAmazonMotherboard(page, url, baseData) {
    try {
        console.log(`  Navigating to ${url}...`);
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });

        // Wait a bit for dynamic content
        await page.waitForTimeout(2000);

        // Extract product data
        const productData = await page.evaluate(() => {
            const data = {};

            // Get title
            const titleEl = document.querySelector('#productTitle');
            data.name = titleEl ? titleEl.textContent.trim() : null;

            // Get price
            const priceWhole = document.querySelector('.a-price-whole');
            const priceFraction = document.querySelector('.a-price-fraction');
            if (priceWhole) {
                const whole = priceWhole.textContent.replace(/[^0-9]/g, '');
                const fraction = priceFraction ? priceFraction.textContent : '00';
                data.price = parseFloat(`${whole}.${fraction}`);
            }

            // Get image
            const imgEl = document.querySelector('#landingImage, #imgBlkFront');
            data.imageUrl = imgEl ? imgEl.src : null;

            // Get features from bullet points
            const features = [];
            const bullets = document.querySelectorAll('#feature-bullets ul li span.a-list-item');
            bullets.forEach(bullet => {
                const text = bullet.textContent.trim();
                if (text) features.push(text);
            });
            data.features = features;

            return data;
        });

        if (!productData.name) {
            throw new Error('Could not find product name');
        }

        return productData;

    } catch (error) {
        console.error(`  ❌ Error scraping ${url}: ${error.message}`);
        return null;
    }
}

async function addMotherboards() {
    let browser;

    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB\n');

        console.log('═══════════════════════════════════════════════════════════════════════════');
        console.log('ADDING NEW LGA1851 MOTHERBOARDS');
        console.log('═══════════════════════════════════════════════════════════════════════════\n');

        browser = await puppeteer.launch({
            headless: 'new',
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });

        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

        let successCount = 0;
        let skipCount = 0;
        let errorCount = 0;

        for (let i = 0; i < newMotherboards.length; i++) {
            const mbData = newMotherboards[i];
            console.log(`\n[${i + 1}/${newMotherboards.length}] Processing: ${mbData.url}`);

            // Check if already exists
            const existing = await Motherboard.findOne({ sourceUrl: mbData.url });
            if (existing) {
                console.log(`  ⏭️  Already exists: ${existing.name}`);
                skipCount++;
                continue;
            }

            // Scrape Amazon page
            const scrapedData = await scrapeAmazonMotherboard(page, mbData.url, mbData);

            if (!scrapedData) {
                console.log(`  ❌ Failed to scrape data`);
                errorCount++;
                continue;
            }

            // Parse M.2 slot count from features
            let m2SlotCount = 0;
            const m2Match = scrapedData.features.join(' ').match(/(\d+)[\s×xX]+M\.?2/i);
            if (m2Match) m2SlotCount = parseInt(m2Match[1]);

            // Parse memory slots (typically 4 for ATX, 2 for ITX)
            let memorySlots = 4;
            if (mbData.formFactor === 'Mini-ITX') memorySlots = 2;
            const memSlotsMatch = scrapedData.features.join(' ').match(/(\d+)[\s×xX]+(?:DIMM|memory slot)/i);
            if (memSlotsMatch) memorySlots = parseInt(memSlotsMatch[1]);

            // Create motherboard document
            const motherboard = new Motherboard({
                name: scrapedData.name,
                manufacturer: mbData.manufacturer,
                socket: mbData.socket,
                chipset: mbData.chipset,
                formFactor: mbData.formFactor,
                memoryType: mbData.memoryType,
                memorySlots: memorySlots,
                m2SlotCount: m2SlotCount || 3, // Default to 3 if not found
                price: scrapedData.price,
                currentPrice: scrapedData.price,
                basePrice: scrapedData.price,
                sourceUrl: mbData.url,
                imageUrl: scrapedData.imageUrl,
                source: 'Amazon',
                category: 'motherboard',
                performanceTier: 'High-End',
                isAvailable: true,
                scrapedAt: new Date(),
                createdAt: new Date(),
                updatedAt: new Date(),
                specifications: {
                    features: scrapedData.features
                },
                // Initialize price history with the initial price
                priceHistory: [{
                    price: scrapedData.price,
                    date: new Date(),
                    source: mbData.url,
                    detectionMethod: 'initial_scrape',
                    isAvailable: true
                }],
                uniqueId: `|${mbData.manufacturer.toLowerCase()}|${mbData.chipset.toLowerCase()}|${mbData.socket.toLowerCase()}|${mbData.formFactor.toLowerCase().replace('-', '')}`
            });

            await motherboard.save();
            console.log(`  ✅ Added: ${scrapedData.name}`);
            console.log(`     Price: $${scrapedData.price}`);
            console.log(`     Form Factor: ${mbData.formFactor}`);
            console.log(`     M.2 Slots: ${m2SlotCount || 3}`);
            successCount++;

            // Wait between requests to avoid rate limiting
            if (i < newMotherboards.length - 1) {
                console.log(`  ⏳ Waiting 3 seconds...`);
                await page.waitForTimeout(3000);
            }
        }

        console.log('\n═══════════════════════════════════════════════════════════════════════════');
        console.log('SUMMARY');
        console.log('═══════════════════════════════════════════════════════════════════════════');
        console.log(`✅ Successfully added: ${successCount}`);
        console.log(`⏭️  Skipped (already exists): ${skipCount}`);
        console.log(`❌ Errors: ${errorCount}`);
        console.log('');

        // Verify total count
        const totalLGA1851 = await Motherboard.countDocuments({ socket: 'LGA1851' });
        console.log(`📊 Total LGA1851 motherboards in database: ${totalLGA1851}`);
        console.log('');

    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error(error);
    } finally {
        if (browser) await browser.close();
        await mongoose.connection.close();
        console.log('✅ Database connection closed');
    }
}

addMotherboards();
