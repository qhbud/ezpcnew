const { MongoClient } = require('mongodb');

const uri = 'mongodb://localhost:27017';
const client = new MongoClient(uri);

async function listAllRAMComplete() {
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB\n');

    const db = client.db('pcbuilder');
    const rams = await db.collection('rams').find({}).sort({ speed: -1, currentPrice: 1 }).toArray();

    console.log('📊 COMPLETE RAM DATABASE - ALL 424 MODULES\n');
    console.log('='.repeat(120));

    rams.forEach((ram, index) => {
      console.log(`\n🎮 RAM #${index + 1}: ${ram.title || ram.name || 'Unknown'}`);
      console.log('─'.repeat(120));

      // Core Specifications
      console.log('📋 CORE SPECIFICATIONS:');
      console.log(`   DDR Type: ${ram.memoryType || 'N/A'} (${typeof ram.memoryType})`);
      console.log(`   Speed: ${ram.speed || 'N/A'} MHz (${typeof ram.speed})`);
      console.log(`   Kit Size: ${ram.kitSize || 'N/A'} sticks (${typeof ram.kitSize})`);
      console.log(`   Capacity per stick: ${ram.capacity || 'N/A'} GB (${typeof ram.capacity})`);
      console.log(`   Total Capacity: ${ram.totalCapacity || 'N/A'} GB (${typeof ram.totalCapacity})`);
      console.log(`   Kit Configuration: ${ram.kitConfiguration || 'N/A'}`);

      // Timing & Performance
      console.log('\n⚡ TIMING & PERFORMANCE:');
      console.log(`   CAS Latency: ${ram.casLatency ? `CL${ram.casLatency}` : 'N/A'} (${typeof ram.casLatency})`);
      console.log(`   Timing String: ${ram.timing || ram.latency || 'N/A'}`);
      console.log(`   Performance Tier: ${ram.performanceTier || 'N/A'}`);

      // Features
      console.log('\n✨ FEATURES:');
      console.log(`   RGB Lighting: ${ram.hasRGB ? 'Yes' : 'No'}`);
      console.log(`   XMP Support: ${ram.hasXMP ? 'Yes' : 'No'}`);
      console.log(`   EXPO Support: ${ram.hasEXPO ? 'Yes' : 'No'}`);
      console.log(`   Heat Spreader: ${ram.hasHeatSpreader ? 'Yes' : 'Unknown'}`);

      // Pricing
      console.log('\n💰 PRICING:');
      console.log(`   Current Price: ${ram.currentPrice ? `$${ram.currentPrice}` : 'N/A'}`);
      console.log(`   Base Price: ${ram.basePrice ? `$${ram.basePrice}` : 'N/A'}`);
      console.log(`   Sale Price: ${ram.salePrice ? `$${ram.salePrice}` : 'N/A'}`);
      console.log(`   On Sale: ${ram.isOnSale ? 'Yes' : 'No'}`);

      // Product Details
      console.log('\n🏢 PRODUCT DETAILS:');
      console.log(`   Manufacturer: ${ram.manufacturer || 'Unknown'}`);
      console.log(`   Model: ${ram.model || 'N/A'}`);
      console.log(`   Source: ${ram.source || 'N/A'}`);
      console.log(`   Product URL: ${ram.sourceUrl || ram.productUrl || 'N/A'}`);
      console.log(`   Image URL: ${ram.imageUrl ? 'Available' : 'N/A'}`);

      // Technical Details
      console.log('\n🔧 TECHNICAL DETAILS:');
      console.log(`   Voltage: ${ram.voltage || 'N/A'}`);
      console.log(`   Form Factor: ${ram.formFactor || 'UDIMM (Desktop)'}`);
      console.log(`   ECC: ${ram.ecc ? 'Yes' : 'No'}`);
      console.log(`   Buffered: ${ram.buffered ? 'Yes' : 'No'}`);

      // Database Metadata
      console.log('\n📅 METADATA:');
      console.log(`   Scraped At: ${ram.scrapedAt || 'N/A'}`);
      console.log(`   Created At: ${ram.createdAt || 'N/A'}`);
      console.log(`   Updated At: ${ram.updatedAt || 'N/A'}`);
      console.log(`   Database ID: ${ram._id}`);

      console.log('='.repeat(120));
    });

    // Summary Statistics
    console.log('\n\n📊 DATABASE STATISTICS:\n');
    console.log('='.repeat(120));

    const totalCount = rams.length;
    const ddr4Count = rams.filter(r => r.memoryType === 'DDR4').length;
    const ddr5Count = rams.filter(r => r.memoryType === 'DDR5').length;
    const rgbCount = rams.filter(r => r.hasRGB).length;
    const xmpCount = rams.filter(r => r.hasXMP).length;
    const expoCount = rams.filter(r => r.hasEXPO).length;

    const avgPrice = rams.filter(r => r.currentPrice).reduce((sum, r) => sum + r.currentPrice, 0) / rams.filter(r => r.currentPrice).length;
    const minPrice = Math.min(...rams.filter(r => r.currentPrice).map(r => r.currentPrice));
    const maxPrice = Math.max(...rams.filter(r => r.currentPrice).map(r => r.currentPrice));

    const speedsWithNumbers = rams.filter(r => r.speed && typeof r.speed === 'number').length;
    const capacitiesWithNumbers = rams.filter(r => r.capacity && typeof r.capacity === 'number').length;
    const kitSizesWithNumbers = rams.filter(r => r.kitSize && typeof r.kitSize === 'number').length;

    console.log(`Total RAM Modules: ${totalCount}`);
    console.log(`\nBy DDR Type:`);
    console.log(`   DDR4: ${ddr4Count} modules (${(ddr4Count/totalCount*100).toFixed(1)}%)`);
    console.log(`   DDR5: ${ddr5Count} modules (${(ddr5Count/totalCount*100).toFixed(1)}%)`);

    console.log(`\nFeatures:`);
    console.log(`   RGB Lighting: ${rgbCount} modules`);
    console.log(`   XMP Support: ${xmpCount} modules`);
    console.log(`   EXPO Support: ${expoCount} modules`);

    console.log(`\nPricing:`);
    console.log(`   Average Price: $${avgPrice.toFixed(2)}`);
    console.log(`   Minimum Price: $${minPrice.toFixed(2)}`);
    console.log(`   Maximum Price: $${maxPrice.toFixed(2)}`);

    console.log(`\nData Quality (Numeric Types):`);
    console.log(`   Speed as NUMBER: ${speedsWithNumbers}/${totalCount} (${(speedsWithNumbers/totalCount*100).toFixed(1)}%)`);
    console.log(`   Capacity as NUMBER: ${capacitiesWithNumbers}/${totalCount} (${(capacitiesWithNumbers/totalCount*100).toFixed(1)}%)`);
    console.log(`   Kit Size as NUMBER: ${kitSizesWithNumbers}/${totalCount} (${(kitSizesWithNumbers/totalCount*100).toFixed(1)}%)`);

    // Speed Distribution
    console.log(`\nSpeed Distribution:`);
    const speedGroups = {};
    rams.filter(r => r.speed).forEach(r => {
      speedGroups[r.speed] = (speedGroups[r.speed] || 0) + 1;
    });
    Object.entries(speedGroups).sort((a, b) => b[0] - a[0]).forEach(([speed, count]) => {
      console.log(`   ${speed} MHz: ${count} modules`);
    });

    // Capacity Distribution
    console.log(`\nTotal Capacity Distribution:`);
    const capGroups = {};
    rams.filter(r => r.totalCapacity).forEach(r => {
      capGroups[r.totalCapacity] = (capGroups[r.totalCapacity] || 0) + 1;
    });
    Object.entries(capGroups).sort((a, b) => a[0] - b[0]).forEach(([cap, count]) => {
      console.log(`   ${cap} GB: ${count} modules`);
    });

    // Manufacturer Distribution
    console.log(`\nTop Manufacturers:`);
    const mfgGroups = {};
    rams.forEach(r => {
      const mfg = r.manufacturer || 'Unknown';
      mfgGroups[mfg] = (mfgGroups[mfg] || 0) + 1;
    });
    Object.entries(mfgGroups).sort((a, b) => b[1] - a[1]).slice(0, 10).forEach(([mfg, count]) => {
      console.log(`   ${mfg}: ${count} modules`);
    });

    console.log('\n' + '='.repeat(120));
    console.log('\n✅ Complete listing finished!\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    await client.close();
  }
}

listAllRAMComplete().catch(console.error);
