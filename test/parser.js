// Extensive parser regression suite for scripts/ingestNewComponents.js
//
// Table-driven: each FIELD case supplies a component type + an Amazon-style title
// and the field values the parser must produce. Each REJECT case asserts that
// shouldRejectCandidate accepts/rejects a listing. Titles are taken from real
// ingested data (2026-06-17 audit) plus known-good spec sheets.
//
// Run: node test/parser.js

const assert = require('assert');
const {
  buildPendingComponent,
  shouldRejectCandidate
} = require('../scripts/ingestNewComponents');

const SCRAPED_AT = '2026-06-18T00:00:00.000Z';
const TAG = 'qhezpc-20';
let pass = 0;
let fail = 0;

function fieldsFor(type, title) {
  return buildPendingComponent(type, {
    asin: 'B0' + Math.random().toString(36).slice(2, 10).toUpperCase(),
    name: title,
    title,
    imageUrl: 'https://m.media-amazon.com/images/I/x.jpg',
    sourceUrl: 'https://www.amazon.com/dp/B0PARSER01',
    price: 99.99,
    source: 'amazon',
    scrapedAt: SCRAPED_AT,
    affiliateTag: TAG
  }).fields;
}

function get(obj, path) {
  return path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);
}

// FIELD cases: { type, title, expect: { 'dotted.path': value } }.
// Arrays are compared with deepStrictEqual; everything else with strictEqual.
const fieldCases = [
  // ---------------- STORAGE ----------------
  {
    type: 'storage',
    title: 'Samsung 990 PRO NVMe M.2 SSD, 2 TB, PCIe 4.0, 7,450 MB/s Read, 6,900 MB/s Write, MZ-V9P2T0BW',
    expect: { manufacturer: 'Samsung', brand: '990 PRO', type: 'M.2 SSD', capacity: 2000, interface: 'PCIe 4.0', readSpeed: 7450, writeSpeed: 6900 }
  },
  {
    type: 'storage',
    title: 'WD_BLACK SN850X 1TB NVMe SSD - M.2 2280, Up to 7,300 MB/s Read speeds, Up to 6,300 MB/s write speeds',
    expect: { manufacturer: 'WD', brand: 'SN850X', capacity: 1000, readSpeed: 7300, writeSpeed: 6300 }
  },
  {
    type: 'storage',
    title: 'Fikwot FN960 2TB M.2 NVMe SSD PCIe Gen4 x4 2280, Up to 4,800MB/s, Dynamic SLC Cache',
    expect: { manufacturer: 'Fikwot', capacity: 2000, interface: 'PCIe 4.0', readSpeed: 4800 }
  },
  {
    type: 'storage',
    title: '2TB NVMe M.2 2280 SSD, PCIe Gen3 3D NAND Internal Solid State Drive, Up to 3500MB/s, GM328',
    expect: { manufacturer: null, capacity: 2000, interface: 'PCIe 3.0', readSpeed: 3500 }
  },
  {
    type: 'storage',
    title: 'Samsung SSD 9100 PRO 4TB, PCIe 5.0x4 M.2 2280, Seq. Read Speeds Up to 14,800MB/s',
    expect: { brand: '9100 PRO', capacity: 4000, interface: 'PCIe 5.0', readSpeed: 14800 }
  },
  {
    type: 'storage',
    title: 'Seagate BarraCuda 2TB Internal Hard Drive HDD - 3.5 Inch SATA 6Gb/s 7200 RPM',
    expect: { manufacturer: 'Seagate', brand: 'BarraCuda', type: 'HDD', formFactor: '3.5"', capacity: 2000 }
  },

  // ---------------- GPU ----------------
  {
    type: 'gpu',
    title: 'ASUS ROG Strix GeForce RTX 4090 BTF OC Edition Gaming Graphics Card (PCIe 4.0, 24GB GDDR6X)',
    expect: { manufacturer: 'NVIDIA', partner: 'ASUS', chipset: 'RTX 4090', 'memory.size': 24, 'memory.type': 'GDDR6X', 'memory.busWidth': 384, 'specifications.pcieVersion': 'PCIe 4.0' }
  },
  {
    type: 'gpu',
    title: 'EVGA GeForce RTX 3090 FTW3 Ultra Gaming, 24GB GDDR6X, PCIe 4, ARGB',
    expect: { partner: 'EVGA', chipset: 'RTX 3090', 'memory.size': 24, 'memory.busWidth': 384 }
  },
  {
    type: 'gpu',
    title: 'ASUS TUF Gaming GeForce RTX 4070 Ti SUPER OC 16GB GDDR6X 256-bit PCIe 4.0 285W TDP',
    expect: { chipset: 'RTX 4070 TI SUPER', 'memory.size': 16, 'memory.busWidth': 256, 'power.tdp': 285 }
  },
  {
    type: 'gpu',
    title: 'GIGABYTE GeForce RTX 5080 Gaming OC 16GB GDDR7 256-bit',
    expect: { partner: 'Gigabyte', chipset: 'RTX 5080', 'memory.type': 'GDDR7', 'memory.busWidth': 256, 'specifications.pcieVersion': 'PCIe 5.0' }
  },
  {
    type: 'gpu',
    title: 'Sapphire AMD Radeon RX 7800 XT Pulse 16GB GDDR6',
    expect: { manufacturer: 'AMD', partner: 'Sapphire', chipset: 'RX 7800 XT', 'memory.size': 16, 'memory.busWidth': 256 }
  },

  // ---------------- CPU ----------------
  {
    type: 'cpu',
    title: 'AMD Ryzen 9 7950X 16-Core, 32-Thread Desktop Processor AM5 up to 5.7 GHz 170W TDP DDR5 PCIe 5.0',
    expect: { manufacturer: 'AMD', socket: 'AM5', cores: 16, threads: 32, boostClock: 5.7, tdp: 170, pcieVersion: 'PCIe 5.0' }
  },
  {
    type: 'cpu',
    title: 'Intel Core i9-11900 Desktop Processor 8 Cores up to 5.2 GHz LGA1200 65W',
    expect: { manufacturer: 'Intel', socket: 'LGA1200', cores: 8, boostClock: 5.2, tdp: 65, integratedGraphics: true }
  },
  {
    type: 'cpu',
    title: 'Intel Core i5-14400F Desktop Processor 10 cores (6 P-cores + 4 E-cores) up to 4.7 GHz LGA1700',
    expect: { socket: 'LGA1700', cores: 10, boostClock: 4.7, integratedGraphics: false }
  },
  {
    type: 'cpu',
    title: 'Intel Core i9-14900K Desktop Processor LGA1700 24 cores (8P + 16E) up to 6.0 GHz DDR5',
    expect: { socket: 'LGA1700', cores: 24, boostClock: 6, integratedGraphics: true }
  },
  {
    type: 'cpu',
    title: 'AMD Ryzen 5 5600G 6-Core 12-Thread AM4 with Radeon Graphics',
    expect: { socket: 'AM4', cores: 6, threads: 12, integratedGraphics: true }
  },

  // ---------------- RAM ----------------
  {
    type: 'ram',
    title: 'Corsair Vengeance RGB 32GB (2 x 16GB) DDR5-6000 PC5-48000 CL36 36-44-44-96',
    expect: { manufacturer: 'Corsair', brand: 'Vengeance', totalCapacity: 32, kitSize: 2, capacity: 16, memoryType: 'DDR5', speed: 6000, casLatency: 36, timing: '36-44-44-96', rgb: true }
  },
  {
    type: 'ram',
    title: 'CORSAIR Vengeance DDR5 RAM 32GB (2x16GB) 6000MHz CL30-36-36-76 1.4V AMD EXPO Intel XMP',
    expect: { speed: 6000, casLatency: 30, timing: '30-36-36-76', voltage: 1.4, xmp: true, expo: true }
  },
  {
    type: 'ram',
    title: 'KLEVV Urbane V RGB DDR5 32GB (2x16GB) 6000MHz CL30 1.35V XMP 3.0 AMD Expo',
    expect: { manufacturer: 'KLEVV', totalCapacity: 32, speed: 6000, casLatency: 30, voltage: 1.35, xmp: true, expo: true, rgb: true }
  },
  {
    type: 'ram',
    title: 'SK Hynix Original 8GB (1x8GB) DDR5 5600MHz UDIMM Unbuffered Non-ECC CL46',
    expect: { manufacturer: 'SK hynix', capacity: 8, kitSize: 1, totalCapacity: 8, memoryType: 'DDR5', speed: 5600, casLatency: 46, ecc: false, registered: false }
  },
  {
    type: 'ram',
    title: 'G.Skill Trident Z5 RGB DDR5 32GB (2x16GB) 6400MHz CL32',
    expect: { manufacturer: 'G.Skill', brand: 'Trident Z5', speed: 6400, casLatency: 32, rgb: true }
  },

  // ---------------- PSU ----------------
  {
    type: 'psu',
    title: 'CORSAIR RM1000x Fully Modular ATX Power Supply - 80 Plus Gold - Black',
    expect: { manufacturer: 'Corsair', brand: 'RMx', wattage: 1000, efficiency: 'Gold', modularity: 'Full', certification: '80 Plus' }
  },
  {
    type: 'psu',
    title: 'CORSAIR RM1000e (2025) Fully Modular ATX 3.1 & PCIe 5.1 Cybenetics Gold Efficiency',
    expect: { brand: 'RMe', wattage: 1000, efficiency: 'Gold', certification: 'Cybenetics' }
  },
  {
    type: 'psu',
    title: 'ARESGAME 750W Power Supply, 80 Plus Bronze Certified, Semi Modular ATX PSU',
    expect: { manufacturer: 'ARESGAME', wattage: 750, efficiency: 'Bronze', modularity: 'Semi', formFactor: 'ATX' }
  },
  {
    type: 'psu',
    title: 'EVGA SuperNOVA 850 GT 80 Plus Gold Fully Modular Power Supply',
    expect: { manufacturer: 'EVGA', brand: 'SuperNOVA', wattage: 850, efficiency: 'Gold', modularity: 'Full' }
  },
  {
    type: 'psu',
    title: 'be quiet! Pure Power 12 M 650W 80 Plus Gold ATX Power Supply',
    expect: { manufacturer: 'be quiet!', wattage: 650, efficiency: 'Gold' }
  },

  // ---------------- MOTHERBOARD ----------------
  {
    type: 'motherboard',
    title: 'ASUS ROG Strix B760-A Gaming WiFi LGA1700 ATX Motherboard, DDR5, PCIe 5.0, WiFi 6E',
    expect: { manufacturer: 'ASUS', chipset: 'B760', socket: 'LGA1700', formFactor: 'ATX', memorySlots: 4, 'networking.wifi': true, 'networking.wifiVersion': 'WiFi 6E' }
  },
  {
    type: 'motherboard',
    title: 'ASUS ROG Maximus Z790 Dark Hero LGA1700 ATX, DDR5, PCIe 5.0 x16 slot plus second PCIe 5.0 x16, 5xM.2 Slots, WiFi 7',
    expect: { chipset: 'Z790', socket: 'LGA1700', formFactor: 'ATX', 'networking.wifiVersion': 'WiFi 7' }
  },
  {
    type: 'motherboard',
    title: 'GIGABYTE Z790 Eagle AX LGA 1700 ATX Motherboard DDR5 PCIe 5.0 WIFI6E 3X M.2',
    expect: { manufacturer: 'Gigabyte', chipset: 'Z790', socket: 'LGA1700', 'networking.wifi': true, 'networking.wifiVersion': 'WiFi 6E' }
  },
  {
    type: 'motherboard',
    title: 'ASUS ROG Strix B850-I Gaming WiFi AM5 Mini-ITX Motherboard DDR5 WiFi 7',
    expect: { chipset: 'B850', socket: 'AM5', formFactor: 'Mini-ITX', memorySlots: 2, 'networking.wifi': true, 'networking.wifiVersion': 'WiFi 7' }
  },
  {
    type: 'motherboard',
    title: 'MSI MAG B650 Tomahawk WiFi AM5 ATX Motherboard DDR5',
    expect: { manufacturer: 'MSI', chipset: 'B650', socket: 'AM5', formFactor: 'ATX', memorySlots: 4, 'networking.wifi': true }
  },

  // ---------------- CASE ----------------
  {
    type: 'case',
    title: 'NZXT H7 Flow RGB Mid-Tower ATX Airflow Case with RGB Fans',
    expect: { manufacturer: 'NZXT', brand: 'H7', 'specifications.hasRGB': true }
  },
  {
    type: 'case',
    title: 'Redragon GC218M Gaming Back-Mounted PC Case, M-ATX Computer Chassis',
    expect: { manufacturer: 'Redragon' }
  },
  {
    type: 'case',
    title: 'Geometric Future M5 Tempered Glass Mid Tower, E-ATX/ATX Gaming Case, GEO-M5-BY',
    expect: { manufacturer: 'Geometric Future', 'specifications.window': true }
  },
  {
    type: 'case',
    title: 'Cooler Master Elite 502 White ATX High Airflow PC Case',
    expect: { manufacturer: 'Cooler Master' }
  },
  {
    type: 'case',
    title: 'Fractal Design Meshify 2 Compact ATX Mid Tower Case',
    expect: { manufacturer: 'Fractal Design', brand: 'Meshify' }
  },

  // ---------------- COOLER ----------------
  {
    type: 'cooler',
    title: 'be quiet! Dark Rock Pro 5 CPU Cooler | 7 high-Performance Copper Heat Pipes | BK036',
    expect: { manufacturer: 'be quiet!', brand: 'Dark Rock', type: 'Air', heatpipes: 7 }
  },
  {
    type: 'cooler',
    title: 'CORSAIR Nautilus 360 RS ARGB Liquid CPU Cooler 360mm AIO 3X RS120 ARGB Fans Included Black',
    expect: { manufacturer: 'Corsair', type: 'Liquid', 'fan.count': 3, 'radiator.size': 360 }
  },
  {
    type: 'cooler',
    title: 'Noctua NH-D15, Premium Dual Tower CPU Cooler with 2X NF-A15 PWM 140mm Fans (Brown)',
    expect: { manufacturer: 'Noctua', brand: 'NH-D15', type: 'Air', 'fan.count': 2 }
  },
  {
    type: 'cooler',
    title: 'be quiet! Pure Rock Slim 3, CPU Cooler, 130 W TDP, 100 mm PWM Fan, 3 Heatpipes, Slim Tower',
    expect: { type: 'Air', heatpipes: 3, 'performance.tdp': 130 }
  },
  {
    type: 'cooler',
    title: 'ARCTIC Liquid Freezer III 360 A-RGB Multi Compatible All-in-One CPU AIO Water Cooler 360mm',
    expect: { manufacturer: 'Arctic', brand: 'Liquid Freezer', type: 'Liquid', 'radiator.size': 360 }
  },

  // ===== 2026-06-18 hardening regressions =====

  // GPU: chipset ref-table coverage for RTX 50 / RX 9000 / RTX 3050. Bus width and
  // PCIe gen must backfill from the die even when the partner title omits them.
  {
    type: 'gpu',
    title: 'ASUS Dual NVIDIA GeForce RTX 3050 6GB GDDR6 OC Edition Gaming Graphics Card - PCIe 4.0',
    expect: { manufacturer: 'NVIDIA', chipset: 'RTX 3050', 'memory.size': 6, 'memory.type': 'GDDR6', 'memory.busWidth': 128, 'specifications.pcieVersion': 'PCIe 4.0' }
  },
  {
    type: 'gpu',
    title: 'ASUS Prime NVIDIA GeForce RTX 5060 8GB GDDR7 OC Edition Graphics Card',
    expect: { chipset: 'RTX 5060', 'memory.type': 'GDDR7', 'memory.busWidth': 128, 'specifications.pcieVersion': 'PCIe 5.0' }
  },
  {
    type: 'gpu',
    title: 'GIGABYTE Radeon RX 9070 XT Gaming OC 16G Graphics Card, PCIe 5.0, 16GB GDDR6',
    expect: { manufacturer: 'AMD', partner: 'Gigabyte', chipset: 'RX 9070 XT', 'memory.size': 16, 'memory.busWidth': 256, 'specifications.pcieVersion': 'PCIe 5.0' }
  },

  // CPU: socket inferred from model generation, authoritative over blob noise. The
  // i9-13900KS title carries no socket string (and was mis-tagged LGA1151).
  {
    type: 'cpu',
    title: 'Intel Core i9-13900KS Desktop Processor 24 cores (8 P-cores + 16 E-cores) 36MB Cache, up to 6.0 GHz',
    expect: { socket: 'LGA1700', cores: 24, boostClock: 6, integratedGraphics: true }
  },
  {
    type: 'cpu',
    title: 'Intel Core i7-10700F Desktop Processor 8 Cores up to 4.8 GHz Without Processor Graphics',
    expect: { socket: 'LGA1200', cores: 8, integratedGraphics: false }
  },
  {
    type: 'cpu',
    title: 'AMD Ryzen 9 9950X 16-Core 32-Thread Unlocked Desktop Processor',
    expect: { socket: 'AM5', cores: 16 }
  },

  // RAM: DDR5 "On-Die ECC" must NOT report ecc:true (every DDR5 chip has it); a
  // genuine ECC RDIMM must.
  {
    type: 'ram',
    title: 'TEAMGROUP T-Force Vulcan DDR5 32GB (2x16GB) 6000MHz CL38 On-Die ECC Intel XMP AMD Expo',
    expect: { memoryType: 'DDR5', speed: 6000, casLatency: 38, ecc: null }
  },
  {
    type: 'ram',
    title: 'Kingston Server Premier 32GB DDR5 4800MHz ECC Registered RDIMM Server Memory',
    expect: { memoryType: 'DDR5', speed: 4800, ecc: true, registered: true }
  },

  // PSU: "80+ Gold" short form (no "Plus") must resolve efficiency + certification.
  {
    type: 'psu',
    title: 'MSI MPG A1000GS PCIE5 II, Fully Modular Gaming 1000W Power Supply, 80+ Gold, ATX 3.1',
    expect: { manufacturer: 'MSI', wattage: 1000, efficiency: 'Gold', modularity: 'Full', certification: '80 Plus' }
  },

  // Cooler: number-word fan count with descriptors before "Fans".
  {
    type: 'cooler',
    title: 'ARCTIC Freezer 36 CO - Single-Tower CPU Cooler with Push-Pull, Two Pressure-optimised 120 mm P Fans, 4 Heatpipes',
    expect: { type: 'Air', heatpipes: 4, 'fan.count': 2 }
  },

  // Motherboard: M.2 + PCIe slot backfill from chipset when the listing omits counts.
  {
    type: 'motherboard',
    title: 'MSI MAG Z890 Tomahawk WiFi Gaming Motherboard LGA 1851 DDR5 ATX Wi-Fi 7',
    expect: { chipset: 'Z890', socket: 'LGA1851', 'm2Slots.0.type': 'M.2', 'm2Slots.0.inferred': true, 'm2Slots.3.nvme': true, 'pcieSlots.0.version': 'PCIe 5.0', 'pcieSlots.0.inferred': true }
  },
  {
    type: 'motherboard',
    title: 'ASUS Prime B650M-A AM5 Micro-ATX Motherboard DDR5',
    expect: { chipset: 'B650', socket: 'AM5', 'm2Slots.1.type': 'M.2', 'pcieSlots.0.physicalSize': 'x16' }
  },
  // M.2 generation must come from the gen tied to "M.2" ("4xPCIe 4.0 M.2"), not the
  // x16 slot's "PCIe5.0" — these sockets are Gen4 and were being mislabeled Gen5.
  {
    type: 'motherboard',
    title: 'ASUS ROG STRIX Z790-H Gaming (WiFi 6E) LGA1700 ATX motherboard (DDR5 7800 MT/s, PCIe5.0 x16 with Q-Release, 4xPCIe 4.0 M.2 slots, USB 3.2 Gen 2x2 Type-C)',
    expect: { chipset: 'Z790', 'm2Slots.0.pcieVersion': 'PCIe 4.0', 'm2Slots.3.pcieVersion': 'PCIe 4.0' }
  },
  // PCIe expansion: a title that spells out only the primary x16 must still report
  // the chipset's full typical layout, not a single slot.
  {
    type: 'motherboard',
    title: 'ASUS ROG Strix Z790-E Gaming WiFi II LGA 1700 ATX motherboard (DDR5, PCIe 5.0, 5XM.2 slots, PCIe 5.0 x16)',
    expect: { chipset: 'Z790', 'pcieSlots.0.version': 'PCIe 5.0', 'pcieSlots.0.inferred': true, 'pcieSlots.2.physicalSize': 'x1' }
  },
  // ®/™ glyphs inside spec phrases must not break M.2 count/gen parsing — "3X PCIe®
  // 5.0 M.2" must yield 3 M.2 sockets at PCIe 5.0, not the chipset default.
  {
    type: 'motherboard',
    title: 'ASUS ROG Maximus Z890 Hero Intel® Z890 LGA 1851 ATX Motherboard, DDR5, WiFi 7, 3X PCIe® 5.0 M.2, Thunderbolt™ 4, USB Type-C®',
    expect: { chipset: 'Z890', socket: 'LGA1851', 'm2Slots.0.pcieVersion': 'PCIe 5.0', 'm2Slots.2.pcieVersion': 'PCIe 5.0' }
  }
];

