const mongoose = require('mongoose');
require('dotenv').config();

// Missing GPU products - at least 1 per benchmarked chipset that has no products
const missingGpus = [
    // RTX 5090 - Score: 205.5
    {
        name: 'ASUS TUF Gaming GeForce RTX 5090 32GB GDDR7 OC Edition Gaming Graphics Card (PCIe 5.0, HDMI/DP 2.1, 3.6-Slot, Military-Grade Components, axial-tech Fans, Vapor Chamber)',
        collection: 'gpus_rtx_5090',
        gpuModel: 'RTX 5090',
        manufacturer: 'NVIDIA',
        tier: 'flagship',
        memory: { size: 32, type: 'GDDR7' },
        wattage: 575,
        releaseYear: 2025,
        sourceUrl: 'https://www.amazon.com/dp/B0DS2X13PH?tag=qhezpc-20',
        imageUrl: 'https://m.media-amazon.com/images/I/81fxhGS-YhL._AC_SL1500_.jpg',
        searchTerms: ['RTX 5090', 'GeForce RTX 5090']
    },
    // RTX 4090 - Score: 203.3
    {
        name: 'MSI Gaming GeForce RTX 4090 24GB GDRR6X 384-Bit HDMI/DP Nvlink Tri-Frozr 3 Ada Lovelace Architecture OC Graphics Card (RTX 4090 Gaming X Trio 24G)',
        collection: 'gpus_rtx_4090',
        gpuModel: 'RTX 4090',
        manufacturer: 'NVIDIA',
        tier: 'flagship',
        memory: { size: 24, type: 'GDDR6X' },
        wattage: 450,
        releaseYear: 2022,
        sourceUrl: 'https://www.amazon.com/dp/B0BG94PS2F?tag=qhezpc-20',
        imageUrl: 'https://m.media-amazon.com/images/I/71XV41gl7jL._AC_SL1500_.jpg',
        searchTerms: ['RTX 4090', 'GeForce RTX 4090']
    },
    // RTX 4080 Super - Score: 185.6
    {
        name: 'MSI Gaming GeForce RTX 4080 Super 16G Gaming X Slim Graphics Card (NVIDIA RTX 4080 Super, 256-Bit, 16GB GDRR6X 23 Gbps, HDMI/DP, Ada Lovelace Architecture)',
        collection: 'gpus_rtx_4080_super',
        gpuModel: 'RTX 4080 Super',
        manufacturer: 'NVIDIA',
        tier: 'high-end',
        memory: { size: 16, type: 'GDDR6X' },
        wattage: 320,
        releaseYear: 2024,
        sourceUrl: 'https://www.amazon.com/dp/B0CSZYZQ86?tag=qhezpc-20',
        imageUrl: 'https://m.media-amazon.com/images/I/71RBb0RQVOL._AC_SL1500_.jpg',
        searchTerms: ['RTX 4080 Super', 'GeForce RTX 4080 Super']
    },
    // RTX 5080 - Score: 172.6
    {
        name: 'GIGABYTE GeForce RTX 5080 Gaming OC 16G Graphics Card, WINDFORCE Cooling System, 16GB 256-bit GDDR7, GV-N5080GAMING OC-16GD Video Card',
        collection: 'gpus_rtx_5080',
        gpuModel: 'RTX 5080',
        manufacturer: 'NVIDIA',
        tier: 'high-end',
        memory: { size: 16, type: 'GDDR7' },
        wattage: 360,
        releaseYear: 2025,
        sourceUrl: 'https://www.amazon.com/dp/B0DS2R6948?tag=qhezpc-20',
        imageUrl: 'https://m.media-amazon.com/images/I/81LkRpum-HL._AC_SL1500_.jpg',
        searchTerms: ['RTX 5080', 'GeForce RTX 5080']
    },
    // RTX 5070 Ti - Score: 171.5
    {
        name: 'MSI Gaming RTX 5070 Ti 16G Ventus 3X OC Graphics Card (16GB GDDR7, 256-bit, Extreme Performance: 2497 MHz, DisplayPort x3 2.1a, HDMI 2.1b, NVIDIA Blackwell Architecture)',
        collection: 'gpus_rtx_5070_ti',
        gpuModel: 'RTX 5070 Ti',
        manufacturer: 'NVIDIA',
        tier: 'high-end',
        memory: { size: 16, type: 'GDDR7' },
        wattage: 300,
        releaseYear: 2025,
        sourceUrl: 'https://www.amazon.com/dp/B0DWHHSZH1?tag=qhezpc-20',
        imageUrl: 'https://m.media-amazon.com/images/I/71v1+6tEURL._AC_SL1500_.jpg',
        searchTerms: ['RTX 5070 Ti', 'GeForce RTX 5070 Ti']
    },
    // RTX 4070 Ti Super - Score: 166.6
    {
        name: 'GIGABYTE GeForce RTX 4070 Ti Super Gaming OC 16G Graphics Card, 3X WINDFORCE Fans, 16GB 256-bit GDDR6X, GV-N407TSGAMING OC-16GD Video Card',
        collection: 'gpus_rtx_4070_ti_super',
        gpuModel: 'RTX 4070 Ti Super',
        manufacturer: 'NVIDIA',
        tier: 'upper-mid',
        memory: { size: 16, type: 'GDDR6X' },
        wattage: 285,
        releaseYear: 2024,
        sourceUrl: 'https://www.amazon.com/dp/B0CSJVCD3Y?tag=qhezpc-20',
        imageUrl: 'https://m.media-amazon.com/images/I/81W+YNVU4dL._AC_SL1500_.jpg',
        searchTerms: ['RTX 4070 Ti Super', 'GeForce RTX 4070 Ti Super']
    },
    // RTX 4070 Ti - Score: 166.6
    {
        name: 'MSI Gaming GeForce RTX 4070 Ti 12GB GDRR6X 192-Bit HDMI/DP Nvlink Tri-Frozr 3 Ada Lovelace Architecture Graphics Card (RTX 4070 Ti Gaming X Trio 12G)',
        collection: 'gpus_rtx_4070_ti',
        gpuModel: 'RTX 4070 Ti',
        manufacturer: 'NVIDIA',
        tier: 'upper-mid',
        memory: { size: 12, type: 'GDDR6X' },
        wattage: 285,
        releaseYear: 2023,
        sourceUrl: 'https://www.amazon.com/dp/B0BNWBJ8Z6?tag=qhezpc-20',
        imageUrl: 'https://m.media-amazon.com/images/I/71GhGNq-YWL._AC_SL1500_.jpg',
        searchTerms: ['RTX 4070 Ti', 'GeForce RTX 4070 Ti']
    },
    // RTX 5070 - Score: 152.6
    {
        name: 'ASUS TUF Gaming GeForce RTX 5070 12GB GDDR7 OC Edition Gaming Graphics Card (PCIe 5.0, HDMI/DP 2.1, 3.125-slot, Military-Grade Components, axial-tech Fans)',
        collection: 'gpus_rtx_5070',
        gpuModel: 'RTX 5070',
        manufacturer: 'NVIDIA',
        tier: 'upper-mid',
        memory: { size: 12, type: 'GDDR7' },
        wattage: 250,
        releaseYear: 2025,
        sourceUrl: 'https://www.amazon.com/dp/B0DS6S98ZF?tag=qhezpc-20',
        imageUrl: 'https://m.media-amazon.com/images/I/71Y6Vl0xFjL._AC_SL1500_.jpg',
        searchTerms: ['RTX 5070', 'GeForce RTX 5070']
    },
    // RX 7900 GRE - Score: 126.3
    {
        name: 'XFX Radeon RX 7900 GRE Gaming Graphics Card with 16GB GDDR6, AMD RDNA 3 RX-79GMERCB9',
        collection: 'gpus_rx_7900_gre',
        gpuModel: 'RX 7900 GRE',
        manufacturer: 'AMD',
        tier: 'upper-mid',
        memory: { size: 16, type: 'GDDR6' },
        wattage: 150,
        releaseYear: 2024,
        sourceUrl: 'https://www.amazon.com/dp/B0CVNJLHXW?tag=qhezpc-20',
        imageUrl: 'https://m.media-amazon.com/images/I/71eU8X0kURL._AC_SL1500_.jpg',
        searchTerms: ['RX 7900 GRE', 'Radeon RX 7900 GRE']
    },
    // RX 6650 XT - Score: 100
    {
        name: 'PowerColor Hellhound AMD Radeon RX 6650 XT Graphics Card with 8GB GDDR6 Memory',
        collection: 'gpus_rx_6650_xt',
        gpuModel: 'RX 6650 XT',
        manufacturer: 'AMD',
        tier: 'mid',
        memory: { size: 8, type: 'GDDR6' },
        wattage: 180,
        releaseYear: 2022,
        sourceUrl: 'https://www.amazon.com/dp/B09VYHB8XG?tag=qhezpc-20',
        imageUrl: 'https://m.media-amazon.com/images/I/71c4GfkXb3L._AC_SL1500_.jpg',
        searchTerms: ['RX 6650 XT', 'Radeon RX 6650 XT']
    },
    // RX 7600 XT - Score: 64.3
    {
        name: 'Sapphire 11339-04-20G Pulse AMD Radeon RX 7600 XT Gaming Graphics Card with 16GB GDDR6, AMD RDNA 3',
        collection: 'gpus_rx_7600_xt',
        gpuModel: 'RX 7600 XT',
        manufacturer: 'AMD',
        tier: 'mid',
        memory: { size: 16, type: 'GDDR6' },
        wattage: 150,
        releaseYear: 2024,
        sourceUrl: 'https://www.amazon.com/dp/B0CTD21LW1?tag=qhezpc-20',
        imageUrl: 'https://m.media-amazon.com/images/I/71H7wq-HHFL._AC_SL1500_.jpg',
        searchTerms: ['RX 7600 XT', 'Radeon RX 7600 XT']
    },
    // RX 6400 - Score: 45
    {
        name: 'MSI Gaming Radeon RX 6400 64-bit 4GB GDDR6 DP/HDMI PCIe 4 Torx Single Fan FreeSync DirectX 12 VR Ready ITX OC Graphics Card (RX 6400 AERO ITX 4G)',
        collection: 'gpus_rx_6400',
        gpuModel: 'RX 6400',
        manufacturer: 'AMD',
        tier: 'budget',
        memory: { size: 4, type: 'GDDR6' },
        wattage: 53,
        releaseYear: 2022,
        sourceUrl: 'https://www.amazon.com/dp/B09WF47XF4?tag=qhezpc-20',
        imageUrl: 'https://m.media-amazon.com/images/I/61UYlLTaEpL._AC_SL1000_.jpg',
        searchTerms: ['RX 6400', 'Radeon RX 6400']
    }
];

