const { connectToDatabase, getDatabase } = require('../config/database');

// Motherboard data to import
const motherboardsData = [
    {
        url: "https://www.amazon.com/ASRock-Riptide-Ryzen-Soket-Motherboard/dp/B09BDCCPQM",
        title: "ASRock AMD B550 PG Riptide ATX Motherboard Dual Channel DDR4 4933 MHz AM4 Socket 128 GB SATA3 6.0 Gb/s M.2",
        formFactor: "ATX",
        memoryType: "DDR4",
        wifi: false,
        chipset: "B550",
        manufacturer: "ASRock",
        pcieSlots: 3,
        ramSlots: 4,
        m2Slots: 2
    },
    {
        url: "https://www.amazon.com/ASUS-II-RyzenTM-Motherboard-Addressable/dp/B0B5M97W1T",
        title: "ASUS Prime B550M-A WiFi II AMD Micro ATX Motherboard with PCIe 4.0, WiFi 6, ECC Memory, HDMI 2.1, RGB Header",
        formFactor: "Micro-ATX",
        memoryType: "DDR4",
        wifi: true,
        chipset: "B550M",
        manufacturer: "ASUS",
        pcieSlots: 1,
        ramSlots: 4,
        m2Slots: 2
    },
    {
        url: "https://www.amazon.com/ASUS-Micro-ATX-Motherboard-Type-C%C2%AE-FlashbackTM/dp/B0C8RYXSQB",
        title: "ASUS Prime B650M-A AX AMD B650(Ryzen 7000) Micro-ATX Motherboard(DDR5,PCIe 5.0 M.2,2.5Gb LAN,Wi-Fi 6, DP,USB 3.2 Gen 2 Ports,Front USB 3.2 Gen 1 Type-C®, BIOS Flashback™, CEC Tier II Ready) (Renewed)",
        formFactor: "Micro-ATX",
        memoryType: "DDR5",
        wifi: true,
        chipset: "B650M",
        manufacturer: "ASUS",
        pcieSlots: 4,
        ramSlots: 4,
        m2Slots: 2
    },
    {
        url: "https://www.amazon.com/ASUS-Strix-B550-XE-Gaming-WiFi/dp/B08NRV2RQH",
        title: "ASUS ROG Strix AMD AM4 ATX Motherboard - WiFi 6, 2.5Gb LAN, 16 Power Stages, Bundled Hyper M.2 Gen 4 Card, Addressable RGB",
        formFactor: "ATX",
        memoryType: "DDR4",
        wifi: true,
        chipset: "B550",
        manufacturer: "ASUS",
        pcieSlots: 3,
        ramSlots: 4,
        m2Slots: 6
    },
    {
        url: "https://www.amazon.com/ROG-B550-F-II-Motherboard-Addressable/dp/B09GP7P1XS",
        title: "Asus ROG Strix B550-F Gaming WiFi II AMD AM4 (3rd Gen Ryzen) ATX Motherboard (PCIe 4.0,WiFi 6E, 2.5Gb LAN, BIOS Flashback, HDMI 2.1, Addressable Gen 2 RGB Header and Aura Sync)",
        formFactor: "ATX",
        memoryType: "DDR4",
        wifi: true,
        chipset: "B550",
        manufacturer: "ASUS",
        pcieSlots: 2,
        ramSlots: 4,
        m2Slots: 4
    },
    {
        url: "https://www.amazon.com/ASUS-TUF-A520M-PLUS-Motherboard-DisplayPort/dp/B0997N7P12",
        title: "ASUS TUF Gaming A520M-PLUS (WiFi) AMD AM4 (3rd Gen Ryzen™) microATX Motherboard (M.2 Support, 802.11ac Wi-Fi, DisplayPort, HDMI, D-Sub, USB 3.2 Gen 1 Type-A and Aura Addressable Gen 2 headers)",
        formFactor: "Micro-ATX",
        memoryType: "DDR4",
        wifi: true,
        chipset: "A520",
        manufacturer: "ASUS",
        pcieSlots: 1,
        ramSlots: 4,
        m2Slots: 1
    },
    {
        url: "https://www.amazon.com/Gigabyte-A520I-AC-Interfaces-Motherboard/dp/B08F7BHDLY",
        title: "Gigabyte A520I AC (AMD Ryzen AM4/Mini-ITX/Direct 6 Phases Digital PWM with 55A DrMOS/Gaming GbE LAN/Intel WiFi+Bluetooth/NVMe PCIe 3.0 x4 M.2/3 Display Interfaces/Q-Flash Plus/Motherboard)",
        formFactor: "Mini-ITX",
        memoryType: "DDR4",
        wifi: true,
        chipset: "A520I",
        manufacturer: "Gigabyte",
        pcieSlots: 1,
        ramSlots: 2,
        m2Slots: 4
    },
    {
        url: "https://www.amazon.com/Gigabyte-B550-Gaming-Ryzen-Motherboard/dp/B08LGKGBKT",
        title: "Gigabyte B550 Gaming X V2 (AMD Ryzen 5000/B550/ATX/M.2/HDMI/DVI/USB 3.1 Gen 2/DDR4/ATX/Gaming Motherboard), 128 GB",
        formFactor: "ATX",
        memoryType: "DDR4",
        wifi: false,
        chipset: "B550",
        manufacturer: "Gigabyte",
        pcieSlots: 2,
        ramSlots: 4,
        m2Slots: 2
    },
    {
        url: "https://www.amazon.com/B550I-AORUS-PRO-DisplayPort-Motherboard/dp/B089FWWN62",
        title: "GIGABYTE B550I AORUS PRO AX (AM4 AMD/B550/Mini-Itx/Dual M.2/SATA 6Gb/s/USB 3.2 Gen 1/WiFi 6/2.5 GbE LAN/PCIe4.0/Realtek ALC1220-Vb/DisplayPort 1.4/2xHDMI 2.0B/RGB Fusion 2.0/DDR4/Gaming Motherboard)",
        formFactor: "Mini-ITX",
        memoryType: "DDR4",
        wifi: true,
        chipset: "B550I",
        manufacturer: "GIGABYTE",
        pcieSlots: 1,
        ramSlots: 2,
        m2Slots: 2
    }
];

