const { connectToDatabase, getDatabase } = require('../config/database');

async function findCpu() {
    try {
        await connectToDatabase();
        const db = getDatabase();
        const collection = db.collection('cpus');

        // Search for any CPU with "13900K" in the name
        const cpus = await collection.find({
            $or: [
                { name: { $regex: /13900K/i } },
                { title: { $regex: /13900K/i } }
            ]
        }).toArray();

        console.log(`Found ${cpus.length} CPUs matching "13900K":\n`);

        cpus.forEach(cpu => {
            console.log('---');
            console.log('Name:', cpu.name);
            console.log('Title:', cpu.title);
            console.log('Single-Core:', cpu.singleCorePerformance);
            console.log('Multi-Thread:', cpu.multiThreadPerformance);
            console.log('');
        });

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

findCpu();
