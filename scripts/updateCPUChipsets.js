const { connectToDatabase, getDatabase } = require('../config/database');

// Compatible chipsets for each CPU with BIOS update information
const cpuChipsets = {
    // AMD Ryzen 5000 Series (AM4) - B450/X470 require BIOS update
    'AMD Ryzen 5 5600': {
        chipsets: ['B550', 'X570', 'A520', 'B450', 'X470'],
        biosUpdateRequired: ['B450', 'X470']
    },
    'AMD Ryzen 5 5600X': {
        chipsets: ['B550', 'X570', 'A520', 'B450', 'X470'],
        biosUpdateRequired: ['B450', 'X470']
    },
    'AMD Ryzen 7 5700X': {
        chipsets: ['B550', 'X570', 'A520', 'B450', 'X470'],
        biosUpdateRequired: ['B450', 'X470']
    },
    'AMD Ryzen 7 5800X': {
        chipsets: ['B550', 'X570', 'A520', 'B450', 'X470'],
        biosUpdateRequired: ['B450', 'X470']
    },
    'AMD Ryzen 7 5800X3D': {
        chipsets: ['B550', 'X570', 'A520', 'B450', 'X470'],
        biosUpdateRequired: ['B450', 'X470']
    },
    'AMD Ryzen 9 5900X': {
        chipsets: ['B550', 'X570', 'A520', 'B450', 'X470'],
        biosUpdateRequired: ['B450', 'X470']
    },
    'AMD Ryzen 9 5950X': {
        chipsets: ['B550', 'X570', 'A520', 'B450', 'X470'],
        biosUpdateRequired: ['B450', 'X470']
    },

    // AMD Ryzen 7000 Series (AM5)
    'AMD Ryzen 5 7600': {
        chipsets: ['A620', 'B650', 'B650E', 'X670', 'X670E'],
        biosUpdateRequired: []
    },
    'AMD Ryzen 7 7700X': {
        chipsets: ['A620', 'B650', 'B650E', 'X670', 'X670E'],
        biosUpdateRequired: []
    },
    'AMD Ryzen 7 7800X3D': {
        chipsets: ['A620', 'B650', 'B650E', 'X670', 'X670E'],
        biosUpdateRequired: []
    },
    'AMD Ryzen 9 7900X': {
        chipsets: ['A620', 'B650', 'B650E', 'X670', 'X670E'],
        biosUpdateRequired: []
    },
    'AMD Ryzen 9 7950X': {
        chipsets: ['A620', 'B650', 'B650E', 'X670', 'X670E'],
        biosUpdateRequired: []
    },
    'AMD Ryzen 9 7950X3D': {
        chipsets: ['A620', 'B650', 'B650E', 'X670', 'X670E'],
        biosUpdateRequired: []
    },
    'AMD Threadripper 7980X': {
        chipsets: ['TRX50'],
        biosUpdateRequired: []
    },

    // Intel 12th Gen (Alder Lake, LGA 1700)
    'Intel Core i5-12600K': {
        chipsets: ['H610', 'B660', 'H670', 'Z690', 'B760', 'Z790'],
        biosUpdateRequired: []
    },
    'Intel Core i7-12700K': {
        chipsets: ['H610', 'B660', 'H670', 'Z690', 'B760', 'Z790'],
        biosUpdateRequired: []
    },
    'Intel Core i9-12900K': {
        chipsets: ['H610', 'B660', 'H670', 'Z690', 'B760', 'Z790'],
        biosUpdateRequired: []
    },

    // Intel 13th Gen (Raptor Lake, LGA 1700)
    'Intel Core i3-13100F': {
        chipsets: ['H610', 'B660', 'H670', 'Z690', 'B760', 'Z790'],
        biosUpdateRequired: []
    },
    'Intel Core i5-13600K': {
        chipsets: ['H610', 'B660', 'H670', 'Z690', 'B760', 'Z790'],
        biosUpdateRequired: []
    },
    'Intel Core i5-13400F': {
        chipsets: ['H610', 'B660', 'H670', 'Z690', 'B760', 'Z790'],
        biosUpdateRequired: []
    },
    'Intel Core i7-13700K': {
        chipsets: ['H610', 'B660', 'H670', 'Z690', 'B760', 'Z790'],
        biosUpdateRequired: []
    },
    'Intel Core i7-13700KF': {
        chipsets: ['H610', 'B660', 'H670', 'Z690', 'B760', 'Z790'],
        biosUpdateRequired: []
    },
    'Intel Core i9-13900F': {
        chipsets: ['H610', 'B660', 'H670', 'Z690', 'B760', 'Z790'],
        biosUpdateRequired: []
    },
    'Intel Core i9-13900K': {
        chipsets: ['H610', 'B660', 'H670', 'Z690', 'B760', 'Z790'],
        biosUpdateRequired: []
    },
    'Intel Core i9-13900KF': {
        chipsets: ['H610', 'B660', 'H670', 'Z690', 'B760', 'Z790'],
        biosUpdateRequired: []
    }
};

async function updateCpuChipsets() {
    try {
        console.log('\n=== Updating CPU Compatible Chipsets ===\n');

        await connectToDatabase();
        const db = getDatabase();

        let totalProcessed = 0;
        let totalUpdated = 0;
        let totalNotFound = 0;

        // Get all CPU collections
        const collections = await db.listCollections().toArray();
        const cpuCollections = collections.filter(c => c.name.startsWith('cpus') || c.name === 'cpus').map(c => c.name);

        console.log(`Found CPU collections: ${cpuCollections.join(', ')}\n`);

        for (const collectionName of cpuCollections) {
            console.log(`\nProcessing collection: ${collectionName}`);
            const cpus = await db.collection(collectionName).find({}).toArray();
            console.log(`Found ${cpus.length} CPUs in ${collectionName}\n`);

        for (const cpu of cpus) {
            totalProcessed++;
            const cpuName = cpu.name || cpu.title || 'Unknown';

            // Try to find matching chipset data
            let chipsetData = null;

            // Try exact match first
            for (const [key, data] of Object.entries(cpuChipsets)) {
                if (cpuName.includes(key) || key.includes(cpuName.replace(' Desktop Processor', ''))) {
                    chipsetData = data;
                    break;
                }
            }

            if (chipsetData) {
                const updateData = {
                    supportedChipsets: chipsetData.chipsets,
                    biosUpdateRequired: chipsetData.biosUpdateRequired,
                    updatedAt: new Date()
                };

                await db.collection(collectionName).updateOne(
                    { _id: cpu._id },
                    { $set: updateData }
                );

                console.log(`✅ ${cpuName}`);
                console.log(`   Chipsets: ${chipsetData.chipsets.join(', ')}`);
                if (chipsetData.biosUpdateRequired.length > 0) {
                    console.log(`   ⚠️  BIOS Update Required: ${chipsetData.biosUpdateRequired.join(', ')}`);
                }
                console.log('');
                totalUpdated++;
            } else {
                console.log(`⚠️  ${cpuName} - No chipset data found`);
                console.log('');
                totalNotFound++;
            }
        }
        }

        console.log('\n' + '='.repeat(70));
        console.log('SUMMARY');
        console.log('='.repeat(70));
        console.log(`Total Processed: ${totalProcessed}`);
        console.log(`Chipsets Updated: ${totalUpdated}`);
        console.log(`No Data Found: ${totalNotFound}`);
        console.log('='.repeat(70));

        console.log('\n✅ CPU chipsets update complete!\n');

        process.exit(0);

    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

updateCpuChipsets();
