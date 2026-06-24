const mongoose = require('mongoose');

// MongoDB Atlas connection string — read from the environment, never hardcoded.
require('dotenv').config({ path: require('path').join(__dirname, '.env.atlas') });
const ATLAS_URI = process.env.MONGODB_URI;
if (!ATLAS_URI) { console.error('MONGODB_URI is not set (put it in .env.atlas or the environment).'); process.exit(1); }

async function testAtlasConnection() {
    console.log('🔌 Testing MongoDB Atlas connection...\n');

    try {
        // Connect to MongoDB Atlas
        await mongoose.connect(ATLAS_URI);

        console.log('✅ SUCCESS! Connected to MongoDB Atlas');
        console.log(`📊 Database: ${mongoose.connection.name}`);
        console.log(`🌐 Host: ${mongoose.connection.host}`);
        console.log(`🔗 Connection state: ${mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected'}`);

        // List existing collections
        const collections = await mongoose.connection.db.listCollections().toArray();

        console.log('\n📁 Collections in database:');
        if (collections.length === 0) {
            console.log('   (No collections yet - database is empty)');
        } else {
            collections.forEach(col => {
                console.log(`   - ${col.name}`);
            });
        }

        console.log('\n🎉 Your MongoDB Atlas is ready to use!');

    } catch (error) {
        console.error('❌ ERROR: Could not connect to MongoDB Atlas');
        console.error('Error message:', error.message);
        console.error('\nPossible issues:');
        console.error('1. Check that IP address 0.0.0.0/0 is whitelisted');
        console.error('2. Verify username and password are correct');
        console.error('3. Wait 2-3 minutes if cluster was just created');
    } finally {
        await mongoose.connection.close();
        console.log('\n🔌 Connection closed');
    }
}

testAtlasConnection();
