const { connectToDatabase, getDatabase } = require('../config/database');

async function addLga1851ToCoolers() {
    try {
        await connectToDatabase();
        const db = getDatabase();
        const coolersCollection = db.collection('coolers');

        console.log('🔧 Adding LGA1851 socket to all compatible coolers...\n');

        // Get all coolers
        const allCoolers = await coolersCollection.find({}).toArray();
        console.log(`Found ${allCoolers.length} total coolers in database\n`);

        let updatedCount = 0;
        let skippedCount = 0;

        for (const cooler of allCoolers) {
            const socketCompatibility = cooler.socketCompatibility || [];

            // Check if cooler already has LGA1851
            if (socketCompatibility.includes('LGA1851')) {
                skippedCount++;
                continue;
            }

            // Check if cooler is for specialized sockets only (like TR5, SP6)
            const isSpecializedOnly = socketCompatibility.length > 0 &&
                socketCompatibility.every(socket =>
                    socket.includes('TR5') || socket.includes('SP6') || socket.includes('sTRX')
                );

            if (isSpecializedOnly) {
                console.log(`⏭️  Skipping specialized cooler: ${(cooler.name || cooler.title || 'Unknown').substring(0, 60)}...`);
                console.log(`   Sockets: ${socketCompatibility.join(', ')}`);
                skippedCount++;
                continue;
            }

            // Add LGA1851 to the socket compatibility array
            const updatedSockets = [...socketCompatibility, 'LGA1851'];

            await coolersCollection.updateOne(
                { _id: cooler._id },
                {
                    $set: {
                        socketCompatibility: updatedSockets,
                        'specifications.socketCompatibility': updatedSockets,
                        updatedAt: new Date()
                    }
                }
            );

            updatedCount++;
            console.log(`✅ Updated: ${(cooler.name || cooler.title || 'Unknown').substring(0, 60)}...`);
            console.log(`   Before: ${socketCompatibility.join(', ') || 'None'}`);
            console.log(`   After: ${updatedSockets.join(', ')}`);
            console.log('');
        }

        console.log('\n📊 Summary:');
        console.log('='.repeat(60));
        console.log(`✅ Coolers updated with LGA1851: ${updatedCount}`);
        console.log(`⏭️  Coolers already had LGA1851 or skipped: ${skippedCount}`);
        console.log(`📦 Total coolers: ${allCoolers.length}`);
        console.log('='.repeat(60));

        // Verify - count coolers with LGA1851
        const coolersWithLga1851 = await coolersCollection.countDocuments({
            socketCompatibility: 'LGA1851'
        });
        console.log(`\n✅ Total coolers now supporting LGA1851: ${coolersWithLga1851}`);

    } catch (error) {
        console.error('❌ Error adding LGA1851 to coolers:', error);
        throw error;
    } finally {
        process.exit(0);
    }
}

addLga1851ToCoolers();
