const { connectToDatabase, getDatabase } = require('../config/database');

const moreCPUs = [
    // Intel 13th Gen
    {
        title: "Intel Core i9-13900KF Desktop Processor",
        name: "Intel Core i9-13900KF",
        manufacturer: "Intel",
        category: "cpus",
        currentPrice: 579.99,
        price: 579.99,
        performanceTier: "High-End",
        socket: "LGA1700",
        specifications: {
            cores: 24,
            threads: 32,
            baseClock: 3.0,
            boostClock: 5.8,
            cache: "36MB",
            tdp: 125
        },
        generation: "13th Gen",
        source: "Enhanced Data",
        sourceUrl: "https://www.intel.com/13900kf",
        createdAt: new Date(),
        updatedAt: new Date()
    },
    {
        title: "Intel Core i9-13900F Desktop Processor",
        name: "Intel Core i9-13900F",
        manufacturer: "Intel",
        category: "cpus",
        currentPrice: 549.99,
        price: 549.99,
        performanceTier: "High-End",
        socket: "LGA1700",
        specifications: {
            cores: 24,
            threads: 32,
            baseClock: 2.2,
            boostClock: 5.6,
            cache: "36MB",
            tdp: 65
        },
        generation: "13th Gen",
        source: "Enhanced Data",
        sourceUrl: "https://www.intel.com/13900f",
        createdAt: new Date(),
        updatedAt: new Date()
    },
    {
        title: "Intel Core i7-13700KF Desktop Processor",
        name: "Intel Core i7-13700KF",
        manufacturer: "Intel",
        category: "cpus",
        currentPrice: 389.99,
        price: 389.99,
        performanceTier: "Performance",
        socket: "LGA1700",
        specifications: {
            cores: 16,
            threads: 24,
            baseClock: 3.4,
            boostClock: 5.4,
            cache: "30MB",
            tdp: 125
        },
        generation: "13th Gen",
        source: "Enhanced Data",
        sourceUrl: "https://www.intel.com/13700kf",
        createdAt: new Date(),
        updatedAt: new Date()
    },
    {
        title: "Intel Core i5-13400F Desktop Processor",
        name: "Intel Core i5-13400F",
        manufacturer: "Intel",
        category: "cpus",
        currentPrice: 199.99,
        price: 199.99,
        performanceTier: "Mainstream",
        socket: "LGA1700",
        specifications: {
            cores: 10,
            threads: 16,
            baseClock: 2.5,
            boostClock: 4.6,
            cache: "20MB",
            tdp: 65
        },
        generation: "13th Gen",
        source: "Enhanced Data",
        sourceUrl: "https://www.intel.com/13400f",
        createdAt: new Date(),
        updatedAt: new Date()
    },
    // Intel 12th Gen
    {
        title: "Intel Core i9-12900K Desktop Processor",
        name: "Intel Core i9-12900K",
        manufacturer: "Intel",
        category: "cpus",
        currentPrice: 489.99,
        price: 489.99,
        performanceTier: "High-End",
        socket: "LGA1700",
        specifications: {
            cores: 16,
            threads: 24,
            baseClock: 3.2,
            boostClock: 5.2,
            cache: "30MB",
            tdp: 125
        },
        generation: "12th Gen",
        source: "Enhanced Data",
        sourceUrl: "https://www.intel.com/12900k",
        createdAt: new Date(),
        updatedAt: new Date()
    },
    {
        title: "Intel Core i7-12700K Desktop Processor",
        name: "Intel Core i7-12700K",
        manufacturer: "Intel",
        category: "cpus",
        currentPrice: 369.99,
        price: 369.99,
        performanceTier: "Performance",
        socket: "LGA1700",
        specifications: {
            cores: 12,
            threads: 20,
            baseClock: 3.6,
            boostClock: 5.0,
            cache: "25MB",
            tdp: 125
        },
        generation: "12th Gen",
        source: "Enhanced Data",
        sourceUrl: "https://www.intel.com/12700k",
        createdAt: new Date(),
        updatedAt: new Date()
    },
    // AMD 7000 Series
    {
        title: "AMD Ryzen 9 7950X3D Desktop Processor",
        name: "AMD Ryzen 9 7950X3D",
        manufacturer: "AMD",
        category: "cpus",
        currentPrice: 699.99,
        price: 699.99,
        performanceTier: "High-End",
        socket: "AM5",
        specifications: {
            cores: 16,
            threads: 32,
            baseClock: 4.2,
            boostClock: 5.7,
            cache: "144MB",
            tdp: 120
        },
        generation: "7000 Series",
        source: "Enhanced Data",
        sourceUrl: "https://www.amd.com/7950x3d",
        createdAt: new Date(),
        updatedAt: new Date()
    },
    {
        title: "AMD Ryzen 7 7700X Desktop Processor",
        name: "AMD Ryzen 7 7700X",
        manufacturer: "AMD",
        category: "cpus",
        currentPrice: 399.99,
        price: 399.99,
        performanceTier: "Performance",
        socket: "AM5",
        specifications: {
            cores: 8,
            threads: 16,
            baseClock: 4.5,
            boostClock: 5.4,
            cache: "40MB",
            tdp: 105
        },
        generation: "7000 Series",
        source: "Enhanced Data",
        sourceUrl: "https://www.amd.com/7700x",
        createdAt: new Date(),
        updatedAt: new Date()
    },
    {
        title: "AMD Ryzen 5 7600 Desktop Processor",
        name: "AMD Ryzen 5 7600",
        manufacturer: "AMD",
        category: "cpus",
        currentPrice: 229.99,
        price: 229.99,
        performanceTier: "Mainstream",
        socket: "AM5",
        specifications: {
            cores: 6,
            threads: 12,
            baseClock: 3.8,
            boostClock: 5.1,
            cache: "38MB",
            tdp: 65
        },
        generation: "7000 Series",
        source: "Enhanced Data",
        sourceUrl: "https://www.amd.com/7600",
        createdAt: new Date(),
        updatedAt: new Date()
    },
    // AMD 5000 Series (Still Popular)
    {
        title: "AMD Ryzen 9 5950X Desktop Processor",
        name: "AMD Ryzen 9 5950X",
        manufacturer: "AMD",
        category: "cpus",
        currentPrice: 549.99,
        price: 549.99,
        performanceTier: "High-End",
        socket: "AM4",
        specifications: {
            cores: 16,
            threads: 32,
            baseClock: 3.4,
            boostClock: 4.9,
            cache: "72MB",
            tdp: 105
        },
        generation: "5000 Series",
        source: "Enhanced Data",
        sourceUrl: "https://www.amd.com/5950x",
        createdAt: new Date(),
        updatedAt: new Date()
    },
    {
        title: "AMD Ryzen 7 5800X3D Desktop Processor",
        name: "AMD Ryzen 7 5800X3D",
        manufacturer: "AMD",
        category: "cpus",
        currentPrice: 449.99,
        price: 449.99,
        performanceTier: "Performance",
        socket: "AM4",
        specifications: {
            cores: 8,
            threads: 16,
            baseClock: 3.4,
            boostClock: 4.5,
            cache: "100MB",
            tdp: 105
        },
        generation: "5000 Series",
        source: "Enhanced Data",
        sourceUrl: "https://www.amd.com/5800x3d",
        createdAt: new Date(),
        updatedAt: new Date()
    },
    {
        title: "AMD Ryzen 5 5600X Desktop Processor",
        name: "AMD Ryzen 5 5600X",
        manufacturer: "AMD",
        category: "cpus",
        currentPrice: 199.99,
        price: 199.99,
        performanceTier: "Mainstream",
        socket: "AM4",
        specifications: {
            cores: 6,
            threads: 12,
            baseClock: 3.7,
            boostClock: 4.6,
            cache: "35MB",
            tdp: 65
        },
        generation: "5000 Series",
        source: "Enhanced Data",
        sourceUrl: "https://www.amd.com/5600x",
        createdAt: new Date(),
        updatedAt: new Date()
    }
];

