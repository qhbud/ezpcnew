const { connectToDatabase, getDatabase } = require('../config/database');

const coreUltraCPUs = [
    // Intel Core Ultra 9 285K
    {
        title: "Intel Core Ultra 9 285K Desktop Processor",
        name: "Intel Core Ultra 9 285K",
        manufacturer: "Intel",
        category: "cpus",
        currentPrice: 589.99,
        price: 589.99,
        performanceTier: "High-End",
        socket: "LGA1851",
        specifications: {
            cores: 24,
            threads: 24,
            baseClock: 3.7,
            boostClock: 5.7,
            cache: "36MB",
            tdp: 125
        },
        singleCorePerformance: 95,
        multiThreadPerformance: 155,
        generation: "Core Ultra (Arrow Lake)",
        source: "Enhanced Data",
        sourceUrl: "https://www.intel.com/core-ultra-9-285k",
        createdAt: new Date(),
        updatedAt: new Date()
    },
    // Intel Core Ultra 7 265K
    {
        title: "Intel Core Ultra 7 265K Desktop Processor",
        name: "Intel Core Ultra 7 265K",
        manufacturer: "Intel",
        category: "cpus",
        currentPrice: 394.99,
        price: 394.99,
        performanceTier: "Performance",
        socket: "LGA1851",
        specifications: {
            cores: 20,
            threads: 20,
            baseClock: 3.9,
            boostClock: 5.5,
            cache: "30MB",
            tdp: 125
        },
        singleCorePerformance: 93,
        multiThreadPerformance: 125,
        generation: "Core Ultra (Arrow Lake)",
        source: "Enhanced Data",
        sourceUrl: "https://www.intel.com/core-ultra-7-265k",
        createdAt: new Date(),
        updatedAt: new Date()
    },
    // Intel Core Ultra 5 245K
    {
        title: "Intel Core Ultra 5 245K Desktop Processor",
        name: "Intel Core Ultra 5 245K",
        manufacturer: "Intel",
        category: "cpus",
        currentPrice: 309.99,
        price: 309.99,
        performanceTier: "Mainstream",
        socket: "LGA1851",
        specifications: {
            cores: 14,
            threads: 14,
            baseClock: 4.2,
            boostClock: 5.2,
            cache: "24MB",
            tdp: 125
        },
        singleCorePerformance: 91,
        multiThreadPerformance: 95,
        generation: "Core Ultra (Arrow Lake)",
        source: "Enhanced Data",
        sourceUrl: "https://www.intel.com/core-ultra-5-245k",
        createdAt: new Date(),
        updatedAt: new Date()
    }
];

async function addCoreUltraCPUs() {
    console.log('🚀 Starting Intel Core Ultra CPU import...\n');

    try {
        await connectToDatabase();
        const db = getDatabase();
        const collection = db.collection('cpus');

        console.log(`📦 Adding ${coreUltraCPUs.length} Intel Core Ultra processors...`);

        for (const cpu of coreUltraCPUs) {
            // Check if CPU already exists
            const existing = await collection.findOne({ name: cpu.name });

            if (existing) {
                console.log(`⚠️  ${cpu.name} already exists, skipping...`);
                continue;
            }

            // Insert the CPU
            await collection.insertOne(cpu);
            console.log(`✅ Added: ${cpu.name} - Socket ${cpu.socket} - $${cpu.price}`);
        }

        console.log('\n✅ Intel Core Ultra CPU import completed!');
        console.log('\n📊 Summary:');
        console.log(`   Total CPUs added: ${coreUltraCPUs.length}`);
        console.log(`   Socket: LGA1851`);
        console.log(`   Generation: Arrow Lake (Core Ultra)`);
        console.log(`   Price range: $${Math.min(...coreUltraCPUs.map(c => c.price))} - $${Math.max(...coreUltraCPUs.map(c => c.price))}`);

        process.exit(0);
    } catch (error) {
        console.error('❌ Error adding Core Ultra CPUs:', error);
        process.exit(1);
    }
}

// Run if called directly
if (require.main === module) {
    addCoreUltraCPUs();
}

module.exports = { addCoreUltraCPUs, coreUltraCPUs };
