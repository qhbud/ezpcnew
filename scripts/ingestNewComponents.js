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
  const joined = [
    rawProduct.rawTitle,
    rawProduct.title,
    rawProduct.name,
    Array.isArray(rawProduct.features) ? rawProduct.features.join(' ') : '',
    specsText(rawProduct.specs)
  ].filter(Boolean).join(' ');
  // Trademark/registered glyphs are interior noise that breaks adjacency-based
  // regexes — e.g. "3X PCIe® 5.0 M.2" stopped the M.2 count/gen parser cold, so an
  // ASUS board fell back to chipset defaults. Strip them (empty, not space, to
  // avoid creating double-spaces that would break \s?-style patterns).
  return joined.replace(/[®™©]/g, '');
}

function matchFirst(text, patterns, formatter = (match) => match[1] || match[0]) {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return formatter(match);
  }
  return null;
}

function findManufacturer(text, names) {
  for (const name of names) {
    // Word-boundary match (not just substring) so short brand tokens like "WD"
    // don't fire inside unrelated words (a Fikwot/generic drive was being tagged
    // "WD"). Underscore counts as a boundary so "WD_BLACK" still matches "WD".
    const escaped = name.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(`(?<![a-z0-9])${escaped}(?![a-z0-9])`, 'i');
    if (re.test(text)) return name;
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
    [/micro[-\s]?atx|\bm-?atx\b/i, 'Micro-ATX'],
    [/mini[-\s]?itx|\bitx\b/i, 'Mini-ITX'],
    // Plain ATX only — the negative lookbehind stops the "ATX" inside "E-ATX",
    // "M-ATX" or "Micro-ATX" from being read as full-size ATX support (which made
    // a Micro-ATX case falsely claim it fits ATX boards).
    [/(?<![-\w])atx\b/i, 'ATX']
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
    /\bRTX\s?5060\s?TI\b/i,
    /\bRTX\s?5060\b/i,
    /\bRTX\s?5050\b/i,
    /\bRTX\s?4090\b/i,
    /\bRTX\s?4080\s?SUPER\b/i,
    /\bRTX\s?4080\b/i,
    /\bRTX\s?4070\s?TI\s?SUPER\b/i,
    /\bRTX\s?4070\s?TI\b/i,
    /\bRTX\s?4070\s?SUPER\b/i,
    /\bRTX\s?4070\b/i,
    /\bRTX\s?4060\s?TI\b/i,
    /\bRTX\s?4060\b/i,
    /\bRTX\s?3090\s?TI\b/i,
    /\bRTX\s?3090\b/i,
    /\bRTX\s?3080\s?TI\b/i,
    /\bRTX\s?3080\b/i,
    /\bRTX\s?3070\s?TI\b/i,
    /\bRTX\s?3070\b/i,
    /\bRTX\s?3060\s?TI\b/i,
    /\bRTX\s?3060\b/i,
    /\bRTX\s?3050\b/i,
    /\bRX\s?9070\s?XT\b/i,
    /\bRX\s?9070\b/i,
    /\bRX\s?9060\s?XT\b/i,
    /\bRX\s?9060\b/i,
    /\bRX\s?7900\s?XTX\b/i,
    /\bRX\s?7900\s?XT\b/i,
    /\bRX\s?7900\s?GRE\b/i,
    /\bRX\s?7800\s?XT\b/i,
    /\bRX\s?7700\s?XT\b/i,
    /\bRX\s?7600\s?XT\b/i,
    /\bRX\s?7600\b/i,
    /\bRX\s?6950\s?XT\b/i,
    /\bRX\s?6900\s?XT\b/i,
    /\bRX\s?6800\s?XT\b/i,
    /\bRX\s?6800\b/i,
    /\bRX\s?6750\s?XT\b/i,
    /\bRX\s?6700\s?XT\b/i,
    /\bRX\s?6700\b/i,
    /\bRX\s?6650\s?XT\b/i,
    /\bRX\s?6600\s?XT\b/i,
    /\bRX\s?6600\b/i,
    /\bRX\s?6500\s?XT\b/i,
    /\bRX\s?6400\b/i,
    /\bGTX\s?1660\s?TI\b/i,
    /\bGTX\s?1660\s?SUPER\b/i,
    /\bGTX\s?1660\b/i,
    /\bGTX\s?1650\s?SUPER\b/i,
    /\bGTX\s?1650\b/i,
    /\bGTX\s?1630\b/i,
    /\bARC\s?A770\b/i,
    /\bARC\s?A750\b/i,
    /\bARC\s?A580\b/i,
    /\bARC\s?A380\b/i,
    /\bARC\s?A310\b/i,
    /\bARC\s?B580\b/i,
    /\bARC\s?B570\b/i
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return match[0].replace(/\s+/g, ' ').toUpperCase().replace('ARC', 'Arc');
  }

  return null;
}

