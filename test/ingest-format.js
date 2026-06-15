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
