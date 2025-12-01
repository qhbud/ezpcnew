const RAMProductFilter = require('./utils/ramProductFilter');

// Test data from the logs - Crucial RAM that was rejected
const testProduct = {
  title: "Crucial Pro DDR5 RAM 32GB Kit (2x16GB) 6400MHz CL38, Overclocking Desktop Gaming Memory, Intel XMP 3.0 & AMD Expo Compatible – Black CP2K16G64C38U5B",
  basePrice: 132.82,
  salePrice: 88.99
};

console.log('🧪 Testing RAMProductFilter with rejected product:');
console.log(`📦 Title: ${testProduct.title}`);
console.log(`💰 Base Price: $${testProduct.basePrice}`);
console.log(`💰 Sale Price: $${testProduct.salePrice}`);
console.log('');

// Test search criteria matching
const searchTerm = "DDR5-6400 32GB";
console.log(`🔍 Testing search criteria match with: "${searchTerm}"`);
const matchesSearch = RAMProductFilter.matchesSearchCriteria(testProduct.title, searchTerm);
console.log(`   Matches search: ${matchesSearch ? '✅ YES' : '❌ NO'}`);

// Test product validation
console.log(`🔍 Testing product validation:`);
const isValid = RAMProductFilter.validateProduct(testProduct);
console.log(`   Is valid product: ${isValid ? '✅ YES' : '❌ NO'}`);

// Test individual validation steps
console.log('\n🔬 Detailed validation analysis:');

// Check title length
console.log(`   Has title (>5 chars): ${testProduct.title && testProduct.title.length >= 5 ? '✅ YES' : '❌ NO'}`);

// Check price
const price = parseFloat(testProduct.basePrice || testProduct.salePrice || 0);
console.log(`   Has valid price (>0, <$2000): ${price > 0 && price <= 2000 ? '✅ YES' : '❌ NO'} ($${price})`);

// Check RAM indicators
const title = testProduct.title.toLowerCase();
const ramIndicators = [
  { name: 'DDR4/DDR5', pattern: /\bddr[45]\b/i, result: /\bddr[45]\b/i.test(testProduct.title) },
  { name: 'Memory capacity', pattern: /\b(4|8|16|32|64|128)gb\b/i, result: /\b(4|8|16|32|64|128)gb\b/i.test(testProduct.title) },
  { name: 'Memory keyword', pattern: /\bmemory\b/i, result: /\bmemory\b/i.test(testProduct.title) },
  { name: 'RAM keyword', pattern: /\bram\b/i, result: /\bram\b/i.test(testProduct.title) },
  { name: 'DIMM keyword', pattern: /\bdimm\b/i, result: /\bdimm\b/i.test(testProduct.title) }
];

ramIndicators.forEach(indicator => {
  console.log(`   ${indicator.name}: ${indicator.result ? '✅ YES' : '❌ NO'}`);
});

// Check exclusion keywords
const excludeKeywords = [
  'laptop', 'desktop', 'computer', 'pc', 'system',
  'motherboard', 'gpu', 'graphics', 'processor', 'cpu',
  'ssd', 'hard drive', 'hdd', 'power supply', 'psu',
  'case', 'cooler', 'fan', 'keyboard', 'mouse',
  'monitor', 'screen', 'display', 'webcam', 'speaker',
  'cable', 'adapter', 'charger', 'battery',
  'usb stick', 'flash drive', 'external',
  'smartphone', 'tablet', 'phone', 'accessory'
];

const hasExcludeKeywords = excludeKeywords.some(keyword => title.includes(keyword));
console.log(`   Has exclude keywords: ${hasExcludeKeywords ? '❌ YES (excluded)' : '✅ NO'}`);

// Check capacity-based price limits
if (title.includes('32gb')) {
  const maxPrice = 800;
  console.log(`   32GB price limit (<$${maxPrice}): ${price <= maxPrice ? '✅ YES' : '❌ NO'} ($${price})`);
}

console.log('\n🎯 Final result:');
console.log(`   Should be accepted: ${matchesSearch && isValid ? '✅ YES' : '❌ NO'}`);