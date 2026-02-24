const mongoose = require('mongoose');
require('dotenv').config();
async function run() {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/pcbuilder');
    const db = mongoose.connection.db;
    // Get a well-populated GPU document
    const doc = await db.collection('gpus_rtx_4070_super').findOne();
    console.log(JSON.stringify(doc, null, 2));
    await mongoose.disconnect();
}
run().catch(e => { console.error(e); process.exit(1); });
