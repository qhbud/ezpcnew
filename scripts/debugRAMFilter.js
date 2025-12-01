const RAMProductFilter = require('./utils/ramProductFilter');

// Debug the Corsair product specifically
const corsairProduct = {
  title: "CORSAIR VENGEANCE RGB DDR5 RAM 32GB (2x16GB) 6400MHz CL36-48-48-104 1.35V Intel XMP 3.0 Desktop Computer Memory - Black (CMH32GX5M2B6400C36)",
  basePrice: 130.67,
  salePrice: 114.99
};

console.log('🔍 Debugging Corsair product rejection:');
console.log(`📦 Title: ${corsairProduct.title}`);
console.log('');

// Test each validation step manually
const title = corsairProduct.title;
const titleLower = title.toLowerCase();

// 1. Title length
const hasTitle = title && title.length >= 5;
console.log(`1. Has title (>5 chars): ${hasTitle ? '✅' : '❌'}`);

// 2. Exclude keywords check
const excludeKeywords = [
  'laptop computer', 'gaming pc', 'gaming computer', 
  'computer system', 'pc system', 'workstation', 'tower',
  'motherboard', 'gpu', 'graphics card', 'processor', 'cpu',
  'ssd', 'hard drive', 'hdd', 'power supply', 'psu',
  'case', 'cooler', 'fan', 'keyboard', 'mouse',
  'monitor', 'screen', 'display', 'webcam', 'speaker',
  'cable', 'adapter', 'charger', 'battery',
  'usb stick', 'flash drive', 'external drive',
  'smartphone', 'tablet', 'phone', 'accessory'
];

const foundExcludeKeywords = excludeKeywords.filter(keyword => titleLower.includes(keyword));
console.log(`2. Exclude keywords found: ${foundExcludeKeywords.length > 0 ? '❌' : '✅'} (${foundExcludeKeywords.join(', ') || 'none'})`);

// 3. System patterns check
const systemPatterns = [
  { name: 'gaming/desktop/laptop + pc/computer/system', pattern: /\b(gaming|desktop|laptop)\s+(pc|computer|system)\b/i },
  { name: 'prebuilt', pattern: /\bpre-?built\b/i },
  { name: 'processor mentions', pattern: /\b(intel|amd)\s+(core|ryzen).+processor\b/i },
  { name: 'storage mentions', pattern: /\b\d+tb\s+(ssd|hdd|storage)\b/i },
  { name: 'windows mentions', pattern: /\bwin\s*\d+\s+(home|pro)\b/i }
];

console.log(`3. System patterns check:`);
const foundPatterns = [];
systemPatterns.forEach(sp => {
  const matches = sp.pattern.test(title);
  console.log(`   ${sp.name}: ${matches ? '❌ MATCHES' : '✅ OK'}`);
  if (matches) foundPatterns.push(sp.name);
});

// 4. RAM indicators check
const ramIndicators = [
  { name: 'DDR4/DDR5', pattern: /\bddr[45]\b/i, result: /\bddr[45]\b/i.test(title) },
  { name: 'Memory capacity', pattern: /\b(4|8|16|32|64|128)gb\b/i, result: /\b(4|8|16|32|64|128)gb\b/i.test(title) },
  { name: 'Memory keyword', pattern: /\bmemory\b/i, result: /\bmemory\b/i.test(title) },
  { name: 'RAM keyword', pattern: /\bram\b/i, result: /\bram\b/i.test(title) },
  { name: 'DIMM keyword', pattern: /\bdimm\b/i, result: /\bdimm\b/i.test(title) }
];

console.log(`4. RAM indicators check:`);
const hasAnyRAMIndicator = ramIndicators.some(indicator => indicator.result);
ramIndicators.forEach(indicator => {
  console.log(`   ${indicator.name}: ${indicator.result ? '✅' : '❌'}`);
});
console.log(`   Has any RAM indicator: ${hasAnyRAMIndicator ? '✅' : '❌'}`);

// 5. Price check
const price = parseFloat(corsairProduct.basePrice || corsairProduct.salePrice || 0);
const validPrice = price > 0 && price <= 2000;
console.log(`5. Valid price (>0, <$2000): ${validPrice ? '✅' : '❌'} ($${price})`);

// 6. Capacity price limits
if (titleLower.includes('32gb')) {
  const maxPrice = 800;
  const withinLimit = price <= maxPrice;
  console.log(`6. 32GB price limit (<$${maxPrice}): ${withinLimit ? '✅' : '❌'} ($${price})`);
}

// Final assessment
console.log('\n🎯 Final validation result:');
const shouldPass = hasTitle && 
                   foundExcludeKeywords.length === 0 && 
                   foundPatterns.length === 0 && 
                   hasAnyRAMIndicator && 
                   validPrice && 
                   (titleLower.includes('32gb') ? price <= 800 : true);

console.log(`Should pass validation: ${shouldPass ? '✅ YES' : '❌ NO'}`);

// Test actual filter
const actualResult = RAMProductFilter.validateProduct(corsairProduct);
console.log(`Actual filter result: ${actualResult ? '✅ YES' : '❌ NO'}`);

if (shouldPass !== actualResult) {
  console.log('⚠️  MISMATCH! Manual analysis differs from actual filter result.');
}