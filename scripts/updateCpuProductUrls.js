const { connectToDatabase, getDatabase } = require('../config/database');
const colors = require('colors');

// Manual list of CPU product URLs found on Amazon
const cpuUrls = {
  // AMD Ryzen 9 7000 Series
  'AMD Ryzen 9 7950X Desktop Processor': 'https://www.amazon.com/AMD-Ryzen-7950X-32-Thread-Processor/dp/B0BBHD5D8Y',
  'AMD Ryzen 9 7900X Desktop Processor': 'https://www.amazon.com/AMD-7900X-24-Thread-Unlocked-Processor/dp/B0BBJ59WJ4',

  // AMD Ryzen 9 5000 Series
  'AMD Ryzen 9 5900X Desktop Processor': 'https://www.amazon.com/AMD-Ryzen-5900X-24-Thread-Processor/dp/B08164VTWH',

  // AMD Ryzen 7 7000 Series
  'AMD Ryzen 7 7800X3D Desktop Processor': 'https://www.amazon.com/AMD-Ryzen-7800X3D-16-Thread-Processor/dp/B0BTZB7F88',

  // AMD Ryzen 7 5000 Series
  'AMD Ryzen 7 5800X3D Desktop Processor': 'https://www.amazon.com/AMD-5800X3D-16-Thread-Processor-Technology/dp/B09VCJ2SHD',
  'AMD Ryzen 7 5800X Desktop Processor': 'https://www.amazon.com/AMD-Ryzen-5800X-16-Thread-Processor/dp/B0815XFSGK',
  'AMD Ryzen 7 5700X Desktop Processor': 'https://www.amazon.com/AMD-5700X-16-Thread-Unlocked-Processor/dp/B09VCHQHZ6',

  // AMD Ryzen 5 7000 Series
  'AMD Ryzen 5 7600 Desktop Processor': 'https://www.amazon.com/AMD-7600-12-Thread-Unlocked-Processor/dp/B0BMQJWBDM',

  // AMD Ryzen 5 5000 Series
  'AMD Ryzen 5 5600X Desktop Processor': 'https://www.amazon.com/AMD-Ryzen-5600X-12-Thread-Processor/dp/B08166SLDF',
  'AMD Ryzen 5 5600 Desktop Processor': 'https://www.amazon.com/AMD-5600-12-Thread-Unlocked-Processor/dp/B09VCHR1VH',
  'AMD Ryzen 5 4600G Desktop Processor': 'https://www.amazon.com/AMD-4600G-12-Thread-Unlocked-Processor/dp/B09Z5NH6SJ',

  // Intel Core i9 13th Gen
  'Intel Core i9-13900K Desktop Processor': 'https://www.amazon.com/Intel-i9-13900K-Desktop-Processor-P-cores/dp/B0BCF54SR1',

  // Intel Core i9 12th Gen
  'Intel Core i9-12900K Desktop Processor': 'https://www.amazon.com/Intel-i9-12900K-Desktop-Processor-Unlocked/dp/B09FXDLX95',

  // Intel Core i7 13th Gen
  'Intel Core i7-13700K Desktop Processor': 'https://www.amazon.com/Intel-i7-13700K-Desktop-Processor-P-cores/dp/B0BCF57FL5',
  'Intel Core i7-13700F Desktop Processor': 'https://www.amazon.com/Intel-i7-13700F-Desktop-Processor-P-cores/dp/B0BQ6CSY9C',

  // Intel Core i5 13th Gen
  'Intel Core i5-13600K Desktop Processor': 'https://www.amazon.com/Intel-i5-13600K-Desktop-Processor-P-cores/dp/B0BCDR9M33',

  // Intel Core i5 12th Gen
  'Intel Core i5-12600K Desktop Processor': 'https://www.amazon.com/Intel-i5-12600K-Desktop-Processor-Unlocked/dp/B09FX4D72T',
  'Intel Core i5-12400F Desktop Processor': 'https://www.amazon.com/INTEL-i5-12400F-2-5GHz-6xxChipset-BX8071512400F/dp/B09NPJRDGD',

  // Intel Core i3 13th Gen
  'Intel Core i3-13100F Desktop Processor': 'https://www.amazon.com/Intel-i3-13100F-Desktop-Processor-P-cores/dp/B0BQ6BCWC4',

  // AMD Threadripper (high-end workstation)
  'AMD Threadripper 7980X Desktop Processor': 'https://www.amazon.com/AMD-RyzenTM-ThreadripperTM-7980X-128-Thread/dp/B0CK2R6DVS'
};

async function updateCpuUrls() {
  try {
    console.log('\n🔗 Updating CPU Product URLs\n'.cyan.bold);

    await connectToDatabase();
    const db = getDatabase();

    const collections = await db.listCollections().toArray();
    const cpuCollections = collections
      .filter(col => col.name.startsWith('cpus'))
      .map(col => col.name);

    console.log(`📋 Found ${cpuCollections.length} CPU collections`.cyan);

    let totalProcessed = 0;
    let totalUpdated = 0;
    let totalNotFound = 0;

    for (const collectionName of cpuCollections) {
      console.log(`\n${'='.repeat(60)}`.cyan);
      console.log(`📦 Collection: ${collectionName}`.cyan.bold);
      console.log(`${'='.repeat(60)}`.cyan);

      const cpus = await db.collection(collectionName).find({}).toArray();

      for (const cpu of cpus) {
        totalProcessed++;
        console.log(`\n   ${cpu.title}`.white);

        // Look for manual URL
        const manualUrl = cpuUrls[cpu.title];
        if (manualUrl) {
          // Check if URL needs updating
          if (cpu.sourceUrl === manualUrl) {
            console.log(`   ✓ URL already up to date`.gray);
            continue;
          }
          await db.collection(collectionName).updateOne(
            { _id: cpu._id },
            {
              $set: {
                sourceUrl: manualUrl,
                url: manualUrl,
                updatedAt: new Date()
              }
            }
          );
          console.log(`   ✅ Updated: ${manualUrl}`.green);
          totalUpdated++;
        } else {
          console.log(`   ⚠️  No manual URL found - keeping search URL`.yellow);
          totalNotFound++;
        }
      }
    }

    console.log('\n' + '='.repeat(60).cyan);
    console.log('📊 SUMMARY'.cyan.bold);
    console.log('='.repeat(60).cyan);
    console.log(`✅ Total Processed: ${totalProcessed}`.green);
    console.log(`💾 URLs Updated: ${totalUpdated}`.green);
    console.log(`⚠️  No URL Found: ${totalNotFound}`.yellow);
    console.log('='.repeat(60).cyan);

    console.log('\n💡 Next Step: Run price updater to get current prices'.yellow.bold);
    console.log('   Command: npm run update-cpu-prices\n'.gray);

    process.exit(0);

  } catch (error) {
    console.error('❌ Error:'.red, error);
    process.exit(1);
  }
}

updateCpuUrls();
