const { MongoClient } = require('mongodb');
require('dotenv').config();

const DEFAULT_DB_NAME = 'pcbuilder';
const DEFAULT_AFFILIATE_TAG = 'qhezpc-20';
const PENDING_COLLECTION = 'pending_components';

const TYPE_ALIASES = {
  gpu: 'gpu',
  gpus: 'gpu',
  cpu: 'cpu',
  cpus: 'cpu',
  motherboard: 'motherboard',
  motherboards: 'motherboard',
  ram: 'ram',
  rams: 'ram',
  storage: 'storage',
  storages: 'storage',
  psu: 'psu',
  psus: 'psu',
  case: 'case',
  cases: 'case',
  cooler: 'cooler',
  coolers: 'cooler',
  addon: 'addon',
  addons: 'addon'
};

const TYPE_CONFIG = {
  gpu: {
    liveCollection: 'gpus',
    livePrefixes: ['gpus_'],
    searchTerms: [
      'NVIDIA RTX 4090 graphics card',
      'NVIDIA RTX 4070 graphics card',
      'NVIDIA RTX 4060 graphics card',
      'AMD RX 7900 XTX graphics card',
      'AMD RX 7800 XT graphics card',
      'AMD RX 7600 graphics card',
      'Intel Arc A770 graphics card'
    ]
  },
  cpu: {
    liveCollection: 'cpus',
    livePrefixes: ['cpus_'],
    searchTerms: [
      'Intel Core i9-14900K processor',
      'Intel Core i7-14700K processor',
      'Intel Core i5-14600K processor',
      'AMD Ryzen 9 7950X processor',
      'AMD Ryzen 7 7700X processor',
      'AMD Ryzen 5 7600X processor'
    ]
  },
  motherboard: {
    liveCollection: 'motherboards',
    livePrefixes: [],
    searchTerms: [
      'ASUS ROG STRIX Z790 motherboard',
      'MSI MAG B760 motherboard',
      'GIGABYTE B650 motherboard',
      'ASRock X670E motherboard',
      'ASUS TUF Gaming motherboard'
    ]
  },
  ram: {
    liveCollection: 'rams',
    livePrefixes: [],
    searchTerms: [
      'Corsair Vengeance DDR5 32GB',
      'G.Skill Trident Z5 DDR5 16GB',
      'Kingston Fury Beast DDR5 64GB',
      'Corsair Dominator DDR4 32GB',
      'G.Skill Ripjaws DDR4 16GB'
    ]
  },
  storage: {
    liveCollection: 'storages',
    livePrefixes: [],
    searchTerms: [
      'Samsung 990 Pro 2TB NVMe SSD',
      'WD Black SN850X 1TB NVMe',
      'Crucial P5 Plus 500GB NVMe',
      'Samsung 870 EVO 2TB SATA SSD',
      'WD Blue 4TB HDD'
    ]
  },
  psu: {
    liveCollection: 'psus',
    livePrefixes: [],
    searchTerms: [
      'Corsair RM1000x power supply',
      'EVGA SuperNOVA 750 power supply',
      'Seasonic Focus 650W power supply',
      'be quiet! Pure Power 550W',
      'Thermaltake Toughpower 850W'
    ]
  },
  case: {
    liveCollection: 'cases',
    livePrefixes: [],
    searchTerms: [
      'NZXT H7 Flow case',
      'Corsair 4000D Airflow',
      'Lian Li O11 Dynamic',
      'Fractal Design Meshify',
      'Phanteks Eclipse P400A'
    ]
  },
  cooler: {
    liveCollection: 'coolers',
    livePrefixes: [],
    searchTerms: [
      'Noctua NH-D15 CPU cooler',
      'Arctic Liquid Freezer II 360mm',
      'be quiet! Dark Rock Pro 4',
      'Cooler Master Hyper 212',
      'Corsair iCUE H150i AIO'
    ]
  },
  addon: {
    liveCollection: 'addons',
    livePrefixes: [],
    searchTerms: [
      '120mm PWM case fan',
      'ARGB fan hub controller',
      'thermal paste CPU',
      'sleeved PSU cable extension',
      'PC RGB LED strip'
    ]
  }
};

const ALL_TYPES = Object.keys(TYPE_CONFIG);

function normalizeType(type) {
  return TYPE_ALIASES[String(type || '').trim().toLowerCase()] || null;
}

function parseArgs(argv) {
  const options = {
    type: 'all',
    limit: 5,
    dryRun: false,
    includeExisting: false
  };

  for (const arg of argv) {
    if (arg === '--dry-run') {
      options.dryRun = true;
    } else if (arg === '--include-existing') {
      options.includeExisting = true;
    } else if (arg.startsWith('--type=')) {
      options.type = arg.slice('--type='.length).trim().toLowerCase();
    } else if (arg.startsWith('--limit=')) {
      const parsed = Number.parseInt(arg.slice('--limit='.length), 10);
      if (!Number.isNaN(parsed) && parsed >= 0) {
        options.limit = parsed;
      }
    }
  }

  const normalizedType = options.type === 'all' ? 'all' : normalizeType(options.type);
  if (!normalizedType) {
    throw new Error(`Unsupported component type: ${options.type}`);
  }

  options.type = normalizedType;
  return options;
}

function firstString(...values) {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }
  return '';
}

function cleanWhitespace(value) {
  return firstString(value).replace(/\s+/g, ' ').trim();
}

function normalizeName(name) {
  return cleanWhitespace(name)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractAsin(url) {
  if (!url || typeof url !== 'string') return null;
  const dpMatch = url.match(/\/dp\/([A-Z0-9]{10})/i);
  const gpMatch = url.match(/\/gp\/product\/([A-Z0-9]{10})/i);
  const productMatch = url.match(/\/product\/([A-Z0-9]{10})/i);
  if (dpMatch) return dpMatch[1].toUpperCase();
  if (gpMatch) return gpMatch[1].toUpperCase();
  if (productMatch) return productMatch[1].toUpperCase();
  return null;
}

function normalizeAsin(value) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim().toUpperCase();
  return /^[A-Z0-9]{10}$/.test(trimmed) ? trimmed : null;
}

