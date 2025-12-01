const { MongoClient } = require('mongodb');

const uri = 'mongodb://localhost:27017';
const client = new MongoClient(uri);

async function listAllRAM() {
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');

    const db = client.db('pcbuilder');
    const rams = await db.collection('rams').find({}).limit(50).sort({ speed: -1 }).toArray();

    console.log('\n📊 RAM DATABASE - FIRST 50 MODULES (Sorted by Speed Descending)\n');
    console.log('='.repeat(120));

    rams.forEach((ram, index) => {
      console.log(`\n🎮 RAM ${index + 1}: ${ram.title || ram.name || 'Unknown'}`);
      console.log(`   DDR Type: ${ram.memoryType || 'N/A'} (type: ${typeof ram.memoryType})`);
      console.log(`   Speed: ${ram.speed || 'N/A'} MHz (type: ${typeof ram.speed})`);
      console.log(`   Kit Size: ${ram.kitSize || 'N/A'} sticks (type: ${typeof ram.kitSize})`);
      console.log(`   Capacity per stick: ${ram.capacity || 'N/A'} GB (type: ${typeof ram.capacity})`);
      console.log(`   Total Capacity: ${ram.totalCapacity || 'N/A'} GB (type: ${typeof ram.totalCapacity})`);
      console.log(`   CAS Latency: ${ram.casLatency ? `CL${ram.casLatency}` : 'N/A'} (type: ${typeof ram.casLatency})`);
      console.log(`   Kit Configuration: ${ram.kitConfiguration || 'N/A'}`);
      console.log(`   Manufacturer: ${ram.manufacturer || 'N/A'}`);
      console.log(`   Price: ${ram.currentPrice ? `$${ram.currentPrice}` : 'N/A'}`);
      console.log(`   RGB: ${ram.hasRGB ? 'Yes' : 'No'}`);

      const xmpExpo = [];
      if (ram.hasXMP) xmpExpo.push('XMP');
      if (ram.hasEXPO) xmpExpo.push('EXPO');
      console.log(`   XMP/EXPO: ${xmpExpo.length > 0 ? xmpExpo.join(' + ') : 'N/A'}`);

      console.log(`   Source: ${ram.source || 'N/A'}`);
      if (ram.sourceUrl) {
        console.log(`   URL: ${ram.sourceUrl.substring(0, 80)}...`);
      }
    });

    console.log('\n' + '='.repeat(120));
    console.log(`\n✅ Total RAM modules shown: ${rams.length}`);

    const totalCount = await db.collection('rams').countDocuments();
    console.log(`📦 Total RAM modules in database: ${totalCount}`);

    // Get statistics
    const ddr4Count = await db.collection('rams').countDocuments({ memoryType: 'DDR4' });
    const ddr5Count = await db.collection('rams').countDocuments({ memoryType: 'DDR5' });
    const avgPrice = await db.collection('rams').aggregate([
      { $match: { currentPrice: { $exists: true, $ne: null } } },
      { $group: { _id: null, avgPrice: { $avg: '$currentPrice' } } }
    ]).toArray();

    console.log('\n📈 DATABASE STATISTICS:');
    console.log(`   DDR4 modules: ${ddr4Count}`);
    console.log(`   DDR5 modules: ${ddr5Count}`);
    console.log(`   Average price: $${avgPrice[0]?.avgPrice?.toFixed(2) || 'N/A'}`);

    // Speed distribution
    const speedDist = await db.collection('rams').aggregate([
      { $group: { _id: '$speed', count: { $sum: 1 } } },
      { $sort: { _id: -1 } },
      { $limit: 10 }
    ]).toArray();

    console.log('\n⚡ TOP 10 SPEEDS BY MODULE COUNT:');
    speedDist.forEach(dist => {
      if (dist._id) {
        console.log(`   ${dist._id} MHz: ${dist.count} modules`);
      }
    });

    console.log('\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    await client.close();
  }
}

listAllRAM().catch(console.error);
