const { MongoClient } = require('mongodb');

const uri = 'mongodb://localhost:27017';
const client = new MongoClient(uri);

async function removeZeroPricePSUs() {
    try {
        await client.connect();
        console.log('Connected to MongoDB');

        const db = client.db('pcbuilder');
        const psusCollection = db.collection('psus');

        // Find all PSUs with $0.00 price
        console.log('Searching for PSUs with $0.00 price...\n');
        const zeroPricePSUs = await psusCollection.find({
            $or: [
                { price: 0 },
                { price: 0.00 },
                { price: '0' },
                { price: '0.00' },
                { price: null }
            ]
        }).toArray();

        console.log(`Found ${zeroPricePSUs.length} PSUs with $0.00 or null price:\n`);
        zeroPricePSUs.forEach((item, index) => {
            console.log(`${index + 1}. ${item.name || item.title}`);
            console.log(`   Wattage: ${item.wattage}`);
            console.log(`   Efficiency: ${item.efficiency}`);
            console.log(`   Price: $${item.price}`);
            console.log('');
        });

        if (zeroPricePSUs.length > 0) {
            console.log('\nRemoving all PSUs with $0.00 or null price from database...\n');

            const result = await psusCollection.deleteMany({
                $or: [
                    { price: 0 },
                    { price: 0.00 },
                    { price: '0' },
                    { price: '0.00' },
                    { price: null }
                ]
            });

            console.log(`Successfully removed ${result.deletedCount} PSU(s) from the database`);
        } else {
            console.log('No PSUs with $0.00 or null price found.');
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await client.close();
        console.log('\nDisconnected from MongoDB');
    }
}

removeZeroPricePSUs();
