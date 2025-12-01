const { connectToDatabase, getDatabase } = require('../config/database');

async function checkMotherboards() {
    try {
        await connectToDatabase();
        const db = getDatabase();

        const motherboards = await db.collection('motherboards')
            .find({
                manufacturer: { $in: ['ASRock', 'ASUS', 'Gigabyte', 'GIGABYTE', 'Asus'] }
            })
            .limit(10)
            .toArray();

        console.log('\n=== Motherboard Data Check ===\n');

        motherboards.forEach(mb => {
            console.log(`Name: ${mb.name || mb.title}`);
            console.log(`Manufacturer: ${mb.manufacturer}`);
            console.log(`Chipset: ${mb.chipset}`);
            console.log(`Memory Type: ${JSON.stringify(mb.memoryType)}`);
            console.log(`Type of memoryType: ${typeof mb.memoryType}, isArray: ${Array.isArray(mb.memoryType)}`);
            console.log('---');
        });

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

checkMotherboards();
