const { connectToDatabase, getDatabase } = require('../config/database');

async function checkMotherboardData() {
    try {
        await connectToDatabase();
        const db = getDatabase();

        const motherboards = await db.collection('motherboards').find({}).limit(5).toArray();

        console.log('\n=== Sample Motherboard Data ===\n');
        motherboards.forEach(mb => {
            console.log('Name:', mb.name || mb.title);
            console.log('Chipset:', mb.chipset);
            console.log('Socket:', mb.socket);
            console.log('---');
        });

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

checkMotherboardData();
