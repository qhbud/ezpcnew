const { connectToDatabase, getDatabase } = require('../config/database');
const colors = require('colors');

// Missing CPUs with their Amazon URLs
const missingCPUs = [
  // Intel 13th Gen
  {
    title: 'Intel Core i9-13900K Desktop Processor',
    manufacturer: 'Intel',
    url: 'https://www.amazon.com/s?k=Intel+Core+i9-13900K+Desktop+Processor',
    socket: 'LGA1700',
    generation: '13th Gen',
    performanceTier: 'High-End',
    collection: 'cpus_intel_core_i9'
  },
  {
    title: 'Intel Core i7-13700K Desktop Processor',
    manufacturer: 'Intel',
    url: 'https://www.amazon.com/s?k=Intel+Core+i7-13700K+Desktop+Processor',
    socket: 'LGA1700',
    generation: '13th Gen',
    performanceTier: 'Performance',
    collection: 'cpus_intel_core_i7'
  },
  {
    title: 'Intel Core i7-13700F Desktop Processor',
    manufacturer: 'Intel',
    url: 'https://www.amazon.com/s?k=Intel+Core+i7-13700F+Desktop+Processor',
    socket: 'LGA1700',
    generation: '13th Gen',
    performanceTier: 'Performance',
    collection: 'cpus_intel_core_i7'
  },
  {
    title: 'Intel Core i5-13600K Desktop Processor',
    manufacturer: 'Intel',
    url: 'https://www.amazon.com/s?k=Intel+Core+i5-13600K+Desktop+Processor',
    socket: 'LGA1700',
    generation: '13th Gen',
    performanceTier: 'Mainstream',
    collection: 'cpus_intel_core_i5'
  },

  // Intel 12th Gen
  {
    title: 'Intel Core i5-12600K Desktop Processor',
    manufacturer: 'Intel',
    url: 'https://www.amazon.com/s?k=Intel+Core+i5-12600K+Desktop+Processor',
    socket: 'LGA1700',
    generation: '12th Gen',
    performanceTier: 'Mainstream',
    collection: 'cpus_intel_core_i5'
  },
  {
    title: 'Intel Core i5-12400F Desktop Processor',
    manufacturer: 'Intel',
    url: 'https://www.amazon.com/s?k=Intel+Core+i5-12400F+Desktop+Processor',
    socket: 'LGA1700',
    generation: '12th Gen',
    performanceTier: 'Mainstream',
    collection: 'cpus_intel_core_i5'
  },
  {
    title: 'Intel Core i3-13100F Desktop Processor',
    manufacturer: 'Intel',
    url: 'https://www.amazon.com/s?k=Intel+Core+i3-13100F+Desktop+Processor',
    socket: 'LGA1700',
    generation: '13th Gen',
    performanceTier: 'Entry-Level',
    collection: 'cpus_intel_core_i3'
  },

  // AMD Ryzen 7000 Series
  {
    title: 'AMD Ryzen 9 7950X Desktop Processor',
    manufacturer: 'AMD',
    url: 'https://www.amazon.com/s?k=AMD+Ryzen+9+7950X+Desktop+Processor',
    socket: 'AM5',
    generation: '7000 Series',
    performanceTier: 'High-End',
    collection: 'cpus_amd_ryzen_9'
  },
  {
    title: 'AMD Ryzen 9 7900X Desktop Processor',
    manufacturer: 'AMD',
    url: 'https://www.amazon.com/s?k=AMD+Ryzen+9+7900X+Desktop+Processor',
    socket: 'AM5',
    generation: '7000 Series',
    performanceTier: 'High-End',
    collection: 'cpus_amd_ryzen_9'
  },
  {
    title: 'AMD Ryzen 7 7800X3D Desktop Processor',
    manufacturer: 'AMD',
    url: 'https://www.amazon.com/s?k=AMD+Ryzen+7+7800X3D+Desktop+Processor',
    socket: 'AM5',
    generation: '7000 Series',
    performanceTier: 'Performance',
    collection: 'cpus_amd_ryzen_7'
  },

  // AMD Ryzen 5000 Series
  {
    title: 'AMD Ryzen 9 5900X Desktop Processor',
    manufacturer: 'AMD',
    url: 'https://www.amazon.com/s?k=AMD+Ryzen+9+5900X+Desktop+Processor',
    socket: 'AM4',
    generation: '5000 Series',
    performanceTier: 'High-End',
    collection: 'cpus_amd_ryzen_9'
  },
  {
    title: 'AMD Ryzen 7 5800X Desktop Processor',
    manufacturer: 'AMD',
    url: 'https://www.amazon.com/s?k=AMD+Ryzen+7+5800X+Desktop+Processor',
    socket: 'AM4',
    generation: '5000 Series',
    performanceTier: 'Performance',
    collection: 'cpus_amd_ryzen_7'
  },
  {
    title: 'AMD Ryzen 7 5700X Desktop Processor',
    manufacturer: 'AMD',
    url: 'https://www.amazon.com/s?k=AMD+Ryzen+7+5700X+Desktop+Processor',
    socket: 'AM4',
    generation: '5000 Series',
    performanceTier: 'Performance',
    collection: 'cpus_amd_ryzen_7'
  },
  {
    title: 'AMD Ryzen 5 5600 Desktop Processor',
    manufacturer: 'AMD',
    url: 'https://www.amazon.com/s?k=AMD+Ryzen+5+5600+Desktop+Processor',
    socket: 'AM4',
    generation: '5000 Series',
    performanceTier: 'Mainstream',
    collection: 'cpus_amd_ryzen_5'
  },
  {
    title: 'AMD Ryzen 5 4600G Desktop Processor',
    manufacturer: 'AMD',
    url: 'https://www.amazon.com/s?k=AMD+Ryzen+5+4600G+Desktop+Processor',
    socket: 'AM4',
    generation: '4000 Series',
    performanceTier: 'Entry-Level',
    collection: 'cpus_amd_ryzen_5'
  },

  // HEDT / Workstation
  {
    title: 'AMD Threadripper 7980X Desktop Processor',
    manufacturer: 'AMD',
    url: 'https://www.amazon.com/s?k=AMD+Threadripper+7980X+Desktop+Processor',
    socket: 'sTRX5',
    generation: '7000 Series',
    performanceTier: 'Workstation',
    collection: 'cpus_amd_threadripper'
  }
];

