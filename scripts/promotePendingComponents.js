// Promote reviewed docs from `pending_components` into the live catalog
// collections, mapping the pending schema (componentType + nested `fields`) onto
// each live collection's shape. Dry-run by default; pass --commit to write.
//
//   node scripts/promotePendingComponents.js                 # dry run, all pending
//   node scripts/promotePendingComponents.js --since=2026-06-16 --commit
//   node scripts/promotePendingComponents.js --type=gpu --commit
//
// Loads .env.atlas first (Atlas) unless MONGODB_URI is already set.
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.atlas') });
require('dotenv').config();
const { MongoClient } = require('mongodb');

const PENDING_COLLECTION = 'pending_components';

function parseArgs(argv) {
  const o = { commit: false, since: null, type: null };
  for (const a of argv) {
    if (a === '--commit') o.commit = true;
    else if (a.startsWith('--since=')) o.since = a.slice(8);
    else if (a.startsWith('--type=')) o.type = a.slice(7);
  }
  return o;
}

const num = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : null);

// Common fields every live doc needs to render + survive the nightly price update.
function commonFields(d, now) {
  return {
    name: d.name,
    title: d.name,
    price: d.price,
    currentPrice: d.price,
    basePrice: d.price,
    salePrice: null,
    isOnSale: false,
    sourceUrl: d.productUrl,
    productUrl: d.productUrl,
    url: d.productUrl,
    imageUrl: d.imageUrl || '',
    image: d.imageUrl || '',
    asin: d.asin || null,
    source: 'Amazon',
    renewed: Boolean(d.renewed),
    hidden: false,
    isAvailable: true,
    availability: 'in_stock',
    scrapedAt: d.scrapedAt || now,
    createdAt: now,
    updatedAt: now,
    lastUpdated: now,
    lastPriceCheck: now,
    priceDetectionMethod: 'RiverSearch',
    lastUpdateError: null,
    updateFailed: false,
    priceHistory: [{ price: d.price, date: now, source: d.productUrl, detectionMethod: 'RiverSearch', isAvailable: true }]
  };
}

function gpuTier(chip) {
  const c = String(chip || '').toUpperCase();
  if (/(4090|5090)/.test(c)) return 'flagship';
  if (/(4080|5080)/.test(c)) return 'enthusiast';
  if (/(4070|5070|7900|7800)/.test(c)) return 'high-end';
  return 'mainstream';
}

