const { MongoClient } = require('mongodb');

const uri = 'mongodb://localhost:27017';
const client = new MongoClient(uri);

async function checkSpecificCpu() {
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB\n');

    const db = client.db('pcbuilder');
    const collection = db.collection('cpus');

    // Search for the Intel Core i7-13700F
    const cpu = await collection.findOne({
      name: { $regex: /i7-13700F/i }
    });

    if (!cpu) {
      console.log('❌ Intel Core i7-13700F not found');
      return;
    }

    console.log('📊 CPU Found:');
    console.log('='.repeat(60));
    console.log(`Name: ${cpu.name}`);
    console.log(`Current Price: $${cpu.currentPrice}`);
    console.log(`Has priceHistory: ${!!cpu.priceHistory}`);
    console.log(`Price History Length: ${cpu.priceHistory?.length || 0}`);

    if (cpu.priceHistory && cpu.priceHistory.length > 0) {
      console.log('\n📈 Price History Entries:');
      console.log('='.repeat(60));
      cpu.priceHistory.forEach((entry, i) => {
        console.log(`  [${i + 1}] ${entry.date} - $${entry.price} - Available: ${entry.isAvailable}`);
      });
    } else {
      console.log('\n⚠️ No price history entries found');
    }

    // Also show all fields
    console.log('\n📋 All Fields in Document:');
    console.log('='.repeat(60));
    console.log(Object.keys(cpu).join(', '));

  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    await client.close();
    console.log('\n✅ Database connection closed');
  }
}

checkSpecificCpu()
  .then(() => {
    console.log('✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
