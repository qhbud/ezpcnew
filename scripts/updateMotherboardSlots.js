const { connectToDatabase, getDatabase } = require('../config/database');

// Motherboard slot data from spreadsheet
const motherboardSlotData = [
    { url: 'https://www.amazon.com/ASUS-STRIX-B860-I-GAMING-WIFI/dp/B0DQ68TV3W', pcieSlots: 1, ramSlots: 2, m2Slots: 1 },
    { url: 'https://www.amazon.com/ASRock-LGA1851-RL-ILM-Motherboard-Phantom/dp/B0DJPXWMG8', pcieSlots: 1, ramSlots: 2, m2Slots: 2 },
    { url: 'https://www.amazon.com/GIGABYTE-B860I-AORUS-PRO-ICE/dp/B0DQLK2RF3', pcieSlots: 1, ramSlots: 2, m2Slots: 2 },
    { url: 'https://www.amazon.com/ASUS-TUF-Intel%C2%AE12th-Motherboard-Thunderbolt/dp/B0BQD58D96', pcieSlots: 2, ramSlots: 4, m2Slots: 4 },
    { url: 'https://www.amazon.com/GIGABYTE-Z790-Q-Flash-EZ-Latch-Motherboard/dp/B0BH9DXY38', pcieSlots: 3, ramSlots: 4, m2Slots: 4 },
    { url: 'https://www.amazon.com/NZXT-Z790-Motherboard-N7-Z79XT-W1-connectivity/dp/B0BFZXDVNY', pcieSlots: 3, ramSlots: 4, m2Slots: 3 },
    { url: 'https://www.amazon.com/Asrock-Z790RiptideWiFi-Asrockz790-Riptide-Wifi/dp/B0CL6K7T51', pcieSlots: 2, ramSlots: 4, m2Slots: 5 },
    { url: 'https://www.amazon.com/Asrock-B760M-Sonic-Intel-Micro/dp/B0BQWPLFNM', pcieSlots: 1, ramSlots: 4, m2Slots: 3 },
    { url: 'https://www.amazon.com/GIGABYTE-B760M-DDR4-Motherboard-EZ-Latch/dp/B0D54QJ9CJ', pcieSlots: 1, ramSlots: 4, m2Slots: 2 },
    { url: 'https://www.amazon.com/ASUS-AX-microATX-Motherboard-Realtek/dp/B0BZTB5LKJ', pcieSlots: 4, ramSlots: 4, m2Slots: 2 },
    { url: 'https://www.amazon.com/ASRock-ASROCK-Z790M-ITX-WiFi-Motherboard/dp/B0BJF1H163', pcieSlots: 1, ramSlots: 2, m2Slots: 2 },
    { url: 'https://www.amazon.com/MB-ASRock-B760-Pro-RS/dp/B0BQWRCNT8', pcieSlots: 3, ramSlots: 4, m2Slots: 3 },
    { url: 'https://www.amazon.com/TUF-GAMING-B760M-PLUS-WIFI-motherboard/dp/B0CSPCVTV1', pcieSlots: 1, ramSlots: 4, m2Slots: 6 },
    { url: 'https://www.amazon.com/ASUS-Z690-P-LGA1700-Motherboard-Thunderbolt/dp/B09J1S3K36', pcieSlots: 3, ramSlots: 4, m2Slots: 3 },
    { url: 'https://www.amazon.com/MSI-DDR4-ProSeries-Motherboard-Socket/dp/B09GLD6LYW', pcieSlots: 3, ramSlots: 4, m2Slots: 4 },
    { url: 'https://www.amazon.com/PRO-Z690-WIFI-DDR4-motherboard/dp/B09HK67Z3N', pcieSlots: 3, ramSlots: 4, m2Slots: 4 },
    { url: 'https://www.amazon.com/GIGABYTE-Z690-AORUS-Gen2X2-Motherboard/dp/B09JZFT4SN', pcieSlots: 3, ramSlots: 4, m2Slots: 4 },
    { url: 'https://www.amazon.com/ASUS-B660-PLUS-D4-Motherboard-Thunderbolt/dp/B09NWDQ1TH', pcieSlots: 2, ramSlots: 4, m2Slots: 3 },
    { url: 'https://www.amazon.com/MSI-PRO-CEC-WiFi-DDR4/dp/B0DF8CPSKZ', pcieSlots: 4, ramSlots: 4, m2Slots: 1 },
    { url: 'https://www.amazon.com/GIGABYTE-Motherboard-Type-C-2-5GbE-Renewed/dp/B0F8N128CW', pcieSlots: 5, ramSlots: 4, m2Slots: 2 },
    { url: 'https://www.amazon.com/ASROCK-Socket-LGA1700-USB3-2-Motherboard/dp/B09PYQP8WH', pcieSlots: 2, ramSlots: 4, m2Slots: 2 },
    { url: 'https://www.amazon.com/ASUS-PRIME-H610I-PLUS-Motherboard-Mono-out/dp/B09XJQTQN1', pcieSlots: 1, ramSlots: 2, m2Slots: 1 },
    { url: 'https://www.amazon.com/GIGABYTE-B850M-AORUS-WIFI6E-ICE/dp/B0DQLJGTRM', pcieSlots: 2, ramSlots: 4, m2Slots: 2 },
    { url: 'https://www.amazon.com/ASUS-ROG-B850-I-Motherboard-Overclocking/dp/B0DHCQ1MPZ', pcieSlots: 1, ramSlots: 2, m2Slots: 2 },
    { url: 'https://www.amazon.com/ASRock-Lightning-WiFi-Motherboard-Flashback/dp/B0DRTVR12D', pcieSlots: 1, ramSlots: 2, m2Slots: 1 },
    { url: 'https://www.amazon.com/GIGABYTE-B650-AX-Triple-Realtek/dp/B083TZ68H1', pcieSlots: 4, ramSlots: 4, m2Slots: 3 },
    { url: 'https://www.amazon.com/ASUS-TUF-B650-PLUS-Motherboard-Ethernet/dp/B0BHN7GGBQ', pcieSlots: 2, ramSlots: 4, m2Slots: 3 },
    { url: 'https://www.amazon.com/ASUS-TUF-X670E-PLUS-Motherboard-Lighting/dp/B0BDTJFHKJ', pcieSlots: 2, ramSlots: 4, m2Slots: 4 },
    { url: 'https://www.amazon.com/GIGABYTE-X670-AORUS-AX-Motherboard/dp/B0BF7FT26Z', pcieSlots: 2, ramSlots: 4, m2Slots: 4 },
    { url: 'https://www.amazon.com/MSI-Computer-Motherboard-Supports-Bluetooth/dp/B0CFS6ZST7', pcieSlots: 3, ramSlots: 4, m2Slots: 3 },
    { url: 'https://www.amazon.com/MSI-X670-P-ProSeries-Motherboard-Wi-Fi/dp/B0B6Q1N477', pcieSlots: 3, ramSlots: 4, m2Slots: 4 },
    { url: 'https://www.amazon.com/ASUS-X670-P-Motherboard-Type-C%C2%AE-Ethernet/dp/B0BDTLXWQM', pcieSlots: 3, ramSlots: 4, m2Slots: 3 },
    { url: 'https://www.amazon.com/ASRock-B650M-Lightning-Socket-Type-C/dp/B0CJT9KKSD', pcieSlots: 2, ramSlots: 4, m2Slots: 3 },
    { url: 'https://www.amazon.com/ASUS-TUF-B650E-PLUS-Motherboard-DisplayPort/dp/B0F7VZS6FG', pcieSlots: 3, ramSlots: 4, m2Slots: 3 },
    { url: 'https://www.amazon.com/ASUS-ROG-B650E-F-LGA1718-Motherboard/dp/B0BHMTYZKZ', pcieSlots: 2, ramSlots: 4, m2Slots: 3 },
    { url: 'https://www.amazon.com/GIGABYTE-B650E-AORUS-ELITE-ICE/dp/B0CTNXBRJV', pcieSlots: 3, ramSlots: 4, m2Slots: 4 },
    { url: 'https://www.amazon.com/GIGABYTE-B650I-AORUS-Mini-ITX-Motherboard/dp/B083R826VW', pcieSlots: 1, ramSlots: 2, m2Slots: 3 },
    { url: 'https://www.amazon.com/GIGABYTE-X570-AORUS-PCIe4-0-Motherboard/dp/B07SVRZGMX', pcieSlots: 2, ramSlots: 4, m2Slots: 2 },
    { url: 'https://www.amazon.com/Motherboard-X570-Gaming-Socket-Shield/dp/B0FG7N1X7D', pcieSlots: 2, ramSlots: 4, m2Slots: 2 },
    { url: 'https://www.amazon.com/Sparepart-Motherboard-B650-Socket-W128564084/dp/B0C3R2TXHJ', pcieSlots: 2, ramSlots: 4, m2Slots: 2 },
    { url: 'https://www.amazon.com/B550-Gaming-Plus-Motherboard-Ryzen/dp/B0FBTB431C', pcieSlots: 2, ramSlots: 4, m2Slots: 2 },
    { url: 'https://www.amazon.com/ASRock-Riptide-Ryzen-Soket-Motherboard/dp/B09BDCCPQM', pcieSlots: 3, ramSlots: 4, m2Slots: 2 },
    { url: 'https://www.amazon.com/ASUS-II-RyzenTM-Motherboard-Addressable/dp/B0B5M97W1T', pcieSlots: 1, ramSlots: 4, m2Slots: 2 },
    { url: 'https://www.amazon.com/ASUS-Micro-ATX-Motherboard-Type-C%C2%AE-FlashbackTM/dp/B0C8RYXSQB', pcieSlots: 4, ramSlots: 4, m2Slots: 2 },
    { url: 'https://www.amazon.com/ASUS-Strix-B550-XE-Gaming-WiFi/dp/B08NRV2RQH', pcieSlots: 3, ramSlots: 4, m2Slots: 6 },
    { url: 'https://www.amazon.com/ROG-B550-F-II-Motherboard-Addressable/dp/B09GP7P1XS', pcieSlots: 2, ramSlots: 4, m2Slots: 4 },
    { url: 'https://www.amazon.com/ASUS-TUF-A520M-PLUS-Motherboard-DisplayPort/dp/B0997N7P12', pcieSlots: 1, ramSlots: 4, m2Slots: 1 },
    { url: 'https://www.amazon.com/Gigabyte-A520I-AC-Interfaces-Motherboard/dp/B08F7BHDLY', pcieSlots: 1, ramSlots: 2, m2Slots: 4 },
    { url: 'https://www.amazon.com/Gigabyte-B550-Gaming-Ryzen-Motherboard/dp/B08LGKGBKT', pcieSlots: 2, ramSlots: 4, m2Slots: 2 },
    { url: 'https://www.amazon.com/B550I-AORUS-PRO-DisplayPort-Motherboard/dp/B089FWWN62', pcieSlots: 1, ramSlots: 2, m2Slots: 2 }
];

