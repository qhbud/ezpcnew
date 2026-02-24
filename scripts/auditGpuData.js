require('dotenv').config();
const { MongoClient } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/pcbuilder';
const DB_NAME = process.env.DB_NAME || 'pcbuilder';

async function auditGpuData() {
  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  console.log('Connected to MongoDB successfully\n');

  const db = client.db(DB_NAME);

  // List all collections starting with "gpus_"
  const collections = await db.listCollections().toArray();
  const gpuCollections = collections
    .filter(c => c.name.startsWith('gpus_'))
    .sort((a, b) => a.name.localeCompare(b.name));

  console.log(`Found ${gpuCollections.length} GPU collections\n`);
  console.log('='.repeat(80));
  console.log('  GPU DATA AUDIT REPORT');
  console.log('='.repeat(80));

  let totalGpus = 0;
  let totalMissingImages = 0;
  let totalMissingPrices = 0;
  let totalMissingBoth = 0;

  const collectionSummaries = [];

  for (const colInfo of gpuCollections) {
    const col = db.collection(colInfo.name);
    const docs = await col.find({}).toArray();

    if (docs.length === 0) {
      collectionSummaries.push({
        name: colInfo.name,
        total: 0,
        missingImages: [],
        missingPrices: [],
        missingBoth: []
      });
      continue;
    }

    const missingImages = [];
    const missingPrices = [];
    const missingBoth = [];

    for (const gpu of docs) {
      const gpuName = gpu.name || gpu.title || gpu.model || 'Unknown';

      // Check imageUrl: must be a non-empty string
      const hasImage = typeof gpu.imageUrl === 'string' && gpu.imageUrl.trim() !== '';

      // Check price: currentPrice > 0 OR basePrice > 0 OR price > 0
      const cp = parseFloat(gpu.currentPrice) || 0;
      const bp = parseFloat(gpu.basePrice) || 0;
      const p = parseFloat(gpu.price) || 0;
      const hasPrice = cp > 0 || bp > 0 || p > 0;

      if (!hasImage && !hasPrice) {
        missingBoth.push(gpuName);
      } else if (!hasImage) {
        missingImages.push(gpuName);
      } else if (!hasPrice) {
        missingPrices.push(gpuName);
      }
    }

    totalGpus += docs.length;
    totalMissingImages += missingImages.length + missingBoth.length;
    totalMissingPrices += missingPrices.length + missingBoth.length;
    totalMissingBoth += missingBoth.length;

    collectionSummaries.push({
      name: colInfo.name,
      total: docs.length,
      missingImages,
      missingPrices,
      missingBoth
    });
  }

  // Print per-collection details
  for (const cs of collectionSummaries) {
    console.log('');
    console.log('-'.repeat(80));
    const imgMissCount = cs.missingImages.length + cs.missingBoth.length;
    const priceMissCount = cs.missingPrices.length + cs.missingBoth.length;
    console.log(`Collection: ${cs.name}  (${cs.total} GPUs)`);

    if (cs.total === 0) {
      console.log('  [EMPTY COLLECTION]');
      continue;
    }

    if (imgMissCount === 0 && priceMissCount === 0) {
      console.log('  All GPUs have valid images and prices.');
      continue;
    }

    if (cs.missingBoth.length > 0) {
      console.log(`  Missing BOTH image AND price (${cs.missingBoth.length}):`);
      for (const name of cs.missingBoth) {
        console.log(`    - ${name}`);
      }
    }

    if (cs.missingImages.length > 0) {
      console.log(`  Missing image only (${cs.missingImages.length}):`);
      for (const name of cs.missingImages) {
        console.log(`    - ${name}`);
      }
    }

    if (cs.missingPrices.length > 0) {
      console.log(`  Missing price only (${cs.missingPrices.length}):`);
      for (const name of cs.missingPrices) {
        console.log(`    - ${name}`);
      }
    }
  }

  // Summary
  console.log('');
  console.log('='.repeat(80));
  console.log('  SUMMARY');
  console.log('='.repeat(80));
  console.log(`Total GPU collections:       ${gpuCollections.length}`);
  console.log(`Total GPU documents:         ${totalGpus}`);
  console.log(`GPUs missing images:         ${totalMissingImages} (${totalGpus > 0 ? (totalMissingImages / totalGpus * 100).toFixed(1) : 0}%)`);
  console.log(`GPUs missing prices:         ${totalMissingPrices} (${totalGpus > 0 ? (totalMissingPrices / totalGpus * 100).toFixed(1) : 0}%)`);
  console.log(`GPUs missing both:           ${totalMissingBoth}`);
  console.log(`GPUs fully complete:         ${totalGpus - (totalMissingImages + totalMissingPrices - totalMissingBoth)}`);
  console.log('='.repeat(80));

  // Collections ranked by issues
  const withIssues = collectionSummaries
    .filter(cs => cs.missingImages.length + cs.missingPrices.length + cs.missingBoth.length > 0)
    .sort((a, b) => {
      const aIssues = a.missingImages.length + a.missingPrices.length + a.missingBoth.length;
      const bIssues = b.missingImages.length + b.missingPrices.length + b.missingBoth.length;
      return bIssues - aIssues;
    });

  if (withIssues.length > 0) {
    console.log(`\nCollections with issues (${withIssues.length}):`);
    for (const cs of withIssues) {
      const imgMiss = cs.missingImages.length + cs.missingBoth.length;
      const priceMiss = cs.missingPrices.length + cs.missingBoth.length;
      console.log(`  ${cs.name.padEnd(35)} ${cs.total} total | ${imgMiss} missing image | ${priceMiss} missing price`);
    }
  }

  const emptyCollections = collectionSummaries.filter(cs => cs.total === 0);
  if (emptyCollections.length > 0) {
    console.log(`\nEmpty collections (${emptyCollections.length}):`);
    for (const cs of emptyCollections) {
      console.log(`  - ${cs.name}`);
    }
  }

  const cleanCollections = collectionSummaries.filter(
    cs => cs.total > 0 && cs.missingImages.length === 0 && cs.missingPrices.length === 0 && cs.missingBoth.length === 0
  );
  if (cleanCollections.length > 0) {
    console.log(`\nClean collections (${cleanCollections.length}):`);
    for (const cs of cleanCollections) {
      console.log(`  ${cs.name.padEnd(35)} ${cs.total} GPUs - all complete`);
    }
  }

  await client.close();
  console.log('\nDone. Connection closed.');
}

auditGpuData().catch(err => {
  console.error('Audit failed:', err);
  process.exit(1);
});