function normalizePrice(value) {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  const parsed = Number.parseFloat(String(value).replace(/[^0-9.]/g, ''));
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeAmazonProductUrl(url, asin, affiliateTag = DEFAULT_AFFILIATE_TAG) {
  const finalAsin = normalizeAsin(asin) || extractAsin(url);
  if (finalAsin) {
    return `https://www.amazon.com/dp/${finalAsin}?tag=${encodeURIComponent(affiliateTag)}`;
  }

  if (!url) return '';

  try {
    const parsedUrl = new URL(url, 'https://www.amazon.com');
    if (parsedUrl.hostname.includes('amazon.com')) {
      parsedUrl.searchParams.set('tag', affiliateTag);
    }
    return parsedUrl.toString();
  } catch {
    return url;
  }
}

function buildDedupKey(asin, name) {
  const normalizedAsin = normalizeAsin(asin);
  if (normalizedAsin) return `amazon:${normalizedAsin}`;
  return `name:${normalizeName(name)}`;
}

function normalizeScrapedAt(value) {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'string' && value.trim()) {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? value.trim() : parsed.toISOString();
  }
  return new Date(0).toISOString();
}

function specsText(specs) {
  if (!specs || typeof specs !== 'object') return '';
  return Object.entries(specs)
    .map(([key, value]) => `${key} ${value}`)
    .join(' ');
}

function productText(rawProduct) {
  return [
    rawProduct.rawTitle,
    rawProduct.title,
    rawProduct.name,
    Array.isArray(rawProduct.features) ? rawProduct.features.join(' ') : '',
    specsText(rawProduct.specs)
  ].filter(Boolean).join(' ');
}

function matchFirst(text, patterns, formatter = (match) => match[1] || match[0]) {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return formatter(match);
  }
  return null;
}

function findManufacturer(text, names) {
  const lower = text.toLowerCase();
  for (const name of names) {
    if (lower.includes(name.toLowerCase())) return name;
  }
  return null;
}

function parseNumber(text, patterns) {
  const value = matchFirst(text, patterns);
  if (value === null || value === undefined) return null;
  const parsed = Number.parseFloat(String(value).replace(/,/g, ''));
  return Number.isFinite(parsed) ? parsed : null;
}

function parseInteger(text, patterns) {
  const parsed = parseNumber(text, patterns);
  return parsed === null ? null : Math.round(parsed);
}

function parseCapacityGb(text) {
  const match = text.match(/(\d+(?:\.\d+)?)\s*(tb|gb)\b/i);
  if (!match) return null;
  const value = Number.parseFloat(match[1]);
  if (!Number.isFinite(value)) return null;
  return match[2].toLowerCase() === 'tb' ? Math.round(value * 1000) : Math.round(value);
}

function parseMemoryTypes(text) {
  const found = [];
  if (/\bddr5\b/i.test(text)) found.push('DDR5');
  if (/\bddr4\b/i.test(text)) found.push('DDR4');
  return found;
}

function parseSocketList(text) {
  const sockets = new Set();
  const patterns = [
    /\bLGA\s?1851\b/ig,
    /\bLGA\s?1700\b/ig,
    /\bLGA\s?1200\b/ig,
    /\bLGA\s?1151\b/ig,
    /\bAM5\b/ig,
    /\bAM4\b/ig,
    /\bsTRX5\b/ig,
    /\bTR4\b/ig
  ];

  for (const pattern of patterns) {
    for (const match of text.matchAll(pattern)) {
      sockets.add(match[0].replace(/\s+/g, '').toUpperCase().replace('STRX', 'sTRX'));
    }
  }

  return Array.from(sockets);
}

function parseSingleSocket(text) {
  return parseSocketList(text)[0] || null;
}

function parseFormFactors(text) {
  const factors = [];
  const checks = [
    [/e-?atx/i, 'E-ATX'],
    [/micro[-\s]?atx|\bmatx\b/i, 'Micro-ATX'],
    [/mini[-\s]?itx|\bitx\b/i, 'Mini-ITX'],
    [/\batx\b/i, 'ATX']
  ];

  for (const [pattern, value] of checks) {
    if (pattern.test(text) && !factors.includes(value)) {
      factors.push(value);
    }
  }

  return factors;
}

function parseChipset(text) {
  const patterns = [
    /\bRTX\s?5090\b/i,
    /\bRTX\s?5080\b/i,
    /\bRTX\s?5070\s?TI\b/i,
    /\bRTX\s?5070\b/i,
    /\bRTX\s?4090\b/i,
    /\bRTX\s?4080\s?SUPER\b/i,
    /\bRTX\s?4080\b/i,
    /\bRTX\s?4070\s?TI\s?SUPER\b/i,
    /\bRTX\s?4070\s?TI\b/i,
    /\bRTX\s?4070\s?SUPER\b/i,
    /\bRTX\s?4070\b/i,
    /\bRTX\s?4060\s?TI\b/i,
    /\bRTX\s?4060\b/i,
    /\bRX\s?7900\s?XTX\b/i,
    /\bRX\s?7900\s?XT\b/i,
    /\bRX\s?7800\s?XT\b/i,
    /\bRX\s?7700\s?XT\b/i,
    /\bRX\s?7600\s?XT\b/i,
    /\bRX\s?7600\b/i,
    /\bARC\s?A770\b/i,
    /\bARC\s?A750\b/i,
    /\bARC\s?B580\b/i
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return match[0].replace(/\s+/g, ' ').toUpperCase().replace('ARC', 'Arc');
  }

  return null;
}

function parseMotherboardChipset(text) {
  return matchFirst(text, [
    /\b(Z890|Z790|Z690|B860|B760|B660|X870E|X870|X670E|X670|B850|B650E|B650|A620|X570|B550)\b/i
  ], (match) => match[1].toUpperCase());
}

