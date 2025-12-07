require('dotenv').config();
const { MongoClient } = require('mongodb');

const ramData = [
    // DDR5 - High-End Gaming (6000MHz+)
    {
        name: "Corsair Vengeance DDR5 64GB (2x32GB) 6000MHz CL30",
        manufacturer: "Corsair",
        memoryType: "DDR5",
        speed: 6000,
        speedMHz: 6000,
        kitSize: 2,
        capacity: 32,
        totalCapacity: 64,
        kitConfiguration: "2x32GB",
        latency: "CL30",
        casLatency: 30,
        basePrice: 199.99,
        performanceTier: "High-End",
        specifications: {
            rgb: false,
            heatSpreader: true,
            overclock: "XMP",
            voltage: "1.35V",
            ecc: false,
            buffered: false,
            type: "UDIMM",
            formFactor: "Desktop"
        }
    },
    {
        name: "G.SKILL Trident Z5 RGB DDR5 32GB (2x16GB) 6400MHz CL32",
        manufacturer: "G.SKILL",
        memoryType: "DDR5",
        speed: 6400,
        speedMHz: 6400,
        kitSize: 2,
        capacity: 16,
        totalCapacity: 32,
        kitConfiguration: "2x16GB",
        latency: "CL32",
        casLatency: 32,
        basePrice: 139.99,
        performanceTier: "High-End",
        specifications: {
            rgb: true,
            heatSpreader: true,
            overclock: "XMP",
            voltage: "1.4V",
            ecc: false,
            buffered: false,
            type: "UDIMM",
            formFactor: "Desktop"
        }
    },
    {
        name: "Kingston FURY Beast DDR5 32GB (2x16GB) 6000MHz CL36",
        manufacturer: "Kingston",
        memoryType: "DDR5",
        speed: 6000,
        speedMHz: 6000,
        kitSize: 2,
        capacity: 16,
        totalCapacity: 32,
        kitConfiguration: "2x16GB",
        latency: "CL36",
        casLatency: 36,
        basePrice: 119.99,
        performanceTier: "High-End",
        specifications: {
            rgb: false,
            heatSpreader: true,
            overclock: "XMP",
            voltage: "1.35V",
            ecc: false,
            buffered: false,
            type: "UDIMM",
            formFactor: "Desktop"
        }
    },
    {
        name: "Corsair Dominator Platinum RGB DDR5 32GB (2x16GB) 6600MHz CL32",
        manufacturer: "Corsair",
        memoryType: "DDR5",
        speed: 6600,
        speedMHz: 6600,
        kitSize: 2,
        capacity: 16,
        totalCapacity: 32,
        kitConfiguration: "2x16GB",
        latency: "CL32",
        casLatency: 32,
        basePrice: 189.99,
        performanceTier: "Enthusiast",
        specifications: {
            rgb: true,
            heatSpreader: true,
            overclock: "XMP",
            voltage: "1.4V",
            ecc: false,
            buffered: false,
            type: "UDIMM",
            formFactor: "Desktop"
        }
    },
    {
        name: "TeamGroup T-Force Delta RGB DDR5 32GB (2x16GB) 6000MHz CL38",
        manufacturer: "TeamGroup",
        memoryType: "DDR5",
        speed: 6000,
        speedMHz: 6000,
        kitSize: 2,
        capacity: 16,
        totalCapacity: 32,
        kitConfiguration: "2x16GB",
        latency: "CL38",
        casLatency: 38,
        basePrice: 109.99,
        performanceTier: "High-End",
        specifications: {
            rgb: true,
            heatSpreader: true,
            overclock: "XMP",
            voltage: "1.35V",
            ecc: false,
            buffered: false,
            type: "UDIMM",
            formFactor: "Desktop"
        }
    },

    // DDR5 - Mid-Range (5200-5600MHz)
    {
        name: "Corsair Vengeance DDR5 32GB (2x16GB) 5600MHz CL36",
        manufacturer: "Corsair",
        memoryType: "DDR5",
        speed: 5600,
        speedMHz: 5600,
        kitSize: 2,
        capacity: 16,
        totalCapacity: 32,
        kitConfiguration: "2x16GB",
        latency: "CL36",
        casLatency: 36,
        basePrice: 99.99,
        performanceTier: "Mid-Range",
        specifications: {
            rgb: false,
            heatSpreader: true,
            overclock: "XMP",
            voltage: "1.25V",
            ecc: false,
            buffered: false,
            type: "UDIMM",
            formFactor: "Desktop"
        }
    },
    {
        name: "Kingston FURY Beast DDR5 16GB (2x8GB) 5200MHz CL40",
        manufacturer: "Kingston",
        memoryType: "DDR5",
        speed: 5200,
        speedMHz: 5200,
        kitSize: 2,
        capacity: 8,
        totalCapacity: 16,
        kitConfiguration: "2x8GB",
        latency: "CL40",
        casLatency: 40,
        basePrice: 59.99,
        performanceTier: "Budget",
        specifications: {
            rgb: false,
            heatSpreader: true,
            overclock: "XMP",
            voltage: "1.25V",
            ecc: false,
            buffered: false,
            type: "UDIMM",
            formFactor: "Desktop"
        }
    },
    {
        name: "Crucial DDR5 32GB (2x16GB) 5600MHz CL46",
        manufacturer: "Crucial",
        memoryType: "DDR5",
        speed: 5600,
        speedMHz: 5600,
        kitSize: 2,
        capacity: 16,
        totalCapacity: 32,
        kitConfiguration: "2x16GB",
        latency: "CL46",
        casLatency: 46,
        basePrice: 89.99,
        performanceTier: "Budget",
        specifications: {
            rgb: false,
            heatSpreader: false,
            overclock: "Standard",
            voltage: "1.1V",
            ecc: false,
            buffered: false,
            type: "UDIMM",
            formFactor: "Desktop"
        }
    },

    // DDR4 - High-End Gaming (3600-4000MHz)
    {
        name: "G.SKILL Trident Z Royal RGB DDR4 32GB (2x16GB) 3600MHz CL16",
        manufacturer: "G.SKILL",
        memoryType: "DDR4",
        speed: 3600,
        speedMHz: 3600,
        kitSize: 2,
        capacity: 16,
        totalCapacity: 32,
        kitConfiguration: "2x16GB",
        latency: "CL16",
        casLatency: 16,
        basePrice: 129.99,
        performanceTier: "High-End",
        specifications: {
            rgb: true,
            heatSpreader: true,
            overclock: "XMP",
            voltage: "1.35V",
            ecc: false,
            buffered: false,
            type: "UDIMM",
            formFactor: "Desktop"
        }
    },
    {
        name: "Corsair Vengeance RGB Pro DDR4 32GB (2x16GB) 3600MHz CL18",
        manufacturer: "Corsair",
        memoryType: "DDR4",
        speed: 3600,
        speedMHz: 3600,
        kitSize: 2,
        capacity: 16,
        totalCapacity: 32,
        kitConfiguration: "2x16GB",
        latency: "CL18",
        casLatency: 18,
        basePrice: 99.99,
        performanceTier: "High-End",
        specifications: {
            rgb: true,
            heatSpreader: true,
            overclock: "XMP",
            voltage: "1.35V",
            ecc: false,
            buffered: false,
            type: "UDIMM",
            formFactor: "Desktop"
        }
    },
    {
        name: "Kingston FURY Renegade RGB DDR4 32GB (2x16GB) 4000MHz CL19",
        manufacturer: "Kingston",
        memoryType: "DDR4",
        speed: 4000,
        speedMHz: 4000,
        kitSize: 2,
        capacity: 16,
        totalCapacity: 32,
        kitConfiguration: "2x16GB",
        latency: "CL19",
        casLatency: 19,
        basePrice: 139.99,
        performanceTier: "Enthusiast",
        specifications: {
            rgb: true,
            heatSpreader: true,
            overclock: "XMP",
            voltage: "1.35V",
            ecc: false,
            buffered: false,
            type: "UDIMM",
            formFactor: "Desktop"
        }
    },
    {
        name: "TeamGroup T-Force Vulcan Z DDR4 32GB (2x16GB) 3600MHz CL18",
        manufacturer: "TeamGroup",
        memoryType: "DDR4",
        speed: 3600,
        speedMHz: 3600,
        kitSize: 2,
        capacity: 16,
        totalCapacity: 32,
        kitConfiguration: "2x16GB",
        latency: "CL18",
        casLatency: 18,
        basePrice: 79.99,
        performanceTier: "Mid-Range",
        specifications: {
            rgb: false,
            heatSpreader: true,
            overclock: "XMP",
            voltage: "1.35V",
            ecc: false,
            buffered: false,
            type: "UDIMM",
            formFactor: "Desktop"
        }
    },

    // DDR4 - Mid-Range (3200MHz)
    {
        name: "Corsair Vengeance LPX DDR4 32GB (2x16GB) 3200MHz CL16",
        manufacturer: "Corsair",
        memoryType: "DDR4",
        speed: 3200,
        speedMHz: 3200,
        kitSize: 2,
        capacity: 16,
        totalCapacity: 32,
        kitConfiguration: "2x16GB",
        latency: "CL16",
        casLatency: 16,
        basePrice: 74.99,
        performanceTier: "Mid-Range",
        specifications: {
            rgb: false,
            heatSpreader: true,
            overclock: "XMP",
            voltage: "1.35V",
            ecc: false,
            buffered: false,
            type: "UDIMM",
            formFactor: "Desktop"
        }
    },
    {
        name: "G.SKILL Ripjaws V DDR4 32GB (2x16GB) 3200MHz CL16",
        manufacturer: "G.SKILL",
        memoryType: "DDR4",
        speed: 3200,
        speedMHz: 3200,
        kitSize: 2,
        capacity: 16,
        totalCapacity: 32,
        kitConfiguration: "2x16GB",
        latency: "CL16",
        casLatency: 16,
        basePrice: 69.99,
        performanceTier: "Mid-Range",
        specifications: {
            rgb: false,
            heatSpreader: true,
            overclock: "XMP",
            voltage: "1.35V",
            ecc: false,
            buffered: false,
            type: "UDIMM",
            formFactor: "Desktop"
        }
    },
    {
        name: "Kingston FURY Beast DDR4 16GB (2x8GB) 3200MHz CL16",
        manufacturer: "Kingston",
        memoryType: "DDR4",
        speed: 3200,
        speedMHz: 3200,
        kitSize: 2,
        capacity: 8,
        totalCapacity: 16,
        kitConfiguration: "2x8GB",
        latency: "CL16",
        casLatency: 16,
        basePrice: 44.99,
        performanceTier: "Budget",
        specifications: {
            rgb: false,
            heatSpreader: true,
            overclock: "XMP",
            voltage: "1.35V",
            ecc: false,
            buffered: false,
            type: "UDIMM",
            formFactor: "Desktop"
        }
    },

    // DDR4 - Budget (2666-3000MHz)
    {
        name: "Crucial DDR4 16GB (2x8GB) 3200MHz CL22",
        manufacturer: "Crucial",
        memoryType: "DDR4",
        speed: 3200,
        speedMHz: 3200,
        kitSize: 2,
        capacity: 8,
        totalCapacity: 16,
        kitConfiguration: "2x8GB",
        latency: "CL22",
        casLatency: 22,
        basePrice: 39.99,
        performanceTier: "Budget",
        specifications: {
            rgb: false,
            heatSpreader: false,
            overclock: "Standard",
            voltage: "1.2V",
            ecc: false,
            buffered: false,
            type: "UDIMM",
            formFactor: "Desktop"
        }
    },
    {
        name: "Corsair Vengeance LPX DDR4 16GB (2x8GB) 3000MHz CL16",
        manufacturer: "Corsair",
        memoryType: "DDR4",
        speed: 3000,
        speedMHz: 3000,
        kitSize: 2,
        capacity: 8,
        totalCapacity: 16,
        kitConfiguration: "2x8GB",
        latency: "CL16",
        casLatency: 16,
        basePrice: 42.99,
        performanceTier: "Budget",
        specifications: {
            rgb: false,
            heatSpreader: true,
            overclock: "XMP",
            voltage: "1.35V",
            ecc: false,
            buffered: false,
            type: "UDIMM",
            formFactor: "Desktop"
        }
    },

    // High Capacity Options
    {
        name: "Corsair Vengeance DDR5 96GB (2x48GB) 5600MHz CL40",
        manufacturer: "Corsair",
        memoryType: "DDR5",
        speed: 5600,
        speedMHz: 5600,
        kitSize: 2,
        capacity: 48,
        totalCapacity: 96,
        kitConfiguration: "2x48GB",
        latency: "CL40",
        casLatency: 40,
        basePrice: 289.99,
        performanceTier: "Workstation",
        specifications: {
            rgb: false,
            heatSpreader: true,
            overclock: "XMP",
            voltage: "1.25V",
            ecc: false,
            buffered: false,
            type: "UDIMM",
            formFactor: "Desktop"
        }
    },
    {
        name: "G.SKILL Trident Z5 DDR5 64GB (2x32GB) 6000MHz CL36",
        manufacturer: "G.SKILL",
        memoryType: "DDR5",
        speed: 6000,
        speedMHz: 6000,
        kitSize: 2,
        capacity: 32,
        totalCapacity: 64,
        kitConfiguration: "2x32GB",
        latency: "CL36",
        casLatency: 36,
        basePrice: 219.99,
        performanceTier: "High-End",
        specifications: {
            rgb: false,
            heatSpreader: true,
            overclock: "XMP",
            voltage: "1.35V",
            ecc: false,
            buffered: false,
            type: "UDIMM",
            formFactor: "Desktop"
        }
    },
    {
        name: "Kingston FURY Beast DDR4 64GB (2x32GB) 3200MHz CL16",
        manufacturer: "Kingston",
        memoryType: "DDR4",
        speed: 3200,
        speedMHz: 3200,
        kitSize: 2,
        capacity: 32,
        totalCapacity: 64,
        kitConfiguration: "2x32GB",
        latency: "CL16",
        casLatency: 16,
        basePrice: 139.99,
        performanceTier: "Workstation",
        specifications: {
            rgb: false,
            heatSpreader: true,
            overclock: "XMP",
            voltage: "1.35V",
            ecc: false,
            buffered: false,
            type: "UDIMM",
            formFactor: "Desktop"
        }
    }
];

