const { RiverSearchPriceDetector } = require('./riverSearchPriceDetection');

async function testSpecificCPUs() {
  const detector = new RiverSearchPriceDetector();

  try {
    await detector.initialize();

    const cpusToTest = [
      {
        name: 'AMD Ryzen 5 5600',
        url: 'https://www.amazon.com/AMD-5600-12-Thread-Unlocked-Processor/dp/B09VCHR1VH',
        expectedPrice: 139.95
      },
      {
        name: 'AMD Ryzen 7 7700X',
        url: 'https://www.amazon.com/AMD-7700X-16-Thread-Unlocked-Processor/dp/B0BBHHT8LY',
        expectedPrice: 258.99
      },
      {
        name: 'Intel Core i7-13700K',
        url: 'https://www.amazon.com/Intel-i7-13700K-Desktop-Processor-P-cores/dp/B0BCF57FL5',
        expectedPrice: 344.49
      },
      {
        name: 'Intel Core i9-12900K',
        url: 'https://www.amazon.com/Intel-i9-12900K-Desktop-Processor-Unlocked/dp/B09FXDLX95',
        expectedPrice: 298.05
      },
      {
        name: 'Intel Core i9-13900K',
        url: 'https://www.amazon.com/Intel-i9-13900K-Desktop-Processor-P-cores/dp/B0BCF54SR1',
        expectedPrice: 567.07
      }
    ];

    for (const cpu of cpusToTest) {
      console.log(`\n${'='.repeat(80)}`);
      console.log(`Testing: ${cpu.name}`);
      console.log(`Expected Price: $${cpu.expectedPrice}`);
      console.log(`URL: ${cpu.url}`);
      console.log('='.repeat(80));

      const result = await detector.detectPrice(cpu.url);

      console.log('\nDetection Result:');
      console.log(`- Success: ${result.success}`);
      console.log(`- Available: ${result.isAvailable}`);
      console.log(`- Current Price: $${result.currentPrice}`);
      console.log(`- Base Price: $${result.basePrice}`);
      console.log(`- Sale Price: $${result.salePrice}`);
      console.log(`- On Sale: ${result.isOnSale}`);
      console.log(`- Detection Method: ${result.detectionMethod}`);

      const priceDiff = result.currentPrice ? Math.abs(result.currentPrice - cpu.expectedPrice) : 'N/A';
      console.log(`\nPrice Difference: ${priceDiff !== 'N/A' ? '$' + priceDiff.toFixed(2) : priceDiff}`);

      if (result.debugInfo && result.debugInfo.length > 0) {
        console.log('\nDebug Info:');
        result.debugInfo.forEach(info => console.log(`  - ${info}`));
      }

      // Wait between requests
      await new Promise(resolve => setTimeout(resolve, 5000));
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await detector.close();
    process.exit(0);
  }
}

testSpecificCPUs();
