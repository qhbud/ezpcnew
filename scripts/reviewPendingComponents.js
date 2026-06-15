const { MongoClient } = require('mongodb');
require('dotenv').config();

const DEFAULT_DB_NAME = 'pcbuilder';
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

function normalizeType(type) {
  return TYPE_ALIASES[String(type || '').trim().toLowerCase()] || null;
}

function parseArgs(argv) {
  const options = {
    limit: 20,
    type: null,
    status: 'pending'
  };

  for (const arg of argv) {
    if (arg.startsWith('--limit=')) {
      const parsed = Number.parseInt(arg.slice('--limit='.length), 10);
      if (!Number.isNaN(parsed) && parsed >= 0) options.limit = parsed;
    } else if (arg.startsWith('--type=')) {
      const rawType = arg.slice('--type='.length);
      const normalized = normalizeType(rawType);
      if (!normalized) throw new Error(`Unsupported component type: ${rawType}`);
      options.type = normalized;
    } else if (arg.startsWith('--status=')) {
      options.status = arg.slice('--status='.length).trim();
    }
  }

  return options;
}

function buildFilter(options) {
  const filter = {};
  if (options.status && options.status !== 'all') filter.status = options.status;
  if (options.type) filter.componentType = options.type;
  return filter;
}

function formatPrice(price) {
  if (typeof price !== 'number' || !Number.isFinite(price)) return 'n/a';
  return `$${price.toFixed(2)}`;
}

async function reviewPendingComponents(options) {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/pcbuilder';
  const dbName = process.env.DB_NAME || DEFAULT_DB_NAME;
  const client = new MongoClient(uri);

  try {
    await client.connect();
    const db = client.db(dbName);
    const collection = db.collection(PENDING_COLLECTION);
    const filter = buildFilter(options);

    const total = await collection.countDocuments(filter);
    const countsByType = await collection.aggregate([
      { $match: filter },
      { $group: { _id: '$componentType', count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]).toArray();

    const recent = await collection.find(filter, {
      projection: {
        componentType: 1,
        name: 1,
        price: 1,
        productUrl: 1,
        alreadyInLive: 1,
        scrapedAt: 1,
        status: 1
      }
    }).sort({ scrapedAt: -1 }).limit(options.limit).toArray();

    console.log(`Pending component review queue: ${total} document(s)`);
    console.log('\nCount by type:');
    if (countsByType.length === 0) {
      console.log('  none');
    } else {
      countsByType.forEach((row) => {
        console.log(`  ${row._id || 'unknown'}: ${row.count}`);
      });
    }

    console.log(`\nRecent ${recent.length} document(s):`);
    if (recent.length === 0) {
      console.log('  none');
    } else {
      recent.forEach((doc, index) => {
        console.log(`${index + 1}. [${doc.componentType}] ${doc.name}`);
        console.log(`   price: ${formatPrice(doc.price)} | status: ${doc.status} | alreadyInLive: ${Boolean(doc.alreadyInLive)}`);
        console.log(`   scrapedAt: ${doc.scrapedAt || 'n/a'}`);
        console.log(`   link: ${doc.productUrl || 'n/a'}`);
      });
    }
  } finally {
    await client.close().catch(() => {});
  }
}

if (require.main === module) {
  reviewPendingComponents(parseArgs(process.argv.slice(2))).catch((error) => {
    console.error(error.stack || error.message);
    process.exitCode = 1;
  });
}

module.exports = {
  reviewPendingComponents,
  parseArgs
};