async function populate() {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/pcbuilder');
    const db = mongoose.connection.db;

    const now = new Date();
    let inserted = 0;
    let skipped = 0;

    for (const gpu of missingGpus) {
        const col = db.collection(gpu.collection);

        // Check if a product with this sourceUrl already exists
        const existing = await col.findOne({ sourceUrl: gpu.sourceUrl });
        if (existing) {
            console.log(`  SKIP: ${gpu.gpuModel} - already exists in ${gpu.collection} (${existing.name.substring(0, 50)}...)`);
            skipped++;
            continue;
        }

        const doc = {
            name: gpu.name,
            basePrice: null,
            salePrice: null,
            isOnSale: false,
            currentPrice: null,
            sourceUrl: gpu.sourceUrl,
            imageUrl: gpu.imageUrl,
            source: 'amazon',
            scrapedAt: now,
            gpuModel: gpu.gpuModel,
            manufacturer: gpu.manufacturer,
            tier: gpu.tier,
            searchTerms: gpu.searchTerms,
            lastUpdated: now,
            memory: gpu.memory,
            wattage: gpu.wattage,
            releaseYear: gpu.releaseYear,
            priceHistory: [],
            isAvailable: true,
            priceSource: null,
            lastPriceUpdate: null,
            lastPriceCheck: null,
            price: null,
            priceDetectionMethod: null,
            lastUpdateError: null,
            updateFailed: false,
            updatedAt: now
        };

        await col.insertOne(doc);
        console.log(`  ADD:  ${gpu.gpuModel} -> ${gpu.collection} (${gpu.name.substring(0, 60)}...)`);
        inserted++;
    }

    console.log(`\n=== DONE ===`);
    console.log(`Inserted: ${inserted}`);
    console.log(`Skipped:  ${skipped}`);
    console.log(`Total:    ${missingGpus.length}`);

    // Verify coverage
    console.log('\n--- Verifying benchmark coverage ---');
    const gpuBenchmarks = {
        'RTX 5090': 205.5, 'RTX 5080': 172.6, 'RTX 5070 Ti': 171.5,
        'RTX 5070': 152.6, 'RTX 5060 Ti': 118.9, 'RTX 5060': 103.7,
        'RTX 4090': 203.3, 'RTX 4080 Super': 185.6, 'RTX 4080': 183.6,
        'RTX 4070 Ti Super': 166.6, 'RTX 4070 Super': 149.8, 'RTX 4070 Ti': 166.6,
        'RTX 4070': 133, 'RTX 4060 Ti': 105, 'RTX 4060': 83.9,
        'RTX 3090 Ti': 134.1, 'RTX 3090': 131.85, 'RTX 3080 Ti': 130.05,
        'RTX 3080': 128.175, 'RTX 3070 Ti': 120.975, 'RTX 3070': 117.15,
        'RTX 3060 Ti': 111.15, 'RTX 3060': 90.75, 'RTX 3050': 66.6,
        'RX 7900 XTX': 140.2, 'RX 7900 XT': 131, 'RX 7900 GRE': 126.3,
        'RX 7900': 126.3, 'RX 7800 XT': 107.1, 'RX 7700 XT': 97.6,
        'RX 7600 XT': 64.3, 'RX 7600': 60.6, 'RX 6950 XT': 140.55,
        'RX 6900 XT': 138.975, 'RX 6800 XT': 135.9, 'RX 6800': 130.5,
        'RX 6750 XT': 120, 'RX 6700 XT': 110, 'RX 6650 XT': 100,
        'RX 6600 XT': 90, 'RX 6600': 80, 'RX 6500 XT': 60,
        'RX 6400': 45, 'Arc A770': 95, 'Arc A750': 85,
        'Arc A580': 70, 'Arc A380': 50
    };

    const collections = await db.listCollections().toArray();
    const gpuCollections = collections.filter(c => c.name.startsWith('gpus_') || c.name === 'gpus');
    const allGpus = [];
    for (const col of gpuCollections) {
        const docs = await db.collection(col.name).find({}).toArray();
        allGpus.push(...docs);
    }

    const sortedModels = Object.entries(gpuBenchmarks)
        .sort((a, b) => b[0].length - a[0].length);

    let stillMissing = 0;
    for (const [model] of sortedModels) {
        const match = allGpus.find(gpu => {
            const name = gpu.name || '';
            return name.includes(model);
        });
        if (!match) {
            console.log(`  Still missing: ${model}`);
            stillMissing++;
        }
    }

    if (stillMissing === 0) {
        console.log('  All benchmarked chipsets now have at least 1 product!');
    } else {
        console.log(`  ${stillMissing} chipsets still missing products`);
    }

    await mongoose.disconnect();
}

populate().catch(e => { console.error(e); process.exit(1); });