async function addMissingCPUs() {
  try {
    console.log('🔍 Adding Missing CPUs to Database\n'.cyan.bold);

    await connectToDatabase();
    const db = getDatabase();

    let added = 0;
    let skipped = 0;
    let failed = 0;

    for (const cpu of missingCPUs) {
      try {
        console.log(`\n📦 Processing: ${cpu.title}`.cyan);
        console.log(`   Collection: ${cpu.collection}`.gray);

        // Check if CPU already exists
        const existing = await db.collection(cpu.collection).findOne({ title: cpu.title });

        if (existing) {
          console.log(`   ⏭️  Already exists, skipping`.yellow);
          skipped++;
          continue;
        }

        // Create CPU document
        const cpuDoc = {
          title: cpu.title,
          manufacturer: cpu.manufacturer,
          sourceUrl: cpu.url,
          url: cpu.url,
          socket: cpu.socket,
          generation: cpu.generation,
          performanceTier: cpu.performanceTier,
          category: 'cpu',
          isAvailable: true,
          unavailabilityReason: null,
          currentPrice: null,
          price: null,
          basePrice: null,
          salePrice: null,
          isOnSale: false,
          priceHistory: [],
          imageUrl: null,
          specifications: {},
          createdAt: new Date(),
          updatedAt: new Date(),
          lastPriceCheck: null,
          priceDetectionMethod: null
        };

        // Insert into database
        await db.collection(cpu.collection).insertOne(cpuDoc);
        console.log(`   ✅ Added successfully`.green);
        added++;

      } catch (error) {
        console.log(`   ❌ Failed: ${error.message}`.red);
        failed++;
      }
    }

    console.log('\n' + '='.repeat(60).cyan);
    console.log('📊 SUMMARY'.cyan.bold);
    console.log('='.repeat(60).cyan);
    console.log(`✅ Added: ${added}`.green);
    console.log(`⏭️  Skipped (already exist): ${skipped}`.yellow);
    console.log(`❌ Failed: ${failed}`.red);
    console.log(`📊 Total Processed: ${missingCPUs.length}`.cyan);
    console.log('='.repeat(60).cyan);

    console.log('\n💡 Next Step: Run price updater to get current prices'.yellow.bold);
    console.log('   Command: npm run update-cpu-prices\n'.gray);

    process.exit(0);

  } catch (error) {
    console.error('❌ Error:'.red, error);
    process.exit(1);
  }
}

addMissingCPUs();