function parseGpuMemory(text) {
  return {
    size: parseInteger(text, [/(\d+)\s*gb\s*gddr/i]),
    type: matchFirst(text, [/\b(GDDR\dX?|HBM\dE?)\b/i], (match) => match[1].toUpperCase()),
    speed: parseNumber(text, [/(\d+(?:\.\d+)?)\s*gbps/i]),
    busWidth: parseInteger(text, [/(\d{3,4})\s*[- ]?bit/i])
  };
}

function parseExplicitWatts(text, labels) {
  const joined = labels.join('|');
  return parseInteger(text, [
    new RegExp(`(?:${joined})[^0-9]{0,24}(\\d{2,4})\\s*w`, 'i'),
    new RegExp(`(\\d{2,4})\\s*w[^a-z0-9]{0,12}(?:${joined})`, 'i')
  ]);
}

function parseGpuFields(text) {
  const chipset = parseChipset(text);
  return {
    manufacturer: findManufacturer(text, ['NVIDIA', 'AMD', 'Intel']),
    partner: findManufacturer(text, ['ASUS', 'MSI', 'Gigabyte', 'GIGABYTE', 'PNY', 'ZOTAC', 'Sapphire', 'PowerColor', 'XFX', 'ASRock', 'EVGA']),
    chipset,
    memory: parseGpuMemory(text),
    core: {
      baseClock: parseInteger(text, [/(?:base clock|base)\D{0,12}(\d{3,5})\s*mhz/i]),
      boostClock: parseInteger(text, [/(?:boost clock|boost)\D{0,12}(\d{3,5})\s*mhz/i])
    },
    power: {
      tdp: parseExplicitWatts(text, ['tdp', 'tbp', 'board power', 'total graphics power']),
      recommendedPsu: parseExplicitWatts(text, ['recommended psu', 'power supply'])
    },
    specifications: {
      pcieVersion: matchFirst(text, [/\bPCIe\s?([345]\.0)\b/i], (match) => `PCIe ${match[1]}`)
    }
  };
}

function parseCpuFields(text) {
  const memoryType = parseMemoryTypes(text);
  return {
    manufacturer: findManufacturer(text, ['Intel', 'AMD']),
    socket: parseSingleSocket(text),
    cores: parseInteger(text, [/(\d+)[\s-]*(?:core|cores)\b/i]),
    threads: parseInteger(text, [/(\d+)[\s-]*(?:thread|threads)\b/i]),
    baseClock: parseNumber(text, [/(?:base clock|base)\D{0,12}(\d+(?:\.\d+)?)\s*ghz/i]),
    boostClock: parseNumber(text, [/(?:up to|max boost|boost clock|boost)\D{0,12}(\d+(?:\.\d+)?)\s*ghz/i]),
    tdp: parseExplicitWatts(text, ['tdp', 'processor base power', 'base power']),
    integratedGraphics: parseIntegratedGraphics(text),
    memoryType: memoryType.length ? memoryType : null,
    maxMemorySpeed: parseInteger(text, [/DDR[45][- ]?(\d{4,5})/i, /(\d{4,5})\s*MT\/s/i]),
    pcieVersion: matchFirst(text, [/\bPCIe\s?([345]\.0)\b/i], (match) => `PCIe ${match[1]}`)
  };
}

function parseIntegratedGraphics(text) {
  if (/\b(no|without)\s+(integrated\s+)?graphics\b/i.test(text)) return false;
  if (/\b(integrated graphics|radeon graphics|uhd graphics)\b/i.test(text)) return true;
  return null;
}

function parseRamKit(text) {
  let match = text.match(/(\d+)\s*gb\s*\(\s*(\d+)\s*x\s*(\d+)\s*gb\s*\)/i);
  if (match) {
    return {
      totalCapacity: Number.parseInt(match[1], 10),
      kitSize: Number.parseInt(match[2], 10),
      capacity: Number.parseInt(match[3], 10)
    };
  }

  match = text.match(/(\d+)\s*x\s*(\d+)\s*gb/i);
  if (match) {
    const kitSize = Number.parseInt(match[1], 10);
    const capacity = Number.parseInt(match[2], 10);
    return { totalCapacity: kitSize * capacity, kitSize, capacity };
  }

  const totalCapacity = parseInteger(text, [/(\d+)\s*gb/i]);
  return {
    totalCapacity,
    kitSize: totalCapacity ? 1 : null,
    capacity: totalCapacity
  };
}

function parseRamFields(text) {
  const kit = parseRamKit(text);
  return {
    manufacturer: findManufacturer(text, ['Corsair', 'G.Skill', 'Kingston', 'Crucial', 'Teamgroup', 'TEAMGROUP', 'Patriot', 'Silicon Power']),
    brand: matchFirst(text, [/\b(Vengeance|Dominator|Trident Z5|Trident Z|Ripjaws|Fury Beast|Ballistix|T-Force)\b/i], (match) => match[1]),
    capacity: kit.capacity,
    kitSize: kit.kitSize,
    totalCapacity: kit.totalCapacity,
    memoryType: parseMemoryTypes(text)[0] || null,
    speed: parseInteger(text, [/(\d{4,5})\s*mhz/i, /(\d{4,5})\s*mt\/s/i, /\bDDR[45][- ]?(\d{4,5})\b/i]),
    casLatency: parseInteger(text, [/\bCL\s?(\d{2,3})\b/i]),
    timing: matchFirst(text, [/\b(\d{2}-\d{2}-\d{2}-\d{2,3})\b/]),
    voltage: parseNumber(text, [/(\d+(?:\.\d+)?)\s*v\b/i]),
    formFactor: /\bsodimm\b|\bso-dimm\b/i.test(text) ? 'SODIMM' : (/\bdimm\b|\bdesktop\b/i.test(text) ? 'DIMM' : null),
    ecc: parseBooleanMention(text, 'ecc', 'non-ecc'),
    registered: parseBooleanMention(text, 'registered', 'unregistered'),
    xmp: /\bxmp\b/i.test(text) ? true : null,
    expo: /\bexpo\b/i.test(text) ? true : null,
    rgb: /\bargb\b|\brgb\b/i.test(text) ? true : null
  };
}

