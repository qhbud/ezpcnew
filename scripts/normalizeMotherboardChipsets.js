const { connectToDatabase, getDatabase } = require('../config/database');

// Mapping of variant chipsets to their base versions
const chipsetNormalizations = {
    'B650E': 'B650',
    'X670E': 'X670',
    'B550I': 'B550',
    'B650M': 'B650',
    'A520I': 'A520',
    'B550M': 'B550'
};

async function normalizeMotherboardChipsets() {
    try {
        console.log('\n=== Normalizing Motherboard Chipsets ===\n');

        await connectToDatabase();
        const db = getDatabase();

        let totalProcessed = 0;
        let totalUpdated = 0;

        // Get all motherboard collections
        const collections = await db.listCollections().toArray();
        const motherboardCollections = collections.filter(c =>
            c.name.startsWith('motherboards') || c.name === 'motherboards'
        ).map(c => c.name);

        console.log(`Found motherboard collections: ${motherboardCollections.join(', ')}\n`);

        for (const collectionName of motherboardCollections) {
            console.log(`\nProcessing collection: ${collectionName}`);
            const motherboards = await db.collection(collectionName).find({}).toArray();
            console.log(`Found ${motherboards.length} motherboards in ${collectionName}\n`);

            for (const motherboard of motherboards) {
                totalProcessed++;
                const motherboardName = motherboard.name || motherboard.title || 'Unknown';
                const currentChipset = motherboard.chipset;

                // Check if this chipset needs normalization
                if (currentChipset && chipsetNormalizations[currentChipset]) {
                    const normalizedChipset = chipsetNormalizations[currentChipset];

                    await db.collection(collectionName).updateOne(
                        { _id: motherboard._id },
                        {
                            $set: {
                                chipset: normalizedChipset,
                                updatedAt: new Date()
                            }
                        }
                    );

                    console.log(`✅ ${motherboardName}`);
                    console.log(`   Changed: ${currentChipset} → ${normalizedChipset}\n`);
                    totalUpdated++;
                }
            }
        }

        console.log('\n' + '='.repeat(70));
        console.log('SUMMARY');
        console.log('='.repeat(70));
        console.log(`Total Motherboards Processed: ${totalProcessed}`);
        console.log(`Chipsets Normalized: ${totalUpdated}`);
        console.log('='.repeat(70));

        console.log('\n✅ Motherboard chipset normalization complete!\n');

        process.exit(0);

    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

normalizeMotherboardChipsets();
