const RAMProductFilter = require('./utils/ramProductFilter');

// Test multiple products from the logs
const testProducts = [
  {
    title: "Crucial Pro DDR5 RAM 32GB Kit (2x16GB) 6400MHz CL38, Overclocking Desktop Gaming Memory, Intel XMP 3.0 & AMD Expo Compatible – Black CP2K16G64C38U5B",
    basePrice: 132.82,
    salePrice: 88.99
  },
  {
    title: "CORSAIR VENGEANCE RGB DDR5 RAM 32GB (2x16GB) 6400MHz CL36-48-48-104 1.35V Intel XMP 3.0 Desktop Computer Memory - Black (CMH32GX5M2B6400C36)",
    basePrice: 130.67,
    salePrice: 114.99
  },
  {
    title: "G.SKILL Trident Z5 RGB Series DDR5 RAM (Intel XMP 3.0) 32GB (2x16GB) 6400MT/s CL32-39-39-102 1.40V Desktop Computer Memory U-DIMM - Matte Black",
    basePrice: 119.99
  },
  {
    title: "TeamGroup T-Force Vulcan DDR5 32GB (2x16GB) 6400MHz (PC5-51200) CL32 Desktop Memory Module Ram",
    basePrice: 94.99
  },
  // Test a product that should be excluded (complete PC)
  {
    title: "Gaming Desktop PC Intel Core i7 32GB RAM 1TB SSD RTX 4070 Windows 11",
    basePrice: 1299.99
  }
];

console.log('🧪 Testing updated RAMProductFilter with multiple products:\n');

testProducts.forEach((product, index) => {
  console.log(`📦 Product ${index + 1}: ${product.title.substring(0, 80)}...`);
  
  const searchTerm = "DDR5-6400 32GB";
  const matchesSearch = RAMProductFilter.matchesSearchCriteria(product.title, searchTerm);
  const isValid = RAMProductFilter.validateProduct(product);
  const shouldAccept = matchesSearch && isValid;
  
  console.log(`   Matches search: ${matchesSearch ? '✅' : '❌'}`);
  console.log(`   Valid product: ${isValid ? '✅' : '❌'}`);
  console.log(`   Final result: ${shouldAccept ? '✅ ACCEPT' : '❌ REJECT'}`);
  console.log('');
});

console.log('✅ Filter test complete!');