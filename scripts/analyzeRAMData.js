const { MongoClient } = require('mongodb');

async function analyzeRAM() {
  const client = new MongoClient('mongodb://localhost:27017');

  try {
    await client.connect();
    const db = client.db('pcbuilder');
    const rams = db.collection('rams');

    console.log('\n📊 RAM DATABASE ANALYSIS\n');
    console.log('='.repeat(80));

    // Total count
    const totalCount = await rams.countDocuments();
    console.log(`\n✅ Total RAM modules: ${totalCount}`);

    // Count by data types for speed field
    const speedAsNumber = await rams.countDocuments({ speed: { $type: 'number' } });
    const speedAsString = await rams.countDocuments({ speed: { $type: 'string' } });
    const speedMissing = await rams.countDocuments({ speed: { $exists: false } });

    console.log('\n🔢 SPEED FIELD DATA TYPES:');
    console.log(`   Numbers: ${speedAsNumber}`);
    console.log(`   Strings: ${speedAsString}`);
    console.log(`   Missing: ${speedMissing}`);

    // Count by data types for capacity field
    const capacityAsNumber = await rams.countDocuments({ capacity: { $type: 'number' } });
    const capacityAsString = await rams.countDocuments({ capacity: { $type: 'string' } });
    const capacityMissing = await rams.countDocuments({ capacity: { $exists: false } });

    console.log('\n💾 CAPACITY FIELD DATA TYPES:');
    console.log(`   Numbers: ${capacityAsNumber}`);
    console.log(`   Strings: ${capacityAsString}`);
    console.log(`   Missing: ${capacityMissing}`);

    // Count by data types for kitSize field
    const kitSizeAsNumber = await rams.countDocuments({ kitSize: { $type: 'number' } });
    const kitSizeMissing = await rams.countDocuments({ kitSize: { $exists: false } });

    console.log('\n📦 KIT SIZE FIELD DATA TYPES:');
    console.log(`   Numbers: ${kitSizeAsNumber}`);
    console.log(`   Missing: ${kitSizeMissing}`);

    // Show a sample of properly extracted RAM
    console.log('\n✅ SAMPLE OF PROPERLY EXTRACTED RAM (speed as NUMBER):');
    const goodSamples = await rams.find({
      speed: { $type: 'number', $gt: 0 },
      kitSize: { $type: 'number' },
      capacity: { $type: 'number' }
    }).limit(5).toArray();

    goodSamples.forEach((ram, idx) => {
      console.log(`\n${idx + 1}. ${ram.title}`);
      console.log(`   DDR Type: ${ram.memoryType} (${typeof ram.memoryType})`);
      console.log(`   Speed: ${ram.speed} MHz (${typeof ram.speed})`);
      console.log(`   Kit Size: ${ram.kitSize} sticks (${typeof ram.kitSize})`);
      console.log(`   Capacity per stick: ${ram.capacity} GB (${typeof ram.capacity})`);
      console.log(`   Total: ${ram.totalCapacity} GB`);
      console.log(`   Price: $${ram.currentPrice}`);
    });

    // Show a sample of OLD data (string types)
    console.log('\n❌ SAMPLE OF OLD DATA (speed as STRING):');
    const badSamples = await rams.find({ speed: { $type: 'string' } }).limit(3).toArray();

    badSamples.forEach((ram, idx) => {
      console.log(`\n${idx + 1}. ${ram.title}`);
      console.log(`   DDR Type: ${ram.memoryType} (${typeof ram.memoryType})`);
      console.log(`   Speed: ${ram.speed} (${typeof ram.speed})`);
      console.log(`   Kit Configuration: ${ram.kitConfiguration}`);
      console.log(`   Capacity: ${ram.capacity} (${typeof ram.capacity})`);
    });

    console.log('\n' + '='.repeat(80));
    console.log(`\n📝 CONCLUSION:`);
    if (speedAsNumber > 0) {
      console.log(`   ✅ ${speedAsNumber} modules have properly extracted numeric speed values`);
    }
    if (speedAsString > 0) {
      console.log(`   ⚠️  ${speedAsString} modules have old string-based speed values`);
      console.log(`   💡 Consider clearing the collection and re-importing to fix all data`);
    }

    console.log('\n');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

analyzeRAM();
