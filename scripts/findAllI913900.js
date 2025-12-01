const { connectToDatabase, getDatabase } = require('../config/database');

async function findAllI913900() {
    try {
        await connectToDatabase();
        const db = getDatabase();
        const collection = db.collection('cpus');

        // Search for any CPU with "i9-13900" in the name
        const cpus = await collection.find({
            $or: [
                { name: { $regex: /i9-13900/i } },
                { title: { $regex: /i9-13900/i } }
            ]
        }).toArray();

        console.log(`Found ${cpus.length} CPUs matching "i9-13900":\n`);

        cpus.forEach(cpu => {
            console.log('---');
            console.log('Name:', cpu.name);
            console.log('Title:', cpu.title);
            console.log('Single-Core:', cpu.singleCorePerformance);
            console.log('Multi-Thread:', cpu.multiThreadPerformance);
            console.log('Price:', cpu.currentPrice || cpu.price);
            console.log('');
        });

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

findAllI913900();
