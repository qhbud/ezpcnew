const { connectToDatabase, getDatabase } = require('../config/database');
const { RiverSearchPriceDetector } = require('./riverSearchPriceDetection');

async function update5800X3DPrice() {
  const detector = new RiverSearchPriceDetector();

  try {
    await connectToDatabase();
    const db = getDatabase();
    await detector.initialize();

    console.log('\n🔄 Updating AMD Ryzen 7 5800X3D price...\n');

    const collections = await db.listCollections().toArray();
    const cpuCollections = collections
      .filter(col => col.name.startsWith('cpus'))
      .map(col => col.name);

    for (const collectionName of cpuCollections) {
      const cpu = await db.collection(collectionName).findOne({
        title: 'AMD Ryzen 7 5800X3D Desktop Processor'
      });

      if (cpu) {
        console.log(`\nCollection: ${collectionName}`);
        console.log(`Current URL in DB: ${cpu.sourceUrl || cpu.url}`);
        console.log(`Current Price: $${cpu.currentPrice}`);

        const url = cpu.sourceUrl || cpu.url;

        if (!url.includes('B09VCJ2SHD')) {
          console.log('❌ ERROR: URL still points to wrong product!');
          console.log('   Expected ASIN: B09VCJ2SHD (5800X3D)');
          console.log(`   Found ASIN: ${url.match(/\/dp\/([A-Z0-9]+)/)?.[1]}`);
          continue;
        }

        console.log('\n🌊 Fetching price from Amazon...');
        const result = await detector.detectPrice(url);

        if (result.success) {
          await db.collection(collectionName).updateOne(
            { _id: cpu._id },
            {
              $set: {
                currentPrice: result.currentPrice,
                basePrice: result.basePrice,
                salePrice: result.salePrice,
                isOnSale: result.isOnSale,
                isAvailable: result.isAvailable,
                lastPriceCheck: new Date(),
                updatedAt: new Date()
              },
              $push: {
                priceHistory: {
                  $each: [{
                    price: result.currentPrice,
                    date: new Date()
                  }],
                  $slice: -90
                }
              }
            }
          );

          console.log(`\n✅ Updated successfully!`);
          console.log(`   New Price: $${result.currentPrice}`);
          console.log(`   Base Price: $${result.basePrice}`);
          console.log(`   Sale Price: $${result.salePrice}`);
          console.log(`   On Sale: ${result.isOnSale}`);
          console.log(`   Available: ${result.isAvailable}`);
        } else {
          console.log(`\n❌ Failed to detect price`);
          if (result.debugInfo) {
            console.log('Debug Info:');
            result.debugInfo.forEach(info => console.log(`  - ${info}`));
          }
        }
      }
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await detector.close();
    process.exit(0);
  }
}

update5800X3DPrice();