async function addMoreCPUs() {
    try {
        console.log('🔌 Connecting to database...');
        await connectToDatabase();
        const db = getDatabase();
        
        console.log('📦 Adding enhanced CPU data to database...');
        
        // Clear existing test data first
        console.log('🧹 Clearing existing test data...');
        await db.collection('cpus').deleteMany({ source: 'Test Data' });
        await db.collection('cpus_intel_core_i9').deleteMany({ source: 'Test Data' });
        await db.collection('cpus_intel_core_i7').deleteMany({ source: 'Test Data' });
        await db.collection('cpus_intel_core_i5').deleteMany({ source: 'Test Data' });
        await db.collection('cpus_amd_ryzen_9').deleteMany({ source: 'Test Data' });
        await db.collection('cpus_amd_ryzen_7').deleteMany({ source: 'Test Data' });
        await db.collection('cpus_amd_ryzen_5').deleteMany({ source: 'Test Data' });
        
        // Add all CPUs to main collection
        await db.collection('cpus').insertMany([...moreCPUs]);
        
        // Organize by manufacturer and series
        const intelCpus = moreCPUs.filter(cpu => cpu.manufacturer === 'Intel');
        const amdCpus = moreCPUs.filter(cpu => cpu.manufacturer === 'AMD');
        
        // Intel CPUs by series
        if (intelCpus.length > 0) {
            await db.collection('cpus_intel_core_i9').insertMany(intelCpus.filter(cpu => cpu.name.includes('i9')));
            await db.collection('cpus_intel_core_i7').insertMany(intelCpus.filter(cpu => cpu.name.includes('i7')));
            await db.collection('cpus_intel_core_i5').insertMany(intelCpus.filter(cpu => cpu.name.includes('i5')));
        }
        
        // AMD CPUs by series
        if (amdCpus.length > 0) {
            await db.collection('cpus_amd_ryzen_9').insertMany(amdCpus.filter(cpu => cpu.name.includes('Ryzen 9')));
            await db.collection('cpus_amd_ryzen_7').insertMany(amdCpus.filter(cpu => cpu.name.includes('Ryzen 7')));
            await db.collection('cpus_amd_ryzen_5').insertMany(amdCpus.filter(cpu => cpu.name.includes('Ryzen 5')));
        }
        
        console.log('✅ Successfully added enhanced CPU data!');
        console.log(`   Added ${moreCPUs.length} CPUs across multiple collections`);
        
        // Show summary by manufacturer
        const intelCount = intelCpus.length;
        const amdCount = amdCpus.length;
        
        console.log('\\n📊 Enhanced CPU Data Summary:');
        console.log(`   📘 Intel CPUs: ${intelCount} (13th Gen, 12th Gen)`);
        console.log(`   📕 AMD CPUs: ${amdCount} (7000 Series, 5000 Series)`);
        console.log(`   💰 Price range: $199.99 - $699.99`);
        console.log(`   🔧 Sockets: LGA1700, AM5, AM4`);
        
        console.log('\\n🎉 Enhanced CPU data population complete!');
        
    } catch (error) {
        console.error('❌ Error adding enhanced CPU data:', error);
    }
}

if (require.main === module) {
    addMoreCPUs()
        .then(() => process.exit(0))
        .catch((error) => {
            console.error('💥 Failed to add enhanced CPU data:', error);
            process.exit(1);
        });
}

module.exports = { addMoreCPUs };