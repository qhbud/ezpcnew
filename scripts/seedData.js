const { connectToDatabase, getDatabase } = require('../config/database');

async function seedData() {
  try {
    console.log('🌱 Seeding PC Parts Database with sample data...');
    
    // Connect to database
    await connectToDatabase();
    const db = getDatabase();
    
    const now = new Date();
    
    // Sample CPU data
    const cpus = [
      {
        name: "Intel Core i9-13900K",
        manufacturer: "Intel",
        socket: "LGA1700",
        cores: 24,
        threads: 32,
        baseClock: 3.0,
        boostClock: 5.8,
        tdp: 253,
        integratedGraphics: true,
        igpuModel: "Intel UHD Graphics 770",
        memoryType: ["DDR4", "DDR5"],
        maxMemorySpeed: 5600,
        pcieVersion: "PCIe 5.0",
        pcieLanes: 20,
        cache: { l1: 1280, l2: 32768, l3: 36864 },
        price: 569.99,
        releaseDate: new Date("2022-10-20"),
        performanceScore: 95,
        powerEfficiency: 0.38,
        overclocking: true,
        stockCooler: false,
        imageUrl: "https://example.com/intel-13900k.jpg",
        specifications: {
          lithography: "10nm",
          architecture: "Raptor Lake",
          instructionSet: ["x86-64", "AVX2", "AVX-512"],
          virtualization: true
        },
        compatibility: {
          motherboards: ["Z790", "B760", "H770"],
          coolers: ["LGA1700"],
          memory: ["DDR4", "DDR5"]
        },
        createdAt: now,
        updatedAt: now
      },
      {
        name: "AMD Ryzen 9 7950X",
        manufacturer: "AMD",
        socket: "AM5",
        cores: 16,
        threads: 32,
        baseClock: 4.5,
        boostClock: 5.7,
        tdp: 170,
        integratedGraphics: true,
        igpuModel: "AMD Radeon Graphics",
        memoryType: ["DDR5"],
        maxMemorySpeed: 5200,
        pcieVersion: "PCIe 5.0",
        pcieLanes: 24,
        cache: { l1: 1024, l2: 16384, l3: 65536 },
        price: 699.99,
        releaseDate: new Date("2022-08-29"),
        performanceScore: 98,
        powerEfficiency: 0.58,
        overclocking: true,
        stockCooler: false,
        imageUrl: "https://example.com/amd-7950x.jpg",
        specifications: {
          lithography: "5nm",
          architecture: "Zen 4",
          instructionSet: ["x86-64", "AVX2", "AVX-512"],
          virtualization: true
        },
        compatibility: {
          motherboards: ["X670E", "B650E", "B650"],
          coolers: ["AM5"],
          memory: ["DDR5"]
        },
        createdAt: now,
        updatedAt: now
      }
    ];
    
    // Sample Motherboard data
    const motherboards = [
      {
        name: "ASUS ROG STRIX Z790-E GAMING WIFI",
        manufacturer: "ASUS",
        chipset: "Z790",
        socket: "LGA1700",
        formFactor: "ATX",
        memorySlots: 4,
        maxMemory: 128,
        memoryType: ["DDR5"],
        memorySpeed: [7800, 7600, 7400, 7200, 7000, 6800, 6600, 6400, 6200, 6000, 5800, 5600],
        pcieSlots: [
          { type: "PCIe x16", version: "PCIe 5.0", lanes: 16, physicalSize: "x16" },
          { type: "PCIe x16", version: "PCIe 4.0", lanes: 4, physicalSize: "x4" },
          { type: "PCIe x16", version: "PCIe 4.0", lanes: 4, physicalSize: "x4" }
        ],
        m2Slots: [
          { type: "M.2 2280", pcieVersion: "PCIe 5.0", sata: false, nvme: true },
          { type: "M.2 2280", pcieVersion: "PCIe 4.0", sata: false, nvme: true },
          { type: "M.2 2280", pcieVersion: "PCIe 4.0", sata: true, nvme: true }
        ],
        sataPorts: 4,
        usbPorts: { usb2: 2, usb3: 2, usb3_1: 2, usb3_2: 2, usbc: 2, thunderbolt: 1 },
        networking: {
          ethernet: ["2.5GbE"],
          wifi: true,
          wifiVersion: "WiFi 6E",
          bluetooth: true,
          bluetoothVersion: "5.2"
        },
        audio: { codec: "Realtek ALC4080", channels: 7.1, optical: true },
        powerConnectors: { cpu: ["8-pin", "4+4-pin"], motherboard: ["24-pin"] },
        features: ["RGB", "Debug LED", "Q-Flash", "WiFi 6E"],
        price: 449.99,
        releaseDate: new Date("2022-10-20"),
        imageUrl: "https://example.com/asus-z790-e.jpg",
        specifications: { vrms: 20, bios: "UEFI", overclocking: true, tpm: true },
        compatibility: { cpus: ["13th Gen Intel"], coolers: ["LGA1700"], memory: ["DDR5"], cases: ["ATX"] },
        createdAt: now,
        updatedAt: now
      }
    ];
    
    // Sample GPU data
    const gpus = [
      {
        name: "NVIDIA GeForce RTX 4090",
        manufacturer: "NVIDIA",
        partner: "ASUS",
        chipset: "RTX 4090",
        architecture: "Ada Lovelace",
        memory: { size: 24, type: "GDDR6X", speed: 21000, busWidth: 384, bandwidth: 1008 },
        core: { baseClock: 2235, boostClock: 2520, shaders: 16384, rtCores: 144, tensorCores: 576, computeUnits: 0 },
        power: { tdp: 450, recommendedPsu: 850, powerConnectors: ["16-pin"] },
        dimensions: { length: 304, width: 137, height: 61, slots: 3 },
        cooling: { type: "Air", fans: 3, fanSize: [92, 92, 92], rgb: true },
        outputs: [
          { type: "HDMI", version: "HDMI 2.1", count: 2 },
          { type: "DisplayPort", version: "DP 1.4a", count: 3 }
        ],
        features: ["Ray tracing", "DLSS 3", "NVIDIA Reflex"],
        price: 1599.99,
        releaseDate: new Date("2022-10-12"),
        performanceScore: 100,
        imageUrl: "https://example.com/rtx-4090.jpg",
        specifications: { lithography: "4nm", transistors: 76.3, dieSize: 608, pcieVersion: "PCIe 4.0" },
        compatibility: { motherboards: ["PCIe 4.0"], psus: ["850W+"], cases: ["Full Tower"] },
        createdAt: now,
        updatedAt: now
      }
    ];
    
    // Sample RAM data
    const rams = [
      {
        name: "Corsair Vengeance RGB DDR5-6000",
        manufacturer: "Corsair",
        brand: "Vengeance RGB",
        capacity: 16,
        kitSize: 2,
        totalCapacity: 32,
        memoryType: "DDR5",
        speed: 6000,
        casLatency: 36,
        timing: "36-36-36-76",
        voltage: 1.35,
        formFactor: "DIMM",
        ecc: false,
        registered: false,
        xmp: true,
        expo: false,
        rgb: true,
        heatSpreader: true,
        price: 189.99,
        releaseDate: new Date("2022-01-01"),
        performanceScore: 85,
        imageUrl: "https://example.com/corsair-ddr5.jpg",
        specifications: { dieType: "Dual rank", pcbLayers: 10, icManufacturer: "Samsung" },
        compatibility: { motherboards: ["DDR5"], cpus: ["Intel 12th/13th Gen", "AMD Ryzen 7000"], cases: ["ATX"] },
        overclocking: { supported: true, maxSpeed: 6400, maxVoltage: 1.4 },
        warranty: 5,
        createdAt: now,
        updatedAt: now
      }
    ];
    
    // Sample Storage data
    const storages = [
      {
        name: "Samsung 970 EVO Plus 2TB",
        manufacturer: "Samsung",
        brand: "970 EVO Plus",
        type: "SSD",
        formFactor: "M.2",
        capacity: 2000,
        interface: "PCIe 3.0",
        controller: "Samsung Phoenix",
        nandType: "TLC",
        readSpeed: 3500,
        writeSpeed: 3300,
        randomRead: 620000,
        randomWrite: 560000,
        endurance: 1200,
        powerConsumption: { idle: 0.003, active: 6.0, sleep: 0.002 },
        dimensions: { length: 80.15, width: 22.15, height: 2.38, weight: 8.5 },
        features: ["TRIM", "S.M.A.R.T", "Encryption"],
        price: 199.99,
        releaseDate: new Date("2019-01-01"),
        performanceScore: 88,
        imageUrl: "https://example.com/samsung-970-evo.jpg",
        specifications: { cache: 2048, buffer: 0, platters: 0, rpm: 0, sectors: 0, firmware: "2B2QEXM7" },
        compatibility: { motherboards: ["M.2 PCIe"], cases: ["All"], psus: ["All"] },
        reliability: { mtbf: 1500000, warranty: 5, temperature: { operating: [0, 70], storage: [-40, 85] } },
        createdAt: now,
        updatedAt: now
      }
    ];
    
    // Sample PSU data
    const psus = [
      {
        name: "Corsair RM850x",
        manufacturer: "Corsair",
        brand: "RMx",
        wattage: 850,
        efficiency: "Gold",
        efficiencyPercentage: 92,
        formFactor: "ATX",
        modularity: "Full",
        certification: "80 Plus Gold",
        powerConnectors: {
          motherboard: ["24-pin"],
          cpu: ["8-pin", "4+4-pin"],
          pcie: ["6+2-pin", "6+2-pin", "6+2-pin"],
          sata: ["SATA", "SATA", "SATA", "SATA"],
          molex: ["4-pin", "4-pin", "4-pin"],
          floppy: ["4-pin"]
        },
        rails: { type: "Single", count: 1, max12v: 70.8, max5v: 25, max3v3: 25 },
        protection: ["OVP", "UVP", "OCP", "SCP", "OTP"],
        cooling: { fan: true, fanSize: 135, fanType: "Fluid dynamic", zeroRpm: true },
        dimensions: { length: 160, width: 150, height: 86, weight: 1.7 },
        features: ["Zero RPM mode", "Japanese capacitors"],
        price: 149.99,
        releaseDate: new Date("2018-01-01"),
        imageUrl: "https://example.com/corsair-rm850x.jpg",
        specifications: { input: { voltage: ["100-240V"], frequency: [50, 60], current: 10 }, output: { voltage: ["+3.3V", "+5V", "+12V", "-12V", "+5VSB"], current: [25, 25, 70.8, 3, 3], ripple: [20, 20, 120, 120, 50] }, holdUpTime: 17, powerGood: 100 },
        compatibility: { motherboards: ["ATX"], cases: ["ATX"], gpus: ["RTX 4080", "RTX 4070 Ti"] },
        reliability: { mtbf: 100000, warranty: 10, temperature: { operating: [0, 50], storage: [-20, 70] } },
        createdAt: now,
        updatedAt: now
      }
    ];
    
    // Sample Case data
    const cases = [
      {
        name: "NZXT H510",
        manufacturer: "NZXT",
        brand: "H510",
        formFactor: ["ATX", "mATX", "ITX"],
        dimensions: { length: 460, width: 200, height: 460, volume: 42.4 },
        motherboardSupport: ["ATX", "mATX", "ITX"],
        expansion: { pcieSlots: 7, driveBays: { threeFive: 2, twoFive: 4, external: 0 } },
        cooling: {
          includedFans: 2,
          fanMounts: [
            { size: 120, count: 2, location: "Front" },
            { size: 120, count: 1, location: "Top" },
            { size: 120, count: 1, location: "Rear" }
          ],
          radiatorSupport: [
            { size: 280, count: 1, location: "Front" },
            { size: 120, count: 1, location: "Top" },
            { size: 120, count: 1, location: "Rear" }
          ],
          dustFilters: ["Front", "Top"]
        },
        materials: { primary: "Steel", sidePanel: "Tempered glass", thickness: 1.0 },
        features: ["USB-C", "Audio jacks", "Cable management"],
        ports: { usb: [{ type: "USB 3.1", count: 1 }, { type: "USB 3.0", count: 1 }], audio: { headphone: 1, microphone: 1 } },
        powerSupply: { included: false, formFactor: ["ATX"], mounting: "Bottom" },
        cableManagement: { routing: true, space: 20, grommets: 8 },
        price: 89.99,
        releaseDate: new Date("2019-01-01"),
        imageUrl: "https://example.com/nzxt-h510.jpg",
        specifications: { weight: 6.8, color: ["Black", "White"], window: true, toolFree: true, noise: 28 },
        compatibility: { gpus: ["Up to 381mm"], cpus: ["Up to 165mm"], psus: ["Up to 200mm"] },
        airflow: { design: "Solid front", pressure: "Negative", ventilation: 15 },
        createdAt: now,
        updatedAt: now
      }
    ];
    
    // Sample Cooler data
    const coolers = [
      {
        name: "Noctua NH-D15",
        manufacturer: "Noctua",
        brand: "NH-D15",
        type: "Air",
        coolingMethod: "Air",
        socket: ["LGA1700", "LGA1200", "LGA1151", "AM4", "AM5"],
        dimensions: { height: 165, width: 150, depth: 161, weight: 1320 },
        fan: {
          count: 2,
          size: [140, 120],
          speed: { min: 300, max: 1500 },
          airflow: 82.5,
          staticPressure: 1.83,
          noise: 24.6,
          bearing: "SSO2",
          rgb: false
        },
        radiator: { size: 0, thickness: 0, material: "N/A", finDensity: 0 },
        heatpipes: { count: 6, diameter: 6, material: "Copper", directTouch: true },
        thermalPaste: { included: true, type: "Tube", brand: "Noctua NT-H1" },
        mounting: { type: "Screw", toolFree: false, backplate: true },
        performance: { tdp: 220, temperature: 65, noise: 24.6 },
        price: 99.99,
        releaseDate: new Date("2014-01-01"),
        imageUrl: "https://example.com/noctua-nh-d15.jpg",
        specifications: { material: "Aluminum", finish: "Matte", warranty: 6 },
        compatibility: { cpus: ["Intel LGA1700", "AMD AM4/AM5"], motherboards: ["LGA1700", "AM4", "AM5"], cases: ["Mid Tower+"] },
        features: ["PWM control", "SecuFirm2"],
        installation: { difficulty: "Medium", time: 15, tools: ["Screwdriver"] },
        createdAt: now,
        updatedAt: now
      }
    ];
    
    // Insert sample data
    console.log('\nInserting sample data...');
    
    const collections = [
      { name: 'cpus', data: cpus },
      { name: 'motherboards', data: motherboards },
      { name: 'gpus', data: gpus },
      { name: 'rams', data: rams },
      { name: 'storages', data: storages },
      { name: 'psus', data: psus },
      { name: 'cases', data: cases },
      { name: 'coolers', data: coolers }
    ];
    
    for (const collection of collections) {
      try {
        const result = await db.collection(collection.name).insertMany(collection.data);
        console.log(`✓ Inserted ${result.insertedCount} ${collection.name}`);
      } catch (error) {
        if (error.code === 11000) {
          console.log(`✓ ${collection.name} already contains data`);
        } else {
          console.error(`✗ Error inserting ${collection.name}:`, error.message);
        }
      }
    }
    
    console.log('\n🎉 Database seeding completed successfully!');
    console.log('\nSample data inserted:');
    collections.forEach(collection => {
      console.log(`  - ${collection.name}: ${collection.data.length} items`);
    });
    
    console.log('\nYour PC Parts Database is now ready to use!');
    
  } catch (error) {
    console.error('❌ Database seeding failed:', error);
    process.exit(1);
  }
}

// Run seeding if called directly
if (require.main === module) {
  seedData();
}

module.exports = { seedData };