// Extract socket from chipset
function extractSocket(chipset, title) {
    const titleLower = title.toLowerCase();

    // AMD chipsets
    if (chipset.includes('B650') || chipset.includes('X670') || chipset.includes('A620')) {
        return 'AM5';
    }
    if (chipset.includes('B550') || chipset.includes('A520') || chipset.includes('X570')) {
        return 'AM4';
    }

    // Intel chipsets
    if (chipset.includes('Z790') || chipset.includes('B760') || chipset.includes('H770')) {
        return 'LGA1700';
    }
    if (chipset.includes('Z690') || chipset.includes('B660') || chipset.includes('H670')) {
        return 'LGA1700';
    }

    // Fallback - check title
    if (titleLower.includes('am5')) return 'AM5';
    if (titleLower.includes('am4')) return 'AM4';
    if (titleLower.includes('lga1700') || titleLower.includes('lga 1700')) return 'LGA1700';
    if (titleLower.includes('lga1200') || titleLower.includes('lga 1200')) return 'LGA1200';

    return 'Unknown';
}

// Determine performance tier
function determinePerformanceTier(chipset) {
    const chipsetUpper = chipset.toUpperCase();

    // High-end chipsets
    if (chipsetUpper.includes('X670') || chipsetUpper.includes('X570') ||
        chipsetUpper.includes('Z790') || chipsetUpper.includes('Z690')) {
        return 'High-End';
    }

    // Performance chipsets
    if (chipsetUpper.includes('B650') || chipsetUpper.includes('B550') ||
        chipsetUpper.includes('B760') || chipsetUpper.includes('B660')) {
        return 'Performance';
    }

    // Entry-level chipsets
    if (chipsetUpper.includes('A520') || chipsetUpper.includes('A620') ||
        chipsetUpper.includes('H610') || chipsetUpper.includes('H670')) {
        return 'Entry-Level';
    }

    return 'Mainstream';
}

