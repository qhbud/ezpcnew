const { extractGPUModel } = require('./purgeAndReorganizeGPUs');

// Test GPU names to verify extraction
const testGPUs = [
  // NVIDIA RTX 40 series
  'NVIDIA GeForce RTX 4090',
  'MSI RTX 4080 Super Gaming X',
  'ASUS RTX 4070 Ti',
  'EVGA RTX 4060 Ti',
  
  // NVIDIA RTX 30 series  
  'RTX 3090 Ti FE',
  'Gigabyte RTX 3080 Ti',
  'MSI RTX 3070 Ti Gaming',
  'ASUS RTX 3060 Ti',
  'EVGA RTX 3060',
  
  // NVIDIA RTX 20 series
  'RTX 2080 Ti',
  'RTX 2070 Super',
  'RTX 2070',
  'RTX 2060 Super',
  
  // NVIDIA GTX series
  'GTX 1660 Ti',
  'GTX 1080 Ti',
  'GTX 1070 Ti',
  'GTX 1060',
  'GTX 980 Ti',
  
  // AMD RX 7000 series (RDNA 3)
  'AMD Radeon RX 7900 XTX',
  'Sapphire RX 7900 XT',
  'PowerColor RX 7800 XT',
  'XFX RX 7700 XT',
  
  // AMD RX 6000 series (RDNA 2)
  'RX 6950 XT',
  'AMD RX 6900 XT',
  'MSI RX 6800 XT Gaming',
  'ASUS RX 6700 XT',
  'Gigabyte RX 6600 XT',
  'RX 6500 XT',
  
  // AMD RX 5000 series
  'Radeon RX 5700 XT',
  'RX 5700',
  'RX 5600 XT',
  
  // AMD older series
  'RX 580',
  'RX 570',
  'RX Vega 64',
  'RX Vega 56',
  
  // Intel Arc
  'Intel Arc A770',
  'Arc A750',
  'A580',
  'A380',
  
  // Edge cases
  'Some Random 7900 XTX Card',
  'Custom 3080 Ti Build',
  'Generic XT Card',
  'Unknown Ti Variant',
  'Mystery Super Card',
  
  // Test cases that should go to fallback
  'Unknown GPU Model',
  'Generic Graphics Card',
  ''
];

console.log('🧪 Testing GPU Model Extraction\n');

testGPUs.forEach((gpuName, index) => {
  const model = extractGPUModel(gpuName);
  const collectionName = `gpus_${model}`;
  console.log(`${(index + 1).toString().padStart(2, '0')}. "${gpuName}" → ${model} → ${collectionName}`);
});

console.log('\n✅ GPU Model Extraction Test Complete');

// Test specific patterns
console.log('\n🔍 Testing Specific Patterns:');

const specificTests = [
  { input: 'RTX 4090', expected: '4090' },
  { input: 'RTX 3080 Ti', expected: '3080_ti' },
  { input: 'RTX 2070', expected: '2070' },
  { input: 'RX 7900 XTX', expected: '7900_xtx' },
  { input: 'RX 6800 XT', expected: '6800_xt' },
  { input: 'GTX 1660 Ti', expected: '1660_ti' },
  { input: 'Arc A770', expected: 'a770' }
];

specificTests.forEach(test => {
  const result = extractGPUModel(test.input);
  const status = result === test.expected ? '✅' : '❌';
  console.log(`${status} "${test.input}" → Expected: ${test.expected}, Got: ${result}`);
});

console.log('\n📊 Collection Summary:');
const models = testGPUs.map(gpu => extractGPUModel(gpu));
const uniqueModels = [...new Set(models)];
console.log(`Total unique models: ${uniqueModels.length}`);
console.log('Models:', uniqueModels.sort().join(', '));