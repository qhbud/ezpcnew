const { connectToDatabase, getDatabase } = require('../config/database');
const puppeteer = require('puppeteer');
const Logger = require('./utils/logger');
const RAMProductFilterLenient = require('./utils/ramProductFilterLenient');

async function populateRamDirect() {
    let browser = null;
    
    try {
        Logger.info('🚀 Starting DIRECT RAM population (bypassing DatabaseService)...');
        
        await connectToDatabase();
        const db = getDatabase();
        const collection = db.collection('rams');
        
        browser = await puppeteer.launch({
            headless: false,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        
        // Single test search
        const searchUrl = 'https://www.amazon.com/s?k=DDR4+16GB+desktop+memory&ref=sr_nr_p_36_1';
        const page = await browser.newPage();
        
        Logger.info(`🔍 Loading: ${searchUrl}`);
        await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 60000 });
        
        // Wait for search results
        await page.waitForSelector('[data-component-type="s-search-result"]', { timeout: 10000 });
        
        // Extract RAM products
        const ramProducts = await page.evaluate(() => {
            const products = [];
            const items = document.querySelectorAll('[data-component-type="s-search-result"]');
            
            items.forEach((item, index) => {
                try {
                    const titleElement = item.querySelector('h2 a span, h2 span, .s-size-mini span');
                    const priceElement = item.querySelector('.a-price-whole, .a-price .a-offscreen');
                    const linkElement = item.querySelector('h2 a');
                    
                    const title = titleElement?.textContent?.trim() || '';
                    const priceText = priceElement?.textContent || '';
                    const productUrl = linkElement?.href || '';
                    
                    // Extract price
                    let finalPrice = null;
                    if (priceText) {
                        const priceMatch = priceText.match(/[\d,]+\.?\d*/);
                        if (priceMatch) {
                            finalPrice = parseFloat(priceMatch[0].replace(/,/g, ''));
                        }
                    }
                    
                    if (title && title.length > 10) {
                        products.push({
                            title: title,
                            currentPrice: finalPrice,
                            sourceUrl: productUrl.startsWith('http') ? productUrl : `https://amazon.com${productUrl}`,
                            source: 'Amazon'
                        });
                    }
                } catch (e) {
                    console.log(`Error processing item ${index + 1}:`, e.message);
                }
            });
            
            return products;
        });
        
        Logger.info(`📦 Found ${ramProducts.length} raw products`);
        
        // Filter products
        const validRam = ramProducts.filter(product => {
            const isValid = RAMProductFilterLenient.validateProduct(product);
            const matches = RAMProductFilterLenient.matchesSearchCriteria(product.title, 'ddr4');
            return isValid && matches;
        });
        
        Logger.info(`✅ ${validRam.length} valid RAM products after filtering`);
        
        // DIRECT MongoDB insertion - no DatabaseService
        let insertCount = 0;
        let duplicateCount = 0;
        
        for (const ram of validRam) {
            try {
                // Simple duplicate check by URL only
                const existing = await collection.findOne({ sourceUrl: ram.sourceUrl });
                
                if (existing) {
                    duplicateCount++;
                    Logger.debug(`⏭️  Duplicate: ${ram.title.substring(0, 50)}...`);
                } else {
                    // Extract specs
                    const specs = RAMProductFilterLenient.extractRAMSpecs(ram.title);
                    
                    // Prepare document for insertion
                    const ramDoc = {
                        title: ram.title,
                        name: ram.title,
                        currentPrice: ram.currentPrice,
                        basePrice: ram.currentPrice,
                        price: ram.currentPrice,
                        sourceUrl: ram.sourceUrl,
                        source: ram.source,
                        category: 'ram',
                        manufacturer: specs.manufacturer || 'Unknown',
                        memoryType: specs.memoryType || 'Unknown',
                        speed: specs.speed || 'Unknown',
                        capacity: specs.capacity || 'Unknown',
                        kitConfiguration: specs.kitConfiguration || 'Unknown',
                        latency: specs.latency || 'Unknown',
                        specifications: {
                            rgb: specs.rgb || false,
                            overclock: /xmp|expo/i.test(ram.title) ? 'XMP' : 'JEDEC',
                            formFactor: 'DIMM'
                        },
                        performanceTier: 'Mainstream',
                        createdAt: new Date(),
                        updatedAt: new Date(),
                        scrapedAt: new Date().toISOString()
                    };
                    
                    // Direct insert
                    const result = await collection.insertOne(ramDoc);
                    
                    if (result.insertedId) {
                        insertCount++;
                        Logger.info(`✅ Inserted: ${ram.title.substring(0, 50)}... (ID: ${result.insertedId})`);
                    } else {
                        Logger.warn(`❌ Insert failed (no ID): ${ram.title.substring(0, 50)}...`);
                    }
                }
            } catch (insertError) {
                Logger.error(`❌ Failed to insert: ${ram.title.substring(0, 50)}... - ${insertError.message}`);
            }
        }
        
        // Final results
        const finalCount = await collection.countDocuments();
        
        Logger.info('\n📊 DIRECT POPULATION RESULTS:');
        Logger.success(`✅ New RAM inserted: ${insertCount}`);
        Logger.info(`⏭️  Duplicates skipped: ${duplicateCount}`);
        Logger.info(`📦 Total database count: ${finalCount}`);
        
        await page.close();
        
    } catch (error) {
        Logger.error('❌ Direct population failed:', error);
        throw error;
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}

populateRamDirect()
    .then(() => {
        console.log('\n🎉 Direct RAM population completed!');
        process.exit(0);
    })
    .catch(error => {
        console.error('\n💥 Direct RAM population failed:', error);
        process.exit(1);
    });