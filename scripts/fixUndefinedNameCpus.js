const { connectToDatabase, getDatabase } = require('../config/database');

async function fixUndefinedNameCpus() {
    console.log('🔧 Fixing CPUs with undefined names...\\n');

    try {
        await connectToDatabase();
        const db = getDatabase();

        const updates = [
            {
                collection: 'cpus_intel_core_i9',
                title: 'Intel Core i9-13900K Desktop Processor',
                name: 'Intel Core i9-13900K',
                singleCore: 91.1,
                multiCore: 80.7
            },
            {
                collection: 'cpus_intel_core_i7',
                title: 'Intel Core i7-13700K Desktop Processor',
                name: 'Intel Core i7-13700K',
                singleCore: 88.4,
                multiCore: 64.8
            },
            {
                collection: 'cpus_amd_ryzen_9',
                title: 'AMD Ryzen 9 7950X Desktop Processor',
                name: 'AMD Ryzen 9 7950X',
                singleCore: 86.2,
                multiCore: 89
            }
        ];

        for (const update of updates) {
            const collection = db.collection(update.collection);

            // Find by title
            const cpu = await collection.findOne({ title: update.title });

            if (cpu) {
                console.log(`Found: ${update.title}`);
                console.log(`  Current values: ${cpu.singleCorePerformance} / ${cpu.multiThreadPerformance}`);
                console.log(`  Name field: "${cpu.name}"`);

                // Update with correct values AND fix the name field
                const result = await collection.updateOne(
                    { _id: cpu._id },
                    {
                        $set: {
                            name: update.name,
                            singleCorePerformance: update.singleCore,
                            multiThreadPerformance: update.multiCore,
                            updatedAt: new Date()
                        }
                    }
                );

                if (result.modifiedCount > 0) {
                    console.log(`  ✅ Updated to: ${update.singleCore} / ${update.multiCore}\\n`);
                } else {
                    console.log(`  ⚠️  No changes made\\n`);
                }
            } else {
                console.log(`❌ Not found: ${update.title}\\n`);
            }
        }

        console.log('✅ Done!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

fixUndefinedNameCpus();
