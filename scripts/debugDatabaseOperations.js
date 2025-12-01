const { connectToDatabase, getDatabase } = require('../config/database');
const DatabaseService = require('./services/databaseService');
const Logger = require('./utils/logger');

async function debugDatabaseOperations() {
    try {
        await connectToDatabase();
        const db = getDatabase();
        const databaseService = new DatabaseService(db);
        
        console.log('🔍 Debugging Database Operations...\n');
        
        // Create some test RAM data
        const testRamData = [
            {
                title: "Test RAM 1 - Corsair Vengeance 16GB",
                manufacturer: "Corsair",
                memoryType: "DDR4",
                speed: "3200MHz",
                capacity: "16GB",
                sourceUrl: "https://amazon.com/test-ram-1-" + Date.now(),
                currentPrice: 89.99,
                basePrice: 89.99
            },
            {
                title: "Test RAM 2 - G.Skill Ripjaws 32GB",
                manufacturer: "G.Skill",
                memoryType: "DDR4",
                speed: "3600MHz",
                capacity: "32GB",
                sourceUrl: "https://amazon.com/test-ram-2-" + Date.now(),
                currentPrice: 149.99,
                basePrice: 149.99
            }
        ];
        
        console.log('📦 Test RAM data created');
        
        // Check database before
        const collection = db.collection('rams');
        const countBefore = await collection.countDocuments();
        console.log(`📊 Database count BEFORE: ${countBefore}`);
        
        // Try to save using the DatabaseService method
        console.log('\n🧪 Testing saveRamWithDuplicateDetection...');
        try {
            const result = await databaseService.saveRamWithDuplicateDetection(testRamData, 'rams');
            console.log('✅ saveRamWithDuplicateDetection completed');
            console.log(`📈 Result: ${result.newCount} new, ${result.duplicateCount} duplicates, ${result.updatedCount} updated`);
        } catch (saveError) {
            console.log('❌ saveRamWithDuplicateDetection failed:', saveError.message);
            console.error('Full error:', saveError);
        }
        
        // Check database after
        const countAfter = await collection.countDocuments();
        console.log(`📊 Database count AFTER: ${countAfter}`);
        console.log(`📈 Database grew by: ${countAfter - countBefore}`);
        
        // Try direct MongoDB insert as comparison
        console.log('\n🧪 Testing direct MongoDB insert...');
        const testDirectRam = {
            title: "Direct Insert Test RAM - " + Date.now(),
            manufacturer: "TestBrand",
            sourceUrl: "https://test.com/direct-" + Date.now(),
            currentPrice: 99.99,
            createdAt: new Date(),
            updatedAt: new Date()
        };
        
        try {
            const directResult = await collection.insertOne(testDirectRam);
            console.log('✅ Direct insert successful:', directResult.insertedId);
            
            const countAfterDirect = await collection.countDocuments();
            console.log(`📊 Database count after direct insert: ${countAfterDirect}`);
            
            // Clean up direct test
            await collection.deleteOne({_id: directResult.insertedId});
            console.log('🧹 Direct test RAM cleaned up');
            
        } catch (directError) {
            console.log('❌ Direct insert failed:', directError.message);
        }
        
        // Show current database contents
        console.log('\n📋 Current database contents:');
        const allRam = await collection.find({}).toArray();
        allRam.forEach((ram, index) => {
            console.log(`${index + 1}. ${ram.title}`);
            console.log(`   URL: ${ram.sourceUrl ? ram.sourceUrl.substring(0, 50) + '...' : 'No URL'}`);
            console.log(`   Created: ${ram.createdAt}`);
        });
        
        // Clean up test data
        console.log('\n🧹 Cleaning up test data...');
        await collection.deleteMany({
            sourceUrl: { $regex: /test-ram-\d+/ }
        });
        console.log('✅ Test data cleaned up');
        
    } catch (error) {
        console.error('❌ Debug failed:', error);
    }
    
    process.exit(0);
}

debugDatabaseOperations();