// Map a pending doc -> { collection, doc }. Returns null if unmappable.
function mapToLive(d, now) {
  const f = d.fields || {};
  const base = commonFields(d, now);

  switch (d.componentType) {
    case 'cpu':
      return { collection: 'cpus', doc: { ...base, category: 'cpu', model: 'Unknown',
        manufacturer: f.manufacturer, cores: num(f.cores), threads: num(f.threads),
        speed: num(f.boostClock), baseClock: num(f.baseClock), socket: f.socket,
        tdp: num(f.tdp), integratedGraphics: f.integratedGraphics,
        memoryType: f.memoryType, pcieVersion: f.pcieVersion } };

    case 'gpu': {
      const model = f.chipset || 'unknown';
      const coll = 'gpus_' + String(model).toLowerCase().replace(/\s+/g, '_');
      return { collection: coll, doc: { ...base, category: 'gpu',
        gpuModel: f.chipset, manufacturer: f.manufacturer, partner: f.partner,
        tier: gpuTier(f.chipset),
        memory: { size: num(f.memory && f.memory.size), type: f.memory && f.memory.type },
        busWidth: num(f.memory && f.memory.busWidth),
        pcieVersion: f.specifications && f.specifications.pcieVersion,
        tdp: num(f.power && f.power.tdp), searchTerms: [] } };
    }

    case 'ram':
      return { collection: 'rams', doc: { ...base, category: 'ram',
        manufacturer: f.manufacturer, memoryType: f.memoryType,
        speed: num(f.speed), speedMHz: num(f.speed),
        kitSize: num(f.kitSize), capacity: num(f.capacity), totalCapacity: num(f.totalCapacity),
        casLatency: num(f.casLatency), latency: f.casLatency != null ? `CL${f.casLatency}` : null,
        timing: f.timing, performanceTier: null,
        specifications: { rgb: f.rgb === true, heatSpreader: false,
          overclock: f.xmp ? 'XMP' : (f.expo ? 'EXPO' : null),
          voltage: f.voltage != null ? `${f.voltage}V` : null,
          ecc: f.ecc === true, buffered: f.registered === true,
          type: f.formFactor === 'DIMM' ? 'UDIMM' : f.formFactor, expo: f.expo === true, xmp: f.xmp === true } } };

    case 'storage':
      return { collection: 'storages', doc: { ...base, category: 'storage',
        manufacturer: f.manufacturer, brand: f.brand,
        capacity: num(f.capacity), capacityGB: num(f.capacity),
        storageType: f.type, type: f.type, interfaceType: f.interface, formFactor: f.formFactor,
        readSpeed: num(f.readSpeed), writeSpeed: num(f.writeSpeed), rpm: null, cache: null, nandType: null } };

    case 'psu': {
      const eff = [f.certification, f.efficiency].filter(Boolean).join(' ') || null;
      return { collection: 'psus', doc: { ...base, category: 'psu',
        manufacturer: f.manufacturer, brand: f.brand, wattage: num(f.wattage),
        efficiency: eff, modular: f.modularity === 'Full' ? 'Fully Modular' : f.modularity } };
    }

    case 'motherboard':
      return { collection: 'motherboards', doc: { ...base, category: 'motherboard',
        manufacturer: f.manufacturer, socket: f.socket, chipset: f.chipset, formFactor: f.formFactor,
        memoryType: f.memoryType,
        m2Slots: Array.isArray(f.m2Slots) ? f.m2Slots.length : num(f.m2Slots),
        pcieSlots: Array.isArray(f.pcieSlots) ? f.pcieSlots.length : num(f.pcieSlots),
        ramSlots: num(f.memorySlots),
        networking: f.networking || { wifi: null, wifiVersion: null, bluetooth: null },
        specifications: {
          memoryType: Array.isArray(f.memoryType) ? f.memoryType[0] : f.memoryType,
          ramType: Array.isArray(f.memoryType) ? f.memoryType[0] : f.memoryType,
          memorySlots: num(f.memorySlots), maxMemory: f.maxMemory != null ? `${f.maxMemory}GB` : null,
          pcieVersion: (f.pcieSlots && f.pcieSlots[0] && f.pcieSlots[0].version) || null,
          wifi: f.networking ? f.networking.wifi : null,
          wifiVersion: f.networking ? f.networking.wifiVersion : null,
          bluetooth: f.networking ? f.networking.bluetooth : null } } };

    case 'cooler': {
      const isAir = f.type === 'Air';
      const coolerType = isAir ? 'Air Cooler' : 'AIO Liquid';
      return { collection: 'coolers', doc: { ...base, category: 'cooler',
        manufacturer: f.manufacturer, coolerType,
        compatibleSockets: f.socket || [], socketCompatibility: f.socket || [],
        fanCount: num(f.fan && f.fan.count), heatpipes: num(f.heatpipes),
        fan: { speed: (f.fan && f.fan.speed) || { min: null, max: null } },
        performance: { estimatedTdp: num(f.performance && f.performance.estimatedTdp),
          tdpBasis: f.performance && f.performance.tdpBasis },
        specifications: { isAIO: f.type === 'Liquid', rgb: !!(f.fan && f.fan.rgb),
          socketCompatibility: f.socket || [], coolerType,
          radiatorSize: f.radiator && f.radiator.size ? `${f.radiator.size}mm` : null, fanConfiguration: null } } };
    }

    case 'case':
      return { collection: 'cases', doc: { ...base, category: 'case',
        manufacturer: f.manufacturer,
        formFactor: Array.isArray(f.formFactor) ? f.formFactor[0] : f.formFactor,
        rgb: f.specifications ? f.specifications.hasRGB === true : false } };

    case 'addon':
      return { collection: 'addons', doc: { ...base, category: f.category || 'Accessories',
        manufacturer: f.manufacturer, brand: f.brand, type: f.type,
        fanSpecs: f.fanSpecs, thermalSpecs: f.thermalSpecs,
        specifications: f.specifications || { hasRGB: null }, features: [] } };

    default:
      return null;
  }
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI not set');
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db(process.env.DB_NAME || 'pcbuilder');
  const pending = db.collection(PENDING_COLLECTION);

  const filter = { status: 'pending' };
  if (opts.since) filter.updatedAt = { $gte: opts.since };
  if (opts.type) filter.componentType = opts.type;

  const docs = await pending.find(filter).toArray();
  const now = new Date().toISOString();
  const summary = {};
  let promoted = 0, skipped = 0, dupes = 0;

  console.log(`${opts.commit ? 'COMMIT' : 'DRY RUN'} — ${docs.length} pending doc(s) matched\n`);

  for (const d of docs) {
    const mapped = mapToLive(d, now);
    if (!mapped) { console.log(`SKIP (unmappable ${d.componentType}): ${d.name}`); skipped++; continue; }
    const { collection, doc } = mapped;

    // De-dupe by ASIN (or sourceUrl) within the target collection.
    const dupQuery = doc.asin ? { asin: doc.asin } : { sourceUrl: doc.sourceUrl };
    const exists = await db.collection(collection).findOne(dupQuery, { projection: { _id: 1 } });
    if (exists) { console.log(`DUP (already in ${collection}): ${d.name}`); dupes++; continue; }

    summary[collection] = (summary[collection] || 0) + 1;
    if (opts.commit) {
      await db.collection(collection).insertOne(doc);
      await pending.updateOne({ _id: d._id }, { $set: { status: 'promoted', promotedAt: now, promotedTo: collection } });
    }
    promoted++;
    console.log(`${opts.commit ? 'INSERTED' : 'WOULD INSERT'} -> ${collection}: ${d.name.slice(0, 70)}`);
  }

  console.log('\nBy collection:');
  Object.entries(summary).sort().forEach(([k, v]) => console.log(`  ${k}: ${v}`));
  console.log(`\n${opts.commit ? 'Promoted' : 'Would promote'}: ${promoted} | dupes skipped: ${dupes} | unmappable: ${skipped}`);
  if (!opts.commit) console.log('\n(Dry run — re-run with --commit to write.)');
  await client.close();
}

main().catch((e) => { console.error(e); process.exit(1); });
