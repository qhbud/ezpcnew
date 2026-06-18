const assert = require('assert');
const { buildPendingComponent } = require('../scripts/ingestNewComponents');

const SAMPLE_SCRAPED_AT = '2026-06-15T00:00:00.000Z';
const AFFILIATE_TAG = 'qhezpc-20';

const samples = {
  gpu: {
    asin: 'B0TESTGPU1',
    name: 'ASUS TUF Gaming NVIDIA GeForce RTX 4070 Ti SUPER OC Graphics Card 16GB GDDR6X 256-bit PCIe 4.0 285W TDP',
    title: 'ASUS TUF Gaming NVIDIA GeForce RTX 4070 Ti SUPER OC Graphics Card 16GB GDDR6X 256-bit PCIe 4.0 285W TDP',
    imageUrl: 'https://m.media-amazon.com/images/I/gpu.jpg',
    sourceUrl: 'https://www.amazon.com/dp/B0TESTGPU1',
    price: 849.99,
    source: 'amazon',
    scrapedAt: SAMPLE_SCRAPED_AT,
    affiliateTag: AFFILIATE_TAG
  },
  cpu: {
    asin: 'B0TESTCPU1',
    name: 'AMD Ryzen 9 7950X 16-Core, 32-Thread Desktop Processor AM5 up to 5.7 GHz 170W TDP DDR5 PCIe 5.0',
    title: 'AMD Ryzen 9 7950X 16-Core, 32-Thread Desktop Processor AM5 up to 5.7 GHz 170W TDP DDR5 PCIe 5.0',
    imageUrl: 'https://m.media-amazon.com/images/I/cpu.jpg',
    sourceUrl: 'https://www.amazon.com/dp/B0TESTCPU1?ref_=sr_1_1',
    price: 529.99,
    source: 'amazon',
    scrapedAt: SAMPLE_SCRAPED_AT,
    affiliateTag: AFFILIATE_TAG
  },
  ram: {
    asin: 'B0TESTRAM1',
    name: 'CORSAIR Vengeance RGB DDR5 RAM 32GB (2x16GB) 6000MHz CL36 1.35V Intel XMP Desktop Memory',
    title: 'CORSAIR Vengeance RGB DDR5 RAM 32GB (2x16GB) 6000MHz CL36 1.35V Intel XMP Desktop Memory',
    imageUrl: 'https://m.media-amazon.com/images/I/ram.jpg',
    sourceUrl: 'https://www.amazon.com/dp/B0TESTRAM1',
    price: 109.99,
    source: 'amazon',
    scrapedAt: SAMPLE_SCRAPED_AT,
    affiliateTag: AFFILIATE_TAG
  }
};

const checks = [];

function addCheck(name, fn) {
  checks.push({ name, fn });
}

function requiredKeys(doc) {
  [
    'componentType',
    'name',
    'imageUrl',
    'productUrl',
    'price',
    'source',
    'dedupKey',
    'scrapedAt',
    'status',
    'fields'
  ].forEach((key) => assert.ok(Object.prototype.hasOwnProperty.call(doc, key), `missing ${key}`));
}

addCheck('F1 required keys', () => {
  for (const [type, sample] of Object.entries(samples)) {
    const doc = buildPendingComponent(type, sample);
    requiredKeys(doc);
    assert.strictEqual(doc.status, 'pending');
    assert.strictEqual(typeof doc.fields, 'object');
    assert.ok(doc.fields);
  }
});

addCheck('F2 type-specific fields', () => {
  const gpu = buildPendingComponent('gpu', samples.gpu);
  assert.strictEqual(gpu.fields.chipset, 'RTX 4070 TI SUPER');
  assert.strictEqual(gpu.fields.memory.size, 16);
  assert.strictEqual(gpu.fields.memory.type, 'GDDR6X');
  assert.strictEqual(gpu.fields.power.tdp, 285);

  const cpu = buildPendingComponent('cpu', samples.cpu);
  assert.strictEqual(cpu.fields.socket, 'AM5');
  assert.strictEqual(cpu.fields.cores, 16);
  assert.strictEqual(cpu.fields.threads, 32);
  assert.strictEqual(cpu.fields.boostClock, 5.7);

  const ram = buildPendingComponent('ram', samples.ram);
  assert.strictEqual(ram.fields.totalCapacity, 32);
  assert.strictEqual(ram.fields.capacity, 16);
  assert.strictEqual(ram.fields.kitSize, 2);
  assert.strictEqual(ram.fields.memoryType, 'DDR5');
  assert.strictEqual(ram.fields.speed, 6000);
});

addCheck('F3 icon name link affiliate', () => {
  for (const [type, sample] of Object.entries(samples)) {
    const doc = buildPendingComponent(type, sample);
    assert.ok(doc.imageUrl && typeof doc.imageUrl === 'string');
    assert.ok(doc.name && typeof doc.name === 'string');
    assert.ok(doc.productUrl && typeof doc.productUrl === 'string');
    assert.ok(doc.productUrl.includes(`tag=${AFFILIATE_TAG}`), `${type} productUrl missing affiliate tag`);
  }
});

addCheck('F4 stable dedup key', () => {
  for (const [type, sample] of Object.entries(samples)) {
    const first = buildPendingComponent(type, sample);
    const second = buildPendingComponent(type, { ...sample });
    assert.strictEqual(first.dedupKey, second.dedupKey);
  }
});

// Regression cases for the 2026-06-17 ingest-audit fixes. Each title is taken
// (verbatim or close) from a doc that parsed wrong in pending_components.
function build(type, title) {
  return buildPendingComponent(type, {
    asin: 'B0REG' + Math.random().toString(36).slice(2, 8).toUpperCase(),
    name: title,
    title,
    imageUrl: 'https://m.media-amazon.com/images/I/x.jpg',
    sourceUrl: 'https://www.amazon.com/dp/B0REGTEST1',
    price: 99.99,
    source: 'amazon',
    scrapedAt: SAMPLE_SCRAPED_AT,
    affiliateTag: AFFILIATE_TAG
  }).fields;
}

