const { connectToDatabase, getDatabase } = require('../config/database');

// Comprehensive chipset mapping based on CPU socket and generation
const chipsetMapping = {
  // AMD AM4 Socket (Ryzen 1000-5000 series)
  AM4: {
    default: ['B550', 'X570', 'A520', 'B450', 'X470', 'X370', 'B350', 'A320'],
    '5000 Series': ['B550', 'X570', 'A520', 'B450', 'X470'], // Zen 3
    '3000 Series': ['B550', 'X570', 'B450', 'X470', 'X370', 'B350', 'A320'], // Zen 2
    '2000 Series': ['B450', 'X470', 'X370', 'B350', 'A320'], // Zen+
    '1000 Series': ['X370', 'B350', 'A320'], // Zen
  },

  // AMD AM5 Socket (Ryzen 7000+ series)
  AM5: {
    default: ['X670E', 'X670', 'B650E', 'B650', 'A620'],
    '7000 Series': ['X670E', 'X670', 'B650E', 'B650', 'A620'], // Zen 4
    '9000 Series': ['X870E', 'X870', 'X670E', 'X670', 'B650E', 'B650', 'A620'], // Zen 5
  },

  // Intel LGA1700 (12th-14th Gen)
  LGA1700: {
    default: ['Z790', 'Z690', 'H770', 'B760', 'B660', 'H670', 'H610'],
    '14th Gen': ['Z790', 'B760', 'H770'], // Raptor Lake Refresh
    '13th Gen': ['Z790', 'Z690', 'H770', 'B760', 'B660', 'H670', 'H610'], // Raptor Lake
    '12th Gen': ['Z690', 'B660', 'H670', 'H610'], // Alder Lake
  },

  // Intel LGA1851 (15th Gen - Arrow Lake/Core Ultra)
  LGA1851: {
    default: ['Z890', 'B860', 'H810'],
    'Core Ultra (Arrow Lake)': ['Z890', 'B860', 'H810'],
  },

  // Intel LGA1200 (10th-11th Gen)
  LGA1200: {
    default: ['Z590', 'Z490', 'B560', 'B460', 'H570', 'H510', 'H470', 'H410'],
    '11th Gen': ['Z590', 'B560', 'H570', 'H510'], // Rocket Lake
    '10th Gen': ['Z490', 'B460', 'H470', 'H410'], // Comet Lake
  },

  // Intel LGA1151 (6th-9th Gen)
  LGA1151: {
    default: ['Z390', 'Z370', 'Z270', 'Z170', 'H370', 'B365', 'B360', 'B250', 'B150', 'H310', 'H270', 'H110'],
    '9th Gen': ['Z390', 'Z370', 'H370', 'B365', 'B360', 'H310'], // Coffee Lake Refresh
    '8th Gen': ['Z370', 'H370', 'B360', 'H310'], // Coffee Lake
    '7th Gen': ['Z270', 'B250', 'H270'], // Kaby Lake
    '6th Gen': ['Z170', 'B150', 'H110'], // Skylake
  },

  // AMD TR4/sTRX4 (Threadripper)
  TR4: {
    default: ['X399'],
  },
  STRX4: {
    default: ['TRX40', 'WRX80'],
  },

  // AMD SP3 (EPYC)
  SP3: {
    default: ['Server Platform'],
  },

  // Intel HEDT
  LGA2066: {
    default: ['X299'],
  },
  LGA2011: {
    default: ['X99', 'X79'],
  },
};

