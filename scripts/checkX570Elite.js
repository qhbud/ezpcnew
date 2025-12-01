const { connectToDatabase, getDatabase } = require('../config/database');

async function checkX570Elite() {
    try {
        await connectToDatabase();
        const db = getDatabase();

        const motherboard = await db.collection('motherboards').findOne({
            $or: [
                { name: { $regex: 'X570.*AORUS.*Elite', $options: 'i' } },
                { title: { $regex: 'X570.*AORUS.*Elite', $options: 'i' } }
            ]
        });

        if (motherboard) {
            console.log('\n=== Gigabyte X570 AORUS Elite Status ===\n');
            console.log(`Name: ${motherboard.name || motherboard.title}`);
            console.log(`Current Price: $${motherboard.currentPrice}`);
            console.log(`Is Available: ${motherboard.isAvailable}`);
            console.log(`Unavailability Reason: ${motherboard.unavailabilityReason || 'N/A'}`);
            console.log(`Source URL: ${motherboard.sourceUrl}`);
            console.log(`Detection Method: ${motherboard.detectionMethod || 'N/A'}`);
            console.log(`Last Updated: ${motherboard.updatedAt}`);
            console.log('');
        } else {
            console.log('\n❌ X570 AORUS Elite not found in database\n');
        }

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

checkX570Elite();