function extractProductId(url) {
    // Extract the Amazon product ID from the URL (the part after /dp/)
    const match = url.match(/\/dp\/([A-Z0-9]+)/);
    return match ? match[1] : null;
}

async function updateMotherboardSlots() {
    try {
        console.log('\n=== Updating Motherboard Slot Counts ===\n');

        await connectToDatabase();
        const db = getDatabase();

        let totalProcessed = 0;
        let totalUpdated = 0;
        let totalNotFound = 0;

        // Get all motherboard collections
        const collections = await db.listCollections().toArray();
        const motherboardCollections = collections.filter(c =>
            c.name.startsWith('motherboards') || c.name === 'motherboards'
        ).map(c => c.name);

        console.log(`Found motherboard collections: ${motherboardCollections.join(', ')}\n`);

        for (const slotData of motherboardSlotData) {
            totalProcessed++;
            const productId = extractProductId(slotData.url);

            if (!productId) {
                console.log(`⚠️  Could not extract product ID from: ${slotData.url}`);
                totalNotFound++;
                continue;
            }

            let found = false;

            // Search through all motherboard collections
            for (const collectionName of motherboardCollections) {
                const motherboard = await db.collection(collectionName).findOne({
                    sourceUrl: { $regex: productId, $options: 'i' }
                });

                if (motherboard) {
                    await db.collection(collectionName).updateOne(
                        { _id: motherboard._id },
                        {
                            $set: {
                                pcieSlotCount: slotData.pcieSlots,
                                memorySlots: slotData.ramSlots,
                                m2SlotCount: slotData.m2Slots,
                                updatedAt: new Date()
                            }
                        }
                    );

                    const name = motherboard.name || motherboard.title || 'Unknown';
                    console.log(`✅ ${name}`);
                    console.log(`   PCIe: ${slotData.pcieSlots}, RAM: ${slotData.ramSlots}, M.2: ${slotData.m2Slots}\n`);

                    totalUpdated++;
                    found = true;
                    break;
                }
            }

            if (!found) {
                console.log(`⚠️  Not found in database: ${productId}`);
                console.log(`   URL: ${slotData.url}\n`);
                totalNotFound++;
            }
        }

        console.log('\n' + '='.repeat(70));
        console.log('SUMMARY');
        console.log('='.repeat(70));
        console.log(`Total Processed: ${totalProcessed}`);
        console.log(`Successfully Updated: ${totalUpdated}`);
        console.log(`Not Found: ${totalNotFound}`);
        console.log('='.repeat(70));

        console.log('\n✅ Motherboard slot counts update complete!\n');

        process.exit(0);

    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

updateMotherboardSlots();
