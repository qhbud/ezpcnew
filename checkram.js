const { connectToDatabase, getDatabase } = require('./config/database');

async function checkRAM() {
    await connectToDatabase();
    const db = getDatabase();

    console.log('=== Checking DDR5 RAM ===');
    const ddr5Rams = await db.collection('rams').find({
        currentPrice: { $gt: 0, $lte: 400 },
        memoryType: { $regex: 'DDR5', $options: 'i' }
    }).limit(5).toArray();

    console.log(`Found ${ddr5Rams.length} DDR5 RAM modules under $400:`);
    ddr5Rams.forEach(ram => {
        console.log(JSON.stringify({
            name: ram.name,
            memoryType: ram.memoryType,
            formFactor: ram.formFactor,
            capacity: ram.capacity,
            price: ram.currentPrice
        }, null, 2));
    });

    console.log('\n=== Checking DDR5 DIMM (not SODIMM) ===');
    const ddr5Dimm = await db.collection('rams').find({
        currentPrice: { $gt: 0, $lte: 400 },
        memoryType: { $regex: 'DDR5', $options: 'i' },
        formFactor: { $regex: '^(?!.*SODIMM).*DIMM', $options: 'i' }
    }).limit(5).toArray();

    console.log(`Found ${ddr5Dimm.length} DDR5 DIMM modules:`);
    ddr5Dimm.forEach(ram => {
        console.log(JSON.stringify({
            name: ram.name,
            formFactor: ram.formFactor,
            price: ram.currentPrice
        }, null, 2));
    });

    process.exit(0);
}

checkRAM();
