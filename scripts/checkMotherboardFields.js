const { connectToDatabase, getDatabase } = require('../config/database');

async function checkMotherboardFields() {
    try {
        await connectToDatabase();
        const db = getDatabase();

        // Get a few motherboards to see what fields they have
        const motherboards = await db.collection('motherboards').find({}).limit(3).toArray();

        console.log('\n=== Motherboard Fields ===\n');

        motherboards.forEach((mb, index) => {
            console.log(`\n--- Motherboard ${index + 1}: ${mb.name || mb.title} ---`);
            console.log('Available fields:', Object.keys(mb));
            console.log('\nFull data:');
            console.log(JSON.stringify(mb, null, 2));
            console.log('\n' + '='.repeat(80));
        });

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

checkMotherboardFields();
