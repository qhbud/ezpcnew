const RAMProductFilterLenient = require('./utils/ramProductFilterLenient');

// Test some sample product titles
const testProducts = [
    { title: "Corsair Vengeance RGB Pro 16GB (2x8GB) DDR4 3200MHz C16 LED Desktop Memory - Black", price: 89.99 },
    { title: "G.Skill Ripjaws V Series 32GB (2 x 16GB) 288-Pin SDRAM DDR4 3600", price: 129.99 },
    { title: "Crucial Ballistix 8GB DDR4-2666 Desktop Gaming Memory", price: 45.99 },
    { title: "Kingston FURY Beast 16GB 3200MHz DDR4 CL16 Desktop Memory", price: 65.99 },
    { title: "TEAMGROUP T-Force Vulcan Z DDR4 32GB Kit (2x16GB) 3200MHz", price: 99.99 },
    { title: "Samsung 16GB DDR5 4800MHz SO-DIMM Laptop Memory", price: 89.99 }, // Should be filtered out (laptop)
    { title: "Dell Gaming Desktop Computer - Intel Core i7", price: 899.99 }, // Should be filtered out (desktop)
    { title: "SSD 1TB NVMe M.2 Internal Solid State Drive", price: 79.99 }, // Should be filtered out (SSD)
    { title: "AMD Ryzen 7 5700X 8-Core Processor", price: 199.99 }, // Should be filtered out (CPU)
    { title: "32GB (2x16GB) DDR5-6000 CL30 Desktop Memory Kit", price: 179.99 }
];

console.log('🧪 Testing RAM Filter (Lenient Version)');
console.log('='.repeat(60));

let validCount = 0;
let filteredCount = 0;

testProducts.forEach((product, index) => {
    const isValid = RAMProductFilterLenient.validateProduct(product);
    const matchesSearch = RAMProductFilterLenient.matchesSearchCriteria(product.title, 'ddr4');
    
    const status = (isValid && matchesSearch) ? '✅ VALID' : '❌ FILTERED';
    const shortTitle = product.title.substring(0, 50) + '...';
    
    console.log(`${index + 1}. ${status} ${shortTitle}`);
    console.log(`   Valid: ${isValid}, Matches: ${matchesSearch}, Price: $${product.price}`);
    
    if (isValid && matchesSearch) {
        validCount++;
        
        // Show extracted specs for valid products
        const specs = RAMProductFilterLenient.extractRAMSpecs(product.title);
        console.log(`   Specs: ${specs.memoryType || 'N/A'} | ${specs.speed || 'N/A'} | ${specs.capacity || 'N/A'} | ${specs.manufacturer || 'N/A'}`);
    } else {
        filteredCount++;
    }
    console.log('');
});

console.log('='.repeat(60));
console.log(`📊 Results: ${validCount} valid RAM products, ${filteredCount} filtered out`);
console.log(`🎯 Expected: ~6-7 valid (should keep most RAM, filter out desktop/CPU/SSD)`);