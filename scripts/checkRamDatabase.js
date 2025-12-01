const { connectToDatabase, getDatabase } = require('../config/database');

async function checkRamDatabase() {
    try {
        await connectToDatabase();
        const db = getDatabase();
        
        console.log('🔍 Checking RAM database...');
        
        // Check if rams collection exists
        const collections = await db.listCollections().toArray();
        const ramCollectionExists = collections.some(col => col.name === 'rams');
        
        console.log(`📊 Collections found: ${collections.map(c => c.name).join(', ')}`);
        console.log(`🎯 RAM collection exists: ${ramCollectionExists}`);
        
        if (ramCollectionExists) {
            const ramsCollection = db.collection('rams');
            const ramCount = await ramsCollection.countDocuments();
            console.log(`📦 Total RAM modules in database: ${ramCount}`);
            
            if (ramCount > 0) {
                // Show some sample RAM data
                const sampleRams = await ramsCollection.find({}).limit(5).toArray();
                console.log('\n📋 Sample RAM modules:');
                sampleRams.forEach((ram, index) => {
                    console.log(`${index + 1}. ${ram.title || ram.name || 'Unknown'}`);
                    console.log(`   Manufacturer: ${ram.manufacturer || 'Unknown'}`);
                    console.log(`   Type: ${ram.memoryType || 'Unknown'}`);
                    console.log(`   Speed: ${ram.speed || 'Unknown'}`);
                    console.log(`   Capacity: ${ram.capacity || 'Unknown'}`);
                    console.log(`   Price: ${ram.currentPrice ? `$${ram.currentPrice}` : 'N/A'}`);
                    console.log('');
                });
                
                // Check manufacturers
                const manufacturers = await ramsCollection.distinct('manufacturer');
                console.log(`🏢 RAM Manufacturers: ${manufacturers.filter(m => m).join(', ')}`);
                
                // Check memory types
                const memoryTypes = await ramsCollection.distinct('memoryType');
                console.log(`🧠 Memory Types: ${memoryTypes.filter(m => m).join(', ')}`);
            }
        } else {
            console.log('❌ No RAM collection found in database');
            console.log('💡 You need to run the RAM populator script first');
        }
        
    } catch (error) {
        console.error('❌ Error checking RAM database:', error);
    }
    
    process.exit(0);
}

checkRamDatabase();