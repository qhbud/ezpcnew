const { extractGPUModel } = require('./scripts/purgeAndReorganizeGPUs');

// Test the extractGPUModel function
const testNames = [
  'PNY GeForce RTX™ 4070 12GB XLR8 Gaming Verto Epic-X RGB™ Triple Fan Graphics Card DLSS 3',
  'GIGABYTE GeForce RTX 4070 WINDFORCE OC 12G Graphics Card, 3X WINDFORCE Fans, 12GB 192-bit GDDR6X, GV-N4070WF3OC-12GD Video Card',
  'NVIDIA GeForce RTX 4070 Founder\'s Edition (FE) Graphics Card - Titanium and Black (900-1G141-2544-000)',
  'ASUS TUF Gaming NVIDIA GeForce RTX™ 4070 OC Edition Gaming Graphics Card (PCIe 4.0, 12GB GDDR6X, HDMI 2.1, DisplayPort 1.4a)'
];

console.log('Testing extractGPUModel function:');
testNames.forEach((name, index) => {
  const cleanedName = name.replace(/[™®©]/g, '').toLowerCase();
  const model = extractGPUModel(cleanedName);
  console.log(`${index + 1}. Original: "${name}"`);
  console.log(`   Cleaned: "${cleanedName}"`);
  console.log(`   Model: "${model}"`);
  console.log('');
});
