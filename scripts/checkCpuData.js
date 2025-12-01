const { connectToDatabase, getDatabase } = require('../config/database');

async function checkCPUData() {
    try {
        await connectToDatabase();
        const db = getDatabase();

        const cpu = await db.collection('cpus').findOne({
            name: { $regex: 'Ryzen 5 5600X', $options: 'i' }
        });

        console.log('\n=== Sample CPU Data ===\n');
        console.log('Name:', cpu.name || cpu.title);
        console.log('Supported Chipsets:', cpu.supportedChipsets);
        console.log('BIOS Update Required:', cpu.biosUpdateRequired);
        console.log('Socket:', cpu.socket);

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

checkCPUData();
