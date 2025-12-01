const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/pcbuilder');
    console.log('Connected to MongoDB');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

const updateChipsets = async () => {
  try {
    await connectDB();
    const db = mongoose.connection.db;
    const collection = db.collection('motherboards');

    // Chipset mapping based on motherboard names
    const chipsetUpdates = [
      // Intel Motherboards
      { search: "ASUS TUF Gaming Z790-Plus WiFi", chipset: "Z790", socket: "LGA1700" },
      { search: "GIGABYTE Z790 AORUS Elite AX", chipset: "Z790", socket: "LGA1700" },
      { search: "NZXT N7 Z790", chipset: "Z790", socket: "LGA1700" },
      { search: "ASRock Z790 Riptide WiFi", chipset: "Z790", socket: "LGA1700" },
      { search: "Asrock B760M PG Sonic WiFi", chipset: "B760", socket: "LGA1700" },
      { search: "GIGABYTE B760M Gaming Plus WiFi DDR4", chipset: "B760", socket: "LGA1700" },
      { search: "ASUS Prime B760M-A AX", chipset: "B760", socket: "LGA1700" },
      { search: "ASRock MB ASROCK | Z790M-ITX WiFi", chipset: "Z790", socket: "LGA1700" },
      { search: "ASUS ROG STRIX B860-I GAMING WIFI", chipset: "B860", socket: "LGA1851" },
      { search: "ASRock Intel Core Ultra Z890", chipset: "Z890", socket: "LGA1851" },
      { search: "ASRock B760 Pro RS", chipset: "B760", socket: "LGA1700" },
      { search: "TUF Gaming B760M-PLUS WiFi II", chipset: "B760", socket: "LGA1700" },
      { search: "ASUS Prime Z690-P WiFi", chipset: "Z690", socket: "LGA1700" },
      { search: "MSI PRO Z690-A DDR4 ProSeries", chipset: "Z690", socket: "LGA1700" },
      { search: "MSI PRO Z690-A WIFI DDR4 motherboard", chipset: "Z690", socket: "LGA1700" },
      { search: "GIGABYTE Z690 AORUS ULTRA", chipset: "Z690", socket: "LGA1700" },
      { search: "ASUS Prime B660-PLUS D4", chipset: "B660", socket: "LGA1700" },
      { search: "MSI PRO B660M-A CEC WiFi", chipset: "B660", socket: "LGA1700" },
      { search: "GIGABYTE B660 DS3H AX DDR4", chipset: "B660", socket: "LGA1700" },
      { search: "GIGABYTE B660 DS3H 1700", chipset: "B660", socket: "LGA1700" },
      { search: "ASROCK H670M PRO RS", chipset: "H670", socket: "LGA1700" },
      { search: "ASUS PRIME H610I-PLUS D4", chipset: "H610", socket: "LGA1700" },
      { search: "GIGABYTE B860I AORUS PRO ICE", chipset: "B860", socket: "LGA1851" },

      // AMD AM5 Motherboards
      { search: "GIGABYTE B850M AORUS Elite WIFI6E ICE", chipset: "B850", socket: "AM5" },
      { search: "ASUS ROG Strix B850-I Gaming WiFi", chipset: "B850", socket: "AM5" },
      { search: "ASRock AMD B850i Lightning WiFi", chipset: "B850", socket: "AM5" },
      { search: "GIGABYTE B650 Eagle AX", chipset: "B650", socket: "AM5" },
      { search: "ASUS TUF GAMING B650-PLUS WIFI", chipset: "B650", socket: "AM5" },
      { search: "ASUS TUF Gaming X670E-PLUS WiFi", chipset: "X670E", socket: "AM5" },
      { search: "GIGABYTE X670 AORUS Elite AX", chipset: "X670", socket: "AM5" },
      { search: "MSI MPG X670E Carbon WiFi", chipset: "X670E", socket: "AM5" },
      { search: "MSI PRO X670-P WiFi", chipset: "X670", socket: "AM5" },
      { search: "ASUS Prime X670-P WiFi", chipset: "X670", socket: "AM5" },
      { search: "ASRock B650M PG Lightning WiFi", chipset: "B650", socket: "AM5" },
      { search: "ASUS TUF Gaming B650E-PLUS WiFi", chipset: "B650E", socket: "AM5" },
      { search: "ASUS ROG Strix B650E-F Gaming WiFi", chipset: "B650E", socket: "AM5" },
      { search: "GIGABYTE B650E AORUS Elite X AX", chipset: "B650E", socket: "AM5" },
      { search: "MSI B650 Gaming Plus WiFi", chipset: "B650", socket: "AM5" },
      { search: "ASUS Prime B650M-A AX", chipset: "B650", socket: "AM5" },
      { search: "GIGABYTE B650I AORUS Ultra", chipset: "B650", socket: "AM5" },

      // AMD AM4 Motherboards
      { search: "GIGABYTE B550I AORUS PRO AX", chipset: "B550", socket: "AM4" },
      { search: "ASUS Prime B550M-A WiFi II", chipset: "B550", socket: "AM4" },
      { search: "Asus ROG Strix B550-F Gaming WiFi II", chipset: "B550", socket: "AM4" },
      { search: "MSI MPG B550 Gaming Plus V1", chipset: "B550", socket: "AM4" },
      { search: "Gigabyte B550 Gaming X V2", chipset: "B550", socket: "AM4" },
      { search: "ASRock AMD B550 PG Riptide", chipset: "B550", socket: "AM4" },
      { search: "Gigabyte X570 AORUS Elite", chipset: "X570", socket: "AM4" },
      { search: "Motherboard Fit for MSI MPG X570 Gaming Plus", chipset: "X570", socket: "AM4" },
      { search: "ASUS ROG Strix AMD AM4 ATX Motherboard", chipset: "X570", socket: "AM4" },
      { search: "ASRock Rack X570D4U-2L2T", chipset: "X570", socket: "AM4" },
      { search: "ASUS TUF Gaming A520M-PLUS", chipset: "A520", socket: "AM4" },
      { search: "Gigabyte A520I AC", chipset: "A520", socket: "AM4" },
      { search: "MINISFORUM BD790I X3D", chipset: "X790", socket: "AM5" }
    ];

    let updated = 0;
    let notFound = 0;

    console.log('\nUpdating motherboard chipsets...\n');
    console.log('='.repeat(80));

    for (const update of chipsetUpdates) {
      const result = await collection.updateOne(
        { name: { $regex: update.search, $options: 'i' } },
        {
          $set: {
            chipset: update.chipset,
            socket: update.socket,
            updatedAt: new Date()
          }
        }
      );

      if (result.matchedCount > 0) {
        console.log(`✅ Updated: ${update.search}`);
        console.log(`   Chipset: ${update.chipset} | Socket: ${update.socket}`);
        updated++;
      } else {
        console.log(`❌ Not found: ${update.search}`);
        notFound++;
      }
    }

    console.log('\n' + '='.repeat(80));
    console.log(`\n✅ Successfully updated: ${updated} motherboards`);
    console.log(`❌ Not found: ${notFound} motherboards`);
    console.log(`\nTotal processed: ${chipsetUpdates.length}\n`);

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('Error updating chipsets:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
};

updateChipsets();
