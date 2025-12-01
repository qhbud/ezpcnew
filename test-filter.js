function isDesktopOrLaptop(title) {
    if (!title) return false;

    const titleLower = title.toLowerCase();

    // Desktop/PC indicators
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
            console.log(`  Matched desktop keyword: "${keyword}"`);
            return true;
        }
    }

    // Check for laptop keywords
    for (const keyword of laptopKeywords) {
        if (titleLower.includes(keyword)) {
            console.log(`  Matched laptop keyword: "${keyword}"`);
            return true;
        }
    }

    // Additional patterns for complete systems
    const systemPatterns = [
        { pattern: /\b(intel|amd)\s+(core|ryzen).+processor\b/i, desc: "processor pattern" },
        { pattern: /\b\d+gb\s+(ram|memory)(?!\s*gddr)\b/i, desc: "RAM pattern (not GDDR)" },
        { pattern: /\b\d+tb\s+(ssd|hdd|storage)\b/i, desc: "storage pattern" },
        { pattern: /\bwin\s*\d+\s+(home|pro)\b/i, desc: "Windows pattern" },
        { pattern: /\bliquid\s+cool(ed|ing)\b/i, desc: "liquid cooling pattern" },
    ];

    for (const { pattern, desc } of systemPatterns) {
        if (pattern.test(title)) {
            console.log(`  Matched pattern: ${desc}`);
            return true;
        }
    }

    return false;
}

const gpuNames = [
    'Asus TUF Gaming NVIDIA GeForce RTX 4090 OC Edition Gaming Graphics Card (24GB GDDR6X, PCIe 4.0, HDMI 2.1a, DisplayPort 1.4a, Dual Ball Bearing Axial Fans)',
    'ASUS ROG Strix GeForce RTX™ 4090 White OC Edition Gaming Graphics Card (PCIe 4.0, 24GB GDDR6X, HDMI 2.1a, DisplayPort 1.4a)',
    'ASUS ROG Strix GeForce RTX® 4090 OC Edition Gaming Graphics Card (PCIe 4.0, 24GB GDDR6X, HDMI 2.1a, DisplayPort 1.4a)',
    'MSI GeForce RTX 4090 SUPRIM Liquid X 24G Gaming Graphics Card - 24GB GDDR6X, 2625 MHz, PCI Express Gen 4, 384-bit, 3X DP v 1.4a, HDMI 2.1a (Supports 4K & 8K HDR)',
    'MSI GeForce RTX 4090 Gaming Slim 24GB GDDR6X Video Card',
    'MSI GeForce RTX 4090 Gaming X Trio 24G Gaming Graphics Card - 24GB GDDR6X, 2595 MHz, PCI Express Gen 4, 384-bit, 3X DP v 1.4a, HDMI 2.1a (Supports 4K & 8K HDR)'
];

console.log('Testing GPU names:\n');
gpuNames.forEach(name => {
    console.log(`GPU: ${name.substring(0, 80)}...`);
    const result = isDesktopOrLaptop(name);
    console.log(`  Result: ${result ? 'FILTERED OUT' : 'PASSED'}\n`);
});
