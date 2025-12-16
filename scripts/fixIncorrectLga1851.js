const { connectToDatabase, getDatabase } = require('../config/database');

async function fixIncorrectLga1851() {
    try {
        await connectToDatabase();
        const db = getDatabase();
        const coolersCollection = db.collection('coolers');

        console.log('🔧 Fixing coolers that incorrectly received LGA1851...\n');

        // Fix Scythe Kotetsu Mark II - Should be AM4 ONLY
        const scytheResult = await coolersCollection.updateMany(
            {
                $or: [
                    { name: { $regex: 'Scythe Kotetsu Mark II', $options: 'i' } },
                    { title: { $regex: 'Scythe Kotetsu Mark II', $options: 'i' } }
                ]
            },
            {
                $set: {
                    socketCompatibility: ['AM4'],
                    'specifications.socketCompatibility': ['AM4'],
                    updatedAt: new Date()
                }
            }
        );
        console.log(`✅ Fixed Scythe Kotetsu Mark II: ${scytheResult.modifiedCount} document(s)`);
        console.log('   Sockets: AM4 only (reverted from AM4, LGA1851)\n');

        // Fix Noctua NH-D9 TR5-SP6 - Should be TR5, SP6 ONLY (Threadripper specialized)
        const noctuaTR5Result = await coolersCollection.updateMany(
            {
                $or: [
                    { name: { $regex: 'NH-D9 TR5-SP6', $options: 'i' } },
                    { title: { $regex: 'NH-D9 TR5-SP6', $options: 'i' } }
                ]
            },
            {
                $set: {
                    socketCompatibility: ['TR5', 'SP6'],
                    'specifications.socketCompatibility': ['TR5', 'SP6'],
                    updatedAt: new Date()
                }
            }
        );
        console.log(`✅ Fixed Noctua NH-D9 TR5-SP6: ${noctuaTR5Result.modifiedCount} document(s)`);
        console.log('   Sockets: TR5, SP6 (Threadripper only, removed AM4, AM5, LGA1851)\n');

        // Fix Noctua NH-D15 chromax.Black - Should have full modern socket support
        const noctuaD15Result = await coolersCollection.updateMany(
            {
                $or: [
                    { name: { $regex: 'NH-D15 chromax\\.Black', $options: 'i' } },
                    { title: { $regex: 'NH-D15 chromax\\.Black', $options: 'i' } }
                ]
            },
            {
                $set: {
                    socketCompatibility: ['AM4', 'AM5', 'LGA1700', 'LGA1851', 'LGA1200'],
                    'specifications.socketCompatibility': ['AM4', 'AM5', 'LGA1700', 'LGA1851', 'LGA1200'],
                    updatedAt: new Date()
                }
            }
        );
        console.log(`✅ Fixed Noctua NH-D15 chromax.Black: ${noctuaD15Result.modifiedCount} document(s)`);
        console.log('   Sockets: AM4, AM5, LGA1700, LGA1851, LGA1200\n');

        console.log('✅ Corrections complete!');

    } catch (error) {
        console.error('❌ Error fixing incorrect LGA1851 additions:', error);
        throw error;
    } finally {
        process.exit(0);
    }
}

fixIncorrectLga1851();