// REJECT cases: { type, title, reason } where reason is the expected
// shouldRejectCandidate() return (a string to reject, or null to accept).
const rejectCases = [
  { type: 'motherboard', title: 'WiFi 7 Antenna External Magnetic Desktop Antenna for ASUS ROG Strix Z790-E Z790-A with 0.8m Extension Cable', reason: 'antenna accessory' },
  { type: 'motherboard', title: '2.4/5.8/6GHz Tri Band WiFi 7 Gaming Motherboard Antenna Cable for ASUS ROG Strix B850-E Z790', reason: 'antenna accessory' },
  { type: 'cpu', title: 'Micro Center 3 in 1 Combo: Intel Core i9-14900K Processor w/Asus Z790 Motherboard and KLEVV DDR5 32GB Ram', reason: 'combo product' },
  { type: 'cpu', title: 'Micro Center CPU Motherboard Combo -14900K 14th Gen 24-Cores LGA 1700 Desktop Processor', reason: 'combo product' },
  { type: 'motherboard', title: 'Micro Center CPU Motherboard Combo -12900K 12th Gen 16-Cores LGA 1700 Desktop', reason: 'combo product' },
  { type: 'motherboard', title: 'Asus Sparepart Rog Strix Z790-I Gaming WiFi Intel Z790 LGA 1700 Mini ITX W128279244', reason: 'spare part listing' },
  { type: 'addon', title: 'EC AC Cooling Fan 120X120X25mm 120mm AC 110V 115V 120V 220V 240V for Chassis case', reason: 'AC-powered fan' },
  { type: 'gpu', title: 'RTX 4090 GPU Support Bracket Anti-Sag Holder Stand for Graphics Cards', reason: 'GPU accessory' },
  { type: 'storage', title: 'SanDisk Extreme Portable SSD 2TB External USB-C Solid State Drive', reason: 'portable/external storage' },
  { type: 'psu', title: 'MXR® Iso-Brick™ Power Supply', reason: 'non-PC power supply' },
  { type: 'psu', title: 'Guitar Effects Pedal Power Supply 10 Isolated DC Outputs', reason: 'non-PC power supply' },
  // Valid listings that must NOT be rejected:
  { type: 'psu', title: 'be quiet! Pure Power 12 1000W 80 Plus Gold ATX Power Supply', reason: null },
  { type: 'psu', title: 'CORSAIR RM1000e Fully Modular Low-Noise ATX Power Supply 80 PLUS Gold', reason: null },
  { type: 'cpu', title: 'AMD Ryzen 7 7800X3D 8-Core 16-Thread AM5 Desktop Processor', reason: null },
  { type: 'gpu', title: 'ASUS TUF Gaming GeForce RTX 4080 SUPER 16GB GDDR6X', reason: null },
  { type: 'motherboard', title: 'ASUS ROG Strix B760-A Gaming WiFi LGA1700 ATX Motherboard', reason: null },
  { type: 'addon', title: 'Corsair RS120 120mm PWM Fan Single Pack Black', reason: null },
  { type: 'storage', title: 'Samsung 990 PRO 2TB NVMe M.2 Internal SSD', reason: null }
];

