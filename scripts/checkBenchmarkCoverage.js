const { MongoClient } = require('mongodb');
require('dotenv').config();

const benchmarks = [
    'RTX 5090','RTX 5080','RTX 5070 Ti','RTX 5070','RTX 5060 Ti','RTX 5060',
    'RTX 4090','RTX 4080 Super','RTX 4080','RTX 4070 Ti Super','RTX 4070 Super',
    'RTX 4070 Ti','RTX 4070','RTX 4060 Ti','RTX 4060',
    'RTX 3090 Ti','RTX 3090','RTX 3080 Ti','RTX 3080','RTX 3070 Ti','RTX 3070',
    'RTX 3060 Ti','RTX 3060','RTX 3050',
    'RX 7900 XTX','RX 7900 XT','RX 7900 GRE','RX 7900',
    'RX 7800 XT','RX 7700 XT','RX 7600 XT','RX 7600',
    'RX 6950 XT','RX 6900 XT','RX 6800 XT','RX 6800',
    'RX 6750 XT','RX 6700 XT','RX 6650 XT','RX 6600 XT','RX 6600',
    'RX 6500 XT','RX 6400',
    'Arc A770','Arc A750','Arc A580','Arc A380'
];

async function run() {
    const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/pcbuilder';
    const client = new MongoClient(uri);
    await client.connect();
    const db = client.db();
    const gpus = await db.collection('gpus').find({}, { projection: { name: 1, chipset: 1 } }).toArray();

    const missing = [];
    for (const b of benchmarks) {
        const match = gpus.some(g => {
            const n = (g.name || '').toUpperCase();
            const c = (g.chipset || '').toUpperCase();
            return n.includes(b.toUpperCase()) || c.includes(b.toUpperCase());
        });
        if (!match) missing.push(b);
    }

    console.log('Total benchmark GPUs: ' + benchmarks.length);
    console.log('In DB: ' + (benchmarks.length - missing.length));
    console.log('NOT in DB (' + missing.length + '):');
    missing.forEach(m => console.log('  - ' + m));
    await client.close();
}
run();
