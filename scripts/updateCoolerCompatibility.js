const { MongoClient } = require('mongodb');

const uri = 'mongodb://localhost:27017';
const client = new MongoClient(uri);

async function updateCoolerCompatibility() {
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB\n');

    const db = client.db('pcbuilder');
    const collection = db.collection('coolers');

    // Items to remove (not actual coolers)
    const itemsToRemove = [
      /CPU Cooler Cooling Fan for Noctua NH-D15S/i,
      /CPU Cooling Fan for Noctua NH-L9i/i,
      /Thermalright TL-S12W X3 CPU Fan/i
    ];

    // Remove non-cooler items
    console.log('🗑️  Removing non-cooler items...\n');
    for (const pattern of itemsToRemove) {
      const result = await collection.deleteMany({
        $or: [
          { name: pattern },
          { title: pattern }
        ]
      });
      console.log(`   Removed ${result.deletedCount} item(s) matching pattern: ${pattern}`);
    }

    // Socket compatibility data
    const compatibilityData = [
      { name: /CORSAIR iCUE Link Titan 360 RX/i, sockets: ['LGA1851', 'LGA1700', 'AM5', 'AM4'] },
      { name: /ARCTIC Liquid Freezer III Pro 240/i, sockets: ['LGA1851', 'LGA1700', 'AM5', 'AM4'] },
      { name: /NZXT Kraken 360 RGB/i, sockets: ['LGA1851', 'LGA1700', 'LGA1200', 'LGA115X', 'AM5', 'AM4'] },
      { name: /Cooler Master MasterLiquid 360L Core/i, sockets: ['LGA1700', 'LGA1200', 'AM5', 'AM4'] },
      { name: /Thermalright FW 360.*White/i, sockets: ['LGA1700', 'AM5', 'AM4'] },
      { name: /Thermalright FW 240 SE/i, sockets: ['LGA1851', 'LGA1700', 'AM5', 'AM4'] },
      { name: /Thermalright Aqua Elite 120 V3/i, sockets: ['LGA1150', 'LGA1151', 'LGA1155', 'LGA1156', 'LGA1200', 'AM4', 'AM5'] },
      { name: /Corsair.*H150i Elite CAPELLIX XT/i, sockets: ['LGA1700', 'LGA1200', 'LGA115X', 'LGA2066', 'AM5', 'AM4'] },
      { name: /CORSAIR H100i RGB PLATINUM SE/i, sockets: ['LGA115X', 'LGA2066', 'AM4', 'TR4'] },
      { name: /CORSAIR iCUE Link H170i.*Renewed/i, sockets: ['LGA1700', 'AM5'] },
      { name: /CORSAIR iCUE H170i Elite.*Renewed/i, sockets: ['LGA1700', 'LGA1200', 'LGA115X', 'LGA2066', 'AM5', 'AM4'] },
      { name: /CoolerMaster MasterLiquid ML240L RGB V2/i, sockets: ['LGA1700', 'LGA1200', 'AM5', 'AM4'] },
      { name: /ASUS ROG Ryujin III 360/i, sockets: ['LGA1700', 'LGA1200', 'LGA115X', 'AM5', 'AM4'] },
      { name: /NZXT Kraken M22/i, sockets: ['LGA115X', 'LGA1200', 'LGA1700', 'AM4'] },
      { name: /Cooler Master MasterLiquid Atmos 240/i, sockets: ['LGA1700', 'AM5'] },
      { name: /Cooler Master 360 Core II/i, sockets: ['LGA1851', 'LGA1700', 'AM5', 'AM4'] },
      { name: /ID-COOLING FROSTFLOW X 280/i, sockets: ['LGA1700', 'LGA1200', 'LGA115X', 'LGA2066', 'AM5', 'AM4'] },
      { name: /Corsair iCUE Link Titan 280 RX/i, sockets: ['LGA1851', 'LGA1700', 'AM5', 'AM4'] },
      { name: /be quiet! Pure Loop 2 FX 280/i, sockets: ['LGA1700', 'LGA1200', 'LGA115X', 'AM5', 'AM4'] },
      { name: /ASUS ROG Strix LC II 280 ARGB/i, sockets: ['LGA1150', 'LGA1151', 'LGA1155', 'LGA1156', 'LGA1200', 'LGA2066', 'AM4', 'TR4'] },
      { name: /Thermalright Aqua Elite 240 V3/i, sockets: ['LGA1150', 'LGA1151', 'LGA1155', 'LGA1156', 'LGA1200', 'LGA2011', 'LGA1700', 'AM4', 'AM5'] },
      { name: /be quiet! Pure Loop 2 280mm.*BW018/i, sockets: ['LGA1700', 'LGA1200', 'LGA1150', 'LGA1151', 'LGA1155', 'AM5', 'AM4'] },
      { name: /Cooler Master MasterLiquid ML240R RGB/i, sockets: ['LGA115X', 'LGA1200', 'LGA1700', 'AM4'] },
      { name: /Corsair H60x RGB Elite.*Renewed/i, sockets: ['LGA1700', 'LGA1200', 'LGA115X', 'LGA2066', 'AM5', 'AM4'] },
      { name: /Thermalright Peerless Assassin 120 Digital/i, sockets: ['LGA1851', 'LGA1700', 'LGA1150', 'LGA1151', 'LGA1200', 'AM5', 'AM4'] },
      { name: /Cooler Master 240 Core II/i, sockets: ['LGA1851', 'LGA1700', 'AM5', 'AM4'] },
      { name: /MSI MAG Coreliquid A13 240/i, sockets: ['LGA1851', 'LGA1700', 'AM5', 'AM4'] },
      { name: /Corsair.*H100i Elite LCD XT.*Renewed/i, sockets: ['LGA1700', 'AM5', 'AM4'] },
      { name: /ASUS ROG Strix LC II 240/i, sockets: ['LGA115X', 'LGA1200', 'LGA1700', 'LGA2066', 'AM4', 'TR4'] },
      { name: /Cooler Master MasterLiquid Pro 120/i, sockets: ['LGA115X', 'LGA1200', 'AM4'] },
      { name: /Cooler Master MasterLiquid 240L Core/i, sockets: ['LGA1700', 'LGA1200', 'AM5', 'AM4'] },
      { name: /Thermaltake TH120 ARGB.*V2/i, sockets: ['LGA1700', 'LGA1200', 'LGA115X', 'AM5', 'AM4'] },
      { name: /Noctua NH-D15 chromax/i, sockets: ['LGA1700', 'LGA1200', 'LGA115X', 'AM5', 'AM4'] },
      { name: /Noctua NH-D15.*Premium.*Brown/i, sockets: ['LGA1700', 'LGA1200', 'LGA115X', 'AM5', 'AM4'] },
      { name: /be quiet! Shadow Rock Slim 2/i, sockets: ['LGA1700', 'LGA1200', 'LGA1150', 'LGA1151', 'LGA1155', 'LGA2066', 'AM4', 'AM5'] },
      { name: /Thermalright PS120SE/i, sockets: ['LGA1851', 'LGA1700', 'LGA1150', 'LGA1151', 'LGA1200', 'AM5', 'AM4'] },
      { name: /Cooler Master Hyper 212 Black(?!.*Halo)/i, sockets: ['LGA1851', 'LGA1700', 'LGA1200', 'AM5', 'AM4'] },
      { name: /Noctua NH-L12 Ghost/i, sockets: ['LGA1700', 'LGA1200', 'LGA115X', 'AM4', 'AM5'] },
      { name: /be quiet! Dark Rock 5/i, sockets: ['LGA1851', 'LGA1700', 'LGA1200', 'LGA115X', 'AM5', 'AM4'] },
      { name: /be quiet! Pure Rock 3 Black/i, sockets: ['LGA1700', 'LGA1200', 'LGA1150', 'LGA1151', 'AM5', 'AM4'] },
      { name: /be quiet! Dark Rock Elite/i, sockets: ['LGA1851', 'LGA1700', 'LGA1200', 'LGA115X', 'AM5', 'AM4'] },
      { name: /Scythe Kotetsu Mark II/i, sockets: ['LGA1700', 'LGA1200', 'LGA115X', 'AM5', 'AM4'] },
      { name: /Cooler Master Hyper 212 Halo Black/i, sockets: ['LGA1851', 'LGA1700', 'LGA1200', 'AM5', 'AM4'] },
      { name: /ID-COOLING FROZN A410/i, sockets: ['LGA1851', 'LGA1700', 'LGA1200', 'LGA115X', 'AM5', 'AM4'] },
      { name: /Thermalright Peerless Assassin 120 ARGB Black V3/i, sockets: ['LGA1851', 'LGA1700', 'LGA1150', 'LGA1151', 'LGA1200', 'LGA2011', 'AM4', 'AM5'] },
      { name: /Scythe Mugen 6/i, sockets: ['LGA1700', 'LGA1151', 'AM5', 'AM4'] },
      { name: /ID-COOLING SE-207-XT/i, sockets: ['LGA1700', 'LGA1200', 'LGA115X', 'AM5', 'AM4'] },
      { name: /Noctua NH-U12S/i, sockets: ['LGA1700', 'LGA1200', 'LGA115X', 'AM5', 'AM4'] },
      { name: /Noctua NH-U12A/i, sockets: ['LGA1700', 'LGA1200', 'LGA115X', 'AM5', 'AM4'] },
      { name: /Thermalright AXP90-X47 Full Cooper/i, sockets: ['LGA1700', 'LGA1150', 'LGA1151', 'LGA1200', 'LGA1851', 'AM5', 'AM4'] },
      { name: /be quiet! Silent Loop 3 420/i, sockets: ['LGA1700', 'LGA1200', 'LGA115X', 'AM5', 'AM4'] },
      { name: /Cooler Master Hyper 212 Spectrum V3/i, sockets: ['LGA1851', 'LGA1700', 'LGA1200', 'AM5', 'AM4'] },
      { name: /Cooler Master Hyper 212 Halo.*White/i, sockets: ['LGA1851', 'LGA1700', 'LGA1200', 'AM5', 'AM4'] },
      { name: /Cooler Master Hyper 612 APEX/i, sockets: ['LGA1851', 'LGA1700', 'AM5', 'AM4'] },
      { name: /ARCTIC Freezer 36 A-RGB/i, sockets: ['LGA1700', 'AM5', 'AM4'] },
      { name: /Thermalright Assassin X120 Refined/i, sockets: ['LGA1851', 'LGA1700', 'LGA1150', 'LGA1151', 'LGA1200', 'AM5', 'AM4'] },
      { name: /ID-COOLING Blitz X4/i, sockets: ['LGA1700', 'LGA1150', 'LGA1151', 'LGA1155', 'LGA1200', 'AM5', 'AM4'] },
      { name: /be quiet! Pure Loop 2 240mm.*BW017/i, sockets: ['LGA1700', 'LGA1200', 'LGA1150', 'LGA1151', 'LGA1155', 'AM5', 'AM4'] },
      { name: /Thermalright AXP90 X36/i, sockets: ['LGA1700', 'LGA1150', 'LGA1151', 'LGA1200', 'AM5', 'AM4'] },
      { name: /ID-COOLING IS-55 Black/i, sockets: ['LGA1851', 'LGA1700', 'LGA115X', 'LGA1200', 'AM5', 'AM4'] },
      { name: /Thermalright AXP-90 X53/i, sockets: ['LGA1150', 'LGA1151', 'LGA1155', 'LGA1200', 'LGA1700', 'LGA1851', 'AM4', 'AM5'] },
      { name: /Thermalright AXP90 X47 Full.*Copper/i, sockets: ['LGA1700', 'LGA1150', 'LGA1151', 'LGA1200', 'AM5', 'AM4'] },
      { name: /ID-COOLING IS-40X V3/i, sockets: ['LGA1700', 'LGA1200', 'LGA115X', 'AM5', 'AM4'] },
      { name: /ID-COOLING SE-903-XT/i, sockets: ['LGA1851', 'LGA1700', 'LGA1200', 'LGA115X', 'AM5', 'AM4'] },
      { name: /ID-COOLING FROZN A620/i, sockets: ['LGA1851', 'LGA1700', 'LGA1200', 'LGA115X', 'AM5', 'AM4'] },
      { name: /Gamma A40 ARGB/i, sockets: ['LGA115X', 'LGA1200', 'LGA1700', 'LGA1851', 'AM4', 'AM5'] },
      { name: /Thermalright Phantom Spirit 120SE/i, sockets: ['LGA1851', 'LGA1700', 'LGA1200', 'LGA1150', 'LGA1151', 'AM4', 'AM5'] },
      { name: /Vetroo V3/i, sockets: ['LGA1851', 'LGA1700', 'LGA1200', 'LGA115X', 'AM4', 'AM5'] },
      { name: /Thermaltake UX150 ARGB/i, sockets: ['LGA1700', 'LGA1200', 'LGA1156', 'LGA1155', 'LGA1151', 'LGA1150', 'LGA1851', 'AM5', 'AM4'] }
    ];

    console.log('\n📝 Updating socket compatibility...\n');

    let updated = 0;
    let notFound = 0;

    for (const data of compatibilityData) {
      const cooler = await collection.findOne({
        $or: [
          { name: data.name },
          { title: data.name }
        ]
      });

      if (cooler) {
        const displayName = cooler.name || cooler.title || 'Unknown';
        console.log(`   ✅ Updating: ${displayName}`);

        await collection.updateOne(
          { _id: cooler._id },
          {
            $set: {
              compatibleSockets: data.sockets,
              updatedAt: new Date()
            }
          }
        );
        updated++;
      } else {
        console.log(`   ⚠️  Not found: ${data.name}`);
        notFound++;
      }
    }

    console.log(`\n✅ Updated ${updated} coolers with socket compatibility`);
    console.log(`⚠️  ${notFound} coolers not found in database`);

  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    await client.close();
    console.log('\n✅ Database connection closed');
  }
}

updateCoolerCompatibility()
  .then(() => {
    console.log('✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
