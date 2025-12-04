const { MongoClient, ObjectId } = require('mongodb');
require('dotenv').config();

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/pcparts';

// Component IDs from the error logs
const failingComponents = [
    { type: 'gpu', id: '68bd0c542b16d7dcff922898', name: 'GPU from error log' },
    { type: 'cpu', id: '68f9aa02873a1cd5d7b52cd0', name: 'CPU from error log' },
    { type: 'motherboard', id: '68c27e6bf98ae41bd1703611', name: 'Motherboard from error log' },
    { type: 'ram', id: '69082e31e05902f2be41108d', name: 'RAM from error log' },
    { type: 'cooler', id: '68c32f075c4ed61c66a00ec0', name: 'Cooler from error log' },
    { type: 'psu', id: '68c22be4cd32f76f9aa4aecc', name: 'PSU from error log' },
    { type: 'storage', id: '6911660f97fb0dacc1810d81', name: 'Storage from error log' },
    { type: 'case', id: '6921692b26218241f91ec2ee', name: 'Case from error log' }
];

async function checkComponents() {
    const client = new MongoClient(uri);

    try {
        await client.connect();
        console.log('Connected to MongoDB\n');

        const db = client.db();

        for (const comp of failingComponents) {
            console.log(`\n🔍 Checking ${comp.type}: ${comp.name}`);
            console.log(`   ID: ${comp.id}`);

            // Convert to ObjectId
            let objectId;
            try {
                if (ObjectId.isValid(comp.id)) {
                    objectId = new ObjectId(comp.id);
                    console.log(`   ObjectId: ${objectId}`);
                } else {
                    console.log(`   ❌ Invalid ObjectId format`);
                    continue;
                }
            } catch (e) {
                console.log(`   ❌ Error creating ObjectId: ${e.message}`);
                continue;
            }

            if (comp.type === 'gpu') {
                // Check all GPU collections
                const collections = await db.listCollections({ name: /^gpus/ }).toArray();
                let found = false;

                for (const coll of collections) {
                    const collection = db.collection(coll.name);
                    const doc = await collection.findOne({ _id: objectId });

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
                    console.log(`   🔎 Searching for similar IDs...`);

                    // Try to find components with similar IDs
                    for (const coll of collections) {
                        const collection = db.collection(coll.name);
                        const similarDocs = await collection.find({
                            _id: { $regex: new RegExp(comp.id.substring(0, 10)) }
                        }).limit(3).toArray();

                        if (similarDocs.length > 0) {
                            console.log(`   Found ${similarDocs.length} similar IDs in ${coll.name}:`);
                            similarDocs.forEach(doc => {
                                console.log(`      - ${doc._id}: ${doc.title || doc.name}`);
                            });
                        }
                    }
                }
            } else if (comp.type === 'cpu') {
                // Check all CPU collections
                const collections = await db.listCollections({ name: /^cpus/ }).toArray();
                let found = false;

                for (const coll of collections) {
                    const collection = db.collection(coll.name);
                    const doc = await collection.findOne({ _id: objectId });

                    if (doc) {
                        found = true;
                        console.log(`   ✅ Found in: ${coll.name}`);
                        console.log(`   Title: ${doc.title || doc.name}`);
                        console.log(`   Save Count: ${doc.saveCount || 0}`);
                        break;
                    }
                }

                if (!found) {
                    console.log(`   ❌ Not found in any CPU collection`);
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
                const collection = db.collection(collectionName);
                const doc = await collection.findOne({ _id: objectId });

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
