const { connectToDatabase, getDatabase } = require('../config/database');

async function checkCpuBenchmark() {
    try {
        await connectToDatabase();
        const db = getDatabase();
        const collection = db.collection('cpus');

        const cpu = await collection.findOne({
            $or: [
                { name: 'Intel Core i9-13900K' },
                { title: 'Intel Core i9-13900K' }
            ]
        });

        if (cpu) {
            console.log('Found CPU:');
            console.log('Name:', cpu.name || cpu.title);
            console.log('Single-Core Performance:', cpu.singleCorePerformance);
            console.log('Multi-Thread Performance:', cpu.multiThreadPerformance);
            console.log('Current Price:', cpu.currentPrice || cpu.price);
            console.log('Last Updated:', cpu.updatedAt);
        } else {
            console.log('CPU not found');
        }

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

checkCpuBenchmark();
