const { connectToDatabase, getDatabase } = require('../config/database');

async function fixI912900Socket() {
    try {
        await connectToDatabase();
        const db = getDatabase();

        console.log('🔧 Fixing Intel Core i9-12900 socket mislabeling...\n');

        // Find all collections with CPUs
        const collections = await db.listCollections().toArray();
        const cpuCollections = collections.filter(c => c.name.toLowerCase().includes('cpu'));

        let totalFixed = 0;

        for (const collection of cpuCollections) {
            const cpusCollection = db.collection(collection.name);

            // Find Intel Core i9-12900 CPUs with incorrect socket
            const result = await cpusCollection.updateMany(
                {
                    $and: [
                        {
                            $or: [
                                { name: { $regex: 'i9-12900', $options: 'i' } },
                                { title: { $regex: 'i9-12900', $options: 'i' } }
                            ]
                        },
                        {
                            $or: [
                                { socket: { $regex: 'LGA 1151', $options: 'i' } },
                                { socket: { $regex: 'LGA1151', $options: 'i' } },
                                { socketType: { $regex: 'LGA 1151', $options: 'i' } },
                                { socketType: { $regex: 'LGA1151', $options: 'i' } }
                            ]
                        }
                    ]
                },
                {
                    $set: {
                        socket: 'LGA1700',
                        socketType: 'LGA1700',
                        updatedAt: new Date()
                    }
                }
            );

            if (result.modifiedCount > 0) {
                console.log(`✅ Fixed ${result.modifiedCount} CPUs in collection: ${collection.name}`);
                totalFixed += result.modifiedCount;
            }
        }

        console.log(`\n📊 Total CPUs fixed: ${totalFixed}`);

        // Verify the fix
        console.log('\n🔍 Verifying fix...');
        for (const collection of cpuCollections) {
            const cpusCollection = db.collection(collection.name);

            const cpus = await cpusCollection.find({
                $or: [
                    { name: { $regex: 'i9-12900', $options: 'i' } },
                    { title: { $regex: 'i9-12900', $options: 'i' } }
                ]
            }).toArray();

            if (cpus.length > 0) {
                console.log(`\nCollection: ${collection.name}`);
                cpus.forEach(cpu => {
                    const name = (cpu.name || cpu.title || 'Unknown').substring(0, 80);
                    const socket = cpu.socket || cpu.socketType || 'Unknown';
                    console.log(`  ✓ ${name}`);
                    console.log(`    Socket: ${socket}`);
                });
            }
        }

        console.log('\n✅ Fix complete!');

    } catch (error) {
        console.error('❌ Error fixing CPU sockets:', error);
        throw error;
    } finally {
        process.exit(0);
    }
}

fixI912900Socket();
