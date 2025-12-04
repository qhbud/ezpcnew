const { MongoClient, ObjectId } = require('mongodb');
require('dotenv').config();

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/pcparts';

// Component IDs from the console log
const componentsToCheck = [
    { type: 'gpu', id: '68bcf85d2b16d7dcff922853', name: 'MSI Gaming RTX 5080' },
    { type: 'cpu', id: '68f9aa02873a1cd5d7b52cd3', name: 'CPU' },
    { type: 'motherboard', id: '69065fd470d4f91d2bf37c96', name: 'ASUS ROG MAXIMUS Z790' },
    { type: 'ram', id: '69082e51e05902f2be4110f7', name: 'CORSAIR Vengeance' },
    { type: 'cooler', id: '68c311825c4ed61c66a00e8a', name: 'Cooler' }
];

async function checkComponents() {
    const client = new MongoClient(uri);

    try {
        await client.connect();
        console.log('Connected to MongoDB\n');

        const db = client.db();

        for (const comp of componentsToCheck) {
            console.log(`\n🔍 Checking ${comp.type}: ${comp.name}`);
            console.log(`   ID: ${comp.id}`);

            if (comp.type === 'gpu') {
                // Check all GPU collections
                const collections = await db.listCollections({ name: /^gpus/ }).toArray();
                let found = false;

                for (const coll of collections) {
                    const collection = db.collection(coll.name);
                    const doc = await collection.findOne({ _id: new ObjectId(comp.id) });

                    if (doc) {
                        found = true;
                        console.log(`   ✅ Found in: ${coll.name}`);
                        console.log(`   Title: ${doc.title || doc.name}`);
                        console.log(`   Save Count: ${doc.saveCount || 0}`);
                        break;
                    }
                }

                if (!found) {
                    console.log(`   ❌ Not found in any GPU collection`);
                }
            } else {
                // Check specific collection
                const collectionMap = {
                    'cpu': 'cpus',
                    'motherboard': 'motherboards',
                    'ram': 'rams',
                    'cooler': 'coolers',
                    'psu': 'psus',
                    'case': 'cases',
                    'storage': 'storages'
                };

                const collectionName = collectionMap[comp.type];
                const collection = db.collection(collectionName);
                const doc = await collection.findOne({ _id: new ObjectId(comp.id) });

                if (doc) {
                    console.log(`   ✅ Found in: ${collectionName}`);
                    console.log(`   Title: ${doc.title || doc.name}`);
                    console.log(`   Save Count: ${doc.saveCount || 0}`);
                } else {
                    console.log(`   ❌ Not found in ${collectionName}`);
                }
            }
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await client.close();
    }
}

checkComponents();
