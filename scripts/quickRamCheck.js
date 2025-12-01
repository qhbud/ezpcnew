const { connectToDatabase, getDatabase } = require('../config/database');

async function quickRamCheck() {
    try {
        await connectToDatabase();
        const db = getDatabase();
        
        const ramsCollection = db.collection('rams');
        const ramCount = await ramsCollection.countDocuments();
        console.log(`📦 Total RAM modules in database: ${ramCount}`);
        
        if (ramCount > 0) {
            // Show first few RAM modules
            const sampleRams = await ramsCollection.find({}).limit(3).toArray();
            console.log('\n📋 Sample RAM modules:');
            sampleRams.forEach((ram, index) => {
                console.log(`${index + 1}. ${ram.title || ram.name || 'Unknown'}`);
                console.log(`   Manufacturer: ${ram.manufacturer || 'Unknown'}`);
                console.log(`   Type: ${ram.memoryType || 'Unknown'}`);
                console.log(`   Speed: ${ram.speed || 'Unknown'}`);
                console.log(`   Price: ${ram.currentPrice ? `$${ram.currentPrice}` : ram.price ? `$${ram.price}` : 'N/A'}`);
                console.log('');
            });
        } else {
            console.log('❌ No RAM modules found in database');
        }
        
    } catch (error) {
        console.error('❌ Error:', error);
    }
    
    process.exit(0);
}

quickRamCheck();