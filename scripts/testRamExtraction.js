// Simple test without instantiating the full populator
// We'll copy the extraction methods to test them directly

class RamExtractor {
  extractMemoryType(title) {
    const memoryTypeMatch = title.match(/ddr\s*([3456])/i);
    if (memoryTypeMatch) {
      return `DDR${memoryTypeMatch[1]}`;
    }
    return 'Unknown';
  }

  extractSpeed(title) {
    const speedMatch = title.match(/ddr[3456][-\s]*(\d{3,5})/i) ||
                      title.match(/(\d{3,5})\s*mhz/i) ||
                      title.match(/pc[3456][-\s]*(\d{3,5})/i) ||
                      title.match(/(\d{3,5})\s*mt\/s/i);

    if (speedMatch) {
      const speed = parseInt(speedMatch[1]);
      if (speed >= 800 && speed <= 10000) {
        return speed;
      }
    }
    return null;
  }

  extractCapacity(title) {
    const kitMatch = title.match(/(\d+)\s*x\s*(\d+)\s*gb/i) ||
                    title.match(/(\d+)x(\d+)gb/i);

    if (kitMatch) {
      const stickCount = parseInt(kitMatch[1]);
      const stickSize = parseInt(kitMatch[2]);
      return stickCount * stickSize;
    }

    const capacityMatch = title.match(/(\d+)\s*gb/i);
    if (capacityMatch) {
      return parseInt(capacityMatch[1]);
    }

    return null;
  }

  extractKitSize(title) {
    const kitMatch = title.match(/(\d+)\s*x\s*(\d+)\s*gb/i) ||
                    title.match(/(\d+)x(\d+)gb/i) ||
                    title.match(/kit\s*of\s*(\d+)/i);

    if (kitMatch) {
      const stickCount = parseInt(kitMatch[1]);
      if (stickCount >= 1 && stickCount <= 8) {
        return stickCount;
      }
    }

    return 1;
  }

  extractCapacityPerStick(title) {
    const kitMatch = title.match(/(\d+)\s*x\s*(\d+)\s*gb/i) ||
                    title.match(/(\d+)x(\d+)gb/i);

    if (kitMatch) {
      return parseInt(kitMatch[2]);
    }

    const capacityMatch = title.match(/(\d+)\s*gb/i);
    if (capacityMatch) {
      return parseInt(capacityMatch[1]);
    }

    return null;
  }

  extractKitConfiguration(title) {
    const kitMatch = title.match(/(\d+)\s*x\s*(\d+)\s*gb/i) ||
                    title.match(/(\d+)x(\d+)gb/i) ||
                    title.match(/kit\s*of\s*(\d+).*?(\d+)gb/i);

    if (kitMatch) {
      return `${kitMatch[1]}x${kitMatch[2]}GB`;
    }

    const singleMatch = title.match(/(\d+)\s*gb/i);
    if (singleMatch) {
      return `1x${singleMatch[1]}GB`;
    }

    return 'Unknown';
  }

  extractCASLatency(title) {
    const latencyMatch = title.match(/\bcl\s*(\d+)/i) ||
                        title.match(/\bc(\d+)\b/i) ||
                        title.match(/cas\s*(\d+)/i) ||
                        title.match(/(\d+)-(\d+)-(\d+)-(\d+)/);

    if (latencyMatch) {
      const casValue = parseInt(latencyMatch[1]);
      if (casValue >= 5 && casValue <= 50) {
        return casValue;
      }
    }
    return null;
  }

  extractLatency(title) {
    const latencyMatch = title.match(/c(\d+)/i) ||
                        title.match(/cl(\d+)/i) ||
                        title.match(/cas\s*(\d+)/i) ||
                        title.match(/(\d+)-(\d+)-(\d+)-(\d+)/);

    if (latencyMatch) {
      if (latencyMatch[4]) {
        return `${latencyMatch[1]}-${latencyMatch[2]}-${latencyMatch[3]}-${latencyMatch[4]}`;
      } else {
        return `CL${latencyMatch[1]}`;
      }
    }
    return 'Unknown';
  }