function check(label, fn) {
  try {
    fn();
    pass += 1;
  } catch (err) {
    fail += 1;
    console.log(`FAIL ${label}: ${err.message}`);
  }
}

for (const tc of fieldCases) {
  const fields = fieldsFor(tc.type, tc.title);
  for (const [path, expected] of Object.entries(tc.expect)) {
    check(`[${tc.type}] "${tc.title.slice(0, 40)}…" ${path}`, () => {
      const actual = get(fields, path);
      if (Array.isArray(expected)) {
        assert.deepStrictEqual(actual, expected, `${path}: ${JSON.stringify(actual)} != ${JSON.stringify(expected)}`);
      } else {
        assert.strictEqual(actual, expected, `${path}: ${JSON.stringify(actual)} != ${JSON.stringify(expected)}`);
      }
    });
  }
}

for (const rc of rejectCases) {
  check(`[reject ${rc.type}] "${rc.title.slice(0, 40)}…" -> ${rc.reason}`, () => {
    const actual = shouldRejectCandidate(rc.type, rc.title);
    assert.strictEqual(actual, rc.reason, `got ${JSON.stringify(actual)}, want ${JSON.stringify(rc.reason)}`);
  });
}

console.log(`\nParser suite: ${pass} passed, ${fail} failed (${pass + fail} assertions)`);
if (fail > 0) process.exitCode = 1;
