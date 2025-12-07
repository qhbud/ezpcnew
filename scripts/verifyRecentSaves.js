const { MongoClient, ObjectId } = require('mongodb');
require('dotenv').config();

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/pcparts';

// Component IDs from the console log
const recentComponents = [
    { type: 'gpu', id: '68bcfbb62b16d7dcff922861' },
    { type: 'cpu', id: '68bc95c9702c81490956774e' },
    { type: 'motherboard', id: '68c28346f98ae41bd170361b' },
    { type: 'ram', id: '69082e1fe05902f2be41104a' },
    { type: 'cooler', id: '68c32f075c4ed61c66a00ec0' },
    { type: 'psu', id: '68c23c96cd32f76f9aa4af43' },
    { type: 'storage', id: '6911660f97fb0dacc1810d81' },
    { type: 'case', id: '6921693e26218241f91ec309' }
];

async function verifyComponents() {
    const client = new MongoClient(uri);

    try {
        await client.connect();
        console.log('Connected to MongoDB\n');

        const db = client.db();

        console.log('=== Verifying Recent Save Count Updates ===\n');

        for (const comp of recentComponents) {
            const objectId = new ObjectId(comp.id);
            let found = false;
            let collection = null;
            let doc = null;

            if (comp.type === 'gpu') {
                // Check all GPU collections
                const allCollections = await db.listCollections().toArray();
                const gpuCollections = allCollections.filter(c => c.name.startsWith('gpus'));

                for (const coll of gpuCollections) {
                    collection = db.collection(coll.name);
                    doc = await collection.findOne({ _id: objectId });

                    if (doc) {
                        found = true;
                        console.log(`✅ GPU (${coll.name})`);
                        console.log(`   ID: ${comp.id}`);
                        console.log(`   Name: ${doc.title || doc.name}`);
                        console.log(`   Save Count: ${doc.saveCount || 0}`);
                        console.log('');
                        break;
                    }
                }
            } else if (comp.type === 'cpu') {
                // Check all CPU collections
                const allCollections = await db.listCollections().toArray();
                const cpuCollections = allCollections.filter(c => c.name.startsWith('cpus'));

                for (const coll of cpuCollections) {
                    collection = db.collection(coll.name);
                    doc = await collection.findOne({ _id: objectId });

                    if (doc) {
                        found = true;
                        console.log(`✅ CPU (${coll.name})`);
                        console.log(`   ID: ${comp.id}`);
                        console.log(`   Name: ${doc.title || doc.name}`);
                        console.log(`   Save Count: ${doc.saveCount || 0}`);
                        console.log('');
                        break;
                    }
                }
            } else {
                // Check specific collection
                const collectionMap = {
                    'motherboard': 'motherboards',
                    'ram': 'rams',
                    'cooler': 'coolers',
                    'psu': 'psus',
                    'case': 'cases',
                    'storage': 'storages'
                };

                const collectionName = collectionMap[comp.type];
                collection = db.collection(collectionName);
                doc = await collection.findOne({ _id: objectId });

                if (doc) {
                    found = true;
                    console.log(`✅ ${comp.type.toUpperCase()} (${collectionName})`);
                    console.log(`   ID: ${comp.id}`);
                    console.log(`   Name: ${doc.title || doc.name}`);
                    console.log(`   Save Count: ${doc.saveCount || 0}`);
                    console.log('');
                }
            }

            if (!found) {
                console.log(`❌ ${comp.type.toUpperCase()}: Not found with ID ${comp.id}\n`);
            }
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await client.close();
    }
}

verifyComponents();
