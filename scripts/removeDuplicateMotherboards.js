const { connectToDatabase, getDatabase } = require('../config/database');

async function removeDuplicates() {
    try {
        await connectToDatabase();
        const db = getDatabase();
        const collection = db.collection('motherboards');

        // Find all motherboards without memoryType
        const motherboardsWithoutMemoryType = await collection.find({
            memoryType: { $exists: false }
        }).toArray();

        console.log(`\nFound ${motherboardsWithoutMemoryType.length} motherboards without memoryType\n`);

        for (const mb of motherboardsWithoutMemoryType) {
            console.log(`Checking: ${mb.name || mb.title}`);
            console.log(`URL: ${mb.sourceUrl}`);

            // Try to find a duplicate with memoryType by matching title
            const duplicate = await collection.findOne({
                $or: [
                    { name: mb.name },
                    { title: mb.title }
                ],
                memoryType: { $exists: true },
                _id: { $ne: mb._id }
            });

            if (duplicate) {
                console.log(`  ✓ Found duplicate with memoryType, removing old entry...`);
                await collection.deleteOne({ _id: mb._id });
                console.log(`  ✓ Deleted`);
            } else {
                console.log(`  ✗ No duplicate found, keeping this one`);
            }
            console.log('');
        }

        console.log('\n✅ Cleanup complete!\n');
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

removeDuplicates();
