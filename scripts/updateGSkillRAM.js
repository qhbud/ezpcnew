const { MongoClient } = require('mongodb');

const uri = 'mongodb://localhost:27017';
const client = new MongoClient(uri);

async function updateGSkillRAM() {
    try {
        await client.connect();
        console.log('✅ Connected to MongoDB');

        const db = client.db('pcbuilder');
        const ramsCollection = db.collection('rams');

        // Find the RAM entry
        const ramToUpdate = await ramsCollection.findOne({
            $or: [
                { title: /F4-3200C16D-32GTZN/i },
                { name: /F4-3200C16D-32GTZN/i },
                { title: /Trident Z Neo.*32.*2.*16/i }
            ]
        });

        if (!ramToUpdate) {
            console.log('❌ RAM entry not found');
            console.log('Searching for similar entries...');

            const similarEntries = await ramsCollection.find({
                $or: [
                    { title: /Trident Z Neo/i },
                    { manufacturer: /G\.?Skill/i }
                ]
            }).limit(10).toArray();

            console.log(`\nFound ${similarEntries.length} similar entries:`);
            similarEntries.forEach((ram, index) => {
                console.log(`\n${index + 1}. ${ram.title || ram.name}`);
                console.log(`   Manufacturer: ${ram.manufacturer}`);
                console.log(`   Capacity: ${ram.capacity}`);
                console.log(`   Kit Size: ${ram.kitSize}`);
                console.log(`   Kit Configuration: ${ram.kitConfiguration}`);
            });
            return;
        }

        console.log('\n📦 Found RAM entry:');
        console.log(`   Title: ${ramToUpdate.title || ramToUpdate.name}`);
        console.log(`   Current Manufacturer: ${ramToUpdate.manufacturer}`);
        console.log(`   Current Capacity: ${ramToUpdate.capacity}`);
        console.log(`   Current Kit Size: ${ramToUpdate.kitSize}`);
        console.log(`   Current Kit Configuration: ${ramToUpdate.kitConfiguration}`);

        // Update the entry
        const updateResult = await ramsCollection.updateOne(
            { _id: ramToUpdate._id },
            {
                $set: {
                    manufacturer: 'G.Skill',
                    kitSize: 2,
                    capacity: 16,
                    kitConfiguration: '2x16GB',
                    totalCapacity: 32
                }
            }
        );

        if (updateResult.modifiedCount > 0) {
            console.log('\n✅ Successfully updated RAM entry!');

            // Fetch the updated entry to verify
            const updatedRam = await ramsCollection.findOne({ _id: ramToUpdate._id });
            console.log('\n📦 Updated RAM entry:');
            console.log(`   Title: ${updatedRam.title || updatedRam.name}`);
            console.log(`   Manufacturer: ${updatedRam.manufacturer}`);
            console.log(`   Capacity: ${updatedRam.capacity} GB per stick`);
            console.log(`   Kit Size: ${updatedRam.kitSize} sticks`);
            console.log(`   Kit Configuration: ${updatedRam.kitConfiguration}`);
            console.log(`   Total Capacity: ${updatedRam.totalCapacity} GB`);
        } else {
            console.log('⚠️ No changes were made (data might already be correct)');
        }

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await client.close();
        console.log('\n🔌 Disconnected from MongoDB');
    }
}

updateGSkillRAM().catch(console.error);
