const { connectToDatabase, getDatabase } = require('../config/database');

async function removeB660DS3H() {
    try {
        await connectToDatabase();
        const db = getDatabase();

        // Find the motherboard first
        const motherboard = await db.collection('motherboards').findOne({
            $or: [
                { name: { $regex: 'B660 DS3H', $options: 'i' } },
                { title: { $regex: 'B660 DS3H', $options: 'i' } }
            ]
        });

        if (motherboard) {
            console.log('\n=== Found Motherboard to Remove ===\n');
            console.log(`Name: ${motherboard.name || motherboard.title}`);
            console.log(`URL: ${motherboard.sourceUrl}`);
            console.log(`Manufacturer: ${motherboard.manufacturer}`);

            // Delete it
            const result = await db.collection('motherboards').deleteOne({ _id: motherboard._id });

            if (result.deletedCount === 1) {
                console.log('\n✅ Successfully removed GIGABYTE B660 DS3H from database\n');
            } else {
                console.log('\n❌ Failed to delete motherboard\n');
            }
        } else {
            console.log('\n❌ GIGABYTE B660 DS3H not found in database\n');
        }

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

removeB660DS3H();