function parseBooleanMention(text, positive, negative) {
  if (new RegExp(`\\b${negative}\\b`, 'i').test(text)) return false;
  if (new RegExp(`\\b${positive}\\b`, 'i').test(text)) return true;
  return null;
}

function parsePsuFields(text) {
  return {
    manufacturer: findManufacturer(text, ['Corsair', 'EVGA', 'Seasonic', 'be quiet!', 'Thermaltake', 'Cooler Master', 'MSI', 'ASUS']),
    brand: matchFirst(text, [/\b(RMx|SuperNOVA|Focus|Toughpower|Pure Power|Straight Power|MAG A?GL|ROG Thor)\b/i], (match) => match[1]),
    wattage: parseInteger(text, [/(\d{3,4})\s*w\b/i]),
    efficiency: parseEfficiency(text),
    formFactor: matchFirst(text, [/\b(ATX|SFX|SFX-L|TFX)\b/i], (match) => match[1].toUpperCase()),
    modularity: parseModularity(text),
    certification: matchFirst(text, [/\b(80\s*Plus|Cybenetics)\b/i], (match) => match[1].replace(/\s+/, ' ')),
    features: [
      /\bATX\s*3(?:\.0|\.1)?\b/i.test(text) ? matchFirst(text, [/\bATX\s*3(?:\.0|\.1)?\b/i]) : null,
      /\bPCIe\s*5(?:\.0|\.1)?\b/i.test(text) ? matchFirst(text, [/\bPCIe\s*5(?:\.0|\.1)?\b/i]) : null
    ].filter(Boolean)
  };
}

function parseEfficiency(text) {
  const match = text.match(/\b(?:80\s*Plus|Cybenetics)\s*(Titanium|Platinum|Gold|Silver|Bronze)\b/i);
  return match ? match[1][0].toUpperCase() + match[1].slice(1).toLowerCase() : null;
}

function parseModularity(text) {
  if (/\bfully modular\b/i.test(text)) return 'Full';
  if (/\bsemi[- ]modular\b/i.test(text)) return 'Semi';
  if (/\bnon[- ]modular\b/i.test(text)) return 'Non-modular';
  if (/\bmodular\b/i.test(text)) return 'Modular';
  return null;
}

function parseStorageFields(text) {
  const type = parseStorageType(text);
  return {
    manufacturer: findManufacturer(text, ['Samsung', 'Western Digital', 'WD', 'Crucial', 'Seagate', 'Kingston', 'SanDisk', 'Sabrent', 'SK hynix']),
    brand: matchFirst(text, [/\b(990 Pro|980 Pro|970 EVO|SN850X|SN770|P5 Plus|P3 Plus|FireCuda|Barracuda|Blue|Black)\b/i], (match) => match[1]),
    type,
    formFactor: parseStorageFormFactor(text, type),
    capacity: parseCapacityGb(text),
    interface: parseStorageInterface(text),
    readSpeed: parseInteger(text, [/(?:read|up to)\D{0,20}(\d{3,5})\s*mb\/s/i]),
    writeSpeed: parseInteger(text, [/(?:write)\D{0,20}(\d{3,5})\s*mb\/s/i]),
    specifications: {
      rpm: parseInteger(text, [/(\d{4,5})\s*rpm/i])
    }
  };
}

function parseStorageType(text) {
  if (/\bhdd\b|\bhard drive\b/i.test(text)) return 'HDD';
  if (/\bm\.?2\b|\bnvme\b/i.test(text)) return 'M.2 SSD';
  if (/\bssd\b/i.test(text)) return 'Other SSD';
  if (/\bsshd\b|\bhybrid\b/i.test(text)) return 'SSHD';
  return null;
}

