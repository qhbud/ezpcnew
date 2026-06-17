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

const KNOWN_LGA = new Set(['1851', '1700', '1200', '1151', '1150', '1155', '1156', '2011', '2066']);

function parseSocketList(text) {
  const sockets = new Set();

  // Intel LGA — handle slash/comma lists where "LGA" prefixes only the first
  // number, e.g. "LGA 1700/1151/1200/1851". Grab the whole LGA span then pull
  // out each known socket number (the old per-socket patterns missed all but
  // the first because the rest had no "LGA" prefix).
  for (const span of text.matchAll(/\bLGA\s?\d{3,4}(?:\s*[\/,]\s*\d{3,4})*/ig)) {
    for (const num of span[0].matchAll(/\d{3,4}/g)) {
      if (KNOWN_LGA.has(num[0])) sockets.add(`LGA${num[0]}`);
    }
  }

  // AMD sockets.
  for (const pattern of [/\bAM5\b/ig, /\bAM4\b/ig, /\bsTRX5\b/ig, /\bsTR5\b/ig, /\bTR4\b/ig]) {
    for (const match of text.matchAll(pattern)) {
      sockets.add(match[0].toUpperCase().replace('STRX', 'sTRX').replace('STR5', 'sTR5'));
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

// Canonical reference specs per GPU chipset (keyed uppercase to match the output
// of parseChipset). Used to backfill bus width / memory / PCIe gen when a partner
// card's listing title omits them — these are fixed by the GPU die, not the AIB.
const GPU_REF = {
  'RTX 5090': { type: 'GDDR7', size: 32, busWidth: 512, pcie: 'PCIe 5.0' },
  'RTX 5080': { type: 'GDDR7', size: 16, busWidth: 256, pcie: 'PCIe 5.0' },
  'RTX 5070 TI': { type: 'GDDR7', size: 16, busWidth: 256, pcie: 'PCIe 5.0' },
  'RTX 5070': { type: 'GDDR7', size: 12, busWidth: 192, pcie: 'PCIe 5.0' },
  'RTX 4090': { type: 'GDDR6X', size: 24, busWidth: 384, pcie: 'PCIe 4.0' },
  'RTX 4080 SUPER': { type: 'GDDR6X', size: 16, busWidth: 256, pcie: 'PCIe 4.0' },
  'RTX 4080': { type: 'GDDR6X', size: 16, busWidth: 256, pcie: 'PCIe 4.0' },
  'RTX 4070 TI SUPER': { type: 'GDDR6X', size: 16, busWidth: 256, pcie: 'PCIe 4.0' },
  'RTX 4070 TI': { type: 'GDDR6X', size: 12, busWidth: 192, pcie: 'PCIe 4.0' },
  'RTX 4070 SUPER': { type: 'GDDR6X', size: 12, busWidth: 192, pcie: 'PCIe 4.0' },
  'RTX 4070': { type: 'GDDR6X', size: 12, busWidth: 192, pcie: 'PCIe 4.0' },
  'RTX 4060 TI': { type: 'GDDR6', size: 8, busWidth: 128, pcie: 'PCIe 4.0' },
  'RTX 4060': { type: 'GDDR6', size: 8, busWidth: 128, pcie: 'PCIe 4.0' },
  'RX 7900 XTX': { type: 'GDDR6', size: 24, busWidth: 384, pcie: 'PCIe 4.0' },
  'RX 7900 XT': { type: 'GDDR6', size: 20, busWidth: 320, pcie: 'PCIe 4.0' },
  'RX 7800 XT': { type: 'GDDR6', size: 16, busWidth: 256, pcie: 'PCIe 4.0' },
  'RX 7700 XT': { type: 'GDDR6', size: 12, busWidth: 192, pcie: 'PCIe 4.0' },
  'RX 7600 XT': { type: 'GDDR6', size: 16, busWidth: 128, pcie: 'PCIe 4.0' },
  'RX 7600': { type: 'GDDR6', size: 8, busWidth: 128, pcie: 'PCIe 4.0' },
  'ARC A770': { type: 'GDDR6', size: 16, busWidth: 256, pcie: 'PCIe 4.0' },
  'ARC A750': { type: 'GDDR6', size: 8, busWidth: 256, pcie: 'PCIe 4.0' },
  'ARC B580': { type: 'GDDR6', size: 12, busWidth: 192, pcie: 'PCIe 4.0' }
};

function parseGpuFields(text) {
  const chipset = parseChipset(text);
  const ref = chipset ? GPU_REF[chipset.toUpperCase()] : null;
  const memory = parseGpuMemory(text);
  if (ref) {
    if (memory.size === null) memory.size = ref.size;
    if (memory.type === null) memory.type = ref.type;
    if (memory.busWidth === null) memory.busWidth = ref.busWidth;
  }
  const pcieVersion = matchFirst(text, [/\bPCIe\s?([345]\.0)\b/i], (match) => `PCIe ${match[1]}`)
    || (ref ? ref.pcie : null);
  return {
    manufacturer: findManufacturer(text, ['NVIDIA', 'AMD', 'Intel']),
    partner: findManufacturer(text, ['ASUS', 'MSI', 'Gigabyte', 'GIGABYTE', 'PNY', 'ZOTAC', 'Sapphire', 'PowerColor', 'XFX', 'ASRock', 'EVGA']),
    chipset,
    memory,
    core: {
      baseClock: parseInteger(text, [/(?:base clock|base)\D{0,12}(\d{3,5})\s*mhz/i]),
      boostClock: parseInteger(text, [/(?:boost clock|boost)\D{0,12}(\d{3,5})\s*mhz/i])
    },
    power: {
      tdp: parseExplicitWatts(text, ['tdp', 'tbp', 'board power', 'total graphics power']),
      recommendedPsu: parseExplicitWatts(text, ['recommended psu', 'power supply'])
    },
    specifications: {
      pcieVersion
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
  // Intel "F" / "KF" SKUs (e.g. i9-14900KF, i5-13400F) ship with the iGPU fused
  // off. Check the model suffix before the generic "graphics" mention so a board
  // listing "supports integrated graphics" can't override it.
  if (/\b\d{4,5}\s*kf\b/i.test(text) || /\bi[3579][\s-]?\d{3,5}\s*f\b/i.test(text) || /\bultra\s*[3579][\s-]?\d{3}\s*f\b/i.test(text)) return false;
  if (/\b(no|without)\s+(integrated\s+)?graphics\b/i.test(text)) return false;
  if (/\b(integrated graphics|radeon graphics|uhd graphics|intel\s+uhd|vega\s+graphics)\b/i.test(text)) return true;
  // Non-F Intel Core desktop SKUs (incl. K/KS/T) and Ryzen "G" APUs have an iGPU.
  if (/\bi[3579][\s-]?\d{4,5}\s*(ks|k|t)?\b(?![\s-]*f)/i.test(text)) return true;
  if (/\bryzen\s*[3579]\s*\d{4}g\b/i.test(text)) return true;
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
    // "registered" alone misfires on boilerplate ("registered trademark"); key
    // off DIMM-type tokens instead. RDIMM = registered, UDIMM/unbuffered = not.
    registered: /\brdimm\b/i.test(text) ? true : (/\budimm\b|\bunbuffered\b|\bunregistered\b/i.test(text) ? false : null),
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

function parsePsuSeries(text) {
  // Corsair model numbers embed the series suffix (RM1000x, RM850e, HX1200i),
  // which the plain token list missed — derive the series from the model.
  const corsair = text.match(/\b(RM|HX|AX|CX)(\d{3,4})(x|e|i)?\b/i);
  if (corsair) {
    const base = corsair[1].toUpperCase();
    const suffix = (corsair[3] || '').toLowerCase();
    return base === 'RM' ? `RM${suffix}` : `${base}${suffix}`;
  }
  return matchFirst(text, [/\b(RMx|RMe|RMi|HXi|SuperNOVA|Focus|Toughpower|Pure Power|Straight Power|MAG A?GL|ROG Thor|Prime|Vertex|Leadex|GF3|GA)\b/i], (m) => m[1]);
}

function parsePsuWattage(text) {
  // Prefer an explicit "1000W" / "1000 Watt", or the "Wattage 1000" spec attribute.
  const explicit = parseInteger(text, [/(\d{3,4})\s*w(?:atts?)?\b/i, /\bwattage\D{0,8}(\d{3,4})\b/i]);
  if (explicit && explicit >= 200 && explicit <= 2000) return explicit;
  // Otherwise derive from the model name (e.g. "RM1000x", "HX1200i",
  // "SuperNOVA 850 GT", "Toughpower GF3 1000"). Constrained to plausible,
  // round PSU wattages so a year ("2025") or revision number can't slip in.
  // Note: no trailing \b — many models append a suffix letter directly to the
  // wattage ("RM1000x", "RM850e"), so anchor on "not another digit" instead.
  const model = parseInteger(text, [
    /\b(?:RM|HX|AX|CX|GX|TX|GF|GA|GM|MWE|MAG|MPG|MEG|GP|SF|SFX|SuperNOVA|Prime|Focus|Toughpower|Pure Power|Straight Power|Leadex|Vertex|Loki)[a-z\s-]{0,6}?0?(\d{3,4})(?!\d)/i
  ]);
  if (model && model >= 200 && model <= 2000 && model % 50 === 0) return model;
  return null;
}

function parsePsuFields(text) {
  return {
    manufacturer: findManufacturer(text, ['Corsair', 'EVGA', 'Seasonic', 'be quiet!', 'Thermaltake', 'Cooler Master', 'MSI', 'ASUS']),
    brand: parsePsuSeries(text),
    wattage: parsePsuWattage(text),
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
    // Order matters: most specific model first so "9100 Pro" / "990 EVO Plus"
    // win over the shorter "990 Pro"/"990 EVO". Bare colour words (Blue/Black)
    // were removed — they misfired on any drive whose page copy mentioned a
    // colour (e.g. a Samsung drive grabbing WD's "Black").
    brand: matchFirst(text, [/\b(9100 Pro|990 EVO Plus|990 EVO|990 Pro|980 Pro|980|970 EVO Plus|970 EVO|SN850X|SN850|SN770|SN570|T500|T700|P5 Plus|P5|P3 Plus|P3|FireCuda|BarraCuda|IronWolf|WD Blue|WD Black|MX500|BX500)\b/i], (match) => match[1]),
    type,
    formFactor: parseStorageFormFactor(text, type),
    capacity: parseCapacityGb(text),
    interface: parseStorageInterface(text),
    readSpeed: parseInteger(text, [/read\D{0,20}([\d,]{3,7})\s*(?:mb\/s|megabytes)/i, /up to\D{0,12}([\d,]{3,7})\s*(?:mb\/s|megabytes)/i]),
    writeSpeed: parseInteger(text, [/write\D{0,20}([\d,]{3,7})\s*(?:mb\/s|megabytes)/i]),
    specifications: {
      rpm: parseInteger(text, [/(\d{4,5})\s*rpm/i])
    }
  };
}

function parseStorageType(text) {
  // SSD/NVMe signals must win over "hard drive" — many SSDs are titled
  // "...Internal Solid State Hard Drive", which would otherwise match HDD.
  if (/\bsshd\b|\bhybrid drive\b/i.test(text)) return 'SSHD';
  if (/\bm\.?2\b|\bnvme\b/i.test(text)) return 'M.2 SSD';
  if (/\bssd\b|\bsolid state\b/i.test(text)) return 'Other SSD';
  if (/\bhdd\b|\bhard drive\b/i.test(text)) return 'HDD';
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
  // Some drives list dual-mode lanes, e.g. "PCIe Gen 4x4, Gen 5x2". The native
  // full-bandwidth interface is the generation running x4 lanes, so prefer that
  // over a higher generation that only runs in a reduced x2 mode (the 990 EVO
  // Plus is a Gen4 x4 drive, not Gen5, despite advertising "Gen 5x2").
  const x4 = text.match(/\bPCIe\s*(?:Gen\s*)?([345])(?:\.0)?\s*x\s*4\b/i);
  if (x4) return `PCIe ${x4[1]}.0`;
  if (/\bPCIe\s*(?:Gen\s*)?5(?:\.0)?\b/i.test(text)) return 'PCIe 5.0';
  if (/\bPCIe\s*(?:Gen\s*)?4(?:\.0)?\b/i.test(text)) return 'PCIe 4.0';
  if (/\bPCIe\s*(?:Gen\s*)?3(?:\.0)?\b/i.test(text)) return 'PCIe 3.0';
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
    memorySlots: parseMemorySlots(text, formFactors),
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

function parseMemorySlots(text, formFactors) {
  // Prefer an explicit count ("4 x DIMM", "4x DDR5", "4 memory slots") or the
  // Amazon spec attribute "Number of Memory Slots 4" (label-then-value order).
  const explicit = parseInteger(text, [
    /(?:number of memory slots|memory slots?|dimm slots?)\D{0,8}(\d)\b/i,
    /(\d)\s*x\s*(?:DDR[45]|DIMM)/i,
    /(\d)\s*(?:DIMM|memory slots?)\b/i
  ]);
  if (explicit && explicit >= 1 && explicit <= 8) return explicit;
  // Titles almost never print the DIMM count, so infer from form factor:
  // Mini-ITX = 2 slots; ATX / E-ATX / Micro-ATX = 4 (true for the vast majority).
  const ff = formFactors[0];
  if (ff === 'Mini-ITX') return 2;
  if (ff) return 4;
  return null;
}

// Count M.2 sockets, handling "5xM.2", "4xPCIe 4.0 M.2 slots" (PCIe wording
// between the count and "M.2"), and "M.2 x5". Takes the largest plausible match
// since the headline total ("5xM.2") can be followed by a subset ("1xPCIe 5.0 M.2").
function parseM2Count(text) {
  const counts = [];
  let m;
  const before = /(\d+)\s*x?\s*(?:PCIe[\s\d.x]*)?M\.?2/ig;
  while ((m = before.exec(text))) { const n = Number.parseInt(m[1], 10); if (n >= 1 && n <= 8) counts.push(n); }
  const after = /M\.?2[\s:]*x\s*(\d+)/ig;
  while ((m = after.exec(text))) { const n = Number.parseInt(m[1], 10); if (n >= 1 && n <= 8) counts.push(n); }
  return counts.length ? Math.max(...counts) : 0;
}

function parsePcieSlots(text) {
  // Only count clearly-stated expansion slots — a PCIe generation with an
  // x16/x8/x4/x1 lane width. This avoids the old bug of counting "4x PCIe 4.0
  // M.2 slots" (M.2 sockets) as expansion slots.
  const slots = [];
  const re = /PCIe\s*([345])\.0\s*x\s*(16|8|4|1)\b/ig;
  let m;
  while ((m = re.exec(text))) {
    slots.push({ type: null, version: `PCIe ${m[1]}.0`, lanes: Number.parseInt(m[2], 10), physicalSize: `x${m[2]}` });
  }
  return slots;
}

function parseM2Slots(text) {
  const count = parseM2Count(text);
  if (!count) return [];
  const pcieVersion = matchFirst(text, [/\bPCIe\s?([345]\.0)\b/i], (match) => `PCIe ${match[1]}`);
  // M.2 sockets on modern desktop boards are NVMe; per-slot SATA support can't be
  // reliably read from a title, so leave it null rather than guessing.
  return Array.from({ length: count }, () => ({
    type: 'M.2',
    pcieVersion,
    sata: null,
    nvme: true
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

// Radiator size for AIOs is the largest standard radiator dimension in the
// title — taking the max avoids picking up a 120mm fan size on a 360mm unit.
function parseRadiatorSize(text) {
  const sizes = [];
  for (const match of text.matchAll(/\b(120|140|240|280|360|420)\s*mm\b/ig)) {
    sizes.push(Number.parseInt(match[1], 10));
  }
  return sizes.length ? Math.max(...sizes) : null;
}

// Watts of CPU heat a radiator of this size can realistically dissipate. These
// are reviewer-consensus ballparks, not vendor claims.
const AIO_CAPACITY_WATTS = { 120: 150, 140: 170, 240: 220, 280: 250, 360: 280, 420: 320 };

// Derive an estimated cooling capacity (watts) for the price/performance axis.
// Prefers an explicitly stated, plausible rated TDP; otherwise estimates from
// physical class (radiator size for liquid, tower/heatpipe class for air).
function estimateCoolingCapacity(text, { type, radiatorSize, heatpipes }) {
  const rated = parseExplicitWatts(text, ['tdp', 'cooling capacity', 'thermal design power']);
  if (rated && rated >= 50 && rated <= 500) {
    return { watts: rated, basis: 'rated' };
  }

  if (type === 'Liquid') {
    const size = radiatorSize || 240;
    const watts = AIO_CAPACITY_WATTS[size]
      || (size >= 360 ? 280 : size >= 280 ? 250 : size >= 240 ? 220 : 160);
    return { watts, basis: 'estimated' };
  }

  if (type === 'Air') {
    const lower = text.toLowerCase();
    let watts;
    if (/low[-\s]?profile|\bslim\b|low height/.test(lower)) watts = 90;
    else if (/\bstock\b|\bbasic\b|\boem\b/.test(lower)) watts = 75;
    else if (/dual[-\s]?tower|nh-d15|dark rock pro|peerless assassin|phantom spirit|\bfuma\b/.test(lower)) watts = 230;
    else if ((heatpipes && heatpipes >= 6) || /dual[-\s]?fan/.test(lower)) watts = 180;
    else if (/\btower\b|heat ?pipe/.test(lower)) watts = 130;
    else watts = 110;
    if (heatpipes && heatpipes >= 8 && watts < 240) watts = 250;
    return { watts, basis: 'estimated' };
  }

  return { watts: null, basis: null };
}

function parseCoolerFields(text) {
  const radiatorSize = parseRadiatorSize(text);
  const heatpipes = parseInteger(text, [/(\d+)\s*heat\s?pipes?/i]);
  // Air vs liquid: heatpipe counts and tower/heatsink phrasing are decisive air
  // signals (AIOs never advertise heatpipes). Only treat as liquid on strong,
  // unambiguous wording — a bare "radiator"/"fan" mention bleeding in from a page
  // comparison or cross-sell block used to flip air coolers (e.g. the Peerless
  // Assassin) to Liquid by mistake.
  const strongLiquid = /\b(aio|all[-\s]?in[-\s]?one|liquid\s*(?:cpu\s*)?cool|water\s*cool|water[-\s]?block)\b/i.test(text)
    || /\b(120|140|240|280|360|420)\s*mm\s*radiator\b/i.test(text);
  const strongAir = (heatpipes !== null && heatpipes > 0)
    || /\b(air\s*cooler|tower\s*cooler|dual[-\s]?tower|single[-\s]?tower|heat\s?sink|heat\s?pipes?)\b/i.test(text);
  let type;
  if (strongAir && !strongLiquid) type = 'Air';
  else if (strongLiquid && !strongAir) type = 'Liquid';
  else if (strongAir && strongLiquid) type = (heatpipes !== null && heatpipes > 0) ? 'Air' : 'Liquid';
  else type = /\bcooler\b|\bcpu cooler\b|\bfans?\b/i.test(text) ? 'Air' : null;
  const isLiquid = type === 'Liquid';
  const isAir = type === 'Air';
  const noise = parseNumber(text, [/(\d+(?:\.\d+)?)\s*db\(?a\)?\b/i]);
  const airflow = parseNumber(text, [/(\d+(?:\.\d+)?)\s*cfm\b/i]);
  const fanSpeed = parseFanSpeed(text);
  const capacity = estimateCoolingCapacity(text, { type, radiatorSize, heatpipes });

  return {
    manufacturer: findManufacturer(text, ['Noctua', 'Arctic', 'ARCTIC', 'Corsair', 'be quiet!', 'Cooler Master', 'NZXT', 'DeepCool', 'Thermalright']),
    brand: matchFirst(text, [/\b(NH-D15|Liquid Freezer|Dark Rock|Hyper 212|iCUE H150i|Kraken|Peerless Assassin)\b/i], (match) => match[1]),
    type,
    coolingMethod: isLiquid ? 'AIO' : (isAir ? 'Air' : null),
    socket: parseSocketList(text),
    heatpipes: type === 'Air' ? heatpipes : null,
    fan: {
      count: parseFanCount(text),
      size: parseFanSizes(text),
      rgb: /\bargb\b|\brgb\b/i.test(text) ? true : null,
      speed: fanSpeed,
      noise,
      airflow
    },
    radiator: {
      size: isLiquid ? radiatorSize : null
    },
    performance: {
      // Explicit vendor-rated TDP only when actually stated; estimatedTdp is the
      // derived capacity score the price/performance graph plots.
      tdp: capacity.basis === 'rated' ? capacity.watts : null,
      estimatedTdp: capacity.watts,
      tdpBasis: capacity.basis,
      noise,
      airflow
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

// Fan count — a leading digit ("3x 120mm fans") or a count word near "fan(s)"
// ("Dual 120mm PWM Fans" → 2). The word match requires "fan" close by so a
// "Dual Tower" heatsink description doesn't get read as two fans.
function parseFanCount(text) {
  const num = parseInteger(text, [/(\d)\s*(?:x\s*)?fans?\b/i]);
  if (num) return num;
  const word = text.match(/\b(single|dual|twin|triple|quad)\b[^.]{0,24}?fans?\b/i);
  if (word) return { single: 1, dual: 2, twin: 2, triple: 3, quad: 4 }[word[1].toLowerCase()];
  return null;
}

// Fan speed in RPM. Prefers a stated range ("500-1800 RPM"), falling back to a
// single max figure.
function parseFanSpeed(text) {
  const range = text.match(/(\d{3,4})\s*(?:-|–|to)\s*(\d{3,4})\s*rpm/i);
  if (range) return { min: Number.parseInt(range[1], 10), max: Number.parseInt(range[2], 10) };
  const single = text.match(/(\d{3,4})\s*rpm/i);
  if (single) return { min: null, max: Number.parseInt(single[1], 10) };
  return { min: null, max: null };
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
        min: parseInteger(text, [/(\d{3,4})\s*[-–—]\s*\d{3,4}\s*rpm/i]),
        max: parseInteger(text, [/\d{3,4}\s*[-–—]\s*(\d{3,4})\s*rpm/i, /(\d{3,4})\s*rpm/i])
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
      // Only read a mm/cm measurement as cable length for actual cable products,
      // otherwise a fan's "120mm" size bleeds into the cable length field.
      length: category === 'Cables' ? parseInteger(text, [/(\d{2,4})\s*(?:mm|cm)\b/i]) : null
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
    renewed: isRenewedListing(name, rawTitle),
    reviewNotes: firstString(rawProduct.reviewNotes),
    fields: buildFields(componentType, rawProduct),
    rawTitle,
    alreadyInLive: Boolean(rawProduct.alreadyInLive)
  };
}

// Flags refurbished / used / open-box listings so they can be badged (or filtered)
// downstream. Amazon labels these in the title, e.g. "(Renewed)".
const RENEWED_RE = /\b(renewed|refurbished|refurb|pre-?owned|open[\s-]?box)\b/i;
function isRenewedListing(...texts) {
  return texts.some((t) => RENEWED_RE.test(String(t || '')));
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
    const clean = (s) => (s || '')
      .replace(/[‎‏‪-‮]/g, '') // strip Amazon's bidi marks
      .replace(/\s+/g, ' ')
      .replace(/^[\s:]+|[\s:]+$/g, '')
      .trim();
    const specs = {};
    const addSpec = (label, value) => {
      const k = clean(label);
      const v = clean(value);
      if (k && v && !(k in specs)) specs[k] = v;
    };

    const titleElement = document.querySelector('#productTitle');
    const mainImage = document.querySelector('#landingImage, #imgBlkFront');
    const featureList = document.querySelectorAll('#feature-bullets ul li');

    // 1) Technical-detail / product-detail tables (th/td pairs).
    document.querySelectorAll([
      '#productDetails_techSpec_section_1 tr',
      '#productDetails_techSpec_section_2 tr',
      '.prodDetTable tr',
      '#productDetails_detailBullets_sections1 tr',
      'table.a-keyvalue tr'
    ].join(', ')).forEach((row) => {
      addSpec(row.querySelector('th')?.textContent, row.querySelector('td')?.textContent);
    });

    // 2) "Product overview" glance box at the top of the page — a clean two-column
    //    attribute table (Brand, Graphics Coprocessor, RAM size, Wattage, ...).
    document.querySelectorAll('#productOverview_feature_div tr').forEach((row) => {
      const cells = row.querySelectorAll('td');
      if (cells.length >= 2) addSpec(cells[0].textContent, cells[1].textContent);
    });

    // 3) "Product information" detail bullets list (label : value per <li>).
    document.querySelectorAll('#detailBullets_feature_div li').forEach((li) => {
      const parts = li.querySelectorAll('span.a-list-item > span');
      if (parts.length >= 2) addSpec(parts[0].textContent, parts[1].textContent);
    });

    return {
      title: titleElement ? clean(titleElement.textContent) : '',
      imageUrl: mainImage ? mainImage.src : '',
      features: Array.from(featureList).map((li) => clean(li.textContent)).filter(Boolean),
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
  parseCoolerFields,
  parseRadiatorSize,
  estimateCoolingCapacity,
  extractAmazonPageDetails,
  PENDING_COLLECTION
};
