const { connectToDatabase, getDatabase } = require('../config/database');
const Logger = require('./utils/logger');

async function debugRamSaving() {
    try {
        await connectToDatabase();
        const db = getDatabase();
        const collection = db.collection('rams');
        
        console.log('🔍 Debugging RAM saving issue...\n');
        
        // Check current RAM count
        const totalCount = await collection.countDocuments();
        console.log(`📦 Current RAM count: ${totalCount}`);
        
        if (totalCount > 0) {
            // Get all RAM modules to see what we have
            const allRam = await collection.find({}).toArray();
            
            console.log('\n📋 Current RAM modules in database:');
            allRam.forEach((ram, index) => {
                console.log(`${index + 1}. ${ram.title || ram.name || 'Unknown'}`);
                console.log(`   URL: ${ram.sourceUrl ? ram.sourceUrl.substring(0, 80) + '...' : 'No URL'}`);
                console.log(`   Manufacturer: ${ram.manufacturer || 'Unknown'}`);
                console.log(`   Memory Type: ${ram.memoryType || 'Unknown'}`);
                console.log(`   Speed: ${ram.speed || 'Unknown'}`);
                console.log(`   Capacity: ${ram.capacity || 'Unknown'}`);
                console.log('');
            });
        }
        
        // Test the duplicate detection logic with a sample RAM
        console.log('\n🧪 Testing duplicate detection logic...');
        
        const testRam = {
            title: "Corsair Vengeance RGB Pro 32GB (2x16GB) DDR4 3200",
            manufacturer: "Corsair",
            memoryType: "DDR4",
            speed: "3200MHz",
            capacity: "32GB",
            sourceUrl: "https://amazon.com/test-url-12345",
            currentPrice: 129.99
        };
        
        // Test the exact query used in saveRamWithDuplicateDetection
        const existingRam = await collection.findOne({
            $or: [
                { sourceUrl: testRam.sourceUrl },
                { 
                    title: testRam.title,
                    manufacturer: testRam.manufacturer,
                    memoryType: testRam.memoryType,
                    speed: testRam.speed,
                    capacity: testRam.capacity
                }
            ]
        });
        
        console.log(`🔎 Test RAM duplicate check result: ${existingRam ? 'DUPLICATE FOUND' : 'NO DUPLICATE'}`);
        
        if (existingRam) {
            console.log('📋 Found "duplicate" RAM:');
            console.log(`   Title: ${existingRam.title}`);
            console.log(`   URL: ${existingRam.sourceUrl}`);
            console.log(`   Manufacturer: ${existingRam.manufacturer}`);
            console.log(`   Memory Type: ${existingRam.memoryType}`);
            console.log(`   Speed: ${existingRam.speed}`);
            console.log(`   Capacity: ${existingRam.capacity}`);
        }
        
        // Test a simpler insert
        console.log('\n🧪 Testing direct insert...');
        const testInsertRam = {
            title: "TEST RAM MODULE " + Date.now(),
            manufacturer: "TestBrand",
            memoryType: "DDR4",
            speed: "3200MHz",
            capacity: "16GB",
            sourceUrl: "https://test.com/" + Date.now(),
            currentPrice: 99.99,
            createdAt: new Date(),
            updatedAt: new Date()
        };
        
        try {
            const insertResult = await collection.insertOne(testInsertRam);
            console.log(`✅ Direct insert successful: ${insertResult.insertedId}`);
            
            // Clean up the test data
            await collection.deleteOne({ _id: insertResult.insertedId });
            console.log('🧹 Test RAM cleaned up');
            
        } catch (insertError) {
            console.log(`❌ Direct insert failed: ${insertError.message}`);
        }
        
        console.log('\n🔍 Recommendations:');
        console.log('1. The duplicate detection is too aggressive - similar titles trigger false positives');
        console.log('2. Use URL-only duplicate detection for now');
        console.log('3. The update operations may be failing silently');
        
    } catch (error) {
        console.error('❌ Debug failed:', error);
    }
    
    process.exit(0);
}

debugRamSaving();