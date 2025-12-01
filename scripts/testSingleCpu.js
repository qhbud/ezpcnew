const { RiverSearchPriceDetector } = require('./riverSearchPriceDetection');

async function testPrice() {
  const detector = new RiverSearchPriceDetector();

  try {
    await detector.initialize();

    console.log('\nChecking AMD Ryzen 7 5800X3D price...\n');

    const result = await detector.detectPrice('https://www.amazon.com/AMD-5800X3D-16-Thread-Processor-Technology/dp/B09VCJ2SHD');

    console.log('Detection Result:');
    console.log('- Success:', result.success);
    console.log('- Available:', result.isAvailable);
    console.log('- Current Price:', result.currentPrice);
    console.log('- Base Price:', result.basePrice);
    console.log('- Sale Price:', result.salePrice);
    console.log('- On Sale:', result.isOnSale);
    console.log('- Detection Method:', result.detectionMethod);

    if (result.debugInfo && result.debugInfo.length > 0) {
      console.log('\nDebug Info:');
      result.debugInfo.forEach(info => console.log('  -', info));
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await detector.close();
    process.exit(0);
  }
}

testPrice();