  detectManufacturer(title) {
    const titleLower = title.toLowerCase();

    if (titleLower.includes('corsair')) return 'Corsair';
    if (titleLower.includes('g.skill') || titleLower.includes('gskill')) return 'G.Skill';
    if (titleLower.includes('crucial')) return 'Crucial';
    if (titleLower.includes('kingston')) return 'Kingston';
    if (titleLower.includes('teamgroup') || titleLower.includes('team group')) return 'TeamGroup';
    if (titleLower.includes('adata')) return 'ADATA';
    if (titleLower.includes('patriot')) return 'Patriot';
    if (titleLower.includes('mushkin')) return 'Mushkin';
    if (titleLower.includes('pny')) return 'PNY';
    if (titleLower.includes('samsung')) return 'Samsung';
    if (titleLower.includes('sk hynix') || titleLower.includes('hynix')) return 'SK Hynix';
    if (titleLower.includes('micron')) return 'Micron';

    return 'Unknown';
  }

  determinePerformanceTier(title) {
    const titleLower = title.toLowerCase();
    const speedNum = this.extractSpeed(title) || 0;

    if ((titleLower.includes('ddr5') && speedNum >= 6000) ||
        (titleLower.includes('ddr4') && speedNum >= 3600) ||
        titleLower.includes('trident') || titleLower.includes('vengeance pro') ||
        titleLower.includes('dominator') || titleLower.includes('royal')) {
      return 'High-End';
    }

    if ((titleLower.includes('ddr5') && speedNum >= 5200) ||
        (titleLower.includes('ddr4') && speedNum >= 3200) ||
        titleLower.includes('vengeance') || titleLower.includes('ripjaws') ||
        titleLower.includes('fury') || titleLower.includes('ballistix')) {
      return 'Performance';
    }

    if ((titleLower.includes('ddr5') && speedNum >= 4800) ||
        (titleLower.includes('ddr4') && speedNum >= 2666)) {
      return 'Mainstream';
    }

    return 'Entry-Level';
  }
}

