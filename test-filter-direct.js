// Test the current isDesktopOrLaptop function directly

function isDesktopOrLaptop(title) {
    if (!title) return false;

    const titleLower = title.toLowerCase();

    // Desktop/PC indicators (without standalone 'pc' to avoid matching 'PCIe')
    const desktopKeywords = [
        'desktop', 'computer', 'tower', 'system',
        'gaming desktop', 'gaming pc', 'workstation',
        'prebuilt', 'pre-built', 'gaming system',
        'alienware', 'dell', 'hp pavilion', 'asus rog desktop',
        'msi gaming desktop', 'cyberpowerpc', 'ibuypower',
        'origin pc', 'maingear'
    ];

    // Laptop indicators
    const laptopKeywords = [
        'laptop', 'notebook', 'gaming laptop', 'ultrabook',
        'thinkpad', 'macbook', 'chromebook', 'surface laptop',
        'asus rog laptop', 'msi gaming laptop', 'alienware laptop',
        'razer blade', 'hp omen', 'lenovo legion'
    ];

    // Check for desktop keywords
    for (const keyword of desktopKeywords) {
        if (titleLower.includes(keyword)) {
            console.log(`  ❌ MATCHED desktop keyword: "${keyword}"`);
            return true;
        }
    }

    // Check for laptop keywords
    for (const keyword of laptopKeywords) {
        if (titleLower.includes(keyword)) {
            console.log(`  ❌ MATCHED laptop keyword: "${keyword}"`);
            return true;
        }
    }

    // Additional patterns for complete systems
    const systemPatterns = [
        { pattern: /\b(intel|amd)\s+(core|ryzen).+processor\b/i, name: "processor" },
        { pattern: /\b\d+gb\s+(ram|memory)(?!\s*gddr)\b/i, name: "RAM/memory" },
        { pattern: /\b\d+tb\s+(ssd|hdd|storage)\b/i, name: "storage" },
        { pattern: /\bwin\s*\d+\s+(home|pro)\b/i, name: "Windows" },
        { pattern: /\bliquid\s+cool(ed|ing)\b/i, name: "liquid cooling" }
    ];

    for (const { pattern, name } of systemPatterns) {
        if (pattern.test(title)) {
            console.log(`  ❌ MATCHED ${name} pattern`);
            return true;
        }
    }

    return false;
}

const gpuName = "MSI GeForce RTX 4090 Gaming X Trio 24G Gaming Graphics Card - 24GB GDDR6X, 2595 MHz, PCI Express Gen 4, 384-bit, 3X DP v 1.4a, HDMI 2.1a (Supports 4K & 8K HDR)";

console.log(`Testing: ${gpuName}\n`);
const result = isDesktopOrLaptop(gpuName);
console.log(`\nResult: ${result ? 'FILTERED OUT ❌' : 'PASSED ✅'}`);
