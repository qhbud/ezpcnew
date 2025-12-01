const { AmazonGpuImporter } = require('./amazonGpuImporter');

// Test a single known product to diagnose price detection
async function testSingleProduct() {
  try {
    console.log('🧪 Testing single product price detection...\n');
    
    const importer = new AmazonGpuImporter();
    
    // Test with the MSI RTX 4070 that should have correct price of $479 base
    const productUrl = 'https://www.amazon.com/MSI-GeForce-RTX-4070-12G/dp/B0BZB7DS7Q';
    
    console.log(`🔍 Testing product: ${productUrl}`);
    console.log('Expected: Base $479.00, not on sale\n');
    
    // Extract just this one product using GPUDataPopulator approach
    const puppeteer = require('puppeteer');
    const config = require('./config/scrapeConfig');
    
    const browser = await puppeteer.launch(config.browser);
    const productPage = await browser.newPage();
    
    await productPage.goto(productUrl, { waitUntil: 'networkidle2' });
    
    // Use Amazon scraper directly
    const AmazonScraper = require('./scrapers/amazonScraper');
    const scraper = new AmazonScraper('amazon', config.sites.amazon.selectors);
    
    const result = await scraper.performProductExtraction(productPage, productUrl, 'RTX 4070');
    
    console.log('\n📊 RESULTS:');
    console.log('===========');
    console.log(`Title: ${result.title || 'Not found'}`);
    console.log(`Base Price: $${result.basePrice || 'Not found'}`);
    console.log(`Sale Price: ${result.salePrice ? '$' + result.salePrice : 'Not on sale'}`);
    console.log(`Is On Sale: ${result.isOnSale || false}`);
    
    await productPage.close();
    await browser.close();
    
    console.log('\n✅ Single product test completed!');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
  }
}

testSingleProduct();