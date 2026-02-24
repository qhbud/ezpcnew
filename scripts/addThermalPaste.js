const { connectToDatabase, getDatabase } = require('../config/database');

async function addThermalPaste() {
    try {
        await connectToDatabase();
        const db = getDatabase();
        const collection = db.collection('addons');

        const thermalPaste = {
            name: 'ARCTIC MX-6 Thermal Paste 4g',
            title: 'ARCTIC MX-6 Thermal Paste 4g',
            manufacturer: 'ARCTIC',
            brand: 'ARCTIC',
            category: 'Thermal Paste',
            type: 'Thermal Paste',
            thermalSpecs: {
                type: 'Paste',
                conductivity: 7.5,
                viscosity: 'Medium',
                amount: '4g',
                applicationType: 'Syringe',
                cureTime: 0,
                operatingTemp: {
                    min: -50,
                    max: 180
                }
            },
            specifications: {
                color: ['Gray'],
                weight: 4,
                warranty: 0,
                hasRGB: false
            },
            features: [
                'Ultra-High Thermal Conductivity 7.5 W/mK',
                'Non-Electrically Conductive',
                'Long Durability',
                '4g Syringe Applicator',
                'Compatible with CPU, GPU, Consoles, Laptops'
            ],
            price: 8.99,
            basePrice: 8.99,
            currentPrice: 8.99,
            isOnSale: false,
            imageUrl: 'https://m.media-amazon.com/images/I/61YGcM8Y9YL._AC_SL1500_.jpg',
            sourceUrl: 'https://www.amazon.com/ARCTIC-ACTCP00080A-MX-6-4-g/dp/B09VDL3CW6/',
            productUrl: 'https://www.amazon.com/ARCTIC-ACTCP00080A-MX-6-4-g/dp/B09VDL3CW6/',
            source: 'Amazon',
            createdAt: new Date(),
            updatedAt: new Date(),
            priceHistory: [{
                price: 8.99,
                date: new Date(),
                source: 'https://www.amazon.com/ARCTIC-ACTCP00080A-MX-6-4-g/dp/B09VDL3CW6/'
            }]
        };

        const existing = await collection.findOne({
            $or: [
                { name: thermalPaste.name },
                { sourceUrl: thermalPaste.sourceUrl }
            ]
        });

        if (existing) {
            console.log('Thermal paste already exists in database:', existing.name);
        } else {
            const result = await collection.insertOne(thermalPaste);
            console.log(`✅ Added: ${thermalPaste.name} - $${thermalPaste.price} (ID: ${result.insertedId})`);
        }

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

addThermalPaste();
