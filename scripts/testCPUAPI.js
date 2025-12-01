const { connectToDatabase, getDatabase } = require('../config/database');

async function testCPUAPI() {
    try {
        await connectToDatabase();
        const db = getDatabase();

        const cpu = await db.collection('cpus').findOne({
            name: { $regex: 'Ryzen 5 7600', $options: 'i' }
        });

        console.log('\n=== AMD Ryzen 5 7600 from Database ===\n');
        console.log('Name:', cpu.name);
        console.log('supportedChipsets:', cpu.supportedChipsets);
        console.log('biosUpdateRequired:', cpu.biosUpdateRequired);
        
        // Check what the API would return
        const cpus = await db.collection('cpus').find({}).toArray();
        const ryzen7600 = cpus.find(c => (c.name || c.title || '').includes('Ryzen 5 7600'));
        
        console.log('\n=== What API returns ===');
        console.log('Has supportedChipsets field:', 'supportedChipsets' in ryzen7600);
        console.log('supportedChipsets value:', ryzen7600.supportedChipsets);

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

testCPUAPI();
