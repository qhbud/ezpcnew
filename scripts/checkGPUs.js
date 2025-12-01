const { MongoClient } = require('mongodb');

const uri = 'mongodb://localhost:27017';
const client = new MongoClient(uri);

async function checkGPUs() {
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');

    const db = client.db('pcbuilder');
    const gpusCollection = db.collection('gpus');

    const total = await gpusCollection.countDocuments();
    const withUrls = await gpusCollection.countDocuments({
      sourceUrl: { $exists: true, $ne: null, $ne: '' }
    });

    console.log('\n📊 GPU DATABASE STATISTICS:');
    console.log(`Total GPUs: ${total}`);
    console.log(`GPUs with source URLs: ${withUrls}`);

    const samples = await gpusCollection.find({}).limit(5).toArray();

    console.log('\n📦 SAMPLE GPU ENTRIES:');
    samples.forEach((gpu, index) => {
      console.log(`\n${index + 1}. ${gpu.name || gpu.title || 'Unknown'}`);
      console.log(`   Has sourceUrl: ${!!gpu.sourceUrl}`);
      console.log(`   Current Price: ${gpu.currentPrice ? `$${gpu.currentPrice}` : 'N/A'}`);
      console.log(`   Source: ${gpu.source || 'N/A'}`);
      if (gpu.sourceUrl) {
        console.log(`   URL: ${gpu.sourceUrl.substring(0, 80)}...`);
      }
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.close();
  }
}

checkGPUs().catch(console.error);
