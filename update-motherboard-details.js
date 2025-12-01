const mongoose = require('mongoose');
require('dotenv').config();

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/pcbuilder');
    console.log('Connected to MongoDB');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

const updateMotherboardDetails = async () => {
  try {
    await connectDB();
    const db = mongoose.connection.db;
    const collection = db.collection('motherboards');

    // Detailed motherboard specifications
    const motherboardDetails = [
      {
        search: "ASUS ROG STRIX B860-I GAMING WIFI",
        formFactor: "Mini-ITX",
        memoryType: ["DDR5"],
        wifi: true,
        pcieSlots: 1,
        memorySlots: 2,
        m2Slots: 1,
        url: "https://www.amazon.com/ASUS-STRIX-B860-I-GAMING-WIFI/dp/B0DQ68TV3W"
      },
      {
        search: "ASRock Intel Core Ultra Z890",
        formFactor: "Mini-ITX",
        memoryType: ["DDR5"],
        wifi: true,
        pcieSlots: 1,
        memorySlots: 2,
        m2Slots: 2,
        url: "https://www.amazon.com/ASRock-LGA1851-RL-ILM-Motherboard-Phantom/dp/B0DJPXWMG8"
      },
      {
        search: "GIGABYTE B860I AORUS PRO ICE",
        formFactor: "Mini-ITX",
        memoryType: ["DDR5"],
        wifi: true,
        pcieSlots: 1,
        memorySlots: 2,
        m2Slots: 2,
        url: "https://www.amazon.com/GIGABYTE-B860I-AORUS-PRO-ICE/dp/B0DQLK2RF3"
      },
      {
        search: "ASUS TUF Gaming Z790-Plus WiFi",
        formFactor: "ATX",
        memoryType: ["DDR5"],
        wifi: true,
        pcieSlots: 2,
        memorySlots: 4,
        m2Slots: 4,
        url: "https://www.amazon.com/ASUS-TUF-Intel%C2%AE12th-Motherboard-Thunderbolt/dp/B0BQD58D96"
      },
      {
        search: "GIGABYTE Z790 AORUS Elite AX",
        formFactor: "ATX",
        memoryType: ["DDR5"],
        wifi: true,
        pcieSlots: 3,
        memorySlots: 4,
        m2Slots: 4,
        url: "https://www.amazon.com/GIGABYTE-Z790-Q-Flash-EZ-Latch-Motherboard/dp/B0BH9DXY38"
      },
      {
        search: "NZXT N7 Z790",
        formFactor: "ATX",
        memoryType: ["DDR5"],
        wifi: true,
        pcieSlots: 3,
        memorySlots: 4,
        m2Slots: 3,
        url: "https://www.amazon.com/NZXT-Z790-Motherboard-N7-Z79XT-W1-connectivity/dp/B0BFZXDVNY"
      },
      {
        search: "ASRock Z790 Riptide WiFi",
        formFactor: "ATX",
        memoryType: ["DDR5"],
        wifi: true,
        pcieSlots: 2,
        memorySlots: 4,
        m2Slots: 5,
        url: "https://www.amazon.com/Asrock-Z790RiptideWiFi-Asrockz790-Riptide-Wifi/dp/B0CL6K7T51"
      },
      {
        search: "Asrock B760M PG Sonic WiFi",
        formFactor: "Micro-ATX",
        memoryType: ["DDR5"],
        wifi: true,
        pcieSlots: 1,
        memorySlots: 4,
        m2Slots: 3,
        url: "https://www.amazon.com/Asrock-B760M-Sonic-Intel-Micro/dp/B0BQWPLFNM"
      },
      {
        search: "GIGABYTE B760M Gaming Plus WiFi DDR4",
        formFactor: "Micro-ATX",
        memoryType: ["DDR4"],
        wifi: true,
        pcieSlots: 1,
        memorySlots: 4,
        m2Slots: 2,
        url: "https://www.amazon.com/GIGABYTE-B760M-DDR4-Motherboard-EZ-Latch/dp/B0D54QJ9CJ"
      },
      {
        search: "ASUS Prime B760M-A AX",
        formFactor: "Micro-ATX",
        memoryType: ["DDR5"],
        wifi: true,
        pcieSlots: 4,
        memorySlots: 4,
        m2Slots: 2,
        url: "https://www.amazon.com/ASUS-AX-microATX-Motherboard-Realtek/dp/B0BZTB5LKJ"
      },
      {
        search: "ASRock MB ASROCK | Z790M-ITX WiFi",
        formFactor: "Mini-ITX",
        memoryType: ["DDR5"],
        wifi: true,
        pcieSlots: 1,
        memorySlots: 2,
        m2Slots: 2,
        url: "https://www.amazon.com/ASRock-ASROCK-Z790M-ITX-WiFi-Motherboard/dp/B0BJF1H163"
      },
      {
        search: "ASRock B760 Pro RS",
        formFactor: "ATX",
        memoryType: ["DDR5"],
        wifi: false,
        pcieSlots: 3,
        memorySlots: 4,
        m2Slots: 3,
        url: "https://www.amazon.com/MB-ASRock-B760-Pro-RS/dp/B0BQWRCNT8"
      },
      {
        search: "TUF Gaming B760M-PLUS WiFi II",
        formFactor: "Micro-ATX",
        memoryType: ["DDR5"],
        wifi: true,
        pcieSlots: 1,
        memorySlots: 4,
        m2Slots: 6,
        url: "https://www.amazon.com/TUF-GAMING-B760M-PLUS-WIFI-motherboard/dp/B0CSPCVTV1"
      },
      {
        search: "ASUS Prime Z690-P WiFi",
        formFactor: "ATX",
        memoryType: ["DDR5"],
        wifi: true,
        pcieSlots: 3,
        memorySlots: 4,
        m2Slots: 3,
        url: "https://www.amazon.com/ASUS-Z690-P-LGA1700-Motherboard-Thunderbolt/dp/B09J1S3K36"
      },
      {
        search: "MSI PRO Z690-A DDR4 ProSeries",
        formFactor: "ATX",
        memoryType: ["DDR4"],
        wifi: false,
        pcieSlots: 3,
        memorySlots: 4,
        m2Slots: 4,
        url: "https://www.amazon.com/MSI-DDR4-ProSeries-Motherboard-Socket/dp/B09GLD6LYW"
      },
      {
        search: "MSI PRO Z690-A WIFI DDR4 motherboard",
        formFactor: "ATX",
        memoryType: ["DDR4"],
        wifi: true,
        pcieSlots: 3,
        memorySlots: 4,
        m2Slots: 4,
        url: "https://www.amazon.com/PRO-Z690-WIFI-DDR4-motherboard/dp/B09HK67Z3N"
      },
      {
        search: "GIGABYTE Z690 AORUS ULTRA",
        formFactor: "ATX",
        memoryType: ["DDR5"],
        wifi: true,
        pcieSlots: 3,
        memorySlots: 4,
        m2Slots: 4,
        url: "https://www.amazon.com/GIGABYTE-Z690-AORUS-Gen2X2-Motherboard/dp/B09JZFT4SN"
      },
      {
        search: "ASUS Prime B660-PLUS D4",
        formFactor: "ATX",
        memoryType: ["DDR4"],
        wifi: false,
        pcieSlots: 2,
        memorySlots: 4,
        m2Slots: 3,
        url: "https://www.amazon.com/ASUS-B660-PLUS-D4-Motherboard-Thunderbolt/dp/B09NWDQ1TH"
      },
      {
        search: "MSI PRO B660M-A CEC WiFi",
        formFactor: "Micro-ATX",
        memoryType: ["DDR4"],
        wifi: true,
        pcieSlots: 4,
        memorySlots: 4,
        m2Slots: 1,
        url: "https://www.amazon.com/MSI-PRO-CEC-WiFi-DDR4/dp/B0DF8CPSKZ"
      },
      {
        search: "GIGABYTE B660 DS3H AX DDR4",
        formFactor: "ATX",
        memoryType: ["DDR4"],
        wifi: true,
        pcieSlots: 5,
        memorySlots: 4,
        m2Slots: 2,
        url: "https://www.amazon.com/GIGABYTE-Motherboard-Type-C-2-5GbE-Renewed/dp/B0F8N128CW"
      },
      {
        search: "GIGABYTE B660 DS3H 1700",
        formFactor: "ATX",
        memoryType: ["DDR4"],
        wifi: false,
        pcieSlots: 5,
        memorySlots: 4,
        m2Slots: 2,
        url: "https://www.amazon.com/GIGABYTE-B660-DS3H-1700-ATX/dp/B09NWDQ1TH"
      },
      {
        search: "ASROCK H670M PRO RS",
        formFactor: "Micro-ATX",
        memoryType: ["DDR4"],
        wifi: false,
        pcieSlots: 2,
        memorySlots: 4,
        m2Slots: 2,
        url: "https://www.amazon.com/ASROCK-Socket-LGA1700-USB3-2-Motherboard/dp/B09PYQP8WH"
      },
      {
        search: "ASUS PRIME H610I-PLUS D4",
        formFactor: "Mini-ITX",
        memoryType: ["DDR4"],
        wifi: false,
        pcieSlots: 1,
        memorySlots: 2,
        m2Slots: 1,
        url: "https://www.amazon.com/ASUS-PRIME-H610I-PLUS-Motherboard-Mono-out/dp/B09XJQTQN1"
      },
      {
        search: "GIGABYTE B850M AORUS Elite WIFI6E ICE",
        formFactor: "Micro-ATX",
        memoryType: ["DDR5"],
        wifi: true,
        pcieSlots: 2,
        memorySlots: 4,
        m2Slots: 2,
        url: "https://www.amazon.com/GIGABYTE-B850M-AORUS-WIFI6E-ICE/dp/B0DQLJGTRM"
      },
      {
        search: "ASUS ROG Strix B850-I Gaming WiFi",
        formFactor: "Mini-ITX",
        memoryType: ["DDR5"],
        wifi: true,
        pcieSlots: 1,
        memorySlots: 2,
        m2Slots: 2,
        url: "https://www.amazon.com/ASUS-ROG-B850-I-Motherboard-Overclocking/dp/B0DHCQ1MPZ"
      },
      {
        search: "ASRock AMD B850i Lightning WiFi",
        formFactor: "Mini-ITX",
        memoryType: ["DDR5"],
        wifi: true,
        pcieSlots: 1,
        memorySlots: 2,
        m2Slots: 1,
        url: "https://www.amazon.com/ASRock-Lightning-WiFi-Motherboard-Flashback/dp/B0DRTVR12D"
      },
      {
        search: "GIGABYTE B650 Eagle AX",
        formFactor: "ATX",
        memoryType: ["DDR5"],
        wifi: true,
        pcieSlots: 4,
        memorySlots: 4,
        m2Slots: 3,
        url: "https://www.amazon.com/GIGABYTE-B650-AX-Triple-Realtek/dp/B083TZ68H1"
      },
      {
        search: "ASUS TUF GAMING B650-PLUS WIFI",
        formFactor: "ATX",
        memoryType: ["DDR5"],
        wifi: true,
        pcieSlots: 2,
        memorySlots: 4,
        m2Slots: 3,
        url: "https://www.amazon.com/ASUS-TUF-B650-PLUS-Motherboard-Ethernet/dp/B0BHN7GGBQ"
      },
      {
        search: "ASUS TUF Gaming X670E-PLUS WiFi",
        formFactor: "ATX",
        memoryType: ["DDR5"],
        wifi: true,
        pcieSlots: 2,
        memorySlots: 4,
        m2Slots: 4,
        url: "https://www.amazon.com/ASUS-TUF-X670E-PLUS-Motherboard-Lighting/dp/B0BDTJFHKJ"
      },
      {
        search: "GIGABYTE X670 AORUS Elite AX",
        formFactor: "ATX",
        memoryType: ["DDR5"],
        wifi: true,
        pcieSlots: 2,
        memorySlots: 4,
        m2Slots: 4,
        url: "https://www.amazon.com/GIGABYTE-X670-AORUS-AX-Motherboard/dp/B0BF7FT26Z"
      },
      {
        search: "MSI MPG X670E Carbon WiFi",
        formFactor: "ATX",
        memoryType: ["DDR5"],
        wifi: true,
        pcieSlots: 3,
        memorySlots: 4,
        m2Slots: 3,
        url: "https://www.amazon.com/MSI-Computer-Motherboard-Supports-Bluetooth/dp/B0CFS6ZST7"
      },
      {
        search: "MSI PRO X670-P WiFi",
        formFactor: "ATX",
        memoryType: ["DDR5"],
        wifi: true,
        pcieSlots: 3,
        memorySlots: 4,
        m2Slots: 4,
        url: "https://www.amazon.com/MSI-X670-P-ProSeries-Motherboard-Wi-Fi/dp/B0B6Q1N477"
      },
      {
        search: "ASUS Prime X670-P WiFi",
        formFactor: "ATX",
        memoryType: ["DDR5"],
        wifi: true,
        pcieSlots: 3,
        memorySlots: 4,
        m2Slots: 3,
        url: "https://www.amazon.com/ASUS-X670-P-Motherboard-Type-C%C2%AE-Ethernet/dp/B0BDTLXWQM"
      },
      {
        search: "ASRock B650M PG Lightning WiFi",
        formFactor: "Micro-ATX",
        memoryType: ["DDR5"],
        wifi: true,
        pcieSlots: 2,
        memorySlots: 4,
        m2Slots: 3,
        url: "https://www.amazon.com/ASRock-B650M-Lightning-Socket-Type-C/dp/B0CJT9KKSD"
      },
      {
        search: "ASUS TUF Gaming B650E-PLUS WiFi",
        formFactor: "ATX",
        memoryType: ["DDR5"],
        wifi: true,
        pcieSlots: 3,
        memorySlots: 4,
        m2Slots: 3,
        url: "https://www.amazon.com/ASUS-TUF-B650E-PLUS-Motherboard-DisplayPort/dp/B0F7VZS6FG"
      },
      {
        search: "ASUS ROG Strix B650E-F Gaming WiFi",
        formFactor: "ATX",
        memoryType: ["DDR5"],
        wifi: true,
        pcieSlots: 2,
        memorySlots: 4,
        m2Slots: 3,
        url: "https://www.amazon.com/ASUS-ROG-B650E-F-LGA1718-Motherboard/dp/B0BHMTYZKZ"
      },
      {
        search: "GIGABYTE B650E AORUS Elite X AX",
        formFactor: "ATX",
        memoryType: ["DDR5"],
        wifi: true,
        pcieSlots: 3,
        memorySlots: 4,
        m2Slots: 4,
        url: "https://www.amazon.com/GIGABYTE-B650E-AORUS-ELITE-ICE/dp/B0CTNXBRJV"
      },
      {
        search: "MSI B650 Gaming Plus WiFi",
        formFactor: "ATX",
        memoryType: ["DDR5"],
        wifi: true,
        pcieSlots: 2,
        memorySlots: 4,
        m2Slots: 2,
        url: "https://www.amazon.com/Sparepart-Motherboard-B650-Socket-W128564084/dp/B0C3R2TXHJ"
      },
      {
        search: "GIGABYTE B650I AORUS Ultra",
        formFactor: "Mini-ITX",
        memoryType: ["DDR5"],
        wifi: true,
        pcieSlots: 1,
        memorySlots: 2,
        m2Slots: 3,
        url: "https://www.amazon.com/GIGABYTE-B650I-AORUS-Mini-ITX-Motherboard/dp/B083R826VW"
      },
      {
        search: "Gigabyte X570 AORUS Elite",
        formFactor: "ATX",
        memoryType: ["DDR4"],
        wifi: false,
        pcieSlots: 2,
        memorySlots: 4,
        m2Slots: 2,
        url: "https://www.amazon.com/GIGABYTE-X570-AORUS-PCIe4-0-Motherboard/dp/B07SVRZGMX"
      },
      {
        search: "Motherboard Fit for MSI MPG X570 Gaming Plus",
        formFactor: "ATX",
        memoryType: ["DDR4"],
        wifi: false,
        pcieSlots: 2,
        memorySlots: 4,
        m2Slots: 2,
        url: "https://www.amazon.com/Motherboard-X570-Gaming-Socket-Shield/dp/B0FG7N1X7D"
      },
      {
        search: "MSI MPG B550 Gaming Plus V1",
        formFactor: "ATX",
        memoryType: ["DDR4"],
        wifi: false,
        pcieSlots: 2,
        memorySlots: 4,
        m2Slots: 2,
        url: "https://www.amazon.com/B550-Gaming-Plus-Motherboard-Ryzen/dp/B0FBTB431C"
      }
    ];

    let updated = 0;
    let notFound = 0;

    console.log('\nUpdating motherboard detailed specifications...\n');
    console.log('='.repeat(80));

    for (const detail of motherboardDetails) {
      const updateData = {
        formFactor: detail.formFactor,
        memoryType: detail.memoryType,
        memorySlots: detail.memorySlots,
        imageUrl: detail.url,
        updatedAt: new Date()
      };

      // Build networking object
      updateData['networking.wifi'] = detail.wifi;

      // Add M.2 slot count
      if (detail.m2Slots) {
        updateData.m2SlotCount = detail.m2Slots;
      }

      // Add PCIe slot count
      if (detail.pcieSlots) {
        updateData.pcieSlotCount = detail.pcieSlots;
      }

      const result = await collection.updateOne(
        { name: { $regex: detail.search, $options: 'i' } },
        { $set: updateData }
      );

      if (result.matchedCount > 0) {
        console.log(`✅ Updated: ${detail.search}`);
        console.log(`   ${detail.formFactor} | ${detail.memoryType.join('/')} | WiFi: ${detail.wifi ? 'Yes' : 'No'}`);
        console.log(`   PCIe: ${detail.pcieSlots} | RAM: ${detail.memorySlots} | M.2: ${detail.m2Slots}`);
        updated++;
      } else {
        console.log(`❌ Not found: ${detail.search}`);
        notFound++;
      }
    }

    console.log('\n' + '='.repeat(80));
    console.log(`\n✅ Successfully updated: ${updated} motherboards`);
    console.log(`❌ Not found: ${notFound} motherboards`);
    console.log(`\nTotal processed: ${motherboardDetails.length}\n`);

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('Error updating motherboard details:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
};

updateMotherboardDetails();
