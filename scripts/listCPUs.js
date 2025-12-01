const { connectToDatabase, getDatabase } = require('../config/database');

async function listCPUs() {
    try {
        await connectToDatabase();
        const db = getDatabase();

        const cpus = await db.collection('cpus')
            .find({})
            .sort({ manufacturer: 1, name: 1 })
            .toArray();

        console.log('\n=== CPU List with Chipsets ===\n');
        console.log(`Total CPUs: ${cpus.length}\n`);

        // Group by manufacturer
        const byManufacturer = {};
        cpus.forEach(cpu => {
            const mfg = cpu.manufacturer || 'Unknown';
            if (!byManufacturer[mfg]) {
                byManufacturer[mfg] = [];
            }
            byManufacturer[mfg].push(cpu);
        });

        // Display by manufacturer
        Object.keys(byManufacturer).sort().forEach(manufacturer => {
            console.log(`\n${'='.repeat(70)}`);
            console.log(`${manufacturer.toUpperCase()} CPUs (${byManufacturer[manufacturer].length})`);
            console.log('='.repeat(70));

            byManufacturer[manufacturer].forEach((cpu, index) => {
                const name = cpu.name || cpu.title || 'Unknown CPU';
                const chipset = cpu.chipset || 'N/A';
                const socket = cpu.socket || 'N/A';
                const cores = cpu.cores || cpu.coreCount || 'N/A';
                const price = cpu.currentPrice || cpu.price || 'N/A';

                console.log(`\n${index + 1}. ${name}`);
                console.log(`   Chipset: ${chipset}`);
                console.log(`   Socket: ${socket}`);
                console.log(`   Cores: ${cores}`);
                console.log(`   Price: ${price !== 'N/A' ? '$' + price : 'N/A'}`);
            });
        });

        console.log('\n' + '='.repeat(70) + '\n');

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

listCPUs();
