const { connectToDatabase, getDatabase } = require('../config/database');

const testCPUs = [
    {
        title: "Intel Core i9-13900K Desktop Processor",
        name: "Intel Core i9-13900K",
        manufacturer: "Intel",
        category: "cpus",
        currentPrice: 599.99,
        price: 599.99,
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
        source: "Test Data",
        sourceUrl: "https://www.amazon.com/test",
        createdAt: new Date(),
        updatedAt: new Date()
    },
    {
        title: "AMD Ryzen 9 7950X Desktop Processor",
        name: "AMD Ryzen 9 7950X",
        manufacturer: "AMD",
        category: "cpus",
        currentPrice: 699.99,
        price: 699.99,
        performanceTier: "High-End",
        socket: "AM5",
        specifications: {
            cores: 16,
            threads: 32,
            baseClock: 4.5,
            boostClock: 5.7,
            cache: "80MB",
            tdp: 170
        },
        generation: "7000 Series",
        source: "Test Data",
        sourceUrl: "https://www.amazon.com/test",
        createdAt: new Date(),
        updatedAt: new Date()
    },
    {
        title: "Intel Core i7-13700K Desktop Processor",
        name: "Intel Core i7-13700K",
        manufacturer: "Intel",
        category: "cpus",
        currentPrice: 409.99,
        price: 409.99,
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
        source: "Test Data",
        sourceUrl: "https://www.amazon.com/test",
        createdAt: new Date(),
        updatedAt: new Date()
    },
    {
        title: "AMD Ryzen 7 7800X3D Desktop Processor",
        name: "AMD Ryzen 7 7800X3D",
        manufacturer: "AMD",
        category: "cpus",
        currentPrice: 449.99,
        price: 449.99,
        performanceTier: "Performance",
        socket: "AM5",
        specifications: {
            cores: 8,
            threads: 16,
            baseClock: 4.2,
            boostClock: 5.0,
            cache: "96MB",
            tdp: 120
        },
        generation: "7000 Series",
        source: "Test Data",
        sourceUrl: "https://www.amazon.com/test",
        createdAt: new Date(),
        updatedAt: new Date()
    },
    {
        title: "Intel Core i5-13600K Desktop Processor",
        name: "Intel Core i5-13600K",
        manufacturer: "Intel",
        category: "cpus",
        currentPrice: 319.99,
        price: 319.99,
        performanceTier: "Mainstream",
        socket: "LGA1700",
        specifications: {
            cores: 14,
            threads: 20,
            baseClock: 3.5,
            boostClock: 5.1,
            cache: "24MB",
            tdp: 125
        },
        generation: "13th Gen",
        source: "Test Data",
        sourceUrl: "https://www.amazon.com/test",
        createdAt: new Date(),
        updatedAt: new Date()
    },
    {
        title: "AMD Ryzen 5 7600X Desktop Processor",
        name: "AMD Ryzen 5 7600X",
        manufacturer: "AMD",
        category: "cpus",
        currentPrice: 299.99,
        price: 299.99,
        performanceTier: "Mainstream",
        socket: "AM5",
        specifications: {
            cores: 6,
            threads: 12,
            baseClock: 4.7,
            boostClock: 5.3,
            cache: "38MB",
            tdp: 105
        },
        generation: "7000 Series",
        source: "Test Data",
        sourceUrl: "https://www.amazon.com/test",
        createdAt: new Date(),
        updatedAt: new Date()
    }
];

async function addTestCPUs() {
    try {
        console.log('🔌 Connecting to database...');
        await connectToDatabase();
        const db = getDatabase();
        
        console.log('📦 Adding test CPUs to database...');
        
        // Create a test collection for Intel CPUs
        const intelCpus = testCPUs.filter(cpu => cpu.manufacturer === 'Intel');
        if (intelCpus.length > 0) {
            await db.collection('cpus_intel_core_i9').insertMany(intelCpus.filter(cpu => cpu.name.includes('i9')));
            await db.collection('cpus_intel_core_i7').insertMany(intelCpus.filter(cpu => cpu.name.includes('i7')));
            await db.collection('cpus_intel_core_i5').insertMany(intelCpus.filter(cpu => cpu.name.includes('i5')));
        }
        
        // Create a test collection for AMD CPUs
        const amdCpus = testCPUs.filter(cpu => cpu.manufacturer === 'AMD');
        if (amdCpus.length > 0) {
            await db.collection('cpus_amd_ryzen_9').insertMany(amdCpus.filter(cpu => cpu.name.includes('Ryzen 9')));
            await db.collection('cpus_amd_ryzen_7').insertMany(amdCpus.filter(cpu => cpu.name.includes('Ryzen 7')));
            await db.collection('cpus_amd_ryzen_5').insertMany(amdCpus.filter(cpu => cpu.name.includes('Ryzen 5')));
        }
        
        // Also add all CPUs to a main 'cpus' collection for compatibility
        await db.collection('cpus').insertMany([...testCPUs]);
        
        console.log('✅ Successfully added test CPUs!');
        console.log(`   Added ${testCPUs.length} CPUs across multiple collections`);
        
        // Show summary
        console.log('\n📊 Test CPUs added:');
        testCPUs.forEach(cpu => {
            console.log(`   ✓ ${cpu.manufacturer} ${cpu.name} - $${cpu.price} (${cpu.performanceTier})`);
        });
        
        console.log('\n🎉 Test data creation complete!');
        
    } catch (error) {
        console.error('❌ Error adding test CPUs:', error);
    }
}

if (require.main === module) {
    addTestCPUs()
        .then(() => process.exit(0))
        .catch((error) => {
            console.error('💥 Failed to add test CPUs:', error);
            process.exit(1);
        });
}

module.exports = { addTestCPUs };