async function populateRamData() {
    const uri = process.env.MONGODB_URI;
    const client = new MongoClient(uri);

    try {
        await client.connect();
        console.log('✅ Connected to MongoDB\n');

        const db = client.db(process.env.DB_NAME || 'pcbuilder');
        const ramCollection = db.collection('rams');

        let insertedCount = 0;
        let skippedCount = 0;

        for (const ram of ramData) {
            // Create a unique identifier
            const uniqueId = `${ram.name.toLowerCase()}|${ram.manufacturer.toLowerCase()}|${ram.memoryType.toLowerCase()}|${ram.speed}|${ram.capacity}|${ram.kitConfiguration}`;

            // Check if already exists
            const existing = await ramCollection.findOne({ uniqueId });

            if (existing) {
                console.log(`⏭️  Skipped (already exists): ${ram.name}`);
                skippedCount++;
                continue;
            }

            // Prepare the document
            const ramDoc = {
                ...ram,
                uniqueId,
                title: ram.name,
                category: 'ram',
                ramGroup: `${ram.memoryType}-${ram.speed} ${ram.totalCapacity}GB`,
                isOnSale: false,
                currentPrice: null,
                salePrice: null,
                isAvailable: true,
                source: 'Manual',
                sourceUrl: null,
                imageUrl: null,
                createdAt: new Date(),
                updatedAt: new Date(),
                scrapedAt: new Date(),
                priceHistory: [
                    {
                        price: ram.basePrice,
                        date: new Date(),
                        source: 'Manual',
                        detectionMethod: 'Manual',
                        isAvailable: true
                    }
                ],
                detectionMethod: 'Manual'
            };

            await ramCollection.insertOne(ramDoc);
            console.log(`✅ Added: ${ram.name} - $${ram.basePrice}`);
            insertedCount++;
        }

        console.log(`\n📊 SUMMARY:`);
        console.log(`   ✅ Inserted: ${insertedCount} RAM modules`);
        console.log(`   ⏭️  Skipped: ${skippedCount} (already exist)`);
        console.log(`   📦 Total in dataset: ${ramData.length}`);

    } catch (error) {
        console.error('❌ Error:', error);
        throw error;
    } finally {
        await client.close();
        console.log('\n🔌 Disconnected from MongoDB');
    }
}

populateRamData()
    .then(() => {
        console.log('\n✨ RAM data population completed successfully');
        process.exit(0);
    })
    .catch(error => {
        console.error('\n💥 Operation failed:', error);
        process.exit(1);
    });
