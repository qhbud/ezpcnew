const { connectToDatabase, getDatabase } = require('../config/database');

async function checkDuplicates() {
    try {
        await connectToDatabase();
        const db = getDatabase();

        console.log('Checking i9-13900K in cpus_intel_core_i9:');
        const i9 = await db.collection('cpus_intel_core_i9').findOne({ name: 'Intel Core i9-13900K' });
        if (i9) {
            console.log(`  Single-Core: ${i9.singleCorePerformance}`);
            console.log(`  Multi-Thread: ${i9.multiThreadPerformance}`);
            console.log(`  Updated: ${i9.updatedAt}\n`);
        }

        console.log('Checking i7-13700K in cpus_intel_core_i7:');
        const i7 = await db.collection('cpus_intel_core_i7').findOne({ name: 'Intel Core i7-13700K' });
        if (i7) {
            console.log(`  Single-Core: ${i7.singleCorePerformance}`);
            console.log(`  Multi-Thread: ${i7.multiThreadPerformance}`);
            console.log(`  Updated: ${i7.updatedAt}\n`);
        }

        console.log('Checking Ryzen 9 7950X in cpus_amd_ryzen_9:');
        const ryzen = await db.collection('cpus_amd_ryzen_9').findOne({ name: 'AMD Ryzen 9 7950X' });
        if (ryzen) {
            console.log(`  Single-Core: ${ryzen.singleCorePerformance}`);
            console.log(`  Multi-Thread: ${ryzen.multiThreadPerformance}`);
            console.log(`  Updated: ${ryzen.updatedAt}\n`);
        }

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

checkDuplicates();
