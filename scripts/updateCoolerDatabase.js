const { connectToDatabase, getDatabase } = require('../config/database');

async function updateCoolerDatabase() {
    try {
        await connectToDatabase();
        const db = getDatabase();
        const coolersCollection = db.collection('coolers');

        console.log('🔧 Starting cooler database update...\n');

        // ========== REMOVE COOLERS ==========
        console.log('🗑️  Removing specified coolers...');

        const coolersToRemove = [
            'ARCTIC Freezer 4U-M (Rev. 2)',
            'ARCTIC Freezer 4U-M Ampere'
        ];

        for (const coolerName of coolersToRemove) {
            const result = await coolersCollection.deleteMany({
                $or: [
                    { name: { $regex: coolerName, $options: 'i' } },
                    { title: { $regex: coolerName, $options: 'i' } }
                ]
            });
            console.log(`   Removed "${coolerName}": ${result.deletedCount} documents`);
        }

        // ========== ADD NEW COOLERS ==========
        console.log('\n➕ Adding new coolers...');

        const newCoolers = [
            {
                name: 'Thermalright AXP-90 X53 Low Profile CPU Air Cooler with Quite 90mm TL-9015 PWM Fan, 4 Heat Pipes, 53mm Height, for AMD AM4/Intel LGA 1150/1151/1155/1851/1200 (AXP-90 X53)',
                title: 'Thermalright AXP-90 X53 Low Profile CPU Air Cooler with Quite 90mm TL-9015 PWM Fan, 4 Heat Pipes, 53mm Height, for AMD AM4/Intel LGA 1150/1151/1155/1851/1200 (AXP-90 X53)',
                manufacturer: 'Thermalright',
                coolerType: 'Air',
                price: 20.90,
                currentPrice: 20.90,
                basePrice: 20.90,
                isOnSale: false,
                height: '53mm',
                fanSize: '90mm',
                socketCompatibility: ['AM4', 'LGA1150', 'LGA1151', 'LGA1155', 'LGA1851', 'LGA1200'],
                specifications: {
                    coolerType: 'Air',
                    isAIO: false,
                    rgb: false,
                    socketCompatibility: ['AM4', 'LGA1150', 'LGA1151', 'LGA1155', 'LGA1851', 'LGA1200'],
                    fanConfiguration: '90mm PWM Fan'
                },
                performanceTier: 'Entry-Level',
                category: 'cooler',
                createdAt: new Date(),
                updatedAt: new Date()
            },
            {
                name: 'NZXT Kraken M22 120mm - All-in-One RGB CPU Liquid Cooler - Infinity Mirror Design - Powered by CAM',
                title: 'NZXT Kraken M22 120mm - All-in-One RGB CPU Liquid Cooler - Infinity Mirror Design - Powered by CAM',
                manufacturer: 'NZXT',
                coolerType: 'AIO Liquid',
                radiatorSize: '120mm',
                price: 89.99,
                currentPrice: 89.99,
                basePrice: 94.99,
                salePrice: 89.99,
                isOnSale: true,
                socketCompatibility: ['AM4', 'AM5', 'LGA1851', 'LGA1700'],
                specifications: {
                    coolerType: 'AIO Liquid',
                    isAIO: true,
                    rgb: true,
                    socketCompatibility: ['AM4', 'AM5', 'LGA1851', 'LGA1700'],
                    radiatorSize: '120mm',
                    fanConfiguration: '120mm RGB Fan'
                },
                performanceTier: 'Mainstream',
                category: 'cooler',
                createdAt: new Date(),
                updatedAt: new Date()
            },
            {
                name: 'Scythe Kotetsu Mark II TUFF Gaming Alliance CPU Processor Cooler',
                title: 'Scythe Kotetsu Mark II TUFF Gaming Alliance CPU Processor Cooler',
                manufacturer: 'Scythe',
                coolerType: 'Air',
                price: 156.03,
                currentPrice: 156.03,
                basePrice: 156.03,
                isOnSale: false,
                socketCompatibility: ['AM4', 'AM5', 'LGA1851', 'LGA1700'],
                specifications: {
                    coolerType: 'Air',
                    isAIO: false,
                    rgb: false,
                    socketCompatibility: ['AM4', 'AM5', 'LGA1851', 'LGA1700']
                },
                performanceTier: 'High-End',
                category: 'cooler',
                createdAt: new Date(),
                updatedAt: new Date()
            },
            {
                name: 'SilverStone Technology XE360-TR5 360mm All-in-One Liquid Cooler for AMD TR5 / SP6, SST-XE360-TR5',
                title: 'SilverStone Technology XE360-TR5 360mm All-in-One Liquid Cooler for AMD TR5 / SP6, SST-XE360-TR5',
                manufacturer: 'SilverStone',
                coolerType: 'AIO Liquid',
                radiatorSize: '360mm',
                price: 422.99,
                currentPrice: 422.99,
                basePrice: 422.99,
                isOnSale: false,
                socketCompatibility: ['TR5', 'SP6'],
                specifications: {
                    coolerType: 'AIO Liquid',
                    isAIO: true,
                    rgb: false,
                    socketCompatibility: ['TR5', 'SP6'],
                    radiatorSize: '360mm'
                },
                performanceTier: 'High-End',
                category: 'cooler',
                createdAt: new Date(),
                updatedAt: new Date()
            },
            {
                name: 'Cooler Master MasterLiquid ML240R RGB 120mm Liquid CPU Cooler w/Controller',
                title: 'Cooler Master MasterLiquid ML240R RGB 120mm Liquid CPU Cooler w/Controller',
                manufacturer: 'Cooler Master',
                coolerType: 'AIO Liquid',
                radiatorSize: '240mm',
                price: 139.00,
                currentPrice: 139.00,
                basePrice: 139.00,
                isOnSale: false,
                socketCompatibility: ['AM4', 'AM5', 'LGA1851', 'LGA1700'],
                specifications: {
                    coolerType: 'AIO Liquid',
                    isAIO: true,
                    rgb: true,
                    socketCompatibility: ['AM4', 'AM5', 'LGA1851', 'LGA1700'],
                    radiatorSize: '240mm'
                },
                performanceTier: 'Performance',
                category: 'cooler',
                createdAt: new Date(),
                updatedAt: new Date()
            }
        ];

        for (const cooler of newCoolers) {
            // Check if cooler already exists
            const existing = await coolersCollection.findOne({
                $or: [
                    { name: cooler.name },
                    { title: cooler.title }
                ]
            });

            if (existing) {
                console.log(`   ⚠️  Cooler already exists: ${cooler.manufacturer} ${cooler.coolerType}`);
            } else {
                await coolersCollection.insertOne(cooler);
                console.log(`   ✅ Added: ${cooler.manufacturer} ${cooler.coolerType} - $${cooler.currentPrice}`);
            }
        }

        // ========== UPDATE CORSAIR iCUE LINK H170i RGB ==========
        console.log('\n🔄 Updating CORSAIR iCUE Link H170i RGB compatibility...');

        const corsairResult = await coolersCollection.updateMany(
            {
                $or: [
                    { name: { $regex: 'CORSAIR iCUE Link H170i RGB', $options: 'i' } },
                    { title: { $regex: 'CORSAIR iCUE Link H170i RGB', $options: 'i' } }
                ]
            },
            {
                $set: {
                    socketCompatibility: ['LGA1700', 'AM5'],
                    'specifications.socketCompatibility': ['LGA1700', 'AM5'],
                    updatedAt: new Date()
                }
            }
        );
        console.log(`   Updated ${corsairResult.modifiedCount} CORSAIR iCUE Link H170i RGB cooler(s) to only support LGA1700 and AM5`);

        // ========== UPDATE ALL OTHER COOLERS WITH DEFAULT COMPATIBILITY ==========
        console.log('\n🔄 Updating default socket compatibility for all other coolers...');

        const defaultSockets = ['AM4', 'AM5', 'LGA1851', 'LGA1700'];

        // Update coolers that don't have socket compatibility set, excluding the CORSAIR H170i
        const defaultResult = await coolersCollection.updateMany(
            {
                $and: [
                    {
                        $or: [
                            { socketCompatibility: { $exists: false } },
                            { socketCompatibility: [] },
                            { socketCompatibility: null }
                        ]
                    },
                    {
                        name: { $not: { $regex: 'CORSAIR iCUE Link H170i RGB', $options: 'i' } }
                    },
                    {
                        title: { $not: { $regex: 'CORSAIR iCUE Link H170i RGB', $options: 'i' } }
                    }
                ]
            },
            {
                $set: {
                    socketCompatibility: defaultSockets,
                    'specifications.socketCompatibility': defaultSockets,
                    updatedAt: new Date()
                }
            }
        );
        console.log(`   Updated ${defaultResult.modifiedCount} coolers with default socket compatibility (AM4, AM5, LGA1851, LGA1700)`);

        // ========== SUMMARY ==========
        console.log('\n📊 Database Update Summary:');
        const totalCoolers = await coolersCollection.countDocuments();
        console.log(`   Total coolers in database: ${totalCoolers}`);

        const coolersWithSockets = await coolersCollection.countDocuments({
            socketCompatibility: { $exists: true, $ne: [], $ne: null }
        });
        console.log(`   Coolers with socket compatibility defined: ${coolersWithSockets}`);

        console.log('\n✅ Cooler database update complete!');

    } catch (error) {
        console.error('❌ Error updating cooler database:', error);
        throw error;
    } finally {
        process.exit(0);
    }
}

// Run the update
updateCoolerDatabase();