// Helper function to determine chipsets based on CPU properties
function getChipsetsForCPU(cpu) {
  let socket = (cpu.socket || '').toUpperCase();
  let generation = cpu.generation || '';
  const title = (cpu.title || cpu.name || '').toLowerCase();

  // Correct socket detection if it's wrong
  // Intel 12th gen should be LGA1700, not LGA1151
  if ((title.includes('12th gen') || title.match(/i[3579]-12\d{3}/)) && socket !== 'LGA1700') {
    socket = 'LGA1700';
    generation = '12th Gen';
  }
  // Intel 13th gen should be LGA1700
  if ((title.includes('13th gen') || title.match(/i[3579]-13\d{3}/)) && socket !== 'LGA1700') {
    socket = 'LGA1700';
    generation = '13th Gen';
  }
  // Intel 14th gen should be LGA1700
  if ((title.includes('14th gen') || title.match(/i[3579]-14\d{3}/)) && socket !== 'LGA1700') {
    socket = 'LGA1700';
    generation = '14th Gen';
  }
  // Intel 11th gen should be LGA1200
  if ((title.includes('11th gen') || title.match(/i[3579]-11\d{3}/)) && socket !== 'LGA1200') {
    socket = 'LGA1200';
    generation = '11th Gen';
  }

  // Try to get chipsets from socket and generation mapping
  if (chipsetMapping[socket]) {
    const socketMap = chipsetMapping[socket];

    // Try generation-specific mapping first
    if (generation && socketMap[generation]) {
      return socketMap[generation];
    }

    // Fall back to default for that socket
    if (socketMap.default) {
      return socketMap.default;
    }
  }

  // Fallback detection based on title/name
  if (title.includes('threadripper')) {
    if (title.includes('3000') || title.includes('5000')) {
      return ['TRX40', 'WRX80'];
    }
    return ['X399'];
  }

  if (title.includes('epyc')) {
    return ['Server Platform'];
  }

  // If no mapping found, return empty array
  console.warn(`⚠️  No chipset mapping found for CPU: ${cpu.title || cpu.name} (Socket: ${socket}, Gen: ${generation})`);
  return [];
}

async function addChipsetsToAllCPUs() {
  let client;
  try {
    console.log('🔌 Connecting to database...');
    client = await connectToDatabase();
    const db = getDatabase();

    // Get all collections that start with 'cpus_'
    const collections = await db.listCollections().toArray();
    const cpuCollections = collections
      .map(col => col.name)
      .filter(name => name.startsWith('cpus_'));

    console.log(`\n📊 Found ${cpuCollections.length} CPU collections`);
    console.log('Collections:', cpuCollections.join(', '));

    let totalUpdated = 0;
    let totalChecked = 0;
    let missingChipsets = 0;

    for (const collectionName of cpuCollections) {
      console.log(`\n📁 Processing collection: ${collectionName}`);
      const collection = db.collection(collectionName);

      const cpus = await collection.find({}).toArray();
      console.log(`   Found ${cpus.length} CPUs`);

      for (const cpu of cpus) {
        totalChecked++;

        // Check if CPU already has both chipset fields
        const hasCompatChipsets = cpu.compatibility?.motherboards && cpu.compatibility.motherboards.length > 0;
        const hasSupportedChipsets = cpu.supportedChipsets && cpu.supportedChipsets.length > 0;

        // If both fields are populated, skip
        if (hasCompatChipsets && hasSupportedChipsets) {
          console.log(`   ✓ ${cpu.title || cpu.name} - Already has chipsets: ${cpu.supportedChipsets.join(', ')}`);
          continue;
        }

        // Get chipsets for this CPU
        const chipsets = getChipsetsForCPU(cpu);

        if (chipsets.length === 0) {
          missingChipsets++;
          console.log(`   ⚠️  ${cpu.title || cpu.name} - No chipsets found`);
          continue;
        }

        // Update CPU with chipsets (add to both fields for compatibility)
        await collection.updateOne(
          { _id: cpu._id },
          {
            $set: {
              'compatibility.motherboards': chipsets,
              'supportedChipsets': chipsets, // Frontend uses this field
              updatedAt: new Date()
            }
          }
        );

        totalUpdated++;
        console.log(`   ✅ ${cpu.title || cpu.name} - Added chipsets: ${chipsets.join(', ')}`);
      }
    }

    console.log('\n' + '='.repeat(80));
    console.log('📈 SUMMARY:');
    console.log('='.repeat(80));
    console.log(`Total CPUs checked: ${totalChecked}`);
    console.log(`CPUs updated with chipsets: ${totalUpdated}`);
    console.log(`CPUs with missing chipset mappings: ${missingChipsets}`);
    console.log(`CPUs already had chipsets: ${totalChecked - totalUpdated - missingChipsets}`);
    console.log('='.repeat(80));

  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    console.log('\n🚪 Script finished');
  }
}

// Run the script
if (require.main === module) {
  addChipsetsToAllCPUs()
    .then(() => {
      console.log('✅ Script completed successfully');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Script failed:', error);
      process.exit(1);
    });
}

module.exports = { addChipsetsToAllCPUs, getChipsetsForCPU };
