const { connectToDatabase, getDatabase } = require('../config/database');

async function verifyMotherboardAvailability() {
    try {
        await connectToDatabase();
        const db = getDatabase();

        // Get all motherboards
        const allMotherboards = await db.collection('motherboards').find({}).toArray();

        // Count available vs unavailable
        const available = allMotherboards.filter(mb => mb.isAvailable !== false);
        const unavailable = allMotherboards.filter(mb => mb.isAvailable === false);

        console.log('\n=== Motherboard Availability Summary ===\n');
        console.log(`Total motherboards in database: ${allMotherboards.length}`);
        console.log(`Available motherboards: ${available.length}`);
        console.log(`Unavailable motherboards: ${unavailable.length}`);

        if (unavailable.length > 0) {
            console.log('\n=== Unavailable Motherboards ===\n');
            unavailable.forEach(mb => {
                console.log(`❌ ${mb.name || mb.title}`);
                console.log(`   Reason: ${mb.unavailabilityReason || 'Not specified'}`);
                console.log(`   URL: ${mb.sourceUrl}`);
                console.log('');
            });
        }

        console.log(`\n✅ Frontend will display ${available.length} available motherboards`);
        console.log(`🚫 Frontend will hide ${unavailable.length} unavailable motherboards\n`);

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

verifyMotherboardAvailability();
