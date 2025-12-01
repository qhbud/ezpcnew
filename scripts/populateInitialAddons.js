const { connectToDatabase, getDatabase } = require('../config/database');
const Logger = require('./utils/logger');

async function populateInitialAddons() {
    try {
        Logger.info('🚀 Starting initial add-ons population...');

        await connectToDatabase();
        const db = getDatabase();
        const collection = db.collection('addons');

        const initialAddons = [
            {
                name: 'Windows 11 Pro License & Installation USB',
                title: 'Windows 11 Pro License & Installation USB',
                manufacturer: 'Microsoft',
                brand: 'Windows',
                category: 'Software',
                type: 'Operating System',
                specifications: {
                    color: ['Black'],
                    warranty: 0
                },
                features: ['Windows 11 Pro License', 'Installation USB', 'Professional Features'],
                price: 39.99,
                basePrice: 39.99,
                currentPrice: 39.99,
                imageUrl: 'https://m.media-amazon.com/images/I/61J0EB8pxnL._AC_SL1500_.jpg',
                sourceUrl: 'https://www.amazon.com/Compatible-professional-Restore-Included-Install/dp/B0FCCNPC4T',
                source: 'Amazon',
                createdAt: new Date(),
                updatedAt: new Date(),
                priceHistory: [{
                    price: 39.99,
                    date: new Date(),
                    source: 'https://www.amazon.com/Compatible-professional-Restore-Included-Install/dp/B0FCCNPC4T'
                }]
            },
            {
                name: 'Logitech G502 HERO High Performance Wired Gaming Mouse',
                title: 'Logitech G502 HERO High Performance Wired Gaming Mouse',
                manufacturer: 'Logitech',
                brand: 'G502 HERO',
                category: 'Peripherals',
                type: 'Gaming Mouse',
                specifications: {
                    color: ['Black'],
                    weight: 121,
                    warranty: 2,
                    hasRGB: true
                },
                features: ['HERO 25K Sensor', '11 Programmable Buttons', 'Adjustable Weight', 'RGB Lighting', 'Wired'],
                price: 49.99,
                basePrice: 49.99,
                currentPrice: 49.99,
                imageUrl: 'https://m.media-amazon.com/images/I/61mpMH5TzkL._AC_SL1500_.jpg',
                sourceUrl: 'https://www.amazon.com/Logitech-G502-Performance-Gaming-Mouse/dp/B07GBZ4Q68',
                source: 'Amazon',
                createdAt: new Date(),
                updatedAt: new Date(),
                priceHistory: [{
                    price: 49.99,
                    date: new Date(),
                    source: 'https://www.amazon.com/Logitech-G502-Performance-Gaming-Mouse/dp/B07GBZ4Q68'
                }]
            },
            {
                name: 'Logitech G413 SE Full-Size Mechanical Gaming Keyboard',
                title: 'Logitech G413 SE Full-Size Mechanical Gaming Keyboard',
                manufacturer: 'Logitech',
                brand: 'G413 SE',
                category: 'Peripherals',
                type: 'Gaming Keyboard',
                specifications: {
                    color: ['White'],
                    warranty: 2,
                    hasRGB: false
                },
                features: ['Mechanical Keys', 'Full-Size', 'Anti-Ghosting', 'White LED Backlighting', 'Wired'],
                price: 54.99,
                basePrice: 54.99,
                currentPrice: 54.99,
                imageUrl: 'https://m.media-amazon.com/images/I/71NlMvUT5eL._AC_SL1500_.jpg',
                sourceUrl: 'https://www.amazon.com/Logitech-Full-Size-Mechanical-Anti-Ghosting-Keys-White/dp/B08Z6X4NK3',
                source: 'Amazon',
                createdAt: new Date(),
                updatedAt: new Date(),
                priceHistory: [{
                    price: 54.99,
                    date: new Date(),
                    source: 'https://www.amazon.com/Logitech-Full-Size-Mechanical-Anti-Ghosting-Keys-White/dp/B08Z6X4NK3'
                }]
            },
            {
                name: 'KTC 24.5 inch Gaming Monitor 400Hz 1080p',
                title: 'KTC 24.5 inch Gaming Monitor 400Hz 1080p',
                manufacturer: 'KTC',
                brand: 'KTC',
                category: 'Monitor',
                type: 'Gaming Monitor',
                specifications: {
                    color: ['Silver', 'Gray'],
                    dimensions: {
                        length: 553,
                        width: 200,
                        height: 415
                    },
                    warranty: 1
                },
                features: ['24.5 inch', '1920x1080 FHD', '400Hz Refresh Rate', 'Height Adjustable', 'VESA Mount'],
                price: 299.99,
                basePrice: 299.99,
                currentPrice: 299.99,
                imageUrl: 'https://m.media-amazon.com/images/I/71vqYL7NVQL._AC_SL1500_.jpg',
                sourceUrl: 'https://www.amazon.com/KTC-Monitor-Adjustability-Silver-Gray-Monitors/dp/B0DKFSV2FT',
                source: 'Amazon',
                createdAt: new Date(),
                updatedAt: new Date(),
                priceHistory: [{
                    price: 299.99,
                    date: new Date(),
                    source: 'https://www.amazon.com/KTC-Monitor-Adjustability-Silver-Gray-Monitors/dp/B0DKFSV2FT'
                }]
            },
            {
                name: 'Acer Nitro 27 Inch 180Hz 1440p Gaming Monitor',
                title: 'Acer Nitro 27 Inch 180Hz 1440p Gaming Monitor',
                manufacturer: 'Acer',
                brand: 'Nitro',
                category: 'Monitor',
                type: 'Gaming Monitor',
                specifications: {
                    color: ['Black'],
                    warranty: 3
                },
                features: ['27 inch', '2560x1440 QHD', '180Hz Refresh Rate', 'FreeSync Premium', 'VESA Mount'],
                price: 199.99,
                basePrice: 199.99,
                currentPrice: 199.99,
                imageUrl: 'https://m.media-amazon.com/images/I/81FTs2bpbJL._AC_SL1500_.jpg',
                sourceUrl: 'https://www.amazon.com/acer-Monitor-FreeSync-Refresh-N3bmiipx/dp/B0D8LH2VSP',
                source: 'Amazon',
                createdAt: new Date(),
                updatedAt: new Date(),
                priceHistory: [{
                    price: 199.99,
                    date: new Date(),
                    source: 'https://www.amazon.com/acer-Monitor-FreeSync-Refresh-N3bmiipx/dp/B0D8LH2VSP'
                }]
            },
            {
                name: 'KTC 24.5" Gaming Monitor FHD 1080P 180Hz',
                title: 'KTC 24.5" Gaming Monitor FHD 1080P 180Hz',
                manufacturer: 'KTC',
                brand: 'KTC',
                category: 'Monitor',
                type: 'Gaming Monitor',
                specifications: {
                    color: ['Black'],
                    warranty: 1
                },
                features: ['24.5 inch', '1920x1080 FHD', '180Hz Refresh Rate', 'Low Latency', 'VESA Mount'],
                price: 129.99,
                basePrice: 129.99,
                currentPrice: 129.99,
                imageUrl: 'https://m.media-amazon.com/images/I/71vqYL7NVQL._AC_SL1500_.jpg',
                sourceUrl: 'https://www.amazon.com/dp/B0D7BQZZCN',
                source: 'Amazon',
                createdAt: new Date(),
                updatedAt: new Date(),
                priceHistory: [{
                    price: 129.99,
                    date: new Date(),
                    source: 'https://www.amazon.com/dp/B0D7BQZZCN'
                }]
            },
            {
                name: 'MSI QD-OLED Computer Monitor 32-inch 4K 240Hz',
                title: 'MSI QD-OLED Computer Monitor 32-inch 4K 240Hz',
                manufacturer: 'MSI',
                brand: 'QD-OLED',
                category: 'Monitor',
                type: 'Gaming Monitor',
                specifications: {
                    color: ['Black'],
                    warranty: 3,
                    hasRGB: false
                },
                features: ['32 inch', '3840x2160 4K UHD', '240Hz Refresh Rate', 'QD-OLED Panel', 'HDR', 'VESA Mount'],
                price: 899.99,
                basePrice: 899.99,
                currentPrice: 899.99,
                imageUrl: 'https://m.media-amazon.com/images/I/71bL8vL8zyL._AC_SL1500_.jpg',
                sourceUrl: 'https://www.amazon.com/dp/B0DPXYZYPT',
                source: 'Amazon',
                createdAt: new Date(),
                updatedAt: new Date(),
                priceHistory: [{
                    price: 899.99,
                    date: new Date(),
                    source: 'https://www.amazon.com/dp/B0DPXYZYPT'
                }]
            }
        ];

        let addedCount = 0;
        let duplicateCount = 0;

        for (const addon of initialAddons) {
            // Check for duplicates
            const existing = await collection.findOne({
                $or: [
                    { name: addon.name },
                    { sourceUrl: addon.sourceUrl }
                ]
            });

            if (existing) {
                Logger.info(`   Duplicate: ${addon.name}`);
                duplicateCount++;
            } else {
                await collection.insertOne(addon);
                Logger.success(`   Added: ${addon.name} - $${addon.price}`);
                addedCount++;
            }
        }

        Logger.info('\n' + '='.repeat(80));
        Logger.info('📊 INITIAL ADD-ONS POPULATION COMPLETE');
        Logger.info('='.repeat(80));
        Logger.success(`✅ New add-ons added: ${addedCount}`);
        Logger.info(`   Duplicates skipped: ${duplicateCount}`);
        Logger.info(`   Total processed: ${initialAddons.length}`);

        const finalCount = await collection.countDocuments();
        Logger.success(`📦 Total add-ons in database: ${finalCount}`);
        Logger.info('='.repeat(80));

    } catch (error) {
        Logger.error('💥 Fatal error during add-ons population:', error);
        throw error;
    }
}

// Run the population if this script is executed directly
if (require.main === module) {
    populateInitialAddons()
        .then(() => {
            Logger.success('\n🎉 Add-ons population completed successfully!');
            process.exit(0);
        })
        .catch(error => {
            Logger.error('\n💥 Add-ons population failed:', error);
            process.exit(1);
        });
}

module.exports = { populateInitialAddons };
