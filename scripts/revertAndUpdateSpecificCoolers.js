const { connectToDatabase, getDatabase } = require('../config/database');

async function revertAndUpdateSpecificCoolers() {
    try {
        await connectToDatabase();
        const db = getDatabase();
        const coolersCollection = db.collection('coolers');

        console.log('🔄 Reverting all coolers and updating only specific ones...\n');

        // First, remove LGA1851 from all coolers to revert the bulk update
        console.log('📋 Step 1: Removing LGA1851 from all coolers...');
        const allCoolers = await coolersCollection.find({}).toArray();

        for (const cooler of allCoolers) {
            const sockets = cooler.socketCompatibility || [];
            const filteredSockets = sockets.filter(socket => socket !== 'LGA1851');

            if (sockets.length !== filteredSockets.length) {
                await coolersCollection.updateOne(
                    { _id: cooler._id },
                    {
                        $set: {
                            socketCompatibility: filteredSockets,
                            'specifications.socketCompatibility': filteredSockets,
                            updatedAt: new Date()
                        }
                    }
                );
            }
        }
        console.log('✅ Reverted all coolers\n');

        // Now, only add LGA1851 to the specific coolers mentioned by the user
        console.log('📋 Step 2: Adding LGA1851 to specific coolers only...\n');

        const specificCoolers = [
            'Thermaltake UX150 ARGB',
            'Vetroo V3 CPU Air Cooler',
            'Thermalright Peerless Assassin 120 ARGB Black V3',
            'Thermalright Peerless Assassin 120 Digital ARGB Black',
            'Thermalright Phantom Spirit 120SE ARGB',
            'Thermalright AXP90-X47',
            'Thermalright FW 240 SE ARGB Black',
            'Thermalright Assassin X120 Refined SE',
            'ID-COOLING SE-903-XT Black',
            'MSI MAG Coreliquid A13 240',
            'ID-COOLING IS-55 Black',
            'ID-COOLING FROZN A410 ARGB',
            'ID-COOLING FROZN A620 GDL',
            'Corsair iCUE Link Titan 280 RX RGB',
            'CORSAIR iCUE Link Titan 360 RX LCD',
            'Gamma A40 ARGB BK',
            'Cooler Master Hyper 212 Spectrum V3 ARGB',
            'Cooler Master Hyper 612 APEX',
            'Cooler Master 240 Core II AIO',
            'Cooler Master 360 Core II AIO',
            'Cooler Master Hyper 212 Black'
        ];

        let updatedCount = 0;
        let notFoundCount = 0;

        for (const coolerPattern of specificCoolers) {
            const cooler = await coolersCollection.findOne({
                $or: [
                    { name: { $regex: coolerPattern, $options: 'i' } },
                    { title: { $regex: coolerPattern, $options: 'i' } }
                ]
            });

            if (cooler) {
                const currentSockets = cooler.socketCompatibility || [];

                // Only add LGA1851 if it's not already there
                if (!currentSockets.includes('LGA1851')) {
                    const updatedSockets = [...currentSockets, 'LGA1851'];

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

                    console.log(`✅ Updated: ${(cooler.name || cooler.title || 'Unknown').substring(0, 60)}...`);
                    console.log(`   Before: ${currentSockets.join(', ')}`);
                    console.log(`   After: ${updatedSockets.join(', ')}\n`);
                    updatedCount++;
                } else {
                    console.log(`⏭️  Already had LGA1851: ${(cooler.name || cooler.title || 'Unknown').substring(0, 60)}...\n`);
                }
            } else {
                console.log(`❌ Not found: ${coolerPattern}\n`);
                notFoundCount++;
            }
        }

        console.log('\n📊 Summary:');
        console.log('='.repeat(60));
        console.log(`✅ Specific coolers updated with LGA1851: ${updatedCount}`);
        console.log(`❌ Coolers not found: ${notFoundCount}`);
        console.log(`📦 Total specific coolers requested: ${specificCoolers.length}`);
        console.log('='.repeat(60));

        console.log('\n✅ Revert and selective update complete!');

    } catch (error) {
        console.error('❌ Error:', error);
        throw error;
    } finally {
        process.exit(0);
    }
}

revertAndUpdateSpecificCoolers();
