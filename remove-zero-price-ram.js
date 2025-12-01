const { MongoClient } = require('mongodb');

const uri = 'mongodb://localhost:27017';
const client = new MongoClient(uri);

async function removeZeroPriceRAM() {
    try {
        await client.connect();
        console.log('Connected to MongoDB');

        const db = client.db('pcbuilder');
        const ramsCollection = db.collection('rams');

        // Find all RAM with $0.00 price
        console.log('Searching for RAM with $0.00 or null price...\n');
        const zeroPriceRAM = await ramsCollection.find({
            $or: [
                { price: 0 },
                { price: 0.00 },
                { price: '0' },
                { price: '0.00' },
                { price: null }
            ]
        }).toArray();

        console.log(`Found ${zeroPriceRAM.length} RAM modules with $0.00 or null price:\n`);
        zeroPriceRAM.forEach((item, index) => {
            console.log(`${index + 1}. ${item.name || item.title}`);
            console.log(`   Capacity: ${item.capacity}GB`);
            console.log(`   Speed: ${item.speed}MHz`);
            console.log(`   Price: $${item.price}`);
            console.log('');
        });

        if (zeroPriceRAM.length > 0) {
            console.log('\nRemoving all RAM with $0.00 or null price from database...\n');

            const result = await ramsCollection.deleteMany({
                $or: [
                    { price: 0 },
                    { price: 0.00 },
                    { price: '0' },
                    { price: '0.00' },
                    { price: null }
                ]
            });

            console.log(`Successfully removed ${result.deletedCount} RAM module(s) from the database`);
        } else {
            console.log('No RAM with $0.00 or null price found.');
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await client.close();
        console.log('\nDisconnected from MongoDB');
    }
}

removeZeroPriceRAM();
