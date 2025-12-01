const { MongoClient } = require('mongodb');
require('dotenv').config();

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/pcbuilder';

async function verifyComponents() {
    const client = new MongoClient(uri);
    await client.connect();
    const db = client.db('pcbuilder');

    const componentsToCheck = [
        { type: 'gpus', name: 'Asus TUF Gaming NVIDIA GeForce RTX 4090 OC Edition Gaming Graphics Card (24GB GDDR6X, PCIe 4.0, HDMI 2.1a, DisplayPort 1.4a, Dual Ball Bearing Axial Fans)', asin: 'B0BHD9TS9Q' },
        { type: 'cpus', name: 'Intel® Core™ i9-14900K Desktop Processor', asin: 'B0CGJDKLB8' },
        { type: 'motherboards', name: 'ASUS ROG MAXIMUS Z790 HERO Intel Z790 LGA 1700 ATX', asin: 'B0BH95RF4R' },
        { type: 'rams', name: 'CORSAIR Vengeance RGB DDR5 RAM 32GB (2x16GB) 6000MHz CL36-44-44-96 1.4V AMD Expo & Intel XMP Desktop Computer Memory - White (CMH32GX5M2E6000Z36W)', asin: 'B0DPJ8DNB3' },
        { type: 'psus', name: 'CORSAIR RM850x ATX 3.1 PCIe 5.1 Ready Fully Modular 850W Power Supply – Low-Noise, Cybenetics Gold Efficiency, Native 12V-2x6 Connector – Black', asin: 'B0FLFGG1CC' },
        { type: 'cases', name: 'NZXT H7 Flow RGB - Compact ATX Mid-Tower PC Gaming Case – High Airflow Perforated Front Panel – Tempered Glass Side Panel – 3 x F140 RGB Core Fans Included – 360mm Radiator Support – White', asin: 'B0BQSQNDX4' },
        { type: 'coolers', name: 'Noctua NM-AMB12, Offset AMD AM5 Mounting Bars for Improved Cooling Performance (Silver)', asin: 'B0C3RJ9938' },
        { type: 'storages', name: 'SanDisk 2TB Extreme Portable SSD - Up to 1050MB/s, USB-C, USB 3.2 Gen 2, IP65 Water and Dust Resistance, Updated Firmware - External Solid State Drive - SDSSDE61-2T00-G25', asin: 'B08HN37XC1' }
    ];

    console.log('\n🔍 Verifying each component is not in database...\n');

    let newCount = 0;
    let duplicateCount = 0;

    for (const component of componentsToCheck) {
        const collections = await db.listCollections({ name: new RegExp('^' + component.type) }).toArray();
        let found = false;

        for (const collection of collections) {
            const result = await db.collection(collection.name).findOne({
                $or: [
                    { name: component.name },
                    { sourceUrl: { $regex: component.asin } }
                ]
            });

            if (result) {
                found = true;
                duplicateCount++;
                console.log(`❌ DUPLICATE FOUND: ${component.type.toUpperCase()}`);
                console.log(`   Name: ${component.name.substring(0, 60)}...`);
                console.log(`   ASIN: ${component.asin}`);
                console.log(`   Collection: ${collection.name}`);
                console.log();
                break;
            }
        }

        if (!found) {
            newCount++;
            console.log(`✅ NEW: ${component.type.toUpperCase()}`);
            console.log(`   ${component.name.substring(0, 70)}...`);
            console.log();
        }
    }

    console.log('='.repeat(60));
    console.log(`📊 VERIFICATION SUMMARY:`);
    console.log(`   ✅ New components: ${newCount}`);
    console.log(`   ❌ Duplicates: ${duplicateCount}`);
    console.log(`   📦 Total checked: ${componentsToCheck.length}`);
    console.log('='.repeat(60));

    await client.close();
}

verifyComponents().catch(console.error);
