const { connectToDatabase, getDatabase } = require('../config/database');

async function fixSpecificCoolers() {
    try {
        await connectToDatabase();
        const db = getDatabase();
        const coolersCollection = db.collection('coolers');

        console.log('🔧 Fixing specific cooler socket compatibility issues...\n');

        // Fix Scythe Kotetsu Mark II - Only AM4
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
        console.log('   Sockets: AM4 only\n');

        // Fix Noctua NH-U12S - AM5, AM4, LGA1851, LGA1700
        const noctuaU12SResult = await coolersCollection.updateMany(
            {
                $or: [
                    { name: { $regex: 'Noctua NH-U12S', $options: 'i' } },
                    { title: { $regex: 'Noctua NH-U12S', $options: 'i' } }
                ]
            },
            {
                $set: {
                    manufacturer: 'Noctua',
                    socketCompatibility: ['AM5', 'AM4', 'LGA1851', 'LGA1700'],
                    'specifications.socketCompatibility': ['AM5', 'AM4', 'LGA1851', 'LGA1700'],
                    updatedAt: new Date()
                }
            }
        );
        console.log(`✅ Fixed Noctua NH-U12S: ${noctuaU12SResult.modifiedCount} document(s)`);
        console.log('   Sockets: AM5, AM4, LGA1851, LGA1700\n');

        // Fix Noctua NH-D15 G2 LBC - AM5, AM4 ONLY (AMD only version)
        const noctuaD15Result = await coolersCollection.updateMany(
            {
                $or: [
                    { name: { $regex: 'Noctua NH-D15 G2 LBC', $options: 'i' } },
                    { title: { $regex: 'Noctua NH-D15 G2 LBC', $options: 'i' } }
                ]
            },
            {
                $set: {
                    socketCompatibility: ['AM5', 'AM4'],
                    'specifications.socketCompatibility': ['AM5', 'AM4'],
                    updatedAt: new Date()
                }
            }
        );
        console.log(`✅ Fixed Noctua NH-D15 G2 LBC: ${noctuaD15Result.modifiedCount} document(s)`);
        console.log('   Sockets: AM5, AM4 (AMD only version)\n');

        // Fix ARCTIC Freezer 36 A-RGB - AM4, AM5, LGA1851, LGA1700
        const arcticResult = await coolersCollection.updateMany(
            {
                $or: [
                    { name: { $regex: 'ARCTIC Freezer 36 A-RGB', $options: 'i' } },
                    { title: { $regex: 'ARCTIC Freezer 36 A-RGB', $options: 'i' } }
                ]
            },
            {
                $set: {
                    manufacturer: 'Arctic',
                    socketCompatibility: ['AM4', 'AM5', 'LGA1851', 'LGA1700'],
                    'specifications.socketCompatibility': ['AM4', 'AM5', 'LGA1851', 'LGA1700'],
                    updatedAt: new Date()
                }
            }
        );
        console.log(`✅ Fixed ARCTIC Freezer 36 A-RGB: ${arcticResult.modifiedCount} document(s)`);
        console.log('   Sockets: AM4, AM5, LGA1851, LGA1700\n');

        // Verify the fixes
        console.log('📋 Verification:');
        console.log('='.repeat(60));

        const coolersToVerify = [
            'Scythe Kotetsu Mark II',
            'Noctua NH-U12S',
            'Noctua NH-D15 G2 LBC',
            'ARCTIC Freezer 36 A-RGB'
        ];

        for (const coolerPattern of coolersToVerify) {
            const cooler = await coolersCollection.findOne({
                $or: [
                    { name: { $regex: coolerPattern, $options: 'i' } },
                    { title: { $regex: coolerPattern, $options: 'i' } }
                ]
            });

            if (cooler) {
                console.log(`\n✅ ${cooler.manufacturer || 'Unknown'} - ${(cooler.name || cooler.title || '').substring(0, 50)}...`);
                console.log(`   Sockets: ${(cooler.socketCompatibility || []).join(', ')}`);
            } else {
                console.log(`\n❌ Not found: ${coolerPattern}`);
            }
        }

        console.log('\n' + '='.repeat(60));
        console.log('✅ Specific cooler fixes complete!');

    } catch (error) {
        console.error('❌ Error fixing coolers:', error);
        throw error;
    } finally {
        process.exit(0);
    }
}

fixSpecificCoolers();
