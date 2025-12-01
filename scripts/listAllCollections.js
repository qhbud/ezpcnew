const { MongoClient } = require('mongodb');

const uri = 'mongodb://localhost:27017';
const client = new MongoClient(uri);

async function listAllCollections() {
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');

    const db = client.db('pcbuilder');

    // List all collections
    const collections = await db.listCollections().toArray();

    console.log('\n📊 ALL COLLECTIONS IN DATABASE:');
    console.log('='.repeat(60));

    for (const collection of collections) {
      const collectionName = collection.name;
      const count = await db.collection(collectionName).countDocuments();

      console.log(`\n📦 ${collectionName}:`);
      console.log(`   Documents: ${count}`);

      // Get a sample document to see the structure
      if (count > 0) {
        const sample = await db.collection(collectionName).findOne({});
        console.log(`   Sample fields: ${Object.keys(sample).join(', ')}`);

        // If it looks like it might contain GPU data, show more
        if (sample.name || sample.title || sample.model) {
          console.log(`   Sample name/title: ${sample.name || sample.title || sample.model}`);
        }
      }
    }

    console.log('\n' + '='.repeat(60));

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.close();
  }
}

listAllCollections().catch(console.error);
