const { connectToDatabase, getDatabase } = require('../config/database');

async function checkB550Riptide() {
    try {
        await connectToDatabase();
        const db = getDatabase();

        const motherboards = await db.collection('motherboards')
            .find({
                $or: [
                    { name: { $regex: 'B550.*Riptide', $options: 'i' } },
                    { title: { $regex: 'B550.*Riptide', $options: 'i' } }
                ]
            })
            .toArray();

        console.log(`\nFound ${motherboards.length} B550 Riptide motherboards:\n`);

        motherboards.forEach(mb => {
            console.log(`Name: ${mb.name || mb.title}`);
            console.log(`Manufacturer: ${mb.manufacturer}`);
            console.log(`Source URL: ${mb.sourceUrl}`);
            console.log(`Memory Type: ${JSON.stringify(mb.memoryType)}`);
            console.log(`Form Factor: ${mb.formFactor}`);
            console.log('---\n');
        });

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

checkB550Riptide();
