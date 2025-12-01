const { connectToDatabase, getDatabase } = require('../config/database');

async function listCpusInCollection() {
    try {
        await connectToDatabase();
        const db = getDatabase();

        console.log('CPUs in cpus_intel_core_i9:\n');
        const i9s = await db.collection('cpus_intel_core_i9').find({}).toArray();
        i9s.forEach(cpu => {
            console.log(`Name: "${cpu.name}"`);
            console.log(`Title: "${cpu.title}"`);
            console.log(`Single/Multi: ${cpu.singleCorePerformance} / ${cpu.multiThreadPerformance}`);
            console.log(`Updated: ${cpu.updatedAt}\n`);
        });

        console.log('\nCPUs in cpus_intel_core_i7:\n');
        const i7s = await db.collection('cpus_intel_core_i7').find({}).toArray();
        i7s.forEach(cpu => {
            console.log(`Name: "${cpu.name}"`);
            console.log(`Title: "${cpu.title}"`);
            console.log(`Single/Multi: ${cpu.singleCorePerformance} / ${cpu.multiThreadPerformance}`);
            console.log(`Updated: ${cpu.updatedAt}\n`);
        });

        console.log('\nCPUs in cpus_amd_ryzen_9:\n');
        const ryzen9s = await db.collection('cpus_amd_ryzen_9').find({}).toArray();
        ryzen9s.forEach(cpu => {
            console.log(`Name: "${cpu.name}"`);
            console.log(`Title: "${cpu.title}"`);
            console.log(`Single/Multi: ${cpu.singleCorePerformance} / ${cpu.multiThreadPerformance}`);
            console.log(`Updated: ${cpu.updatedAt}\n`);
        });

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

listCpusInCollection();