function parseMotherboardChipset(text) {
  // Trailing (?!\d) instead of \b so a form-factor suffix glued to the chipset
  // ("B650M-A", "B760M") still resolves — \b failed between "B650" and "M". The
  // alternation is ordered longest-first (B650E before B650) so suffixed variants
  // still win.
  return matchFirst(text, [
    /\b(Z890|Z790|Z690|H770|H670|H610|B860|B760|B660|Z590|Z490|B560|B460|H570|H510|H470|X870E|X870|X670E|X670|B850|B840|B650E|B650|A620|X570|X470|B550|B450|A520)(?!\d)/i
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
  'RTX 5060 TI': { type: 'GDDR7', size: 16, busWidth: 128, pcie: 'PCIe 5.0' },
  'RTX 5060': { type: 'GDDR7', size: 8, busWidth: 128, pcie: 'PCIe 5.0' },
  'RTX 5050': { type: 'GDDR6', size: 8, busWidth: 128, pcie: 'PCIe 5.0' },
  'RTX 4090': { type: 'GDDR6X', size: 24, busWidth: 384, pcie: 'PCIe 4.0' },
  'RTX 4080 SUPER': { type: 'GDDR6X', size: 16, busWidth: 256, pcie: 'PCIe 4.0' },
  'RTX 4080': { type: 'GDDR6X', size: 16, busWidth: 256, pcie: 'PCIe 4.0' },
  'RTX 4070 TI SUPER': { type: 'GDDR6X', size: 16, busWidth: 256, pcie: 'PCIe 4.0' },
  'RTX 4070 TI': { type: 'GDDR6X', size: 12, busWidth: 192, pcie: 'PCIe 4.0' },
  'RTX 4070 SUPER': { type: 'GDDR6X', size: 12, busWidth: 192, pcie: 'PCIe 4.0' },
  'RTX 4070': { type: 'GDDR6X', size: 12, busWidth: 192, pcie: 'PCIe 4.0' },
  'RTX 4060 TI': { type: 'GDDR6', size: 8, busWidth: 128, pcie: 'PCIe 4.0' },
  'RTX 4060': { type: 'GDDR6', size: 8, busWidth: 128, pcie: 'PCIe 4.0' },
  'RTX 3090 TI': { type: 'GDDR6X', size: 24, busWidth: 384, pcie: 'PCIe 4.0' },
  'RTX 3090': { type: 'GDDR6X', size: 24, busWidth: 384, pcie: 'PCIe 4.0' },
  'RTX 3080 TI': { type: 'GDDR6X', size: 12, busWidth: 384, pcie: 'PCIe 4.0' },
  'RTX 3080': { type: 'GDDR6X', size: 10, busWidth: 320, pcie: 'PCIe 4.0' },
  'RTX 3070 TI': { type: 'GDDR6X', size: 8, busWidth: 256, pcie: 'PCIe 4.0' },
  'RTX 3070': { type: 'GDDR6', size: 8, busWidth: 256, pcie: 'PCIe 4.0' },
  'RTX 3060 TI': { type: 'GDDR6', size: 8, busWidth: 256, pcie: 'PCIe 4.0' },
  'RTX 3060': { type: 'GDDR6', size: 12, busWidth: 192, pcie: 'PCIe 4.0' },
  // RTX 3050 ships in 8GB (128-bit) and 6GB (96-bit) variants; the 8GB is the
  // canonical card. parseGpuMemory backfills only null fields, so a "6GB" listing
  // keeps its real 6GB size — only the bus width default may skew for that variant.
  'RTX 3050': { type: 'GDDR6', size: 8, busWidth: 128, pcie: 'PCIe 4.0' },
  'RX 9070 XT': { type: 'GDDR6', size: 16, busWidth: 256, pcie: 'PCIe 5.0' },
  'RX 9070': { type: 'GDDR6', size: 16, busWidth: 256, pcie: 'PCIe 5.0' },
  'RX 9060 XT': { type: 'GDDR6', size: 16, busWidth: 128, pcie: 'PCIe 5.0' },
  'RX 9060': { type: 'GDDR6', size: 8, busWidth: 128, pcie: 'PCIe 5.0' },
  'RX 7900 XTX': { type: 'GDDR6', size: 24, busWidth: 384, pcie: 'PCIe 4.0' },
  'RX 7900 XT': { type: 'GDDR6', size: 20, busWidth: 320, pcie: 'PCIe 4.0' },
  'RX 7900 GRE': { type: 'GDDR6', size: 16, busWidth: 256, pcie: 'PCIe 4.0' },
  'RX 7800 XT': { type: 'GDDR6', size: 16, busWidth: 256, pcie: 'PCIe 4.0' },
  'RX 7700 XT': { type: 'GDDR6', size: 12, busWidth: 192, pcie: 'PCIe 4.0' },
  'RX 7600 XT': { type: 'GDDR6', size: 16, busWidth: 128, pcie: 'PCIe 4.0' },
  'RX 7600': { type: 'GDDR6', size: 8, busWidth: 128, pcie: 'PCIe 4.0' },
  // RDNA 2 (RX 6000) — still widely sold new. All PCIe 4.0; the 6500 XT / 6400
  // run only x4 electrically but the connector/gen is still 4.0.
  'RX 6950 XT': { type: 'GDDR6', size: 16, busWidth: 256, pcie: 'PCIe 4.0' },
  'RX 6900 XT': { type: 'GDDR6', size: 16, busWidth: 256, pcie: 'PCIe 4.0' },
  'RX 6800 XT': { type: 'GDDR6', size: 16, busWidth: 256, pcie: 'PCIe 4.0' },
  'RX 6800': { type: 'GDDR6', size: 16, busWidth: 256, pcie: 'PCIe 4.0' },
  'RX 6750 XT': { type: 'GDDR6', size: 12, busWidth: 192, pcie: 'PCIe 4.0' },
  'RX 6700 XT': { type: 'GDDR6', size: 12, busWidth: 192, pcie: 'PCIe 4.0' },
  'RX 6700': { type: 'GDDR6', size: 10, busWidth: 160, pcie: 'PCIe 4.0' },
  'RX 6650 XT': { type: 'GDDR6', size: 8, busWidth: 128, pcie: 'PCIe 4.0' },
  'RX 6600 XT': { type: 'GDDR6', size: 8, busWidth: 128, pcie: 'PCIe 4.0' },
  'RX 6600': { type: 'GDDR6', size: 8, busWidth: 128, pcie: 'PCIe 4.0' },
  'RX 6500 XT': { type: 'GDDR6', size: 4, busWidth: 64, pcie: 'PCIe 4.0' },
  'RX 6400': { type: 'GDDR6', size: 4, busWidth: 64, pcie: 'PCIe 4.0' },
  // GTX 16 (Turing) — budget/OEM, still on retail. PCIe 3.0; non-Super 1660/1650
  // ship GDDR5, the Super/Ti use GDDR6 (parseGpuMemory keeps an explicit listing).
  'GTX 1660 TI': { type: 'GDDR6', size: 6, busWidth: 192, pcie: 'PCIe 3.0' },
  'GTX 1660 SUPER': { type: 'GDDR6', size: 6, busWidth: 192, pcie: 'PCIe 3.0' },
  'GTX 1660': { type: 'GDDR5', size: 6, busWidth: 192, pcie: 'PCIe 3.0' },
  'GTX 1650 SUPER': { type: 'GDDR6', size: 4, busWidth: 128, pcie: 'PCIe 3.0' },
  'GTX 1650': { type: 'GDDR5', size: 4, busWidth: 128, pcie: 'PCIe 3.0' },
  'GTX 1630': { type: 'GDDR6', size: 4, busWidth: 64, pcie: 'PCIe 3.0' },
  'ARC A770': { type: 'GDDR6', size: 16, busWidth: 256, pcie: 'PCIe 4.0' },
  'ARC A750': { type: 'GDDR6', size: 8, busWidth: 256, pcie: 'PCIe 4.0' },
  'ARC A580': { type: 'GDDR6', size: 8, busWidth: 256, pcie: 'PCIe 4.0' },
  'ARC A380': { type: 'GDDR6', size: 6, busWidth: 96, pcie: 'PCIe 4.0' },
  'ARC A310': { type: 'GDDR6', size: 4, busWidth: 64, pcie: 'PCIe 4.0' },
  'ARC B580': { type: 'GDDR6', size: 12, busWidth: 192, pcie: 'PCIe 4.0' },
  'ARC B570': { type: 'GDDR6', size: 10, busWidth: 160, pcie: 'PCIe 4.0' }
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
  // Infer the GPU vendor from the brand family (GeForce/Radeon/Arc) when the bare
  // "NVIDIA"/"AMD"/"Intel" token isn't in the title — a partner card titled
  // "ASUS ROG Strix GeForce RTX 4090" still has a knowable vendor.
  let manufacturer = findManufacturer(text, ['NVIDIA', 'AMD', 'Intel']);
  if (!manufacturer) {
    if (/\b(geforce|gtx)\b/i.test(text) || /^RTX/i.test(chipset || '')) manufacturer = 'NVIDIA';
    else if (/\bradeon\b/i.test(text) || /^RX/i.test(chipset || '')) manufacturer = 'AMD';
    else if (/\barc\b/i.test(text) || /^ARC/i.test(chipset || '')) manufacturer = 'Intel';
  }
  return {
    manufacturer,
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

// Intel generation embedded in the model number: 5-digit models put it in the
// first two digits (13900 -> 13, 10700 -> 10); 4-digit models in the first
// (9900 -> 9, 8700 -> 8).
function intelGenFromModel(digits) {
  if (digits.length === 5) return Number.parseInt(digits.slice(0, 2), 10);
  if (digits.length === 4) return Number.parseInt(digits.slice(0, 1), 10);
  return 0;
}

// The CPU socket is fixed by the model/generation, so infer it from the SKU. This
// is authoritative and overrides a bare LGA/AM token, which can bleed in from a
// "compatible with LGA1151" cross-sell or spec-blob noise (e.g. an i9-13900KS,
// an LGA1700 part, whose page mentioned LGA1151 and was mis-tagged).
function inferCpuSocketFromModel(text) {
  // Intel Core Ultra Series 2 (Arrow Lake desktop) — "Core Ultra 9 285K" etc.
  if (/\bcore\s*ultra\s*[3579]\s*2\d\d\b/i.test(text)) return 'LGA1851';
  const intel = text.match(/\bi[3579][\s-]?(\d{4,5})\s*[a-z]{0,2}\b/i);
  if (intel) {
    const gen = intelGenFromModel(intel[1]);
    if (gen >= 12 && gen <= 14) return 'LGA1700';
    if (gen === 10 || gen === 11) return 'LGA1200';
    if (gen >= 6 && gen <= 9) return 'LGA1151';
  }
  const ryzen = text.match(/\bryzen\s*(?:threadripper\s*)?[3579]\s*(\d{4})\s*[a-z0-9]{0,3}\b/i);
  if (ryzen) {
    const n = Number.parseInt(ryzen[1], 10);
    if (n >= 7000) return 'AM5';   // Ryzen 7000/8000/9000 = AM5
    if (n >= 1000) return 'AM4';   // Ryzen 1000–5000 = AM4
  }
  return null;
}

function parseCpuSocket(text) {
  return inferCpuSocketFromModel(text) || parseSingleSocket(text);
}

function parseCpuFields(text) {
  const memoryType = parseMemoryTypes(text);
  // Prefer a labelled TDP; otherwise accept a bare watt figure ("LGA1200 65W") —
  // on a CPU title the standalone wattage is the TDP. Constrained to 15–300W so a
  // model number or unrelated figure can't slip in.
  const labelledTdp = parseExplicitWatts(text, ['tdp', 'processor base power', 'base power']);
  const bareTdp = parseInteger(text, [/\b(\d{2,3})\s*w\b/i]);
  const tdp = labelledTdp || (bareTdp && bareTdp >= 15 && bareTdp <= 300 ? bareTdp : null);
  return {
    manufacturer: findManufacturer(text, ['Intel', 'AMD']),
    socket: parseCpuSocket(text),
    cores: parseInteger(text, [/(\d+)[\s-]*(?:core|cores)\b/i]),
    threads: parseInteger(text, [/(\d+)[\s-]*(?:thread|threads)\b/i]),
    baseClock: parseNumber(text, [/(?:base clock|base)\D{0,12}(\d+(?:\.\d+)?)\s*ghz/i]),
    boostClock: parseNumber(text, [/(?:up to|max boost|boost clock|boost)\D{0,12}(\d+(?:\.\d+)?)\s*ghz/i]),
    tdp,
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
    manufacturer: findManufacturer(text, ['Corsair', 'G.Skill', 'Kingston', 'Crucial', 'Teamgroup', 'TEAMGROUP', 'Patriot', 'Silicon Power', 'KLEVV', 'PNY', 'SK hynix', 'ADATA', 'XPG']),
    brand: matchFirst(text, [/\b(Vengeance|Dominator|Trident Z5|Trident Z|Ripjaws|Fury Beast|Ballistix|T-Force)\b/i], (match) => match[1]),
    capacity: kit.capacity,
    kitSize: kit.kitSize,
    totalCapacity: kit.totalCapacity,
    memoryType: parseMemoryTypes(text)[0] || null,
    speed: parseInteger(text, [/(\d{4,5})\s*mhz/i, /(\d{4,5})\s*mt\/s/i, /\bDDR[45][- ]?(\d{4,5})\b/i]),
    casLatency: parseInteger(text, [/\bCL\s?(\d{2,3})\b/i]),
    // Lookarounds (not \b) so a CL-prefixed form like "CL30-36-36-76" still yields
    // "30-36-36-76" — \b failed between the "L" and the leading digits.
    timing: matchFirst(text, [/(?<![\d-])(\d{2}-\d{2}-\d{2}-\d{2,3})(?![\d-])/]),
    voltage: parseNumber(text, [/(\d+(?:\.\d+)?)\s*v\b/i]),
    formFactor: /\bsodimm\b|\bso-dimm\b/i.test(text) ? 'SODIMM' : (/\bdimm\b|\bdesktop\b/i.test(text) ? 'DIMM' : null),
    ecc: parseEcc(text),
    // "registered" alone misfires on boilerplate ("registered trademark"); key
    // off DIMM-type tokens instead. RDIMM = registered, UDIMM/unbuffered = not.
    registered: /\brdimm\b/i.test(text) ? true : (/\budimm\b|\bunbuffered\b|\bunregistered\b/i.test(text) ? false : null),
    xmp: /\bxmp\b/i.test(text) ? true : null,
    expo: /\bexpo\b/i.test(text) ? true : null,
    rgb: /\bargb\b|\brgb\b/i.test(text) ? true : null
  };
}

// Whether the module is a true ECC (sideband / module-level) DIMM. Every DDR5
// chip has *on-die* ECC, which vendors advertise as "On-Die ECC" / "ECC" on
// ordinary non-ECC desktop kits — that does NOT make it an ECC module and must
// not be reported as ecc:true. Strip on-die mentions before deciding.
function parseEcc(text) {
  const stripped = String(text).replace(/\bon[-\s]?die\s+ecc\b/ig, ' ');
  if (/\bnon[-\s]?ecc\b/i.test(stripped)) return false;
  // Genuine ECC modules say "ECC" alongside a module-type or memory descriptor.
  if (/\b(?:ecc\s+(?:rdimm|udimm|dimm|memory|module|registered|unbuffered)|registered\s+ecc|rdimm\s+ecc)\b/i.test(stripped)) return true;
  // A bare "ECC" left after stripping on-die — only trust it on server/workstation
  // memory contexts, otherwise leave unknown rather than guess.
  if (/\becc\b/i.test(stripped) && /\b(rdimm|registered|workstation|server|xeon|epyc|threadripper\s*pro)\b/i.test(stripped)) return true;
  return null;
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
    manufacturer: findManufacturer(text, ['Corsair', 'EVGA', 'Seasonic', 'be quiet!', 'Thermaltake', 'Cooler Master', 'MSI', 'ASUS', 'ARESGAME', 'Montech', 'NZXT', 'Gigabyte']),
    brand: parsePsuSeries(text),
    wattage: parsePsuWattage(text),
    efficiency: parseEfficiency(text),
    formFactor: matchFirst(text, [/\b(ATX|SFX|SFX-L|TFX)\b/i], (match) => match[1].toUpperCase()),
    modularity: parseModularity(text),
    certification: matchFirst(text, [/(\b80\s*(?:\+|plus)|\bcybenetics)/i], (match) => /cyben/i.test(match[1]) ? 'Cybenetics' : '80 Plus'),
    features: [
      /\bATX\s*3(?:\.0|\.1)?\b/i.test(text) ? matchFirst(text, [/\bATX\s*3(?:\.0|\.1)?\b/i]) : null,
      /\bPCIe\s*5(?:\.0|\.1)?\b/i.test(text) ? matchFirst(text, [/\bPCIe\s*5(?:\.0|\.1)?\b/i]) : null
    ].filter(Boolean)
  };
}

function parseEfficiency(text) {
  // Accept "80 Plus Gold", "80Plus Gold", "80+ Gold", "80 + Gold" and "Cybenetics
  // Platinum". The "+" short form (no "Plus") previously slipped through.
  const match = text.match(/\b(?:80\s*(?:\+\s*)?(?:plus)?|cybenetics)\s*(Titanium|Platinum|Gold|Silver|Bronze)\b/i);
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
    manufacturer: findManufacturer(text, ['Samsung', 'Western Digital', 'WD', 'Crucial', 'Seagate', 'Kingston', 'SanDisk', 'Sabrent', 'SK hynix', 'Fikwot', 'Teamgroup', 'ADATA']),
    // Order matters: most specific model first so "9100 Pro" / "990 EVO Plus"
    // win over the shorter "990 Pro"/"990 EVO". Bare colour words (Blue/Black)
    // were removed — they misfired on any drive whose page copy mentioned a
    // colour (e.g. a Samsung drive grabbing WD's "Black").
    brand: matchFirst(text, [/\b(9100 Pro|990 EVO Plus|990 EVO|990 Pro|980 Pro|980|970 EVO Plus|970 EVO|SN850X|SN850|SN770|SN570|T500|T700|P5 Plus|P5|P3 Plus|P3|FireCuda|BarraCuda|IronWolf|WD Blue|WD Black|MX500|BX500)\b/i], (match) => match[1]),
    type,
    formFactor: parseStorageFormFactor(text, type),
    capacity: parseCapacityGb(text),
    interface: parseStorageInterface(text),
    // Number-before-label form ("7,450 MB/s Read") must be tried first: the old
    // label-first patterns matched the next number AFTER "Read", which on a
    // "7,450 MB/s Read, 6,900 MB/s Write" title grabbed the write speed as read.
    readSpeed: parseInteger(text, [/([\d,]{3,7})\s*(?:mb\/s|megabytes)\s*(?:seq[a-z.]*\s*)?read/i, /read\D{0,20}([\d,]{3,7})\s*(?:mb\/s|megabytes)/i, /up to\D{0,12}([\d,]{3,7})\s*(?:mb\/s|megabytes)/i]),
    writeSpeed: parseInteger(text, [/([\d,]{3,7})\s*(?:mb\/s|megabytes)\s*(?:seq[a-z.]*\s*)?write/i, /write\D{0,20}([\d,]{3,7})\s*(?:mb\/s|megabytes)/i]),
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

// Typical mainstream full-size (ATX) slot layout per chipset, used to backfill
// M.2 and PCIe expansion slots when a retail listing doesn't print the counts
// (the common case) — the parser otherwise left them empty for nearly every
// board. pcie entries are [gen, lanes]. Inferred slots are tagged inferred:true
// so downstream code can tell them from values read directly off the listing.
// Inferred M.2 sockets default to PCIe 4.0 — the dominant socket gen across
// these chipsets — rather than over-claiming Gen5 on every socket.
const MOBO_REF = {
  // Intel LGA1700 (12th–14th gen)
  Z890: { m2: 4, pcie: [['5.0', 16], ['4.0', 16], ['3.0', 1]] },
  Z790: { m2: 4, pcie: [['5.0', 16], ['4.0', 16], ['3.0', 1]] },
  Z690: { m2: 4, pcie: [['5.0', 16], ['3.0', 16], ['3.0', 1]] },
  H770: { m2: 3, pcie: [['5.0', 16], ['3.0', 1]] },
  H670: { m2: 3, pcie: [['5.0', 16], ['3.0', 1]] },
  H610: { m2: 1, pcie: [['4.0', 16], ['3.0', 1]] },
  B860: { m2: 2, pcie: [['4.0', 16], ['3.0', 1]] },
  B760: { m2: 2, pcie: [['4.0', 16], ['3.0', 1]] },
  B660: { m2: 2, pcie: [['4.0', 16], ['3.0', 1]] },
  // Intel LGA1200 (10th–11th gen) — PCIe 4.0 x16 only with Rocket Lake CPUs.
  Z590: { m2: 3, pcie: [['4.0', 16], ['3.0', 16], ['3.0', 1]] },
  Z490: { m2: 2, pcie: [['3.0', 16], ['3.0', 1]] },
  B560: { m2: 2, pcie: [['4.0', 16], ['3.0', 1]] },
  B460: { m2: 1, pcie: [['3.0', 16], ['3.0', 1]] },
  H570: { m2: 2, pcie: [['4.0', 16], ['3.0', 1]] },
  H510: { m2: 1, pcie: [['4.0', 16], ['3.0', 1]] },
  H470: { m2: 1, pcie: [['3.0', 16], ['3.0', 1]] },
  // AMD AM5
  X870E: { m2: 4, pcie: [['5.0', 16], ['4.0', 16], ['3.0', 1]] },
  X870: { m2: 3, pcie: [['5.0', 16], ['4.0', 1]] },
  X670E: { m2: 4, pcie: [['5.0', 16], ['4.0', 16], ['3.0', 1]] },
  X670: { m2: 3, pcie: [['5.0', 16], ['4.0', 4], ['3.0', 1]] },
  B850: { m2: 2, pcie: [['4.0', 16], ['3.0', 1]] },
  B840: { m2: 1, pcie: [['4.0', 16], ['3.0', 1]] },
  B650E: { m2: 3, pcie: [['5.0', 16], ['3.0', 1]] },
  B650: { m2: 2, pcie: [['4.0', 16], ['3.0', 1]] },
  A620: { m2: 1, pcie: [['4.0', 16], ['3.0', 1]] },
  // AMD AM4
  X570: { m2: 2, pcie: [['4.0', 16], ['4.0', 16], ['4.0', 1]] },
  X470: { m2: 2, pcie: [['3.0', 16], ['3.0', 16], ['3.0', 1]] },
  B550: { m2: 2, pcie: [['4.0', 16], ['3.0', 1]] },
  B450: { m2: 1, pcie: [['3.0', 16], ['3.0', 1]] },
  A520: { m2: 1, pcie: [['3.0', 16], ['3.0', 1]] }
};

function refM2Slots(count) {
  return Array.from({ length: count }, () => ({ type: 'M.2', pcieVersion: 'PCIe 4.0', sata: null, nvme: true, inferred: true }));
}

function refPcieSlots(pairs) {
  return pairs.map(([gen, lanes]) => ({ type: null, version: `PCIe ${gen}`, lanes, physicalSize: `x${lanes}`, inferred: true }));
}

function parseMotherboardFields(text) {
  const formFactors = parseFormFactors(text);
  const memoryType = parseMemoryTypes(text);
  const chipset = parseMotherboardChipset(text);
  const isItx = formFactors[0] === 'Mini-ITX';
  let pcieSlots = parsePcieSlots(text);
  let m2Slots = parseM2Slots(text);
  const ref = chipset ? MOBO_REF[chipset.toUpperCase()] : null;
  if (ref) {
    // ITX boards have one x16 slot and at most two M.2 sockets regardless of chipset.
    if (!m2Slots.length) m2Slots = refM2Slots(isItx ? Math.min(ref.m2, 2) : ref.m2);
    // PCIe: prefer the chipset's typical layout whenever explicit parsing found
    // fewer slots than the board actually has. Retail titles often spell out only
    // the primary "PCIe 5.0 x16" lane width, which left boards showing 1 slot when
    // they really have ~3. Only keep the explicit set if it's at least as complete.
    const refPcie = isItx ? [ref.pcie[0]] : ref.pcie;
    if (pcieSlots.length < refPcie.length) pcieSlots = refPcieSlots(refPcie);
  }
  return {
    manufacturer: findManufacturer(text, ['ASUS', 'MSI', 'Gigabyte', 'GIGABYTE', 'ASRock', 'EVGA', 'Biostar']),
    chipset,
    socket: parseSingleSocket(text),
    formFactor: formFactors[0] || null,
    memorySlots: parseMemorySlots(text, formFactors),
    maxMemory: parseInteger(text, [/max(?:imum)?\s*memory\D{0,12}(\d{2,4})\s*gb/i]),
    memoryType: memoryType.length ? memoryType : null,
    sataPorts: parseInteger(text, [/(\d)\s*(?:x\s*)?SATA/i]),
    pcieSlots,
    m2Slots,
    networking: parseNetworking(text)
  };
}

function parseNetworking(text) {
  // "WIFI6E"/"WiFi 7" — the version token also proves WiFi is present, so derive
  // the boolean from either signal. The bare \bwifi\b test alone missed
  // "WIFI6E" (no word boundary before the trailing digit).
  const wifiVersion = matchFirst(text, [/\bWi-?Fi\s?(\d(?:\.\d)?E?)\b/i], (match) => `WiFi ${match[1]}`);
  const wifi = (wifiVersion || /\bwi-?fi\b/i.test(text)) ? true : null;
  return {
    wifi,
    wifiVersion,
    bluetooth: /\bbluetooth\b/i.test(text) ? true : null
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
  const seen = new Set();
  const re = /PCIe\s*([345])\.0\s*x\s*(16|8|4|1)\b/ig;
  let m;
  while ((m = re.exec(text))) {
    // De-dupe identical slot specs: the same "PCIe 5.0 x16" phrase often appears
    // in both the title and the specs blob, which inflated the slot count
    // (a board showed 4× PCIe 5.0 x16 when it has one).
    const key = `${m[1]}.0x${m[2]}`;
    if (seen.has(key)) continue;
    seen.add(key);
    slots.push({ type: null, version: `PCIe ${m[1]}.0`, lanes: Number.parseInt(m[2], 10), physicalSize: `x${m[2]}` });
  }
  return slots;
}

// The PCIe generation of the M.2 sockets — read from a gen token actually
// attached to "M.2" ("4xPCIe 4.0 M.2 slots", "M.2 PCIe 5.0", "M.2 Gen4"), NOT
// the first PCIe mention in the text (which is usually the x16 expansion slot and
// previously got mis-applied — tagging explicitly-Gen4 M.2 sockets as Gen5).
// Defaults to PCIe 4.0, the dominant socket gen, rather than over-claiming Gen5.
// (Mixed-gen boards can't be represented per-slot from a title; this picks the
// gen the listing ties to M.2.)
function parseM2PcieVersion(text) {
  const m = text.match(/PCIe\s?([345])\.0\s*(?:x\s?\d+\s*)?M\.?2/i)
    || text.match(/M\.?2[^.,;]{0,18}?PCIe\s?([345])\.0/i)
    || text.match(/Gen\s?([345])\s*(?:x\s?\d+\s*)?M\.?2/i)
    || text.match(/M\.?2[^.,;]{0,12}?Gen\s?([345])/i);
  return m ? `PCIe ${m[1]}.0` : 'PCIe 4.0';
}

function parseM2Slots(text) {
  const count = parseM2Count(text);
  if (!count) return [];
  const pcieVersion = parseM2PcieVersion(text);
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
    manufacturer: findManufacturer(text, ['NZXT', 'Corsair', 'Lian Li', 'Fractal Design', 'Phanteks', 'Cooler Master', 'Thermaltake', 'be quiet!', 'GAMDIAS', 'Redragon', 'Montech', 'Antec', 'DeepCool', 'ASUS', 'MSI', 'Geometric Future', 'ARCTIC', 'Hyte', 'darkFlash', 'Vetroo', 'DIYPC', 'SilverStone', 'Jonsbo', 'InWin', 'Zalman', 'Sama', 'GAMEMAX', 'Sahara', 'Cougar', 'Thermalright']),
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
  // Allow up to 3 descriptor words between the count and "heat pipes", e.g.
  // "7 high-Performance Copper Heat Pipes" (strict adjacent form tried first).
  const heatpipes = parseInteger(text, [/(\d+)\s*heat\s?pipes?/i, /(\d+)\s*(?:[a-z][\w-]*\s+){1,3}heat[-\s]?pipes?/i]);
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
    manufacturer: findManufacturer(text, ['Noctua', 'Arctic', 'ARCTIC', 'Corsair', 'be quiet!', 'Cooler Master', 'NZXT', 'DeepCool', 'Thermalright', 'Thermaltake', 'ID-COOLING', 'Scythe', 'Phanteks', 'Vetroo', 'EKWB', 'EK', 'Lian Li', 'Montech', 'MSI', 'ASUS', 'Cougar', 'Antec', 'Zalman']),
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
  for (const match of text.matchAll(/\b(80|92|100|120|140|200)\s*mm\b/ig)) {
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
  // "3X RS120 ARGB Fans Included" — a "<n>x" count token with the model/colour
  // words in between before "Fans". (The adjacent pattern above missed it.)
  const prefixed = text.match(/(\d)\s*x\b[\sa-z0-9,–-]{0,24}?fans?\b/i);
  if (prefixed) return Number.parseInt(prefixed[1], 10);
  // Count words near "fan(s)" — include number words ("Two ... Fans" on the Arctic
  // Freezer 36 CO) and widen the gap so descriptors between the word and "Fans"
  // ("Two Pressure-optimised 120 mm P Fans") still match.
  const word = text.match(/\b(single|dual|twin|triple|quad|two|three|four)\b[^.]{0,30}?fans?\b/i);
  if (word) return { single: 1, dual: 2, twin: 2, two: 2, triple: 3, three: 3, quad: 4, four: 4 }[word[1].toLowerCase()];
  return null;
}

// Fan speed in RPM. Prefers a stated range ("500-1800 RPM"), falling back to a
// single max figure.
function parseFanSpeed(text) {
  const range = text.match(/(\d{3,4})\s*(?:-|–|to)\s*(\d{3,4})\s*rpm/i);
  if (range) return { min: Number.parseInt(range[1], 10), max: Number.parseInt(range[2], 10) };
  // Comma-aware single value so "2,100 RPM" → 2100 (not the "100" tail).
  const single = text.match(/(?<![\d,])(\d{1,2},?\d{3}|\d{3,4})\s*rpm/i);
  if (single) return { min: null, max: Number.parseInt(single[1].replace(/,/g, ''), 10) };
  return { min: null, max: null };
}

function parseAddonFields(text) {
  const category = parseAddonCategory(text);
  return {
    manufacturer: findManufacturer(text, ['Corsair', 'Noctua', 'Lian Li', 'CableMod', 'Arctic', 'ARCTIC', 'Thermal Grizzly', 'Thermalright', 'Cooler Master', 'NZXT', 'be quiet!', 'Phanteks', 'Thermaltake', 'AsiaHorse', 'Lian-Li', 'upHere', 'EZDIY-FAB', 'ID-COOLING', 'Vetroo', 'DeepCool', 'Scythe', 'Cougar', 'Antec']),
    brand: null,
    category,
    type: parseAddonType(text, category),
    fanSpecs: {
      size: parseInteger(text, [/\b(80|92|100|120|140|200)\s*mm\b/i]),
      rpm: {
        min: parseInteger(text, [/(\d{3,4})\s*[-–—]\s*\d{3,4}\s*rpm/i]),
        // Lookbehind + optional comma so "2,100 RPM" yields 2100, not the "100"
        // tail the old \d{3,4} grabbed after the thousands separator.
        max: parseInteger(text, [/\d{3,4}\s*[-–—]\s*(\d{3,4})\s*rpm/i, /(?<![\d,])(\d{1,2},?\d{3}|\d{3,4})\s*rpm/i])
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
    '+ processor +',
    'in 1 combo',
    '3 in 1',
    '2 in 1',
    'combo:',
    'motherboard and',
    'and motherboard'
  ];

  return strictComboKeywords.some((keyword) => nameLower.includes(keyword));
}

function isGpuAccessory(productName) {
  const nameLower = String(productName || '').toLowerCase();
  const hasAccessoryKeyword = [
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
  if (!hasAccessoryKeyword) return false;

  // Real graphics cards routinely mention a bundled "Anti-Sag Bracket" (e.g. the
  // PNY 4090) — so an accessory keyword alone isn't decisive. A genuine card lists
  // its memory type (GDDRx); a bracket/stand never does. Use that to discriminate.
  const isRealCard = /\bgddr\d/i.test(productName || '') || /\bhbm\d/i.test(productName || '');
  return !isRealCard;
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

// Catch listings that are clearly NOT the component they were searched under:
// replacement WiFi antennas (sold "for ASUS ROG Strix Z790-E…"), bare spare parts,
// and AC-mains industrial fans (110–240V) that aren't 12V PC fans. These passed
// field-parsing fine but polluted the catalog as fake motherboards / addons.
function isWrongCategoryListing(componentType, productName) {
  const name = String(productName || '').toLowerCase();

  // WiFi/Bluetooth antenna accessories — never a board/GPU/CPU themselves.
  if (componentType !== 'addon' && /\bantenna\b/.test(name)) return 'antenna accessory';

  // Bare spare-part / replacement-unit resale listings.
  if (/\bspare\s?part\b|\bsparepart\b/.test(name)) return 'spare part listing';

  // AC-mains powered fans (industrial/chassis), not 12V PC fans.
  if (componentType === 'addon'
    && /\bac\b/.test(name)
    && /\b(110|115|120|220|240)\s?v\b/.test(name)) return 'AC-powered fan';

  return null;
}

// Catch "power supplies" that aren't ATX PC PSUs: guitar-pedal power bricks
// (MXR Iso-Brick), bench/lab DC supplies, AC/DC adapters. A genuine PC PSU title
// essentially always states a wattage AND/OR an ATX/SFX form factor or 80-Plus
// rating; lacking all of those is a strong non-PC signal.
function isNonPcPowerSupply(productName) {
  const name = String(productName || '').toLowerCase();
  if (/\b(iso-?brick|pedal|guitar|bench|laboratory|lab\s+power|variable|adjustable|regulated\s+dc|dc\s+power\s+supply|ac\/dc\s+adapter|power\s+brick)\b/.test(name)) return true;
  const hasWattage = /\b\d{3,4}\s*w(?:att)?s?\b/.test(name);
  const hasFormSignal = /\b(atx|sfx|sfx-l|tfx|modular|80\s*(?:\+|plus)|gold|platinum|titanium|bronze)\b/.test(name);
  return !hasWattage && !hasFormSignal;
}

function shouldRejectCandidate(componentType, productName) {
  if (isComboProduct(productName)) return 'combo product';
  if (componentType === 'psu' && isNonPcPowerSupply(productName)) return 'non-PC power supply';
  const wrongCategory = isWrongCategoryListing(componentType, productName);
  if (wrongCategory) return wrongCategory;
  if (componentType === 'gpu' && isGpuAccessory(productName)) return 'GPU accessory';
  if (componentType === 'storage' && isPortableStorage(productName)) return 'portable/external storage';
  if (isCableOrAccessory(productName, componentType)) return 'cable/accessory';
  return null;
}

async function searchAmazon(browser, searchTerm) {
  try {
    return await withScrapeRetry(`Search "${searchTerm}"`, async () => {
      const page = await preparePage(browser);
      try {
        const searchUrl = `https://www.amazon.com/s?k=${encodeURIComponent(searchTerm)}&i=electronics`;

        await page.goto(searchUrl, {
          waitUntil: 'networkidle2',
          timeout: 45000
        });

        await page.waitForTimeout(jitter(2000, 4500));

        if (await isBotBlocked(page)) throw new Error('bot wall (CAPTCHA / robot check)');

        const items = await page.evaluate(() => {
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

        // Zero results on a search that should have plenty usually means a soft
        // block (empty results shell served to a suspected bot) rather than a
        // genuinely empty catalog — retry on a fresh IP before giving up.
        if (!items.length) throw new Error('zero results (likely soft block)');
        return items;
      } finally {
        await page.close().catch(() => {});
      }
    });
  } catch (error) {
    console.error(`Amazon search failed for "${searchTerm}": ${error.message}`);
    return [];
  }
}

// Plausible buy-box price window per component type. Lower bounds let genuinely
// cheap parts (fans/paste/budget RAM) through; upper bounds reject the stray
// large numbers (bundles, unrelated listings) the scraper used to grab.
const PRICE_WINDOWS = {
  addon: { minPrice: 3, maxPrice: 400 },
  cooler: { minPrice: 12, maxPrice: 700 },
  ram: { minPrice: 15, maxPrice: 1200 },
  storage: { minPrice: 15, maxPrice: 1500 },
  psu: { minPrice: 25, maxPrice: 900 },
  case: { minPrice: 25, maxPrice: 800 },
  cpu: { minPrice: 40, maxPrice: 2500 },
  gpu: { minPrice: 80, maxPrice: 6000 },
  motherboard: { minPrice: 40, maxPrice: 1800 }
};

async function scrapeAmazonCandidate(browser, candidate, componentType, affiliateTag) {
  const { scrapePrice } = require('./scrapers/amazonScraper');
  const asin = normalizeAsin(candidate.asin) || extractAsin(candidate.sourceUrl);
  const productUrl = normalizeAmazonProductUrl(candidate.sourceUrl, asin, affiliateTag);

  try {
    return await withScrapeRetry(`Product ${asin || productUrl}`, async () => {
      const page = await preparePage(browser);
      try {
        const priceResult = await scrapePrice(page, productUrl, PRICE_WINDOWS[componentType] || {});
        if (await isBotBlocked(page)) throw new Error('bot wall on product page');
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
      } finally {
        await page.close().catch(() => {});
      }
    });
  } catch (error) {
    // A dead browser session must bubble up so the caller relaunches it; other
    // failures (block/timeout after all retries) fall back to the search-result
    // data, which still carries a name + price for this candidate.
    if (/session closed|target closed|protocol error|connection closed|browser has disconnected|most likely the page has been closed/i.test(error.message)) {
      throw error;
    }
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

// --- Anti-bot scraping infrastructure --------------------------------------
// Amazon hard-blocks datacenter IPs (GitHub Actions) at the search stage — a
// cloud run found candidates for only 1 of 9 types while the same code on a
// local residential IP got all 9. Defence in depth: a stealth plugin to hide
// the headless fingerprint, an optional residential proxy (rotating per page via
// a {session} token in the username), rotated user agents, jittered delays, and
// CAPTCHA detection that retries on a fresh page/IP. Proxy config is env-driven,
// so local runs without a proxy keep working (stealth only).

const SCRAPE_USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15'
];

const SCRAPE_ATTEMPTS = Math.max(1, Number.parseInt(process.env.INGEST_SCRAPE_ATTEMPTS || '3', 10) || 3);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const jitter = (min, max) => Math.floor(min + Math.random() * (max - min));
const randomUserAgent = () => SCRAPE_USER_AGENTS[Math.floor(Math.random() * SCRAPE_USER_AGENTS.length)];

// Optional residential proxy, read from env so it stays a deploy secret, never
// code. INGEST_PROXY_SERVER = host:port (or scheme://host:port). The username may
// contain a literal "{session}" placeholder; we swap a fresh random token per
// page so each page (and each retry) egresses from a different residential IP.
function getProxyConfig() {
  const raw = process.env.INGEST_PROXY_SERVER || process.env.SCRAPER_PROXY_SERVER;
  if (!raw) return null;
  return {
    server: /:\/\//.test(raw) ? raw : `http://${raw}`,
    username: process.env.INGEST_PROXY_USERNAME || process.env.SCRAPER_PROXY_USERNAME || '',
    password: process.env.INGEST_PROXY_PASSWORD || process.env.SCRAPER_PROXY_PASSWORD || ''
  };
}

function buildLaunchArgs() {
  const args = [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    // Stability flags: Amazon product pages are heavy and, over many
    // navigations, the renderer used to exhaust memory and the browser session
    // died ("Target.createTarget: Session with given id not found"), taking down
    // the rest of the run. These trim memory/GPU usage.
    '--disable-dev-shm-usage',
    '--disable-gpu',
    '--disable-extensions',
    '--disable-background-networking',
    '--no-zygote'
  ];
  const proxy = getProxyConfig();
  if (proxy) args.push(`--proxy-server=${proxy.server}`);
  return args;
}

async function launchBrowser() {
  const proxy = getProxyConfig();
  if (proxy) console.log(`Browser launching via proxy ${proxy.server}`);
  // puppeteer-extra wraps the installed puppeteer; the stealth plugin masks the
  // headless fingerprint (navigator.webdriver, plugins, WebGL, languages, ...).
  let puppeteer;
  try {
    puppeteer = require('puppeteer-extra');
    const StealthPlugin = require('puppeteer-extra-plugin-stealth');
    puppeteer.use(StealthPlugin());
  } catch (err) {
    console.warn(`puppeteer-extra/stealth unavailable (${err.message}); using plain puppeteer.`);
    puppeteer = require('puppeteer');
  }
  return puppeteer.launch({ headless: 'new', args: buildLaunchArgs() });
}

// Prepare a page: fresh proxy session (rotates the residential IP), a rotated
// user agent, realistic headers/viewport, and image/media/font blocking.
async function preparePage(browser) {
  const page = await browser.newPage();
  await blockHeavyResources(page);
  const proxy = getProxyConfig();
  if (proxy && (proxy.username || proxy.password)) {
    const username = proxy.username.includes('{session}')
      ? proxy.username.replace(/\{session\}/g, Math.random().toString(36).slice(2, 10))
      : proxy.username;
    await page.authenticate({ username, password: proxy.password });
  }
  await page.setUserAgent(randomUserAgent());
  await page.setExtraHTTPHeaders({ 'Accept-Language': 'en-US,en;q=0.9' });
  await page.setViewport({ width: 1366, height: 768 });
  return page;
}

// Detect Amazon's bot wall (CAPTCHA / "Robot Check" / dog page) so we retry on a
// fresh IP instead of silently returning zero results.
async function isBotBlocked(page) {
  try {
    if (/\/errors\/validateCaptcha/i.test(page.url())) return true;
    return await page.evaluate(() => {
      const title = (document.title || '').toLowerCase();
      const body = (document.body && document.body.innerText ? document.body.innerText : '').toLowerCase();
      const hay = `${title}\n${body.slice(0, 4000)}`;
      return [
        'robot check',
        'enter the characters you see',
        'type the characters you see',
        "we just need to make sure you're not a robot",
        'to discuss automated access',
        'api-services-support@amazon.com'
      ].some((needle) => hay.includes(needle));
    });
  } catch {
    return false;
  }
}

// Run a page operation with retries; each attempt gets a fresh page (new proxy
// IP + UA) plus a jittered backoff, so a transient block or empty result doesn't
// kill the whole component type.
async function withScrapeRetry(label, fn) {
  let lastError;
  for (let attempt = 1; attempt <= SCRAPE_ATTEMPTS; attempt += 1) {
    try {
      return await fn(attempt);
    } catch (err) {
      lastError = err;
      console.warn(`${label}: attempt ${attempt}/${SCRAPE_ATTEMPTS} failed — ${err.message}`);
      if (attempt < SCRAPE_ATTEMPTS) await sleep(jitter(2500, 6000));
    }
  }
  throw lastError;
}

// Abort image/media/font requests before navigation. Price/spec detection only
// needs the DOM text, and these resource types dominate an Amazon product page's
// memory footprint — blocking them is the main defence against the renderer
// crash that was killing long runs.
async function blockHeavyResources(page) {
  try {
    await page.setRequestInterception(true);
    page.on('request', (req) => {
      const type = req.resourceType();
      if (type === 'image' || type === 'media' || type === 'font') {
        req.abort().catch(() => {});
      } else {
        req.continue().catch(() => {});
      }
    });
  } catch (err) {
    // Interception unsupported / already set — proceed without it.
  }
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
    alreadyInLiveSkipped: 0,
    noPriceSkipped: 0
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
    let pagesScraped = 0;

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

          // Proactively recycle the browser every dozen product pages so renderer
          // memory can't accumulate to the crash point over a long run.
          if (pagesScraped > 0 && pagesScraped % 12 === 0) {
            console.log('Recycling browser (memory hygiene)…');
            await browser.close().catch(() => {});
            browser = await launchBrowser();
          }
          pagesScraped += 1;

          // Resilient scrape: if the browser session has died, relaunch and retry
          // this one candidate once before giving up on it.
          let rawProduct;
          try {
            rawProduct = await scrapeAmazonCandidate(browser, candidate, componentType, affiliateTag);
          } catch (err) {
            console.error(`Scrape threw (${err.message}); relaunching browser and retrying once.`);
            await browser.close().catch(() => {});
            browser = await launchBrowser();
            try {
              rawProduct = await scrapeAmazonCandidate(browser, candidate, componentType, affiliateTag);
            } catch (err2) {
              console.error(`Retry failed (${err2.message}); skipping candidate.`);
              summary.skipped += 1;
              continue;
            }
          }
          rawProduct.scrapedAt = new Date().toISOString();
          rawProduct.affiliateTag = affiliateTag;

          // Re-run rejection on the FULL product-page title. The search-result
          // snippet is often shorter than the real title, so combo/antenna/
          // sparepart wording (e.g. "CPU Motherboard Combo", "Sparepart") only
          // shows up post-scrape and slipped past the pre-scrape check above.
          const fullTitle = firstString(rawProduct.rawTitle, rawProduct.title, rawProduct.name, candidate.name);
          const postReject = shouldRejectCandidate(componentType, fullTitle);
          if (postReject) {
            summary.skipped += 1;
            console.log(`Skipped after scrape (${postReject}): ${fullTitle}`);
            continue;
          }

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

          // Never stage a component without a usable price. A priceless doc is
          // useless downstream (the API hides anything failing hasValidPrice) and
          // only clutters the pending queue, so drop it before it is written.
          if (!(typeof pendingDoc.price === 'number' && pendingDoc.price > 0)) {
            summary.skipped += 1;
            summary.noPriceSkipped += 1;
            console.log(`Skipped (no price): ${pendingDoc.name || rawProduct.name || candidate.name}`);
            continue;
          }

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
  shouldRejectCandidate,
  isComboProduct,
  PENDING_COLLECTION
};
