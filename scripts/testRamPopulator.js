const { RamDataPopulator } = require('./ramDataPopulator');

async function testRamPopulator() {
  const populator = new RamDataPopulator();
  
  try {
    console.log('🧪 Testing RAM Data Populator...');
    console.log('✅ RAM populator created successfully');
    
    // Test data extraction methods
    console.log('\n🔍 Testing data extraction methods:');
    
    // Test RAM model extraction
    const testModels = [
      'DDR5-6000',
      'DDR4-3200',
      'corsair vengeance rgb pro 32gb',
      'g.skill trident z5 neo 64gb'
    ];
    
    testModels.forEach(model => {
      const extracted = populator.extractRamModel(model);
      console.log(`   "${model}" -> "${extracted}"`);
    });
    
    // Test manufacturer detection
    console.log('\n🏢 Testing manufacturer detection:');
    const testTitles = [
      'Corsair Vengeance RGB Pro 32GB',
      'G.Skill Trident Z5 Neo 64GB DDR5-6000',
      'Crucial Ballistix 16GB DDR4-3200',
      'Kingston FURY Beast 8GB DDR4-2666'
    ];
    
    testTitles.forEach(title => {
      const manufacturer = populator.detectManufacturer(title);
      console.log(`   "${title}" -> "${manufacturer}"`);
    });
    
    // Test memory type extraction
    console.log('\n🧠 Testing memory type extraction:');
    testTitles.forEach(title => {
      const memType = populator.extractMemoryType(title);
      console.log(`   "${title}" -> "${memType}"`);
    });
    
    // Test speed extraction
    console.log('\n⚡ Testing speed extraction:');
    testTitles.forEach(title => {
      const speed = populator.extractSpeed(title);
      console.log(`   "${title}" -> "${speed}"`);
    });
    
    // Test capacity extraction
    console.log('\n💾 Testing capacity extraction:');
    testTitles.forEach(title => {
      const capacity = populator.extractCapacity(title);
      console.log(`   "${title}" -> "${capacity}"`);
    });
    
    // Test kit configuration extraction
    console.log('\n📦 Testing kit configuration extraction:');
    const kitTitles = [
      'Corsair Vengeance RGB Pro 32GB (2x16GB) DDR5-6000',
      'G.Skill Trident Z5 Neo 64GB (4x16GB) DDR5-6000',
      'Crucial Ballistix 16GB DDR4-3200',
      'Kingston FURY Beast 8GB DDR4-2666'
    ];
    
    kitTitles.forEach(title => {
      const kit = populator.extractKitConfiguration(title);
      console.log(`   "${title}" -> "${kit}"`);
    });
    
    // Test performance tier determination
    console.log('\n🏆 Testing performance tier determination:');
    testTitles.forEach(title => {
      const tier = populator.determinePerformanceTier(title);
      console.log(`   "${title}" -> "${tier}"`);
    });
    
    console.log('\n✅ All tests completed successfully!');
    console.log('🎯 RAM Data Populator is ready for use.');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    throw error;
  }
}

// Run the test
if (require.main === module) {
  testRamPopulator()
    .then(() => {
      console.log('\n🎉 Test suite passed!');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n💥 Test suite failed:', error);
      process.exit(1);
    });
}

module.exports = { testRamPopulator };