// Test the RAM data extraction with sample titles
async function testRamExtraction() {
  const populator = new RamExtractor();

  // Test cases with real RAM product titles
  const testTitles = [
    'CORSAIR VENGEANCE RGB PRO DDR4 RAM 16GB (2x8GB) 3200MHz CL16-18-18-36 1.35V Intel AMD Desktop Computer Memory - Black (CMW16GX4M2C3200C16)',
    'G.Skill Trident Z5 RGB Series (Intel XMP) DDR5 RAM 32GB (2x16GB) 6000MT/s CL36-36-36-96 1.35V Desktop Computer Memory - Matte Black (F5-6000J3636F16GX2-TZ5RK)',
    'Kingston FURY Beast DDR5 RGB 64GB (2x32GB) 5600MHz CL40 Desktop Memory',
    'Corsair Dominator Platinum RGB DDR5 16GB (2x8GB) 6400MHz CL32 Memory Kit',
    'Crucial RAM 32GB Kit (2x16GB) DDR4 3200MHz CL22',
    'TEAMGROUP T-Force Delta RGB DDR4 64GB (4x16GB) 3600MHz CL18',
    'PNY XLR8 Gaming DDR4 RAM 8GB 3200MHz Desktop Memory',
    'G.SKILL Ripjaws V Series 128GB (4x32GB) DDR4 3200 CL16',
    'Crucial 16GB Single DDR4 2666 MT/s CL19'
  ];

  console.log('🧪 Testing RAM Data Extraction\n');
  console.log('='.repeat(80));

  testTitles.forEach((title, index) => {
    console.log(`\n📦 Test ${index + 1}: ${title}`);
    console.log('-'.repeat(80));

    // Extract all fields
    const memoryType = populator.extractMemoryType(title);
    const speed = populator.extractSpeed(title);
    const kitSize = populator.extractKitSize(title);
    const capacityPerStick = populator.extractCapacityPerStick(title);
    const totalCapacity = populator.extractCapacity(title);
    const kitConfiguration = populator.extractKitConfiguration(title);
    const casLatency = populator.extractCASLatency(title);
    const latency = populator.extractLatency(title);
    const manufacturer = populator.detectManufacturer(title);
    const performanceTier = populator.determinePerformanceTier(title);

    // Display results
    console.log(`✅ Memory Type: ${memoryType} (${typeof memoryType})`);
    console.log(`✅ Speed: ${speed} MHz (${typeof speed}) ${speed !== null ? '✓ NUMERIC' : '✗ NULL'}`);
    console.log(`✅ Kit Size: ${kitSize} sticks (${typeof kitSize}) ${kitSize !== null ? '✓ NUMERIC' : '✗ NULL'}`);
    console.log(`✅ Capacity Per Stick: ${capacityPerStick} GB (${typeof capacityPerStick}) ${capacityPerStick !== null ? '✓ NUMERIC' : '✗ NULL'}`);
    console.log(`✅ Total Capacity: ${totalCapacity} GB (${typeof totalCapacity}) ${totalCapacity !== null ? '✓ NUMERIC' : '✗ NULL'}`);
    console.log(`✅ Kit Configuration: ${kitConfiguration} (${typeof kitConfiguration})`);
    console.log(`✅ CAS Latency: ${casLatency} (${typeof casLatency}) ${casLatency !== null ? '✓ NUMERIC' : '✗ NULL'}`);
    console.log(`✅ Latency String: ${latency} (${typeof latency})`);
    console.log(`✅ Manufacturer: ${manufacturer}`);
    console.log(`✅ Performance Tier: ${performanceTier}`);

    // Validation
    const validation = [];
    if (memoryType === 'Unknown') validation.push('⚠️  Memory type not detected');
    if (speed === null) validation.push('⚠️  Speed not detected');
    if (kitSize === null) validation.push('⚠️  Kit size not detected');
    if (capacityPerStick === null) validation.push('⚠️  Capacity per stick not detected');
    if (totalCapacity === null) validation.push('⚠️  Total capacity not detected');

    if (validation.length > 0) {
      console.log('\n⚠️  VALIDATION WARNINGS:');
      validation.forEach(warning => console.log(`   ${warning}`));
    } else {
      console.log('\n✨ ALL FIELDS EXTRACTED SUCCESSFULLY!');
    }

    // Database format preview
    console.log('\n💾 DATABASE OBJECT:');
    const dbObject = {
      memoryType: memoryType,
      speed: speed,
      kitSize: kitSize,
      capacity: capacityPerStick,
      totalCapacity: totalCapacity,
      kitConfiguration: kitConfiguration,
      casLatency: casLatency,
      latency: latency,
      manufacturer: manufacturer,
      performanceTier: performanceTier
    };
    console.log(JSON.stringify(dbObject, null, 2));
  });

  console.log('\n' + '='.repeat(80));
  console.log('✅ RAM Extraction Test Complete!\n');

  // Test the specific example from user
  console.log('🎯 USER EXAMPLE TEST:');
  console.log('='.repeat(80));
  const userExample = 'CORSAIR VENGEANCE RGB PRO DDR4 RAM 16GB (2x8GB) 3200MHz CL16-18-18-36 1.35V Intel AMD Desktop Computer Memory - Black (CMW16GX4M2C3200C16)';
  console.log(`Title: ${userExample}\n`);

  const result = {
    memoryType: populator.extractMemoryType(userExample),
    speed: populator.extractSpeed(userExample),
    kitSize: populator.extractKitSize(userExample),
    capacityPerStick: populator.extractCapacityPerStick(userExample),
    totalCapacity: populator.extractCapacity(userExample)
  };

  console.log('Expected Results:');
  console.log('  - DDR Type: DDR4 ✓');
  console.log('  - Speed: 3200 MHz ✓');
  console.log('  - Stick Count: 2 ✓');
  console.log('  - Capacity Per Stick: 8 GB ✓');
  console.log('  - Total Capacity: 16 GB ✓');

  console.log('\nActual Results:');
  console.log(`  - DDR Type: ${result.memoryType} ${result.memoryType === 'DDR4' ? '✅' : '❌'}`);
  console.log(`  - Speed: ${result.speed} MHz ${result.speed === 3200 ? '✅' : '❌'}`);
  console.log(`  - Stick Count: ${result.kitSize} ${result.kitSize === 2 ? '✅' : '❌'}`);
  console.log(`  - Capacity Per Stick: ${result.capacityPerStick} GB ${result.capacityPerStick === 8 ? '✅' : '❌'}`);
  console.log(`  - Total Capacity: ${result.totalCapacity} GB ${result.totalCapacity === 16 ? '✅' : '❌'}`);

  const allMatch = result.memoryType === 'DDR4' &&
                   result.speed === 3200 &&
                   result.kitSize === 2 &&
                   result.capacityPerStick === 8 &&
                   result.totalCapacity === 16;

  console.log('\n' + '='.repeat(80));
  if (allMatch) {
    console.log('🎉 USER EXAMPLE TEST PASSED! All fields extracted correctly!\n');
  } else {
    console.log('❌ USER EXAMPLE TEST FAILED! Some fields did not match expectations.\n');
  }
}

// Run the test
testRamExtraction().catch(error => {
  console.error('Test failed:', error);
  process.exit(1);
});
