const { MongoClient } = require('mongodb');

const uri = 'mongodb://localhost:27017';
const client = new MongoClient(uri);

async function fixHDDLabels() {
    try {
        await client.connect();
        console.log('Connected to MongoDB');

        const db = client.db('pcbuilder');
        const storagesCollection = db.collection('storages');

        // Find items that are HDDs but labeled as SATA SSD
        // HDDs have indicators like: "Hard Drive", "HDD", "RPM", "7200RPM", "5400RPM"
        const hddIndicators = [
            { name: { $regex: /hard drive/i } },
            { name: { $regex: /hard disk/i } },
            { name: { $regex: /\d+\s*rpm/i } },  // 7200 RPM, 5400RPM, etc.
            { name: { $regex: /hdd/i } },
            { description: { $regex: /hard drive/i } },
            { description: { $regex: /\d+\s*rpm/i } }
        ];

        console.log('Searching for hard drives mislabeled as SATA SSD...\n');

        const mislabeledItems = await storagesCollection.find({
            $and: [
                { type: 'SATA SSD' },  // Currently labeled as SATA SSD
                { $or: hddIndicators }  // But has HDD indicators
            ]
        }).toArray();

        console.log(`Found ${mislabeledItems.length} mislabeled items:\n`);

        mislabeledItems.forEach((item, index) => {
            console.log(`${index + 1}. ${item.name}`);
            console.log(`   Current type: ${item.type}`);
            console.log(`   Manufacturer: ${item.manufacturer}`);
            console.log(`   Price: $${item.price}`);
            console.log('');
        });

        if (mislabeledItems.length > 0) {
            console.log('\nUpdating these items to "HDD"...\n');

            const result = await storagesCollection.updateMany(
                {
                    $and: [
                        { type: 'SATA SSD' },
                        { $or: hddIndicators }
                    ]
                },
                {
                    $set: { type: 'HDD', storageType: 'HDD' }
                }
            );

            console.log(`Update result: ${result.modifiedCount} items updated`);

            // Also check for items with "NOT a SATA HDD" or similar in the name
            const notSataItems = await storagesCollection.find({
                name: { $regex: /not.*sata.*hdd/i }
            }).toArray();

            if (notSataItems.length > 0) {
                console.log('\n\nFound items explicitly marked as NOT SATA HDD:');
                notSataItems.forEach(item => {
                    console.log(`- ${item.name} (${item.type})`);
                });

                // Update these to SAS HDD
                const sasResult = await storagesCollection.updateMany(
                    { name: { $regex: /not.*sata.*hdd/i } },
                    { $set: { type: 'SAS HDD', storageType: 'SAS HDD' } }
                );

                console.log(`Updated ${sasResult.modifiedCount} items to SAS HDD`);
            }
        } else {
            console.log('No mislabeled items found.');
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await client.close();
        console.log('\nDisconnected from MongoDB');
    }
}

fixHDDLabels();
