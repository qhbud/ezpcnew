const mongoose = require('mongoose');
require('dotenv').config();
async function fix() {
  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;

  const asin = 'B0G4BGHWBH';
  const url = `https://www.amazon.com/dp/${asin}`;

  const result = await db.collection('rams').updateOne(
    { asin },
    { $set: { sourceUrl: url, productUrl: url } }
  );

  console.log(`Updated: ${result.modifiedCount} document(s)`);

  // Verify
  const doc = await db.collection('rams').findOne({ asin }, { projection: { name: 1, sourceUrl: 1 } });
  console.log(`Name: ${doc.name?.slice(0,70)}`);
  console.log(`URL:  ${doc.sourceUrl}`);

  await mongoose.disconnect();
}
fix().catch(console.error);
