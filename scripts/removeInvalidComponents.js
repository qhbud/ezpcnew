const { MongoClient, ObjectId } = require('mongodb');
require('dotenv').config();

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/pcbuilder';

async function removeInvalidComponents() {
    const client = new MongoClient(uri);

    try {
        await client.connect();
        console.log('Connected to MongoDB');

        const db = client.db('pcbuilder');

        // Components to remove (from the invalid links report)
        const componentsToRemove = [
            {
                collection: 'rams',
                id: '69082e5ae05902f2be411114',
                name: 'OLOy DDR4 RAM 32GB (2x16GB) Warhawk Aura Sync RGB 3600 MHz CL18 1.35V 288-Pin Desktop Gaming UDIMM (MD4U163618DEDA)'
            },
            {
                collection: 'cases',
                id: '68aa6dec78f87428fb81de2a',
                name: 'NZXT H510'
            },
            {
                collection: 'cases',
                id: '6921689b26218241f91ec294',
                name: 'K6 PC Case - Pre-Installed 6 PWM ARGB Fan (3 x 120mm, 3 x 140mm), ATX Mid-Tower Gaming PC Case, with Type-C, FOIFKIN (Black, K6)'
            },
            {
                collection: 'storages',
                id: '691164c9c9778f85fbcb97f6',
                name: '2TB NVMe SSD Gen4x4 for PS5 with Heatsink, M.2 2280 PCIe 4.0 Gaming SSD, PS5 Storage Expansion, Up to 7500MB/s Read & 6800MB/s Write, DRAM Cache, 3D TLC NAND'
            }
        ];

        console.log('\n=== Removing Components Without Links ===\n');

        let totalRemoved = 0;

        for (const component of componentsToRemove) {
            try {
                const collection = db.collection(component.collection);
                const result = await collection.deleteOne({ _id: new ObjectId(component.id) });

                if (result.deletedCount > 0) {
                    console.log(`✓ Removed from ${component.collection}:`);
                    console.log(`  ${component.name}`);
                    totalRemoved++;
                } else {
                    console.log(`✗ Not found in ${component.collection}:`);
                    console.log(`  ${component.name}`);
                }
            } catch (err) {
                console.log(`✗ Error removing from ${component.collection}:`);
                console.log(`  ${component.name}`);
                console.log(`  Error: ${err.message}`);
            }
        }

        console.log(`\n\n=== Summary ===`);
        console.log(`Total components removed: ${totalRemoved} / ${componentsToRemove.length}`);

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await client.close();
        console.log('\nDisconnected from MongoDB');
    }
}

removeInvalidComponents();