function parseStorageFormFactor(text, type) {
  if (/\bm\.?2\b/i.test(text)) return 'M.2';
  if (/\b2\.5["\s-]/i.test(text)) return '2.5"';
  if (/\b3\.5["\s-]/i.test(text)) return '3.5"';
  if (type === 'M.2 SSD') return 'M.2';
  return null;
}

function parseStorageInterface(text) {
  if (/\bPCIe\s?5(?:\.0)?\b/i.test(text)) return 'PCIe 5.0';
  if (/\bPCIe\s?4(?:\.0)?\b/i.test(text)) return 'PCIe 4.0';
  if (/\bNVMe\b/i.test(text)) return 'NVMe';
  if (/\bSATA\s?III\b/i.test(text)) return 'SATA III';
  if (/\bSATA\b/i.test(text)) return 'SATA';
  return null;
}

function parseMotherboardFields(text) {
  const formFactors = parseFormFactors(text);
  const memoryType = parseMemoryTypes(text);
  return {
    manufacturer: findManufacturer(text, ['ASUS', 'MSI', 'Gigabyte', 'GIGABYTE', 'ASRock', 'EVGA', 'Biostar']),
    chipset: parseMotherboardChipset(text),
    socket: parseSingleSocket(text),
    formFactor: formFactors[0] || null,
    memorySlots: parseInteger(text, [/(\d)\s*(?:x\s*)?(?:DIMM|memory slots?)/i]),
    maxMemory: parseInteger(text, [/max(?:imum)?\s*memory\D{0,12}(\d{2,4})\s*gb/i]),
    memoryType: memoryType.length ? memoryType : null,
    sataPorts: parseInteger(text, [/(\d)\s*(?:x\s*)?SATA/i]),
    pcieSlots: parsePcieSlots(text),
    m2Slots: parseM2Slots(text),
    networking: {
      wifi: /\bwi-?fi\b|\bwifi\b/i.test(text) ? true : null,
      wifiVersion: matchFirst(text, [/\bWi-?Fi\s?(\dE?)\b/i], (match) => `WiFi ${match[1]}`),
      bluetooth: /\bbluetooth\b/i.test(text) ? true : null
    }
  };
}

function parsePcieSlots(text) {
  const count = parseInteger(text, [/(\d)\s*(?:x\s*)?PCIe/i]);
  if (!count) return [];
  return Array.from({ length: count }, () => ({
    type: null,
    version: matchFirst(text, [/\bPCIe\s?([345]\.0)\b/i], (match) => `PCIe ${match[1]}`),
    lanes: null,
    physicalSize: null
  }));
}

function parseM2Slots(text) {
  const count = parseInteger(text, [/(\d)\s*(?:x\s*)?M\.?2/i, /M\.?2\D{0,12}(\d)\s*slots?/i]);
  if (!count) return [];
  return Array.from({ length: count }, () => ({
    type: 'M.2',
    pcieVersion: matchFirst(text, [/\bPCIe\s?([345]\.0)\b/i], (match) => `PCIe ${match[1]}`),
    sata: /\bsata\b/i.test(text) ? true : null,
    nvme: /\bnvme\b/i.test(text) ? true : null
  }));
}

function parseCaseFields(text) {
  const formFactors = parseFormFactors(text);
  return {
    manufacturer: findManufacturer(text, ['NZXT', 'Corsair', 'Lian Li', 'Fractal Design', 'Phanteks', 'Cooler Master', 'Thermaltake', 'be quiet!']),
    brand: matchFirst(text, [/\b(H5|H6|H7|H9|4000D|5000D|O11 Dynamic|Meshify|North|Eclipse|Lancool)\b/i], (match) => match[1]),
    formFactor: formFactors.length ? formFactors : null,
    motherboardSupport: formFactors.length ? formFactors : null,
    features: [
      /\bmesh\b/i.test(text) ? 'Mesh' : null,
      /\bairflow\b/i.test(text) ? 'Airflow' : null,
      /\busb-c\b/i.test(text) ? 'USB-C' : null
    ].filter(Boolean),
    specifications: {
      hasRGB: /\bargb\b|\brgb\b/i.test(text) ? true : null,
      window: /\btempered glass\b|\bglass side\b|\bwindow\b/i.test(text) ? true : null
    }
  };
}

function parseCoolerFields(text) {
  const radiatorSize = parseInteger(text, [/(\d{3})\s*mm/i]);
  const isLiquid = /\bliquid\b|\baio\b|\bradiator\b/i.test(text);
  const isAir = /\bair cooler\b|\btower cooler\b|\bheatsink\b/i.test(text);
  const type = isLiquid ? 'Liquid' : (isAir ? 'Air' : null);

  return {
    manufacturer: findManufacturer(text, ['Noctua', 'Arctic', 'ARCTIC', 'Corsair', 'be quiet!', 'Cooler Master', 'NZXT', 'DeepCool', 'Thermalright']),
    brand: matchFirst(text, [/\b(NH-D15|Liquid Freezer|Dark Rock|Hyper 212|iCUE H150i|Kraken|Peerless Assassin)\b/i], (match) => match[1]),
    type,
    coolingMethod: isLiquid ? 'AIO' : (isAir ? 'Air' : null),
    socket: parseSocketList(text),
    fan: {
      count: parseInteger(text, [/(\d)\s*(?:x\s*)?(?:fans?|fan)\b/i]),
      size: parseFanSizes(text),
      rgb: /\bargb\b|\brgb\b/i.test(text) ? true : null
    },
    radiator: {
      size: isLiquid ? radiatorSize : null
    },
    performance: {
      tdp: parseExplicitWatts(text, ['tdp'])
    }
  };
}

function parseFanSizes(text) {
  const sizes = new Set();
  for (const match of text.matchAll(/\b(80|92|120|140|200)\s*mm\b/ig)) {
    sizes.add(Number.parseInt(match[1], 10));
  }
  return Array.from(sizes);
}

function parseAddonFields(text) {
  const category = parseAddonCategory(text);
  return {
    manufacturer: findManufacturer(text, ['Corsair', 'Noctua', 'Lian Li', 'CableMod', 'Arctic', 'ARCTIC', 'Thermal Grizzly', 'Cooler Master', 'NZXT']),
    brand: null,
    category,
    type: parseAddonType(text, category),
    fanSpecs: {
      size: parseInteger(text, [/\b(80|92|120|140|200)\s*mm\b/i]),
      rpm: {
        min: parseInteger(text, [/(\d{3,4})\s*-\s*\d{3,4}\s*rpm/i]),
        max: parseInteger(text, [/\d{3,4}\s*-\s*(\d{3,4})\s*rpm/i, /(\d{3,4})\s*rpm/i])
      },
      pwm: /\bpwm\b/i.test(text) ? true : null,
      ledType: /\bargb\b/i.test(text) ? 'ARGB' : (/\brgb\b/i.test(text) ? 'RGB' : null)
    },
    lightingSpecs: {
      addressable: /\bargb\b|\baddressable\b/i.test(text) ? true : null,
      connector: matchFirst(text, [/\b(3-pin\s*5v|4-pin\s*12v)\b/i], (match) => match[1])
    },
    cableSpecs: {
      connectorType: matchFirst(text, [/\b(24-pin|8-pin|6\+2-pin|12VHPWR|12V-2x6)\b/i], (match) => match[1]),
      length: parseInteger(text, [/(\d{2,4})\s*(?:mm|cm)\b/i])
    },
    thermalSpecs: {
      amount: matchFirst(text, [/\b(\d+(?:\.\d+)?\s*g)\b/i])
    },
    controllerSpecs: {
      channels: parseInteger(text, [/(\d+)\s*(?:channels?|ports?)\b/i])
    },
    specifications: {
      hasRGB: /\bargb\b|\brgb\b/i.test(text) ? true : null
    }
  };
}

function parseAddonCategory(text) {
  if (/\bfan\b/i.test(text)) return 'Case Fan';
  if (/\brgb\b|\bargb\b|\bled strip\b|\blighting\b/i.test(text)) return 'RGB Lighting';
  if (/\bcable\b|\bextension\b|\b12vhpwr\b|\b12v-2x6\b/i.test(text)) return 'Cables';
  if (/\bthermal paste\b|\bthermal pad\b|\bliquid metal\b/i.test(text)) return 'Thermal Paste';
  if (/\bcontroller\b|\bhub\b/i.test(text)) return 'Controllers';
  return 'Accessories';
}

function parseAddonType(text, category) {
  if (category === 'Case Fan') return matchFirst(text, [/\b(PWM|DC|ARGB|RGB)\b/i], (match) => `${match[1].toUpperCase()} Fan`);
  if (category === 'RGB Lighting') return /\bled strip\b/i.test(text) ? 'LED Strip' : 'Lighting';
  if (category === 'Cables') return /\bextension\b/i.test(text) ? 'Extension' : 'Cable';
  if (category === 'Thermal Paste') return /\bpad\b/i.test(text) ? 'Pad' : 'Paste';
  if (category === 'Controllers') return /\bfan\b/i.test(text) ? 'Fan Controller' : 'Controller';
  return null;
}

function buildFields(componentType, rawProduct) {
  const text = productText(rawProduct);

  switch (componentType) {
    case 'gpu':
      return parseGpuFields(text);
    case 'cpu':
      return parseCpuFields(text);
    case 'motherboard':
      return parseMotherboardFields(text);
    case 'ram':
      return parseRamFields(text);
    case 'storage':
      return parseStorageFields(text);
    case 'psu':
      return parsePsuFields(text);
    case 'case':
      return parseCaseFields(text);
    case 'cooler':
      return parseCoolerFields(text);
    case 'addon':
      return parseAddonFields(text);
    default:
      throw new Error(`Unsupported component type: ${componentType}`);
  }
}

function buildPendingComponent(type, rawProduct = {}) {
  const componentType = normalizeType(type);
  if (!componentType) {
    throw new Error(`Unsupported component type: ${type}`);
  }

  const rawTitle = cleanWhitespace(firstString(rawProduct.rawTitle, rawProduct.title, rawProduct.name));
  const name = cleanWhitespace(firstString(rawProduct.name, rawProduct.title, rawTitle));
  const sourceUrl = firstString(rawProduct.productUrl, rawProduct.sourceUrl, rawProduct.url);
  const asin = normalizeAsin(rawProduct.asin) || extractAsin(sourceUrl);
  const productUrl = normalizeAmazonProductUrl(sourceUrl, asin, rawProduct.affiliateTag || DEFAULT_AFFILIATE_TAG);
  const price = normalizePrice(rawProduct.currentPrice ?? rawProduct.price ?? rawProduct.basePrice);

  return {
    componentType,
    name,
    imageUrl: firstString(rawProduct.imageUrl),
    productUrl,
    price,
    source: firstString(rawProduct.source) || (productUrl.includes('amazon.com') ? 'amazon' : 'unknown'),
    asin,
    dedupKey: buildDedupKey(asin, name),
    scrapedAt: normalizeScrapedAt(rawProduct.scrapedAt),
    status: 'pending',
    reviewNotes: firstString(rawProduct.reviewNotes),
    fields: buildFields(componentType, rawProduct),
    rawTitle,
    alreadyInLive: Boolean(rawProduct.alreadyInLive)
  };
}

function isComboProduct(productName) {
  const nameLower = String(productName || '').toLowerCase();
  const strictComboKeywords = [
    'combo pack',
    'bundle pack',
    'combo deal',
    'bundle deal',
    'pc build',
    'complete build',
    'gaming pc',
    'desktop pc',
    'computer system',
    'full system',
    'with motherboard',
    'with cpu',
    'with processor',
    'cpu motherboard combo',
    'motherboard cpu combo',
    'processor motherboard combo',
    'cpu + motherboard',
    'motherboard + cpu',
    'processor + motherboard',
    '+ motherboard +',
    '+ cpu +',
    '+ processor +'
  ];

  return strictComboKeywords.some((keyword) => nameLower.includes(keyword));
}

function isGpuAccessory(productName) {
  const nameLower = String(productName || '').toLowerCase();
  const hasGpuModel = /\b(rtx\s*\d{4}|rx\s*\d{4}|arc\s*a\d{3}|gtx\s*\d{4}|radeon|geforce)\b/i.test(productName || '');
  if (hasGpuModel && !/\bfor\s+(rtx|rx|arc|gtx|radeon|geforce)/i.test(productName || '')) return false;

  return [
    'support bracket',
    'gpu bracket',
    'gpu stand',
    'gpu support',
    'anti sag',
    'anti-sag',
    'vertical mount',
    'riser cable',
    'display dummy',
    'backplate only'
  ].some((keyword) => nameLower.includes(keyword));
}

function isPortableStorage(productName) {
  const nameLower = String(productName || '').toLowerCase();
  return [
    'portable',
    'external',
    'thumb drive',
    'flash drive',
    'usb drive',
    'memory card',
    'sd card',
    'microsd',
    'cfexpress'
  ].some((keyword) => nameLower.includes(keyword));
}

function isCableOrAccessory(productName, componentType) {
  if (componentType === 'addon') return false;
  const nameLower = String(productName || '').toLowerCase();
  return [
    'adapter',
    'extension',
    'replacement cable',
    'power cable',
    'sata cable',
    'pcie cable',
    'connector kit'
  ].some((keyword) => nameLower.includes(keyword));
}

function shouldRejectCandidate(componentType, productName) {
  if (isComboProduct(productName)) return 'combo product';
  if (componentType === 'gpu' && isGpuAccessory(productName)) return 'GPU accessory';
  if (componentType === 'storage' && isPortableStorage(productName)) return 'portable/external storage';
  if (isCableOrAccessory(productName, componentType)) return 'cable/accessory';
  return null;
}

async function searchAmazon(browser, searchTerm) {
  const page = await browser.newPage();

  try {
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    const searchUrl = `https://www.amazon.com/s?k=${encodeURIComponent(searchTerm)}&i=electronics`;

    await page.goto(searchUrl, {
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    await page.waitForTimeout(3000);

    return page.evaluate(() => {
      const items = [];
      let productDivs = document.querySelectorAll('[data-component-type="s-search-result"]');

      if (productDivs.length === 0) {
        productDivs = document.querySelectorAll('.s-result-item[data-asin]');
      }

      for (const div of productDivs) {
        try {
          const asin = div.getAttribute('data-asin');
          if (!asin) continue;

          const titleElement =
            div.querySelector('h2 a span') ||
            div.querySelector('h2.s-line-clamp-2') ||
            div.querySelector('.s-title-instructions-style span');
          const name = titleElement ? titleElement.textContent.trim() : '';
          if (!name) continue;

          let price = null;
          const priceWhole = div.querySelector('.a-price-whole');
          const priceFraction = div.querySelector('.a-price-fraction');
          if (priceWhole) {
            const whole = priceWhole.textContent.replace(/[^0-9]/g, '');
            const fraction = priceFraction ? priceFraction.textContent.replace(/[^0-9]/g, '') : '00';
            if (whole) price = Number.parseFloat(`${whole}.${fraction}`);
          }

          if (!price) {
            const priceSymbol = div.querySelector('.a-price .a-offscreen');
            if (priceSymbol) {
              price = Number.parseFloat(priceSymbol.textContent.replace(/[^0-9.]/g, ''));
            }
          }

          const imgElement = div.querySelector('img.s-image');
          const linkElement = div.querySelector('h2 a[href], a.a-link-normal[href*="/dp/"], a.a-link-normal[href*="/gp/product/"]');

          items.push({
            asin,
            name,
            price: Number.isFinite(price) ? price : null,
            imageUrl: imgElement ? imgElement.src : '',
            sourceUrl: linkElement ? linkElement.href : `https://www.amazon.com/dp/${asin}`
          });
        } catch {
          // Skip malformed search result cards.
        }
      }

      return items;
    });
  } catch (error) {
    console.error(`Amazon search failed for "${searchTerm}": ${error.message}`);
    return [];
  } finally {
    await page.close();
  }
}

async function scrapeAmazonCandidate(browser, candidate, componentType, affiliateTag) {
  const { scrapePrice } = require('./scrapers/amazonScraper');
  const page = await browser.newPage();
  const asin = normalizeAsin(candidate.asin) || extractAsin(candidate.sourceUrl);
  const productUrl = normalizeAmazonProductUrl(candidate.sourceUrl, asin, affiliateTag);

  try {
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    const priceResult = await scrapePrice(page, productUrl);
    const pageDetails = await extractAmazonPageDetails(page);

    return {
      asin,
      name: pageDetails.title || candidate.name,
      title: pageDetails.title || candidate.name,
      rawTitle: pageDetails.title || candidate.name,
      price: normalizePrice(priceResult.currentPrice ?? priceResult.basePrice ?? candidate.price),
      basePrice: normalizePrice(priceResult.basePrice ?? candidate.price),
      imageUrl: firstString(priceResult.imageUrl, pageDetails.imageUrl, candidate.imageUrl),
      productUrl,
      sourceUrl: productUrl,
      source: 'amazon',
      features: pageDetails.features,
      specs: pageDetails.specs,
      componentType
    };
  } catch (error) {
    console.error(`Product scrape failed for ${productUrl}: ${error.message}`);
    return {
      asin,
      name: candidate.name,
      title: candidate.name,
      rawTitle: candidate.name,
      price: normalizePrice(candidate.price),
      basePrice: normalizePrice(candidate.price),
      imageUrl: candidate.imageUrl || '',
      productUrl,
      sourceUrl: productUrl,
      source: 'amazon',
      features: [],
      specs: {},
      componentType
    };
  } finally {
    await page.close();
  }
}

async function extractAmazonPageDetails(page) {
  return page.evaluate(() => {
    const titleElement = document.querySelector('#productTitle');
    const mainImage = document.querySelector('#landingImage, #imgBlkFront');
    const featureList = document.querySelectorAll('#feature-bullets ul li');
    const specs = {};
    const rows = document.querySelectorAll('#productDetails_techSpec_section_1 tr, .prodDetTable tr, #productDetails_detailBullets_sections1 tr');

    rows.forEach((row) => {
      const th = row.querySelector('th');
      const td = row.querySelector('td');
      if (th && td) {
        specs[th.textContent.trim()] = td.textContent.trim();
      }
    });

    return {
      title: titleElement ? titleElement.textContent.trim() : '',
      imageUrl: mainImage ? mainImage.src : '',
      features: Array.from(featureList).map((li) => li.textContent.trim()).filter(Boolean),
      specs
    };
  });
}

async function getLiveCollectionNames(db, componentType) {
  const config = TYPE_CONFIG[componentType];
  const names = new Set();

  const mainCollection = await db.listCollections({ name: config.liveCollection }).toArray();
  if (mainCollection.length > 0) names.add(config.liveCollection);

  for (const prefix of config.livePrefixes) {
    const escaped = prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const collections = await db.listCollections({ name: new RegExp(`^${escaped}`) }).toArray();
    collections.forEach((collection) => names.add(collection.name));
  }

  if (names.size === 0) names.add(config.liveCollection);
  return Array.from(names);
}

async function loadLiveDedupIndex(db, componentTypes) {
  const index = new Map();

  for (const type of componentTypes) {
    const asins = new Set();
    const names = new Set();
    const collectionNames = await getLiveCollectionNames(db, type);

    for (const collectionName of collectionNames) {
      const docs = await db.collection(collectionName).find({}, {
        projection: {
          name: 1,
          title: 1,
          sourceUrl: 1,
          productUrl: 1,
          url: 1
        }
      }).toArray();

      for (const doc of docs) {
        const asin = extractAsin(doc.sourceUrl || doc.productUrl || doc.url);
        if (asin) asins.add(asin);

        const normalized = normalizeName(doc.name || doc.title);
        if (normalized) names.add(normalized);
      }
    }

    index.set(type, { asins, names });
  }

  return index;
}

function emptyLiveDedupIndex(componentTypes) {
  return new Map(componentTypes.map((type) => [type, { asins: new Set(), names: new Set() }]));
}

function isAlreadyInLive(liveIndex, componentType, rawProduct) {
  const typeIndex = liveIndex.get(componentType);
  if (!typeIndex) return false;

  const asin = normalizeAsin(rawProduct.asin) || extractAsin(rawProduct.productUrl || rawProduct.sourceUrl);
  if (asin && typeIndex.asins.has(asin)) return true;

  const normalizedName = normalizeName(rawProduct.name || rawProduct.title || rawProduct.rawTitle);
  return normalizedName ? typeIndex.names.has(normalizedName) : false;
}

async function upsertPendingComponent(db, pendingDoc) {
  const now = new Date().toISOString();
  return db.collection(PENDING_COLLECTION).updateOne(
    { dedupKey: pendingDoc.dedupKey },
    {
      $set: {
        ...pendingDoc,
        updatedAt: now
      },
      $setOnInsert: {
        createdAt: now
      }
    },
    { upsert: true }
  );
}

async function connectForIngest(dryRun) {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/pcbuilder';
  const dbName = process.env.DB_NAME || DEFAULT_DB_NAME;
  const shouldConnect = !dryRun || Boolean(process.env.MONGODB_URI) || process.env.DB_READ_DURING_DRY_RUN === '1';

  if (!shouldConnect) {
    return { client: null, db: null };
  }

  const client = new MongoClient(uri);
  try {
    await client.connect();
    return { client, db: client.db(dbName) };
  } catch (error) {
    await client.close().catch(() => {});
    if (dryRun) {
      console.warn(`Read-only live lookup skipped during dry-run: ${error.message}`);
      return { client: null, db: null };
    }
    throw error;
  }
}

async function launchBrowser() {
  const puppeteer = require('puppeteer');
  return puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
}

async function runIngest(options) {
  const componentTypes = options.type === 'all' ? ALL_TYPES : [options.type];
  const affiliateTag = process.env.AMAZON_ASSOCIATE_TAG || DEFAULT_AFFILIATE_TAG;
  let client;
  let browser;
  const summary = {
    discovered: 0,
    queued: 0,
    upserted: 0,
    skipped: 0,
    alreadyInLiveSkipped: 0
  };

  if (options.dryRun) {
    console.log('DRY RUN — no DB writes');
  }

  try {
    const connection = await connectForIngest(options.dryRun);
    client = connection.client;
    const db = connection.db;
    const liveIndex = db ? await loadLiveDedupIndex(db, componentTypes) : emptyLiveDedupIndex(componentTypes);

    browser = await launchBrowser();

    for (const componentType of componentTypes) {
      let typeCount = 0;
      console.log(`\nSearching ${componentType} candidates (limit ${options.limit})`);

      for (const searchTerm of TYPE_CONFIG[componentType].searchTerms) {
        if (typeCount >= options.limit) break;
        console.log(`Search term: ${searchTerm}`);

        const candidates = await searchAmazon(browser, searchTerm);
        console.log(`Found ${candidates.length} Amazon search result(s)`);

        for (const candidate of candidates) {
          if (typeCount >= options.limit) break;
          summary.discovered += 1;

          const rejectionReason = shouldRejectCandidate(componentType, candidate.name);
          if (rejectionReason) {
            summary.skipped += 1;
            console.log(`Skipped candidate (${rejectionReason}): ${candidate.name}`);
            continue;
          }

          const rawProduct = await scrapeAmazonCandidate(browser, candidate, componentType, affiliateTag);
          rawProduct.scrapedAt = new Date().toISOString();
          rawProduct.affiliateTag = affiliateTag;
          rawProduct.alreadyInLive = isAlreadyInLive(liveIndex, componentType, rawProduct);

          // Only queue genuinely NEW components. Skip anything already in the live
          // catalog (the whole point is discovering parts not yet listed); does not
          // count toward the limit, so the run keeps digging for new candidates.
          if (rawProduct.alreadyInLive && !options.includeExisting) {
            summary.skipped += 1;
            summary.alreadyInLiveSkipped += 1;
            console.log(`Skipped (already in live catalog): ${rawProduct.name || candidate.name}`);
            continue;
          }

          const pendingDoc = buildPendingComponent(componentType, rawProduct);

          if (options.dryRun) {
            console.log(JSON.stringify(pendingDoc, null, 2));
          }

          if (!options.dryRun) {
            await upsertPendingComponent(db, pendingDoc);
            summary.upserted += 1;
          }

          summary.queued += 1;
          typeCount += 1;
        }
      }

      if (typeCount === 0) {
        console.log(`No ${componentType} candidates queued. Amazon may have returned zero usable results or blocked scraping.`);
      }
    }

    console.log('\nIngest summary:');
    console.log(JSON.stringify(summary, null, 2));
  } finally {
    if (browser) await browser.close().catch(() => {});
    if (client) await client.close().catch(() => {});
  }
}

if (require.main === module) {
  runIngest(parseArgs(process.argv.slice(2))).catch((error) => {
    console.error(error.stack || error.message);
    process.exitCode = 1;
  });
}

module.exports = {
  buildPendingComponent,
  normalizeType,
  extractAsin,
  normalizeAmazonProductUrl,
  buildDedupKey,
  PENDING_COLLECTION
};
