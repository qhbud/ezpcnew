const { connectToDatabase, getDatabase } = require('../config/database');

async function purgeRamDb() {
    try {
        console.log('🗑️  Purging RAM database...');
        
        await connectToDatabase();
        const db = getDatabase();
        
        // Check current count
        const currentCount = await db.collection('rams').countDocuments();
        console.log(`📦 Current RAM modules in database: ${currentCount}`);
        
        if (currentCount === 0) {
            console.log('✅ RAM database is already empty');
            process.exit(0);
        }
        
        // Delete all RAM documents
        const result = await db.collection('rams').deleteMany({});
        
        console.log(`✅ Successfully purged ${result.deletedCount} RAM modules`);
        console.log('🔒 CPU, GPU, and Motherboard databases remain untouched');
        
        // Verify deletion
        const finalCount = await db.collection('rams').countDocuments();
        console.log(`📦 Final RAM count: ${finalCount}`);
        
        process.exit(0);
        
    } catch (error) {
        console.error('❌ Error purging RAM database:', error);
        process.exit(1);
    }
}

purgeRamDb();