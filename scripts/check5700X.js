const { connectToDatabase, getDatabase } = require('../config/database');

async function check5700X() {
    try {
        await connectToDatabase();
        const db = getDatabase();

        const cpu = await db.collection('cpus').findOne({
            $or: [
                { name: { $regex: '5700X', $options: 'i' } },
                { title: { $regex: '5700X', $options: 'i' } }
            ]
        });

        console.log('\n=== AMD Ryzen 7 5700X Data ===\n');
        console.log('Name:', cpu.name || cpu.title);
        console.log('supportedChipsets:', cpu.supportedChipsets);
        console.log('biosUpdateRequired:', cpu.biosUpdateRequired);
        console.log('\nAll Fields:');
        console.log(Object.keys(cpu));

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

check5700X();
