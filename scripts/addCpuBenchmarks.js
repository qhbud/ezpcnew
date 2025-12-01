const { MongoClient } = require('mongodb');

const uri = 'mongodb://localhost:27017';
const client = new MongoClient(uri);

async function addCpuBenchmarks() {
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB\n');

    const db = client.db('pcbuilder');

    // Benchmark data to add
    const benchmarks = [
      {
        name: /Ryzen 9 7950X3D/i,
        collection: 'cpus_amd_ryzen_9',
        singleThread: 86.10,
        multiThread: 84.40
      },
      {
        name: /i5-12400F/i,
        collection: 'cpus_intel_core_i5',
        singleThread: 66.48,
        multiThread: 36.552
      },
      {
        name: /i7-13700F/i,
        collection: 'cpus_intel_core_i7',
        singleThread: 84.4,
        multiThread: 59.62
      }
    ];

    for (const benchmark of benchmarks) {
      console.log(`🔍 Searching for CPU matching: ${benchmark.name}`);

      const collection = db.collection(benchmark.collection);

      // Search in both name and title fields
      const cpu = await collection.findOne({
        $or: [
          { name: benchmark.name },
          { title: benchmark.name }
        ]
      });

      if (!cpu) {
        console.log(`❌ CPU not found in ${benchmark.collection}`);
        console.log('');
        continue;
      }

      const displayName = cpu.name || cpu.title || 'Unknown';
      console.log(`   Found: ${displayName}`);
      console.log(`   Current benchmarks: Single=${cpu.singleThreadScore || 'none'}, Multi=${cpu.multiThreadScore || 'none'}`);

      // Update with new benchmarks (using correct field names)
      await collection.updateOne(
        { _id: cpu._id },
        {
          $set: {
            singleCorePerformance: benchmark.singleThread,
            multiThreadPerformance: benchmark.multiThread,
            hasBenchmark: true,
            updatedAt: new Date()
          }
        }
      );

      console.log(`   ✅ Updated: Single=${benchmark.singleThread}, Multi=${benchmark.multiThread}`);
      console.log('');
    }

    console.log('✅ All benchmarks added successfully');

  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    await client.close();
    console.log('\n✅ Database connection closed');
  }
}

addCpuBenchmarks()
  .then(() => {
    console.log('✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