addCheck('F5 storage read/write not swapped by comma', () => {
  // Was: readSpeed=6900 (grabbed the write number after the "Read" label).
  const f = build('storage', 'Samsung 990 PRO NVMe M.2 SSD, 2 TB, PCIe 4.0, 7,450 MB/s Read, 6,900 MB/s Write');
  assert.strictEqual(f.readSpeed, 7450, `readSpeed ${f.readSpeed}`);
  assert.strictEqual(f.writeSpeed, 6900, `writeSpeed ${f.writeSpeed}`);
  // "Up to" form still works.
  const g = build('storage', 'Samsung 9100 PRO 4TB, PCIe 5.0x4 M.2 2280, Seq. Read Speeds Up to 14,800MB/s');
  assert.strictEqual(g.readSpeed, 14800, `up-to readSpeed ${g.readSpeed}`);
});

addCheck('F6 addon fan rpm survives thousands comma', () => {
  // Was: rpm.max=100 (the tail of "2,100" after the comma).
  const f = build('addon', 'CORSAIR RS120 120mm PWM Fan up to 2,100 RPM Single Pack Black');
  assert.strictEqual(f.fanSpecs.rpm.max, 2100, `rpm.max ${f.fanSpecs.rpm.max}`);
  const g = build('addon', 'Thermalright TL-C12C 120mm 4pin PWM Silent Fan up to 1550RPM');
  assert.strictEqual(g.fanSpecs.rpm.max, 1550, `rpm.max ${g.fanSpecs.rpm.max}`);
  assert.strictEqual(g.manufacturer, 'Thermalright', `manufacturer ${g.manufacturer}`);
});

addCheck('F7 micro-ATX case does not claim ATX support', () => {
  // Was: motherboardSupport included "ATX" (the ATX inside "M-ATX").
  const f = build('case', 'Redragon GC218M Gaming Back-Mounted PC Case, M-ATX Computer Chassis');
  assert.ok(f.motherboardSupport.includes('Micro-ATX'), 'should support Micro-ATX');
  assert.ok(!f.motherboardSupport.includes('ATX'), `should NOT list full ATX: ${JSON.stringify(f.motherboardSupport)}`);
  assert.strictEqual(f.manufacturer, 'Redragon', `manufacturer ${f.manufacturer}`);
  // A genuine ATX case still parses ATX.
  const g = build('case', 'GAMDIAS ATX Mid Tower Gaming Computer Case Tempered Glass');
  assert.ok(g.motherboardSupport.includes('ATX'), 'real ATX case should list ATX');
  assert.strictEqual(g.manufacturer, 'GAMDIAS', `manufacturer ${g.manufacturer}`);
});

addCheck('F8 motherboard wifi true when version present', () => {
  // Was: wifi=null while wifiVersion="WiFi 6E" (\bwifi\b missed "WIFI6E").
  const f = build('motherboard', 'GIGABYTE Z790 Eagle AX LGA 1700 ATX, DDR5, PCIe 5.0, WIFI6E, 2.5GbE');
  assert.strictEqual(f.networking.wifi, true, `wifi ${f.networking.wifi}`);
  assert.strictEqual(f.networking.wifiVersion, 'WiFi 6E', `wifiVersion ${f.networking.wifiVersion}`);
  const g = build('motherboard', 'ASUS ROG STRIX B860-I LGA 1851 Mini-ITX, DDR5, WiFi7, M.2');
  assert.strictEqual(g.networking.wifi, true, 'WiFi7 board wifi true');
  assert.strictEqual(g.networking.wifiVersion, 'WiFi 7', `wifiVersion ${g.networking.wifiVersion}`);
});

addCheck('F9 GPU 30-series chipset resolves', () => {
  // Was: chipset=null, busWidth=null for an RTX 3090.
  const f = build('gpu', 'EVGA GeForce RTX 3090 FTW3 Ultra Gaming, 24GB GDDR6X, PCIe 4, ARGB');
  assert.strictEqual(f.chipset, 'RTX 3090', `chipset ${f.chipset}`);
  assert.strictEqual(f.partner, 'EVGA', `partner ${f.partner}`);
  assert.strictEqual(f.memory.busWidth, 384, `busWidth ${f.memory.busWidth}`);
});

addCheck('F10 cooler heatpipe count and fan count', () => {
  // Was: heatpipes=null with descriptor words between number and "Heat Pipes".
  const air = build('cooler', 'be quiet! Dark Rock Pro 5 CPU Cooler | 7 high-Performance Copper Heat Pipes | BK036');
  assert.strictEqual(air.type, 'Air', `type ${air.type}`);
  assert.strictEqual(air.heatpipes, 7, `heatpipes ${air.heatpipes}`);
  // Was: fan.count=null for "3X RS120 ARGB Fans Included".
  const aio = build('cooler', 'CORSAIR Nautilus 360 RS ARGB Liquid CPU Cooler 360mm AIO 3X RS120 ARGB Fans Included Black');
  assert.strictEqual(aio.type, 'Liquid', `type ${aio.type}`);
  assert.strictEqual(aio.fan.count, 3, `fan.count ${aio.fan.count}`);
});

let failed = 0;
for (const check of checks) {
  try {
    check.fn();
    console.log(`PASS ${check.name}`);
  } catch (error) {
    failed += 1;
    console.log(`FAIL ${check.name}: ${error.message}`);
  }
}

if (failed > 0) {
  process.exitCode = 1;
}