// Get supported CPU chipsets
function getSupportedCpuChipsets(chipset) {
    const chipsetUpper = chipset.toUpperCase();

    // AMD AM5 chipsets
    if (chipsetUpper.includes('B650') || chipsetUpper.includes('X670') || chipsetUpper.includes('A620')) {
        return ['AMD Ryzen 7000 Series', 'AMD Ryzen 8000 Series'];
    }

    // AMD AM4 chipsets
    if (chipsetUpper.includes('B550') || chipsetUpper.includes('X570') || chipsetUpper.includes('A520')) {
        return ['AMD Ryzen 5000 Series', 'AMD Ryzen 3000 Series', 'AMD Ryzen 2000 Series'];
    }

    // Intel LGA1700 chipsets
    if (chipsetUpper.includes('Z790') || chipsetUpper.includes('B760') || chipsetUpper.includes('H770')) {
        return ['Intel 13th Gen', 'Intel 12th Gen'];
    }

    if (chipsetUpper.includes('Z690') || chipsetUpper.includes('B660') || chipsetUpper.includes('H670')) {
        return ['Intel 12th Gen', 'Intel 11th Gen'];
    }

    return [];
}

async function addMotherboards() {
    let db;

    try {
        // Connect to database
        await connectToDatabase();
        db = getDatabase();
        console.log('✅ Connected to MongoDB database');

        const collection = db.collection('motherboards');

        let newCount = 0;
        let duplicateCount = 0;
        let updatedCount = 0;

        for (const mbData of motherboardsData) {
            try {
                // Check if motherboard already exists by URL
                const existing = await collection.findOne({ sourceUrl: mbData.url });

                // Build the motherboard document
                const socket = extractSocket(mbData.chipset, mbData.title);
                const motherboard = {
                    name: mbData.title,
                    title: mbData.title,
                    manufacturer: mbData.manufacturer,
                    chipset: mbData.chipset,
                    socket: socket,
                    formFactor: mbData.formFactor,
                    memorySlots: mbData.ramSlots,
                    memoryType: [mbData.memoryType],
                    category: 'motherboard',
                    sourceUrl: mbData.url,
                    specifications: {
                        wifi: mbData.wifi,
                        wifiVersion: mbData.wifi ? 'WiFi 6' : null,
                        ramType: mbData.memoryType,
                        memorySlots: mbData.ramSlots,
                        supportedCpuChipsets: getSupportedCpuChipsets(mbData.chipset),
                        pcieSlots: mbData.pcieSlots,
                        m2Slots: mbData.m2Slots
                    },
                    performanceTier: determinePerformanceTier(mbData.chipset),
                    createdAt: new Date(),
                    updatedAt: new Date()
                };

                // Set default max memory based on memory type and chipset
                if (mbData.memoryType === 'DDR5') {
                    motherboard.maxMemory = 128;
                } else {
                    motherboard.maxMemory = 128;
                }

                // Set memory speed based on type
                if (mbData.memoryType === 'DDR5') {
                    motherboard.memorySpeed = [5600, 6000, 6400];
                    motherboard.specifications.maxMemorySpeed = '6400MHz';
                } else {
                    motherboard.memorySpeed = [3200, 3600, 4000];
                    motherboard.specifications.maxMemorySpeed = '4000MHz';
                }

                if (existing) {
                    // Update existing motherboard
                    motherboard.createdAt = existing.createdAt;
                    motherboard.updatedAt = new Date();

                    await collection.updateOne(
                        { _id: existing._id },
                        { $set: motherboard }
                    );

                    console.log(`🔄 Updated: ${mbData.manufacturer} ${mbData.chipset} ${mbData.formFactor}`);
                    updatedCount++;
                } else {
                    // Insert new motherboard
                    await collection.insertOne(motherboard);
                    console.log(`✅ Added: ${mbData.manufacturer} ${mbData.chipset} ${mbData.formFactor}`);
                    newCount++;
                }

            } catch (error) {
                console.error(`❌ Error processing ${mbData.title}:`, error.message);
            }
        }

        console.log('\n📊 IMPORT SUMMARY:');
        console.log('='.repeat(60));
        console.log(`✅ New motherboards added: ${newCount}`);
        console.log(`🔄 Motherboards updated: ${updatedCount}`);
        console.log(`📦 Total motherboards processed: ${motherboardsData.length}`);
        console.log('='.repeat(60));

    } catch (error) {
        console.error('❌ Error:', error);
        throw error;
    } finally {
        process.exit(0);
    }
}

// Run the import
addMotherboards().catch(console.error);
